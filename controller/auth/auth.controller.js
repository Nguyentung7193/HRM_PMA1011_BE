const User = require('../../models/auth/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            role: role || 'employee' // Default to employee if role not specified
        });

        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};