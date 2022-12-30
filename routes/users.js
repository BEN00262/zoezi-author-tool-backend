const express = require("express");
const { AuthorService } = require('../services');
const { EnsureIsAuthenticated } = require('../middlewares/auth');

const router = express();

// we also need a status thingy
router.post("/login",(req,res) => {
    const {email,password} = req.body;

    AuthorService.login(email,password,(response) => {
        res.json(response)
    });
})

router.get('/metadata',EnsureIsAuthenticated,(req,res) => {
    // fetch this data from the req object
    res.status(200).json({
        contentCanDo: req.user.contentCanDo,
        paperTypeCanDo: req.user.paperTypeCanDo
    });
})


module.exports = router;