const express = require("express");

const { ContentService, ContentUploadService } = require('../services');
const { EnsureIsAuthenticated } = require("../middlewares");
const { multerUploader, hasActiveSubscription } = require('../utils');
const SpecialContentService = require("../services/SpecialContentService");

const router = express.Router();

router.use(EnsureIsAuthenticated);

router.post('/import-excel-paper',[multerUploader.single('excelFile')],(req,res) => {
    const { grade } = req.body;

    // if (!hasActiveSubscription(grade,req.user.subscriptions)){
    //     return res.json({
    //         success: false,
    //         error: `You do not have an active subscription to grade: ${grade}`
    //     })
    // }

    ContentUploadService.uploadFile(req.user, grade, req.file).then(response => res.json(response))
})

// set question as sample --> only the person who owns the question or a reviewer
router.post('/set-sample/:_id',(req,res) => {
    const { isSample } = req.body;
    ContentService.setIsSample(req.params._id, isSample)
        .then(response => res.json(response))
})

// use query strings
router.get('/search/:paperID/:not_relevant',(req,res) => {
    const { searchTerm, searchCategory } = req.query;

    const searchDic = {}

    switch(searchCategory){
        case "isSample":
            searchDic.isSample = true
    }

    const { paperID } = req.params;

    ContentService.searchQuestion(paperID, searchTerm, searchDic).then(results => res.json(results))
})

router.post("/create-paper",(req,res) => {
    const { grade } = req.body;

    // if (!hasActiveSubscription(grade,req.user.subscriptions)){
    //     return res.json({
    //         success: false,
    //         errors: [`You do not have an active subscription to grade: ${grade}`]
    //     })
    // }

    ContentService.createPaper(req.body,req.user._id).then(createdPaper => res.json(createdPaper));
})

router.delete("/remove-paper/:paperID",(req,res) => {
    ContentService.removePaper(req.params.paperID).then(response => res.json(response))
})

router.get("/papers",(req,res) => {
    ContentService.getPapers(req.user._id).then(papers => res.json(papers));
})

router.post("/submit-paper",(req,res) => {
    const { clientID,paperID } = req.body;
    ContentService.submitPaper(clientID,paperID).then(submittedPaper => res.json(submittedPaper));
})

router.get('/approve-question/:id',(req,res) => {
    ContentService.approveQuestion(req.params.id).then(approved_question => res.json(approved_question));
})

router.get("/paper-questions/:uid/:is_special/:page_num?",(req,res) => {
    let { uid, is_special, page_num } = req.params;
    is_special = is_special === "true"
    ContentService.getQuestions(uid, is_special, +page_num || 0).then(questions => res.json(questions));
})

router.post("/create-question/:is_special",(req,res) => {
    const canReview = req.user.roles.includes("can:review");
    // check if the paper is special
    const is_special = req.params.is_special == "true" ? true : false;
    ContentService.createQuestion(req.body,canReview, is_special).then(question => res.json(question));
})

router.delete("/remove-question/:uid",(req,res) => {
    ContentService.removeQuestion(req.params.uid).then(removedQuestion => res.json(removedQuestion));
})

// special paper routes
router.post("/special-paper", (req, res) => {
    const {rootID, ...paperDescritpion} = req.body
    SpecialContentService.createPaperPathIfNotExists(rootID, paperDescritpion).then(({status_code, response}) => {
        
        console.log(response)
        res.status(status_code).json(response)
    })
})

// we count then do the necessary fetching from this side 
// this is a stupid way btw
router.get("/special-paper/:rootID/:secondLevel?/:thirdLevel?", (req, res) => {
    // pass down we only take 
    SpecialContentService.fetchFileOrFolder(req.params).then(({status_code, response}) => {
        res.status(status_code).json(response)
    })
})

module.exports = router;
