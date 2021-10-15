const consola = require('consola');
const mongoose = require('mongoose');

// NOTE: decouple the models from the services later
// local imports
const { PaperModel, AuthorModel, QuestionsModel, SubjectModel, GradeModel, SpecialPaperModel } = require('../models');
const sendToSubmissionQueue = require('../rabbitmq_client');
const { marshalIDTypes } = require('../utils');
const { ZoeziCustomError } = require('../errors');

// global declarations
const NORMAL = "normal";
const COMPREHENSION = "comprehension";

const getPapers = async _id => {
    try {
        // link the special papers to the author too
        let authorPapers = await AuthorModel.findOne({ _id })
            .populate('papers')
            .populate('specialpapers')

        if (!authorPapers) {
            throw new ZoeziCustomError("Papers not found")
        }

        // we create a thing for all the papers in the system
        return { npapers: authorPapers.papers, spapers: authorPapers.specialpapers }
    } catch (error) {
        consola.error(error);
        return [];
    }
}

// delete a paper
// make this transactional
const removePaper = async _id => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const paperToBeDeleted = await PaperModel.findOne({ _id }).session(session)

        if (!paperToBeDeleted) {
            throw new ZoeziCustomError(`paper does not exist`)
        }

        await QuestionsModel.deleteMany({
            _id: {
                $in: paperToBeDeleted.questions
            }
        }).session(session);

        await paperToBeDeleted.delete().session(session);

        await session.commitTransaction()
        return { success: true }
    } catch (error) {
        await session.abortTransaction()

        if (error instanceof ZoeziCustomError) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: false,
            error: "Failed!!"
        }
    }
}


const createPaper = (paper, author_id) => {
    const { grade, subject, paperType } = paper;

    return new PaperModel({
            grade,
            subject,
            paperType,
            paperName: `${grade}_${subject}_${(new Date).toLocaleDateString()}`
        })
        .save()
        .then(async(saved_paper) => {
            await AuthorModel.findOneAndUpdate({ _id: author_id }, {
                $push: {
                    papers: saved_paper._id
                }
            })
            return { success: true, errors: null, paper: saved_paper }
        })
        .catch(error => {
            consola.error(error);
            return {
                success: false,
                errors: [
                    "Failed to create paper"
                ]
            }
        })
}

// this will be done by the receivers on the other side of the rabbitMQ broker
// on submitting the paper what happens??
// the idea is to spread the work properly between the reviewers
// pick the reviewer with the least amount of papers in the submission queue
// add it there 
const submitPaper = (clientID, paperID) => {
    return sendToSubmissionQueue(clientID, paperID)
        .then(_ => {
            return {
                success: true,
                message: 'Your paper has been queued for submission'
            }
        })
        .catch(error => {
            consola.error(error);
            return {
                success: false,
                errors: [
                    "Failed to create paper"
                ]
            }
        })
}

// protect this
const setIsSample = async(_id, isSample) => {
    try {
        await QuestionsModel.findOneAndUpdate({ _id }, { isSample });
        return {
            success: true,
            // message: 'Your paper has been queued for submission'
        }
    } catch (error) {
        consola.error(error);
        return {
            success: false,
            errors: [
                "Failed to create paper"
            ]
        }
    }
}

// increment a counter on the side of the author in the case
// that their question is accepted --> push this as a job to rabbitMQ
const approveQuestion = async(questionID) => {
    try {
        await QuestionsModel.findOneAndUpdate({
            _id: questionID
        }, { $set: { isExposed: true, status: "approved" } });

        return { success: true }
    } catch (error) {
        consola.error(error);
        return {
            success: false,
            errors: [
                "Failed to approve question"
            ]
        }
    }
}

/**
 * 
 * @param {string} paperID 
 * @param {number} skip 
 * @param {number} limit 
 * @returns 
 */
const getQuestions = async(paperID, is_special, skip = 0) => {
    // we fetch using this but what about the other type of questions from the new special papers

    try {
        const documentsPerPage = 5;

        // find a much better way to handle this
        let number_questions = await (is_special ? SpecialPaperModel : PaperModel).findOne({ _id: marshalIDTypes(paperID) });

        let paperFound = await (is_special ? SpecialPaperModel.findOne({ _id: marshalIDTypes(paperID) }): PaperModel.findOne({ _id: marshalIDTypes(paperID) }))
            .populate([{
                path: 'questions',
                model: 'ques',
                options: {
                    skip: skip * documentsPerPage,
                    limit: documentsPerPage
                },
            }]);

        let doc_count = number_questions.questions.length;

        return {
            totalDocuments: doc_count,
            pageCount: Math.ceil(doc_count / documentsPerPage),
            paper: paperFound.toObject()
        }
    } catch (error) {
        consola.error(error);
        return null;
    }
}

