const express = require('express');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const envPath = path.join(__dirname, '../.env');

// ========================================
// 用户管理
// ========================================

// 获取所有用户
router.get('/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, avatar, role, created_at FROM users ORDER BY id'
        );
        res.json({ success: true, data: users });
    } catch (err) {
        console.error('获取用户列表失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 更新用户角色（设为管理员/普通用户）
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: '无效的角色类型' });
    }
    
    try {
        await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        res.json({ success: true, message: '用户角色更新成功' });
    } catch (err) {
        console.error('更新用户角色失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除用户
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
    const userId = req.params.id;
    
    try {
        // 检查是否是管理员自己
        if (parseInt(userId) === req.userId) {
            return res.status(400).json({ success: false, message: '不能删除自己的账号' });
        }
        
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ success: true, message: '用户删除成功' });
    } catch (err) {
        console.error('删除用户失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 重置用户密码（管理员）
router.put('/users/:id/password', authenticate, requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const { password } = req.body;
    const bcrypt = require('bcryptjs');
    
    try {
        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        res.json({ success: true, message: '密码重置成功' });
    } catch (err) {
        console.error('重置密码失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ========================================
// 分类管理
// ========================================

// 获取所有分类
router.get('/categories', authenticate, requireAdmin, async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY id');
        res.json({ success: true, data: categories });
    } catch (err) {
        console.error('获取分类列表失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 新增分类
router.post('/categories', authenticate, requireAdmin, async (req, res) => {
    const { name, slug } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }
    
    try {
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
        const [result] = await db.execute(
            'INSERT INTO categories (name, slug, created_at) VALUES (?, ?, ?)',
            [name.trim(), finalSlug, new Date()]
        );
        res.json({ success: true, message: '分类添加成功', id: result.insertId });
    } catch (err) {
        console.error('添加分类失败:', err);
        res.status(500).json({ success: false, message: '分类已存在或服务器错误' });
    }
});

// 更新分类
router.put('/categories/:id', authenticate, requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { name, slug } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }
    
    try {
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
        await db.execute(
            'UPDATE categories SET name = ?, slug = ? WHERE id = ?',
            [name.trim(), finalSlug, id]
        );
        res.json({ success: true, message: '分类更新成功' });
    } catch (err) {
        console.error('更新分类失败:', err);
        res.status(500).json({ success: false, message: '分类已存在或服务器错误' });
    }
});

// 删除分类
router.delete('/categories/:id', authenticate, requireAdmin, async (req, res) => {
    const id = req.params.id;
    
    try {
        // 检查是否有文章使用该分类
        const [posts] = await db.query('SELECT COUNT(*) as count FROM posts WHERE category_id = ?', [id]);
        if (posts[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `该分类下有 ${posts[0].count} 篇文章，无法删除` 
            });
        }
        
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ success: true, message: '分类删除成功' });
    } catch (err) {
        console.error('删除分类失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ========================================
// 博客配置管理
// ========================================

// 获取博客配置
router.get('/config', authenticate, requireAdmin, (req, res) => {
    const config = {
        BLOG_NAME: process.env.BLOG_NAME || '我的博客',
        BLOG_SUBTITLE: process.env.BLOG_SUBTITLE || '分享知识与思考',
        BLOG_LOGO: process.env.BLOG_LOGO || 'fas fa-feather-alt',
        BLOG_FOOTER: process.env.BLOG_FOOTER || '分享有价值的思想'
    };
    res.json({ success: true, data: config });
});

// 更新博客配置
router.put('/config', authenticate, requireAdmin, async (req, res) => {
    const { BLOG_NAME, BLOG_SUBTITLE, BLOG_LOGO, BLOG_FOOTER } = req.body;
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        const updates = { BLOG_NAME, BLOG_SUBTITLE, BLOG_LOGO, BLOG_FOOTER };
        
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && value !== '') {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                const newLine = `${key}=${value}`;
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, newLine);
                } else {
                    envContent += `\n${newLine}`;
                }
            }
        }
        
        fs.writeFileSync(envPath, envContent);
        
        res.json({ success: true, message: '配置已保存，请重启服务器生效' });
    } catch (err) {
        console.error('更新配置失败:', err);
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

module.exports = router;