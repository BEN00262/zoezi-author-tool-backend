const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question:{
        type: String,
        required: true
    },
    topic:{
        type: String,
        required: true
    },
    subTopic:{
        type: String
    },
    version:{
		type: String,
		default: '0',
		enum:['0','1']
	},
    isExposed:{
        type: Boolean,
        default: false
    },
    isExperimental:{
        type: Boolean,
        default: true
    },
    status:{
        type: String,
        enum: ["approved","ongoing","submitted"],
        default:"ongoing"
    },
    questionType:{
        type: String,
        required: true
    },
    options_next:[{
        option:{
            type: String,
            required: true
        },
        isCorrect:{
            type: Boolean,
            default: false
        }
    }],
    additionalInfo:{
        type: String,
    },
    children:[{
        question:{
            type: String
        },
        options:[{
            option:{
                type: String,
                required: true
            },
            isCorrect:{
                type: Boolean,
                default: false
            }
        }],
        additionalInfo:{
            type: String,
        },
    }],
    answer:{
		type:String
	},
    options:{
        type:String,
        required:false
    },
    grade:{
		type:String,
		required:true
	},
	subject:{
		type:String,
		required:true
	},
    subjectID:{type:mongoose.Types.ObjectId,ref:"subject"},
    paper:{ref:'paper',type:mongoose.Types.ObjectId}
})

module.exports = mongoose.model('ques',questionSchema);