const express = require('express');
const router = express.Router();
const authController = require('../../controller/auth/auth.controller');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
