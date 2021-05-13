const { AuthorModel } = require('../../models');
const _uploadFileFunc = require('./ContentUpload');
const { ZoeziCustomError } = require('../../errors');

const DEFAULT_ERROR_MESSAGE = "Failed to upload file. Try again. If it persists raise an issue with the Admin. Thanks";

// rate limit on this 
const uploadFile = async (authorID,gradeName,file_object) => {
    try {
        let paper_ids = await _uploadFileFunc(gradeName, file_object.buffer);

        await AuthorModel.findOneAndUpdate({ _id: authorID }, { $push: {
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