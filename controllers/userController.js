const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const fs = require('fs');

class UserController {
    // 获取当前用户信息
    static async getProfile(req, res) {
        try {
            const user = await UserModel.findById(req.userId);
            res.json({ success: true, user });
        } catch (err) {
            console.error('获取用户信息错误:', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    // 更新用户资料
    static async updateProfile(req, res) {
        const { username, bio } = req.body;
        
        try {
            await UserModel.updateProfile(req.userId, { username, bio });
            const user = await UserModel.findById(req.userId);
            res.json({ success: true, message: '资料更新成功', user });
        } catch (err) {
            console.error('更新资料错误:', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    // 上传头像
    static async uploadAvatar(req, res) {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '请选择图片文件' });
        }
        
        try {
            const avatarUrl = '/uploads/avatars/' + req.file.filename;
            await UserModel.updateAvatar(req.userId, avatarUrl);
            const user = await UserModel.findById(req.userId);
            res.json({ success: true, message: '头像更新成功', avatar: avatarUrl, user });
        } catch (err) {
            console.error('上传头像错误:', err);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
    
    // 修改密码
    static async changePassword(req, res) {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        const userId = req.userId;
        
        // 验证
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: '请填写所有密码字段' 
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: '新密码至少6个字符' 
            });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: '两次输入的新密码不一致' 
            });
        }
        
        try {
            // 获取当前用户信息（包含密码）
            const user = await UserModel.findUserWithPassword(userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: '用户不存在' 
                });
            }
            
            // 验证旧密码
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ 
                    success: false, 
                    message: '原密码错误' 
                });
            }
            
            // 加密新密码
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // 更新密码
            await UserModel.updatePassword(userId, hashedPassword);
            
            res.json({ 
                success: true, 
                message: '密码修改成功' 
            });
        } catch (err) {
            console.error('修改密码错误:', err);
            res.status(500).json({ 
                success: false, 
                message: '服务器错误' 
            });
        }
    }
}

module.exports = UserController;