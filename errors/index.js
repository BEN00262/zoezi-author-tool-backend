class ZoeziCustomError extends Error {
    constructor(message){
        super(message);
    }
}


module.exports = {
    ZoeziCustomError,
}