// create all the functionality to create special papers here
// and how are we going to fetch them i dont know buana
const mongoose = require('mongoose')
const { 
    SecondLevelPaperModel, MidTierPaperModel, MultiLevelPaperModel, SpecialPaperModel,
    AuthorModel
} = require('../models')
const { massageResponse } = require('../utils')

class ZoeziSystemError extends Error {
    constructor(msg) {
        super(msg)
    }
}

class SpecialContentService {
    async createRootPaper(name, author_id) {
        try {
            let paper = await MultiLevelPaperModel.create({ name })

            await AuthorModel.findOneAndUpdate({ _id: author_id }, {
                $push: { specialpapers: paper._id }
            })

            return massageResponse(201, { status: true, paper })
        } catch (error) {
            console.log(error)

            return massageResponse(500, {
                status: false,
                error: "Unknown Error!"
            })
        }
    }

    async _createMidLevelTier(name_or_year, secondTierID) {
        let midPaperLevel = await MidTierPaperModel.create({
            name: name_or_year,
            secondTier: secondTierID
        })

        await SecondLevelPaperModel.findOneAndUpdate(
            { _id: secondTierID }, { $push: { midTiers: midPaperLevel._id } }
        )

        // thos works here
        return midPaperLevel
    }

    async _createSpecialPaper({subject, isTimed, duration, parent}) {
        let paperFound = await SpecialPaperModel.create({
            subject,
            isTimed,
            duration,
            parent
        })

        // save it into the midTier reference and we are good hapa
        let saved = await MidTierPaperModel.findOneAndUpdate(
            { _id: parent }, {$push: { papers: paperFound._id }}, { $new: true }
        )
        // we are done here
        console.log("We are here updating stuff")
        console.log(saved)

        return paperFound
    }

    // an array of the paths (count them and then know where to start)
    async fetchFileOrFolder(paths = {}) {
        try {
            let pathsLen = Object.values(paths).filter(x => x).length

            switch(pathsLen) {
                case 1:
                    {
                        let root = await MultiLevelPaperModel
                            .findOne({ _id: mongoose.Types.ObjectId(paths.rootID)})
                            .populate("children");

                        if (!root) {
                            throw new ZoeziSystemError("Failed to fetch files/folders in the given path")
                        }

                        // else we return the gotten files with a sample metadata
                        // we only require the name and the id
                        let folders = []
                        root.children.forEach(child => {
                            folders.push({
                                name: child.name,
                                _id: child._id
                            })
                        })

                        return massageResponse(200, {
                            status: true,
                            files: {
                                // if false then we are dealing with folders
                                areFiles: false,
                                folders
                            }
                        })
                    }
                case 2:
                    {
                        console.log("We are here at the second level")
                        console.log(paths)
                        // this is the root folder just fetch the children and return
                        let secondLevel = await SecondLevelPaperModel
                            .findOne({ _id: mongoose.Types.ObjectId(paths.secondLevel)})
                            .populate("midTiers");

                        if (!secondLevel) {
                            throw new ZoeziSystemError("Failed to fetch files/folders in the given path")
                        }

                        // else we return the gotten files with a sample metadata
                        // we only require the name and the id
                        let folders = []
                        
                        secondLevel.midTiers.forEach(child => {
                            folders.push({
                                name: child.name,
                                _id: child._id
                            })
                        })

                        return massageResponse(200, {
                            status: true,
                            files: {
                                // if false then we are dealing with folders
                                areFiles: false,
                                folders
                            }
                        })
                    }
                case 3:
                    {
                        let midTier = await MidTierPaperModel
                            .findOne({ _id: mongoose.Types.ObjectId(paths.thirdLevel)})
                            .populate("papers");

                        console.log(midTier)

                        if (!midTier) {
                            throw new ZoeziSystemError("Failed to fetch files/folders in the given path")
                        }

                        // else we return the gotten files with a sample metadata
                        // we only require the name and the id
                        let folders = []
                        
                        midTier.papers.forEach(child => {
                            folders.push({
                                subject: child.subject,
                                _id: child._id
                            })
                        })

                        return massageResponse(200, {
                            status: true,
                            files: {
                                // if false then we are dealing with folders
                                // for files on click from the client side does something different
                                // it just sets the id and then the system will fetch the actual paper from the backend

                                areFiles: true,
                                folders
                            }
                        })
                    }
                default:
                    throw new ZoeziSystemError("We dont support beyond level 3 of folders/files currently")
            }


        } catch(error) {
            console.log(error)

            let errorMsg = "Failed to fetch files at the given level"

            if (error instanceof ZoeziSystemError) {
                errorMsg = error.message
            }

            return massageResponse(500, {
                status: false,
                error: errorMsg
            })
        }
    }

