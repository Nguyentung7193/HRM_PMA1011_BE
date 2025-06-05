const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/auth/User');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, fcmToken } = req.body;  // lấy thêm fcmToken

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email không tồn tại' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Mật khẩu không đúng' });

    // Nếu client gửi fcmToken, lưu vào DB
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );

    res.json({ accessToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Đăng ký user mới
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    await newUser.save();
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Đăng ký thành công',
      accessToken: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
// // lưu FCM token
// router.post('/save-token', authenticate, async (req, res) => {
//   const userId = req.user.id; // giả sử userId lấy từ middleware authenticate
//   const { fcmToken } = req.body;

//   if (!fcmToken) {
//     return res.status(400).json({ message: 'fcmToken là bắt buộc' });
//   }

//   try {
//     await User.findByIdAndUpdate(userId, { fcmToken });
//     return res.json({ message: 'FCM token đã được lưu' });
//   } catch (error) {
//     console.error('Lỗi lưu token FCM:', error);
//     return res.status(500).json({ message: 'Lỗi server' });
//   }
// });


module.exports = router;