// paperID -> searchTerm -> response
const searchQuestion = async(paperID, searchTerm, searchDic) => {
    try {
        // find a way to relate to the search stuff in mongodb
        // check if this is also a special paper type
        let foundTerm = await PaperModel.findOne({ _id: paperID })
            .populate({
                path: "questions",
                model: 'ques',
                match: { question: { $regex: searchTerm || " ", $options: 'i' }, ...searchDic }
            });

        if (!foundTerm) {
            return {
                success: false,
                errors: ["Search term not found"]
            }
        }

        return {
            success: true,
            paper: foundTerm
        }
    } catch (error) {
        consola.error(error);
        return {
            success: false,
            errors: ["Failed to create question"]
        }
    }
}

// this is the last entry point to conserve
// NOTE: improve this
const createQuestion = async(questionInput, canReview, is_special = false) => {
    try {
        const {
            questionType,
            question,
            options_next,
            additionalInfo,
            children,
            question_id,
            topic,
            subTopic,
            paperID,
            paperSubject,
            paperGrade, // in a special paper this is the special paper kcpe
        } = questionInput;

        if (question_id) {
            return updateQuestion(questionInput, question_id);
        }

        // just incase
        is_special = is_special || false

        let questionObject = {
            questionType,
            question,
            topic,
            subTopic,
            version: "1",

            // for special papers this refers to the name of the actual subject
            subject: paperSubject,

            // for special papers this refers to the name of the top level thing
            // we are now passing this dow to here

            grade: is_special ? `${paperGrade}_special`: paperGrade,
            isExperimental: true,
            isExposed: canReview,
            status: canReview ? "approved" : "ongoing"
        };

        switch (questionType) {
            case NORMAL:
                questionObject = {
                    ...questionObject,
                    options_next,
                    additionalInfo,
                };
                break;
            case COMPREHENSION:
                questionObject = {
                    ...questionObject,
                    children,
                };
                break;
            default:
                throw new Error("Unrecognized paper type");
        }


        let saved_question = await QuestionsModel.create(questionObject);

        if (is_special) {
            await SpecialPaperModel.findByIdAndUpdate({ _id: marshalIDTypes(paperID) }, {
                $push: { questions: saved_question._id }
            })
        } else {
            let subjectID = ((await GradeModel.findOne({ grade: paperGrade })
                    .populate("subjects", "subject _id")) || { subjects: [] })
                .subjects.find(x => x.subject === paperSubject);

            await Promise.all([
                PaperModel.findOneAndUpdate({ _id: marshalIDTypes(paperID) }, {
                    $push: {
                        questions: saved_question._id
                    }
                }),
                SubjectModel.findOneAndUpdate({ _id: marshalIDTypes(subjectID._id) }, {
                    $push: {
                        questions: saved_question._id
                    }
                })
            ]);
        }

        return { success: true, question: saved_question.toObject() };
    } catch (error) {
        consola.error(error);
        return {
            success: false,
            errors: [
                "Failed to create question"
            ]
        }
    }
}

// reusable
const removeQuestion = async(questionID) => {
    try {
        await QuestionsModel.deleteOne({ _id: questionID });
        return { success: true }
    } catch (error) {
        consola.error(error);
        return {
            success: false,
            errors: [error.message]
        }
    }
}


// this is also generic
const updateQuestion = async(questionInput, questionID) => {
    try {
        const {
            questionType,
            question,
            options_next,
            additionalInfo,
            children,
            topic,
            subTopic
        } = questionInput;

        let questionObject = { question, topic, subTopic };


        switch (questionType) {
            case NORMAL:
                questionObject = {
                    ...questionObject,
                    options_next,
                    additionalInfo,
                };
                break;
            case COMPREHENSION:
                questionObject = {
                    ...questionObject,
                    children,
                };
                break;
            default:
                throw new Error("Unrecognized question type")
        }

        // this is the only unique part of the system
        let updated_question = await QuestionsModel.findOneAndUpdate({
            _id: marshalIDTypes(questionID)
        }, { $set: questionObject }, { $new: true });

        return {
            success: true,
            question: updated_question.toObject()
        }
    } catch (error) {
        consola.error(error);
        return {
            success: false,
            errors: [
                error.message
            ]
        }
    }
}
module.exports = {
    getPapers,
    setIsSample,
    removePaper,
    searchQuestion,
    createPaper,
    submitPaper,
    approveQuestion,
    getQuestions,
    createQuestion,
    removeQuestion,
    updateQuestion
}