const { ZoeziCustomError } = require('../errors')
const { massageResponse } = require('../utils')
const { GradeModel, SubjectModel } = require('../models')

const errorHandler = (error, errorMessage) => {
    if (error instanceof ZoeziCustomError) {
        return massageResponse(500, {
            status: false,
            errors: [
                error.message
            ]
        })
    }

    return massageResponse(500, {
        status: false,
        errors: [
            errorMessage
        ]
    })
}

class AdminService {
    // returns all the grades in the system currently
    async getAllGrades() {
        try {
            let grades = await GradeModel.aggregate([
                {
                    $project: {
                        grade: 1,
                        // avatarPath: 1 // do this later
                        available: 1
                    }
                }
            ]);

            return massageResponse(200, { grades })

        } catch(error) {
            return errorHandler(error, "Failed to fetch grades")
        }
    }

    // can be used for fetching data for updating 
    async getFullGradeDetails(gradeID) {
        try {
            let gradeFound = await GradeModel.findOne({ _id: gradeID });

            if (!gradeFound) {
                throw ZoeziCustomError(`Grade ${gradeID} does not exist!`);
            }

            return massageResponse(200, { grade: gradeFound })
        }catch(error) {
            return errorHandler(error, `Failed to fetch details of grade: ${gradeID}`)
        }
    }

    async updateGradeDetails(gradeID, gradeDetails) {

    }

    // requires the grade id
    async getSubjects(gradeID) {
        try {
            let gradeWithSubjects = await GradeModel.findOne({ _id: gradeID }).populate('subjects', '-questions');

            if (!gradeWithSubjects) {
                throw ZoeziCustomError(`Grade ${gradeID} does not exist!`);
            }

            return massageResponse(200, { gradeWithSubjects });
        } catch(error) {
            return errorHandler(error, `Failed to fetch subjects of grade: ${gradeID}`)
        }
    }

    async getFullSubjectDetails(subjectID) {
        try {
            let subjectDetails = await SubjectModel.findOne({ _id: subjectID });

            if (!subjectDetails) {
                throw ZoeziCustomError(`Subject ${subjectID} does not exist!`);
            }

            return massageResponse(200, { subjectDetails });
        } catch(error) {
            return errorHandler(error, `Failed to fetch full details of the subject: ${subjectID}`)
        }
    }

    async updateSubjectDetails(subjectID, subjectDetails) {

    }

    // managing other authors
    async getAllAuthors() {

    }

    async getAuthorDetails(authorID) {

    }

    // creating an author u require his/her email
    // pass the rights later in this method
    async createAuthor(email, rights = []) {

    }

    // used for all the other operations revoking an author etc
    async updateAuthorDetails(authorID, authorDetails) {

    }
}

module.exports = new AdminService();