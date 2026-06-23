// 博客配置（默认值）
let blogConfig = {
    blogName: 'none-name',
    blogSubtitle: '分享技术与生活',
    blogLogo: 'fas fa-feather-alt',
    blogFooter: '分享有价值的思想'
};

// 加载博客配置
async function loadBlogConfig() {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.success) {
            blogConfig = data.data;
            applyBlogConfig();
        }
    } catch (err) {
        console.error('加载博客配置失败:', err);
        // 使用默认配置
        applyBlogConfig();
    }
}

// 应用配置到页面
// 应用配置到页面
function applyBlogConfig() {
    // 更新页面标题
    document.title = blogConfig.blogName;
    
    // 更新 logo 和名称
    document.querySelectorAll('.logo i').forEach(el => {
        el.className = blogConfig.blogLogo;
    });
    document.querySelectorAll('.logo span').forEach(el => {
        el.textContent = blogConfig.blogName;
    });
    
    // 更新页脚 logo 和名称
    const footerLogo = document.querySelector('.footer-logo');
    if (footerLogo) {
        const footerIcon = footerLogo.querySelector('i');
        const footerSpan = footerLogo.querySelector('span');
        if (footerIcon) footerIcon.className = blogConfig.blogLogo;
        if (footerSpan) footerSpan.textContent = blogConfig.blogName;
    }
    
    // 更新页脚版权信息
    document.querySelectorAll('.footer-bottom p').forEach(el => {
        el.innerHTML = `&copy; ${new Date().getFullYear()} ${blogConfig.blogName} | ${blogConfig.blogFooter}`;
    });
    
    // 更新 footer-info 描述
    const footerDesc = document.querySelector('.footer-info p');
    if (footerDesc) footerDesc.textContent = blogConfig.blogSubtitle;
    
    // 更新 hero 区域（如果有）
    const heroH1 = document.querySelector('.hero-title');
    if (heroH1) {
        heroH1.innerHTML = blogConfig.blogSubtitle || `欢迎来到 ${blogConfig.blogName}`;
    }
    
    const heroBadge = document.querySelector('.hero-badge');
    if (heroBadge) {
        heroBadge.innerHTML = `<i class="${blogConfig.blogLogo}"></i> ${blogConfig.blogName}`;
    }
}

// 页面加载时自动加载配置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBlogConfig);
} else {
    loadBlogConfig();
}