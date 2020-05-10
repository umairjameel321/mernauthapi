const express = require("express");
const router = express.Router();

const {requireSignin, adminMiddleware} = require('../controllers/auth')

// import controller
const { read, update } = require("../controllers/user");

// requireSignin middleware will restrict user to access this route if he is logged in
// From client side, we will have to send Bearer token in header (to access this route while calling it)
// e.g. key=Authorization and value = <token-created-after-signin>
router.get('/user/:id', requireSignin, read);

// We don't need id here as requiresSignin middleware will add user data in req.user object
// From client side, we will have to send Bearer token in header (to access this route while calling it)
// e.g. key=Authorization and value = <token-created-after-signin>
router.put('/user/update', requireSignin, update);

// admin will use this route to update his/her profile
// From client side, we will have to send Bearer token in header (to access this route while calling it)
// e.g. key=Authorization and value = <token-created-after-signin>
router.put('/admin/update', requireSignin, adminMiddleware, update);

module.exports = router;