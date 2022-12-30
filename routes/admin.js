const router = require('express').Router();
const { AdminService } = require('../services');
const { EnsureIsAuthenticated } = require('../middlewares')

// router.use([
//     EnsureIsAuthenticated,
//     (req, res, next) => {
//         if (req.user.isAdmin)
//             return next();

//         res.status(403).json({
//             error: "Forbidden Access"
//         })
//     }
// ])

// get all the grades
router.get('/grades', (req, res) => {
    AdminService.getAllGrades().then(({ status_code, response }) => {
        res.status(status_code).json(response);
    })
})

// TODO: write verifiers for the gradeID
router.get('/grade/:gradeID', (req, res) => {
    AdminService.getFullGradeDetails(req.params.gradeID).then(({status_code, response}) => {
        res.status(status_code).json(response);
    })
})

router.get('/subjects/:gradeID', (req, res) => {
    AdminService.getSubjects(req.params.gradeID).then(({ status_code, response }) => {
        res.status(status_code).json(response);
    })
})

router.get('/subject/:subjectID', (req, res) => {
    AdminService.getFullSubjectDetails(req.params.subjectID).then(({ status_code, response }) => {
        res.status(status_code).json(response);
    })
})


module.exports = router;