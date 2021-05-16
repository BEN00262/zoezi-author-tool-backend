const consola = require('consola');

// NOTE: decouple the models from the services later
// local imports
const { PaperModel,AuthorModel,QuestionsModel, SubjectModel, GradeModel } = require('../models');
const sendToSubmissionQueue = require('../rabbitmq_client');
const { marshalIDTypes } = require('../utils');

// global declarations
const NORMAL = "normal";
const COMPREHENSION = "comprehension";

const getPapers = _id => {
    return AuthorModel.findOne({ _id })
        .populate('papers')
        .then(found_data => {
            if (!found_data){
                throw new Error("Papers not found");
            }
            return found_data.papers;
        })
        .catch(error => {
            consola.error(error);
            return [];
        })
}

// delete a paper
const removePaper = async _id => {
    try {
        const paperToBeDeleted = await PaperModel.findOne({ _id });

        if (!paperToBeDeleted){
            return {
                success: false,
                error: `paper does not exist`
            }
        }

        await QuestionsModel.deleteMany({_id: {
            $in: paperToBeDeleted.questions
        }})

        await paperToBeDeleted.delete();

        return { success: true }
    }catch(error){
        return {
            success: false,
            error: "Failed!!"
        }
    }
}


const createPaper = (paper,author_id) => {
    const { grade,subject, paperType } = paper;

    return new PaperModel({
        grade,
        subject,
        paperType,
        paperName:`${grade}_${subject}_${(new Date).toLocaleDateString()}`
    })
        .save()
        .then(async (saved_paper) => {
            await AuthorModel.findOneAndUpdate({_id:author_id},{$push:{
                papers:saved_paper._id
            }})
            return {success: true,errors:null,paper:saved_paper}
        })
        .catch(error => {
            consola.error(error);
            return {
                success: false,
                errors:[
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
const submitPaper = (clientID,paperID) => {
   return sendToSubmissionQueue(clientID,paperID)
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
            errors:[
                "Failed to create paper"
            ]
        }
    })
}

// increment a counter on the side of the author in the case
// that their question is accepted --> push this as a job to rabbitMQ
const approveQuestion = async (questionID) => {
    try {
        await QuestionsModel.findOneAndUpdate({
            _id:questionID
        },{$set:{isExposed:true,status:"approved"}});

        return {success:true}
    }catch(error){
        consola.error(error);
        return {
            success:false,
            errors:[
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
const getQuestions = async (paperID, skip = 0) => {
    try {
        const documentsPerPage = 5;

        // find a much better way to handle this
        let number_questions = await PaperModel.findOne({ _id: marshalIDTypes(paperID)});

        let paperFound = await PaperModel.findOne({ _id: marshalIDTypes(paperID) }).populate([{
            path: 'questions',
            model:'ques',
            options: {
                skip: skip * documentsPerPage,
                limit: documentsPerPage
            },
        }]);

        let doc_count = number_questions.questions.length;

        return {
            totalDocuments: doc_count,
            pageCount: Math.ceil(doc_count/documentsPerPage),
            paper: paperFound.toObject()
        }
    }catch(error){
        consola.error(error);
        return null;
    }
    // return PaperModel.findOne({
    //     _id:marshalIDTypes(paperID)
    // })
    //     .populate("questions")
    //     .then(data => {
    //         return {...data.toObject()}
    //     })
    //     .catch(error => {
    //         consola.error(error);
    //         return null;
    //     })
}

// in --> inout trtr
const searchQuestion = async (paperID,searchTerm) => {
    try {
        let foundTerm = await PaperModel.findOne({ _id: paperID })
            .populate({
                path:"questions",
                model:'ques',
                match: {
                    question: { $regex: searchTerm, $options:'i' }
                }
            });

        if (!foundTerm){
            return {
                success: false,
                errors: [
                    "Search term not found"
                ]
            }
        }

        return {
            success: true,
            paper: foundTerm
        }
    }catch(error){
        consola.error(error);
        return {
            success: false,
            errors: [
                "Failed to create question"
            ]
        }
    }
}

// this is the last entry point to conserve
// NOTE: improve this
const createQuestion = async (questionInput,canReview) => {
    try {
        const {
            questionType,question,
            options_next,additionalInfo,
            children,question_id,
            topic,subTopic,paperID,
            paperSubject,paperGrade
        } = questionInput;
    
        if(question_id){
            return updateQuestion(questionInput,question_id);
        }

        let found_data = await GradeModel.findOne({ grade: paperGrade })
                            .populate("subjects","subject _id");

        let subjectID = found_data.subjects.find(x => x.subject === paperSubject);

        
        let questionObject = {
            questionType,
            question,
            topic,
            subTopic,
            version:"1",
            subject:paperSubject,
            grade:paperGrade,
            isExperimental: true,
            isExposed: canReview,
            status: canReview ? "approved" : "ongoing"
        };

        switch(questionType){
            case NORMAL:
                questionObject = {
                    ...questionObject,
                    options_next,
                    additionalInfo,
                };
                break;
            case COMPREHENSION:
                questionObject ={
                    ...questionObject,
                    children,
                };
                break;
            default:
                throw new Error("Unrecognized paper type");
        }


        let saved_question = await new QuestionsModel(questionObject).save();

        await Promise.all([
            PaperModel.findOneAndUpdate({_id:marshalIDTypes(paperID)},{$push:{
                questions:saved_question._id
            }}), 
            SubjectModel.findOneAndUpdate({_id:marshalIDTypes(subjectID._id) },{$push:{
                questions: saved_question._id
            }})]
        );

        return {success: true,question:saved_question.toObject()};
    }catch(error){
        consola.error(error);
        return {
            success: false,
            errors: [
                "Failed to create question"
            ]
        }
    }
}


const removeQuestion = async (questionID) => {
    try {
        await QuestionsModel.deleteOne({_id:questionID});
        return {
            success: true
        }
    }catch(error){
        consola.error(error);
        return {
            success: false,
            errors: [
                error.message
            ]
        }
    }
}


const updateQuestion = async (questionInput,questionID) => {
    try {
        const {
            questionType,
            question,options_next,
            additionalInfo,children,
            topic,subTopic
        } = questionInput;
    
        let questionObject = { question, topic, subTopic };
    
    
        switch(questionType){
            case NORMAL:
                questionObject = {
                    ...questionObject,
                    options_next,
                    additionalInfo,
                };
                break;
            case COMPREHENSION:
                questionObject ={
                    ...questionObject,
                    children,
                };
                break;
            default:
                throw new Error("Unrecognized question type")
        }

        let updated_question = await QuestionsModel.findOneAndUpdate({
            _id:marshalIDTypes(questionID)
        },{ $set: questionObject },{$new:true});

        return {
            success: true,
            question: updated_question.toObject()
        }
    }catch(error){
        consola.error(error);
        return {
            success: false,
            errors:[
                error.message
            ]
        }
    }
}
module.exports = {
    getPapers,
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