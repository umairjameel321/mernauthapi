const express = require("express");
const router = express.Router();

// import controller
const {signup, accountActivation, signin, facebookLogin, forgotPassword, resetPassword, googleLogin} = require("../controllers/auth");

// import validators
const {userSignupValidator, userSigninValidator, forgotPasswordValidator, resetPasswordValidator} = require('../validators/auth');
const {runValidation} = require('../validators'); // load index.js

router.post('/signup', userSignupValidator, runValidation, signup);
router.post('/account-activation', accountActivation);
router.post('/signin', userSigninValidator, runValidation, signin);

// forgot/reset password routes
router.put('/forgot-password', forgotPasswordValidator, runValidation, forgotPassword)
router.put('/reset-password', resetPasswordValidator, runValidation, resetPassword)

// google/facebook login
router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);

module.exports = router;