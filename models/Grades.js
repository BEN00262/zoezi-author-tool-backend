const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
	grade:{
		type:String,
		required:true
	},
	available:{
		type: Boolean,
		default: false
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
	gradeNumeric:{
		type:Number,
		enum:[1,2,3,4,5,6,7,8],
		default:9,
		required:false
	},
	subjects:[{type:mongoose.Types.ObjectId,ref:'subject'}]
})

module.exports = mongoose.model('grades',GradeSchema);