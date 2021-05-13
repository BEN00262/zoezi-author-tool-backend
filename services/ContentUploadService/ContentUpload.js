/**
 * Copyright: Mitzanimedia Limited
 * Author: John Kerama <johhnesta2018@zoezimitzanimedia.co.ke>
 * Date: 5/12/2021
 */

const excelToJson = require('convert-excel-to-json');
const yup = require('yup');

const { QuestionsModel, SubjectModel, PaperModel, GradeModel } = require('../../models');
const { ZoeziCustomError } = require('../../errors');
const { ValidationError } = require('yup');

const OPTION_SPLITTING_REGEX = /[A-D]\.\s*([A-Za-z]*[\s,'\-]*[\sa-z]*)/g;
const optionsIndex = { 'A':0, 'B':1, 'C':2, 'D':3 };

const questionSchema = yup.object().shape({
    question: yup.string().required(),
    options: yup.string().required(),
    answer: yup.string().required(),
    additionalInfo: yup.string().required(),
    topic: yup.string().required(),
    subTopic: yup.string().required()
})


const questionValidation = yup.array().of(questionSchema);


// string => number => boolean
const check_if_correct = correct_option => index => optionsIndex[correct_option] === index

// string => buffer => Promise
const findOrUpdateGrade = async (gradeName,filebuffer) => {
    try {
        let found_grade = await GradeModel.findOne({ grade: gradeName.toLowerCase() }).populate('subjects');

        const check_if_subject_Exists = subject => found_grade.subjects.find(x => x.subject === subject)

        if (!found_grade){ throw new ZoeziCustomError("Invalid grade used") }

        let fileData = excelToJson({
            source: filebuffer,
            header:{ rows:1 },
            columnToKey:{
                A:'question',
                B:'options',
                C:'answer',
                D:'additionalInfo',
                E:'topic',
                F:'subTopic'
            }
        });

        const _save = async ({subject, questions}) => {
            let saved_questions = await QuestionsModel.insertMany(questions);

            if (!saved_questions){
                throw new ZoeziCustomError(
                    `Failed to save questions to grade ${gradeName}. Please try again`
                )
            }

            if (!check_if_subject_Exists(subject)){
                throw new ZoeziCustomError(
                    `subject ${subject} does not exist in grade ${gradename}`
                );
            }

            let saved_questions_ids = saved_questions.map(x => x._id);

            await SubjectModel.findOneAndUpdate({ subject }, {
                $push: { questions: saved_questions_ids }
            })

            let createdPaper = await PaperModel.create({
                isSubmitted: false,
                grade: gradeName,
                subject,
                paperType: 'Imported',
                paperName: `${gradeName}_${subject}_${(new Date).toLocaleDateString()}`,
                questions: saved_questions_ids
            })

            return createdPaper._id
        }

        return Promise.all(Object.entries(fileData).map(([subject, questions]) => {
            if (!questions || !Array.isArray(questions) || !questions.length){ return; }

            if (!questionValidation.validateSync(questions)){
               return;
            }

            questions = transformToV1(questions).map(q => ({
                ...q,
                subject,
                grade: gradeName
            }))
            return { subject, questions }
        }).filter(x => x).map(_save));

    }catch(error){
        if( error instanceof ValidationError){
            throw new ZoeziCustomError(
                `The excel file contains questions that do not follow the required question standard.
                 Please recheck the manual and ensure all required fields are filled`
            )
        }
        throw error;
    }
}

// question => transformed question
const transformToV1 = questions => {

    let v1_questions = questions.map(question => {
        const isCorrectFunc = check_if_correct(question.answer ? question.answer.toUpperCase() : 'A');

        let options_next = question.options.split(OPTION_SPLITTING_REGEX).filter(x => x).map((x, index) => ({
                option: x.trim(),
                isCorrect: isCorrectFunc(index)
            })
        )

        return {
            ...question,
            question: `<p>${question.question}</p>`,
            additionalInfo: `<p>${question.additionalInfo}</p>`,
            version:'1',
            isExposed:false,
            topic:question.topic || "Default",
            subTopic:question.subTopic || "Default",
            questionTag:[],
            options_next,
            isExperimental:true,
            options:'',
            answer:'',
            questionType:'normal',
        }
    })
    return v1_questions;
}

module.exports = findOrUpdateGrade;