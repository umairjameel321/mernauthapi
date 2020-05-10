const User = require('../models/user');
const jwt = require('jsonwebtoken');
const expressJWT = require('express-jwt');
const _ = require('lodash');
const {OAuth2Client} = require('google-auth-library');
const fetch = require('node-fetch');
// mailgun
const mailgun = require('mailgun-js');
const DOMAIN = 'sandboxf26a5c38b52e4da68cd059e6c4d2daba.mailgun.org';
const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: DOMAIN});

// Create user wihtout email account activation
// exports.signup = (req, res) => {
//     const {name, email, password} = req.body;
//     User.findOne({email}).exec((err, user) => {
//         if(user) {
//             return res.status(400).json({error: "Email is already taken"});
//         }
//     });
//     let newUser = new User({name, email, password});
//     newUser.save((err, success) => {
//         if(err) {
//             console.log("SIGN UP ERROR: ", err);
//             return res.status(400), json({error: err})
//         }
//         res.json({
//             message: "Signup success! Please signin"
//         })
//     })
// }

/**
 * Sign up user by sending verificaiton email to user's email id
 */
exports.signup = (req, res) => {
    const {name, email, password} = req.body;
    User.findOne({email}).exec((err, user) => {
        if(user) {
            return res.status(400).json({error: "Email is already taken"});
        }

        const token = jwt.sign({name, email, password}, process.env.JWT_ACCOUNT_ACTIVATION, {expiresIn: '10m'});
        const data = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Account Activation Link',
            html: `
                <h1>Please use the following link to activate your account</h1>
                <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
                <hr/>
                <p> This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `
        };

        mg.messages().send(data, function (error, body) {
            console.log(body);
            if(error) {
                return res.json({
                    message: err.message
                })
            }
            return res.json({
                message: `Email has been sent to ${email}. Follow the instructions to activate your account.`
            })
        });
    });
}

/** 
 * This function will be called with activation link from frontend app will be clicked
 */
exports.accountActivation = (req, res) => {
    const {token} = req.body;
    if(token) {
        jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decodedToken) {
            if(err) {
                return res.status(401).json({
                    error: "Incorrect or Expired link. Try again"
                })
            }
            const {name, email, password} = decodedToken;
            User.findOne({email}).exec((err, user) => {
                if(user) {
                    return res.status(400).json({error: "User with this email already activated"});
                }         
                let newUser = new User({name, email, password});
                newUser.save((err, success) => {
                    if(err) {
                        console.log("Save user account activation error: ", err);
                        return res.status(401).json({error: 'Error activating your account, please try again.'})
                    }
                    return res.json({
                        message: "Signup success! Please signin"
                    })
                })
            });
        })
    } else {
        return res.json({
            message: "Something went wrong, Try again"
        })
    }
}

/** 
 * SignIn user
 */
exports.signin = (req, res) => {
    const {email, password} = req.body
    User.findOne({email}).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                error: "User with that email does not exist. Please signup"
            })
        }
        // authenticate
        if(!user.authenticate(password)) {
            return res.status(400).json({
                error: "Email or password incorrect"
            })
        }
        // generate a token and send to client
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
        const {_id, name, email, role} = user
        res.json({
            token,
            user: {_id, name, email, role}
        })
    })
}

exports.requireSignin = expressJWT({
    secret: process.env.JWT_SECRET // data will be available in req.user
})

exports.adminMiddleware = (req, res, next) => {
    User.findById(req.user._id).exec((error, user) => {
        if (error || !user) {
            return res.status(400).json({
                error: "User not found"
            })
        }

        if(user.role !== 'admin') {
            return res.status(400).json({
                error: "Admin resource access denied"
            })
        }

        req.profile = user;
        next();
    })
}

