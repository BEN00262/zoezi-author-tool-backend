const jwt = require("jsonwebtoken");
const userModel = require("../models/author");

module.exports = {
    ensureAuthenticated:async (req,res,next) => {
        const authToken = req.headers["authtoken"];

        if(!authToken){
            console.log(authToken);
            return res.status(403).json({message:"Authorization required"})
        }

       
        try{
            // this is secure
            let decoded =  await jwt.verify(authToken, process.env.SECRET_KEY);

            if(!decoded){
                throw new Error("nothing..."); // we dont give a fuck here though
            }

            let userFound = await userModel.findOne({_id:decoded._id});
            req.user = userFound;
            next();
        }catch(error){
            return res.status(500).json({message:"Unkown error. Contact the admin for more info"})
        }
    }
}