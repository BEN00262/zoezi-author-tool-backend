// Author model
const mongoose = require('mongoose')
const moment = require('moment')
const ObjectId = mongoose.Schema.Types.ObjectId

// we will just use a small subsection of this
const UserSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: false
  },
  isSuspended:{
    type: Boolean,
    default:false
  },
  email:{
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified:{
    type:Boolean,
    default: true
  },
  roles:[{
    type: String,
    required: true,
    enum: ["can:review","can:write"]
  }],
  contentCanDo:[{
    grade:{
      type: String
    },
    subjects:[{
      type: String
    }]
  }],
  paperTypeCanDo:[{
    type: String,
    required: true
  }],
  papers:[{type:mongoose.Types.ObjectId,ref:"paper"}], // make this change on the actual system later
})

const User = mongoose.model('User', UserSchema)

module.exports = User
