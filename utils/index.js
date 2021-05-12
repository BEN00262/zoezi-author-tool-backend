const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

const marshalIDTypes = id => mongoose.Types.ObjectId(id);

let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, "./uploads/"));
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + "-" + Date.now());
	}
});

module.exports = {
    marshalIDTypes,
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
    })
}