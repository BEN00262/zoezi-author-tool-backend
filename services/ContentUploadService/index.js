const { AuthorModel } = require('../../models');
const _uploadFileFunc = require('./ContentUpload');

// rate limit on this 
const uploadFile = async (authorID,gradeName,file_object) => {
    try {
        let paper_ids = await _uploadFileFunc(gradeName, file_object.path);

        await AuthorModel.findOneAndUpdate({ _id: authorID }, { $push: {
            papers: paper_ids
        }})

        return { success: true }
    }catch(error){
        return {
            success: false,
            error: "Failed to upload file. Try again. If it persists raise an issue with the Admin. Thanks"
        }
    }
}


module.exports = {
    uploadFile
}