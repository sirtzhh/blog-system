// 从环境变量读取博客配置
function getBlogConfig() {
    return {
        blogName: process.env.BLOG_NAME || '我的博客',
        blogSubtitle: process.env.BLOG_SUBTITLE || '分享知识与思考',
        blogLogo: process.env.BLOG_LOGO || 'fas fa-feather-alt',
        blogFooter: process.env.BLOG_FOOTER || '分享有价值的思想'
    };
}

// 中间件：注入配置到模板
function injectBlogConfig(req, res, next) {
    res.locals.blogConfig = getBlogConfig();
    next();
}

// API：获取配置
function getConfigApi(req, res) {
    res.json({ success: true, data: getBlogConfig() });
}

module.exports = { getBlogConfig, injectBlogConfig, getConfigApi };