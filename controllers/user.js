const User = require('../models/user');

// Read user profile (if logged in)
exports.read = (req, res) => {
    const userId = req.params.id;
    User.findById(userId).exec((error, user) => {
        if(error || !user) {
            return res.status(400).json({
                error: 'User not found'
            })
        }
        user.salt = undefined;
        user.hashed_password = undefined;
        res.json(user);

    })
}

// Update user profile (if logged in)
exports.update = (req, res) => {
    // req.user will have user data because of requiresSignin middleware in route
   console.log("req.user: ", req.user, "req.body: ", req.body);

   const {name, password} = req.body;

   User.findOne({_id: req.user._id}, (error, user) => {
        if(error || !user) {
            return res.status(400).json({
                error: 'User not found'
            })
        }
        if(!name) {
            return res.status(400).json({
                error: 'Name is required'
            })
        } else {
            user.name = name;
        }
        if(password) {
            if(password.length < 6) {
                return res.status(400).json({
                    error: 'Password should be min 6 characters long'
                })
            } else {
                user.password = password;
            }
        } 

        user.save((error, updatedUser) => {
            if(error) {
                return res.status(400).json({
                    error: 'User not updated'
                })
            }
            updatedUser.salt = undefined;
            updatedUser.hashed_password = undefined;
            res.status(200).json(updatedUser)
        })
   })
}