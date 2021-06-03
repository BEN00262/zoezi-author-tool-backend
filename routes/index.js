const express = require("express");

const { ContentService, ContentUploadService } = require('../services');
const { ensureAuthenticated, hasActiveSubscription } = require("../middlewares");
const { multerUploader } = require('../utils');

const router = express.Router();

router.use(ensureAuthenticated);

router.post('/import-excel-paper',[multerUploader.single('excelFile')],(req,res) => {
    const { grade } = req.body;

    if (!hasActiveSubscription(grade,req.user.subscriptions)){
        return res.json({
            success: false,
            error: `You do not have an active subscription to grade: ${grade}`
        })
    }

    ContentUploadService.uploadFile(req.user, grade, req.file).then(response => res.json(response))
})

router.get('/search/:paperID/:searchTerm',(req,res) => {
    const { paperID, searchTerm } = req.params;

    ContentService.searchQuestion(paperID, searchTerm).then(results => res.json(results))
})

router.post("/create-paper",(req,res) => {
    const { grade } = req.body;

    if (!hasActiveSubscription(grade,req.user.subscriptions)){
        return res.json({
            success: false,
            errors: [`You do not have an active subscription to grade: ${grade}`]
        })
    }

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



router.get("/paper-questions/:uid/:page_num?",(req,res) => {
    const { uid, page_num } = req.params;
    ContentService.getQuestions(uid, +page_num || 0).then(questions => res.json(questions));
})

router.post("/create-question",(req,res) => {
    const canReview = req.user.roles.includes("can:review");
    ContentService.createQuestion(req.body,canReview).then(question => res.json(question));
})

router.delete("/remove-question/:uid",(req,res) => {
    ContentService.removeQuestion(req.params.uid).then(removedQuestion => res.json(removedQuestion));
})

module.exports = router;