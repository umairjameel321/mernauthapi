const {validationResult} = require('express-validator');

// it will have errors if auth.js validator will return errors.
exports.runValidation = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).json({
            error: errors.array()[0].msg
        })
    }
    next();
}