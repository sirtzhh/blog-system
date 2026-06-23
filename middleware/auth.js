const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
require('dotenv').config();

function generateToken(userId, username, role) {
    return jwt.sign({ userId: userId, username: username, role: role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function authenticate(req, res, next) {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
    }
    if (!token) {
        return res.status(401).json({ success: false, message: '请先登录' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: '用户不存在' });
        }
        req.user = user;
        req.userId = user.id;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: '登录已过期' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    next();
}

module.exports = { generateToken: generateToken, authenticate: authenticate, requireAdmin: requireAdmin };