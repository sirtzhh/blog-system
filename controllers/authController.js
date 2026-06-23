const UserModel = require('../models/userModel');
const { generateToken } = require('../middleware/auth');

class AuthController {
    static async register(req, res) {
        const { username, email, password } = req.body;
        if (!username || username.length < 3) {
            return res.status(400).json({ success: false, message: '用户名至少3个字符' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: '邮箱格式错误' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: '密码至少6个字符' });
        }
        try {
            const existingUser = await UserModel.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({ success: false, message: '用户名已存在' });
            }
            const existingEmail = await UserModel.findByEmail(email);
            if (existingEmail) {
                return res.status(400).json({ success: false, message: '邮箱已被注册' });
            }
            const userId = await UserModel.create(username, email, password);
            const user = await UserModel.findById(userId);
            const token = generateToken(user.id, user.username, user.role);
            res.json({ success: true, message: '注册成功', token: token, user: user });
        } catch (err) {
            console.error('注册错误:', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    static async login(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: '请填写邮箱和密码' });
        }
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ success: false, message: '邮箱或密码错误' });
            }
            const isValid = await UserModel.verifyPassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ success: false, message: '邮箱或密码错误' });
            }
            const token = generateToken(user.id, user.username, user.role);
            res.json({ success: true, message: '登录成功', token: token, user: user });
        } catch (err) {
            console.error('登录错误:', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
}

module.exports = AuthController;