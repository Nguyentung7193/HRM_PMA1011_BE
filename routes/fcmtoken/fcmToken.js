
const express = require('express');
const router = express.Router();
const FcmToken = require('../models/FcmToken');
const authenticate = require('../../middleware/authenticate');

router.post('/register', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    let existing = await FcmToken.findOne({ token });
    if (existing) {
      if (!existing.userId.equals(userId)) {
        existing.userId = userId;
        await existing.save();
      }
      return res.json({ message: 'Token updated' });
    }
    const newToken = new FcmToken({ userId, token });
    await newToken.save();

    res.json({ message: 'Token registered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