exports.forgotPassword = (req, res) => {
    const {email} = req.body;

    User.findOne({email}, (err, user) => {
        if(err || !user) {
            return res.status(400).json({
                error: 'User with that email does not exist'
            })
        }
        const token = jwt.sign({_id: user._id, name: user.name}, process.env.JWT_RESET_PASSWORD, {expiresIn: '10m'});
        const data = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Password reset link',
            html: `
                <h1>Please use the following link to reset your password.</h1>
                <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
                <hr/>
                <p> This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `
        };

        return user.updateOne({resetPasswordLink: token}, (err, success) => {
            if(err) {
                console.log("reset password link error", err)
                return res.status(400).json({
                    error: 'Database connection error on user password forgot request'
                })
            } else {
                mg.messages().send(data, function (error, body) {
                    console.log(body);
                    if(error) {
                        return res.json({
                            error: err.message
                        })
                    }
                    return res.json({
                        message: `Email has been sent to ${email}. Follow the instructions to reset your password.`
                    })
                });
            }
        })

       
    })
    
}

exports.resetPassword = (req, res) => {
    const {resetPasswordLink, newPassword} = req.body;
    if(resetPasswordLink) {
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(err, decodedToken) {
            if(err) {
                return res.status(401).json({
                    error: "Incorrect or Expired link. Try again"
                })
            }

            User.findOne({resetPasswordLink}, (err, user) => {
                if(err || !user) {
                    return res.status(400).json({
                        error: 'Something went wrong, Try again'
                    })
                }
                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ''
                }

                user = _.extend(user, updatedFields);
                user.save((err, result) => {
                    if(err) {
                        return res.status(400).json({
                            error: "Error, resetting user password."
                        })
                    }
                    res.status(200).json({
                        message: "Great! now you can login with your new password."
                    })

                });
            })
        });
    } else {
        res.status(401).json({
            error: "Authentication error..."
        })
    }
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
    const {idToken} = req.body;

    client.verifyIdToken({idToken, audience: process.env.GOOGLE_CLIENT_ID}).then(response => {
        console.log(response);
        const {email_verified, name, email} = response.payload;
        if(email_verified) {
            User.findOne({email}).exec((err, user) => {
                if(err) {
                    return res.status(400).json({
                        error: "Something went wrong. Try again"
                    })
                } else {
                    if(user) {
                        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
                        const {_id, name, email, role} = user
                        return res.json({
                            token,
                            user: {_id, name, email, role}
                        })
                    } else {
                        let password = email+process.env.JWT_SECRET;
                        let newUser = new User({name, email, password});
                        newUser.save((err, data) => {
                            if(err) {
                                console.log("Save user google login error: ", err);
                                return res.status(401).json({error: 'Error in saving new user account while login with google, please try again.'})
                            }
                            const token = jwt.sign({_id: data._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
                            const {_id, name, email, role} = data
                            return res.json({
                                token,
                                user: {_id, name, email, role}
                            })
                        })
                    }
                }
                
            })
        } else {
            res.status(401).json({
                error: "Google Login Failed."
            })
        }
        
    })

}

exports.facebookLogin = (req, res) => {
    const {userID, accessToken} = req.body;
    const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;
 
        fetch(url, {
            method: 'GET'
        })
        .then(response => response.json())
        .then(response => {
            console.log("YAAAA", response);
            const {email, name} = response
            User.findOne({email}).exec((err, user) => {
                if(err) {
                    return res.status(400).json({
                        error: "Something went wrong. Try again"
                    })
                } else {
                    if(user) {
                        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
                        const {_id, name, email, role} = user
                        return res.json({
                            token,
                            user: {_id, name, email, role}
                        })
                    } else {
                        let password = email+process.env.JWT_SECRET;
                        let newUser = new User({name, email, password});
                        newUser.save((err, data) => {
                            if(err) {
                                console.log("Save user facebook login error: ", err);
                                return res.status(401).json({error: 'Error in saving new user account while login with facebook, please try again.'})
                            }
                            const token = jwt.sign({_id: data._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
                            const {_id, name, email, role} = data
                            return res.json({
                                token,
                                user: {_id, name, email, role}
                            })
                        })
                    }
                }
            })
        }).catch(error => {
            console.log("asldkfjsldkfjslkdfjj")
            return res.json({error: "Yeah! there is an error"})
        })
    

}