const express = require('express');
const path = require('path');
require('dotenv').config();

// 路由模块
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const commentRoutes = require('./routes/commentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');

// 配置中间件
const { injectBlogConfig, getConfigApi } = require('./middleware/blogConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 注入博客配置
app.use(injectBlogConfig);

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/user', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// 配置API
app.get('/api/config', getConfigApi);

app.listen(PORT, () => {
    const blogName = process.env.BLOG_NAME || '我的博客';
    console.log('');
    console.log('========================================');
    console.log(`🚀 ${blogName} 已启动！`);
    console.log('========================================');
    console.log(`📖 访问地址：http://localhost:${PORT}`);
    console.log('========================================');
    console.log('');
});