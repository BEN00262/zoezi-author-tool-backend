const mongoose = require('mongoose');

let subjectSchema = new mongoose.Schema({
	subject:{
		type:String,
		required:true
	},
	// avatarPath: {
	// 	url: {
	// 		type: String,
	// 		required: true
	// 	},
	// 	publicID: {
	// 		type: String,
	// 		required: true
	// 	}
	// },
	isVisible: {
		type: Boolean,
		default: true
	},
	questions:[{type:mongoose.Types.ObjectId,ref:'ques'}],
	grade:{type:mongoose.Types.ObjectId,ref:'grades'}
});

module.exports = mongoose.model('subject',subjectSchema);