    // we need to group all of this methods under one function
    async createPaperPathIfNotExists(rootPaperID, {paperType, name_or_year, subject, isTimed, duration}) {
        // const session = await mongoose.startSession()
        // session.startTransaction()

        try {
            let secondLevel = await SecondLevelPaperModel.findOne({ topLevelPaper: rootPaperID, name: paperType })

            if (!secondLevel) {
                let paper = await SecondLevelPaperModel.create({
                    name: paperType,
                    topLevelPaper: mongoose.Types.ObjectId(rootPaperID)
                })

                await MultiLevelPaperModel.findOneAndUpdate({ _id: rootPaperID }, { $push: { children: paper._id }})

                let midPaperLevel= await this._createMidLevelTier(
                    name_or_year,
                    paper._id
                )

                // we have to push something into something but it aint working buana
                let paperFound = await this._createSpecialPaper({
                    subject,
                    isTimed: isTimed || false,
                    duration: duration || -1,
                    parent: midPaperLevel._id
                })

                // return this paper
                return massageResponse(201, {
                    status: true,
                    paper: paperFound
                })
            }

            // we have the secondLevel check the midtier
            let midLevel = await MidTierPaperModel.findOne({ secondTier: secondLevel._id, name: name_or_year })

            if (!midLevel) {
                // create the midLevel and the paper only
                let midPaperLevel= await this._createMidLevelTier(
                    name_or_year,
                    secondLevel._id
                )

                let paperFound = await this._createSpecialPaper({
                    subject,
                    isTimed: isTimed || false,
                    duration: duration || -1,
                    parent: midPaperLevel._id
                })

                // return this paper
                return massageResponse(201, {
                    status: true,
                    paper: paperFound
                })
            }

            // the mid tier exists check for the paper if it does exist just return it else create it then return it
            let specialPaper = await SpecialPaperModel.findOne({ parent: midLevel._id, subject })

            if (!specialPaper) {
                let paperFound = await this._createSpecialPaper({
                    subject,
                    isTimed: isTimed || false,
                    duration: duration || -1,
                    parent: midLevel._id
                })

                // return this paper
                return massageResponse(201, {
                    status: true,
                    paper: paperFound
                })
            }

            return massageResponse(201, {
                status: true,
                paper: specialPaper
            })

        } catch(error) {
            // await session.abortTransaction()
            console.log(error)

            return massageResponse(500, {
                status: false,
                error: "Failed to create suggested paper"
            })
        }
    }

    async createSubRootPaper(rootPaperID, name) {
        try {
            let paper = await SecondLevelPaperModel.create({
                name,
                topLevelPaper: mongoose.Types.ObjectId(rootPaperID) // assign the parent
            })

            return massageResponse(201, { status: true, paper })

        } catch (error) {
            console.log(error)

            return massageResponse(500, {
                status: false,
                error: "Unknown Error!"
            })
        }
    }

    async createPaperGroup(subRootPaperID, name) {
        try {
            let level = await SecondLevelPaperModel.findOne({ _id: subRootPaperID })

            if (!level) {
                throw new ZoeziSystemError("Not found")
            }

            if (level.isYeared) {
                if (!(/\d{4}/.test(name))) {
                    throw new ZoeziSystemError("Invalid category, required a number")
                }
            }

            let category = await MidTierPaperModel.create({
                name,
                secondTier: mongoose.Types.ObjectId(subRootPaperID)
            })

            return massageResponse(201, { status: true, category })
        } catch (error) {
            console.log(error)
            let errorMsg = "Unknown Error!!"

            if (error instanceof ZoeziSystemError) {
                errorMsg = error.message
            }

            return massageResponse(500, {
                status: false,
                error: errorMsg
            })
        }
    }

    async createPaperUnderCategory(paperCategoryID, body) {
        const { subject, isTimed, duration, priority } = body

        try {

            if (!subject) {
                throw new ZoeziSystemError("Paper missing subject name which is a required field")
            }

            let paper = await SpecialPaperModel.create({
                subject,
                isTimed: isTimed || false,
                duration: duration || -1,
                priority: priority || 0,
                parent: mongoose.Types.ObjectId(paperCategoryID)
            })

            return massageResponse(201, { status: true, paper })
        } catch (error) {
            console.log(error)
            let errorMsg = "Unknown Error!!"

            if (error instanceof ZoeziSystemError) {
                errorMsg = error.message
            }

            return massageResponse(500, {
                status: false,
                error: errorMsg
            })
        }
    }
}

module.exports = new SpecialContentService()