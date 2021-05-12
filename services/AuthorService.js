const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const consola = require('consola');

const {AuthorModel, PaperModel} = require('../models');
const { marshalIDTypes } = require('../utils');

// fetch the authors data and group them according to the gradename
// and increment their counter
const analytics = async (author) => {
    // we want to fetch all papers associated with an author
    // populate --> submissions ( 20 ) , not submitted, grade, subject
    // webhooks
    try {
        let author_data = await AuthorModel.findOne({
            _id: marshalIDTypes(author._id)
        }).populate([{
            path: 'papers',
            select: 'grade subject questions'
        }]);

        // we have the papers --> group them per grade and then per subject and then send the data
        return {
            
        }

    }catch(error){
        consola.error(error);
        return []; // no data to show
    }
}

// use yup for ensuring proper rules are enforced
const login = async (email,password,callback) => {
    return AuthorModel.findOne({email})
        .then(found_user => {
            if (!found_user){
                throw new Error("User not Found");
            }

            return bcrypt.compare(password, found_user.password, (err, isMatch) => {
                if (err) throw err;

                if (!isMatch){
                    return callback({
                        success: false,
                        token: null,
                        roles:[],
                        errors:[
                            "Invalid Login Credentials. Confirm with the Adminstrator"
                        ]
                    })
                }

                // the can:write is the base permission for all the authors
                if (!found_user.roles.includes("can:write") && found_user.isSuspended){
                    return callback({
                        success: false,
                        token: null,
                        roles:[],
                        errors:[
                            "Not Authorized to access this page"
                        ]
                    })
                }

                // also place the roles here
                callback({
                    success: true,
                    token: jwt.sign({ 
                            _id: found_user._id
                        },
                        process.env.SECRET_KEY
                    ),
                    roles:found_user.roles,
                    errors: null
                });
            })
        })
        .catch(error => {
            consola.error(error);
            callback({
                success: false,
                token: null,
                roles:[],
                errors:[
                    "Unknown errors in the system"
                ]
            });
        })
}


module.exports = {
    login
}
