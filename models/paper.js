const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema({
    isSubmitted:{
        type: Boolean,
        default: false
    },
    submissionDate:{
        type:String
    },
    grade:{
        type: String,
        required: true
    },
    subject:{
        type: String,
        required: true
    },
    paperType:{
        type: String,
        required: true
    },
    paperName:{
        type: String,
        required: true
    },
    createdAt:{
        type:String,
        default: (new Date()).toLocaleDateString()
    },
    questions:[{type:mongoose.Types.ObjectId,ref:"ques"}]
})

module.exports = mongoose.model('paper',paperSchema);