const { AuthorModel } = require('../../models');
const _uploadFileFunc = require('./ContentUpload');
const { ZoeziCustomError } = require('../../errors');

const DEFAULT_ERROR_MESSAGE = "Failed to upload file. Try again. If it persists raise an issue with the Admin. Thanks";

// rate limit on this 
const uploadFile = async (author,gradeName,file_object) => {
    try {
        const contentCanDo = author.contentCanDo.find(x => x.grade === gradeName);

        if (!contentCanDo){
            throw new ZoeziCustomError(`You don't have the rights to upload to grade: ${gradeName}`)
        }

        let paper_ids = await _uploadFileFunc(contentCanDo.subjects,gradeName, file_object.buffer);

        await AuthorModel.findOneAndUpdate({ _id: author._id }, { $push: {
            papers: paper_ids
        }})

        return { success: true }
    }catch(error){
        // console.log(error); // log this 
        return {
            success: false,
            error: error instanceof ZoeziCustomError ? error.message : DEFAULT_ERROR_MESSAGE
        }
    }
}


module.exports = {
    uploadFile
}