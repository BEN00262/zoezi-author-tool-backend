const mongoose = require('mongoose');
// const path = require('path');
const multer = require('multer');
// const { v2: CloudinaryV2 } = require('cloudinary');

const marshalIDTypes = mongoose.Types.ObjectId;

// let storage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, path.join(__dirname, "./uploads/"));
// 	},
// 	filename: (req, file, cb) => {
// 		cb(null, file.fieldname + "-" + Date.now());
// 	}
// });


let storage = multer.memoryStorage();

// CloudinaryV2.config({
//     cloud_name: process.env.CLOUD_NAME,
//     api_key: process.env.API_KEY,
//     api_secret: process.env.API_SECRET,
// });

module.exports = {
    marshalIDTypes,
    // CloudinaryV2,
    multerUploader: multer({ 
        storage,
        // fileFilter: (req,file,cb) => {
        //     if (file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        //         cb(null, true);
        //     } else {
        //         cb(null, false);
        //         return cb(new Error('Only .xlsx file format allowed!'));
        //     }
        // }
    }),
    massageResponse: (status_code, response) => ({status_code, response: { status: true, ...response }})
}