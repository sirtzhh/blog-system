// ========================================
// 全局变量
// ========================================
let token = localStorage.getItem('token');
let currentUser = null;
let currentPage = 1;
let currentLimit = 10;        // 每页显示数量
let currentCategory = 'all';
let currentKeyword = null;    // 新增：搜索关键词
let totalPages = 1;           // 总页数
let totalPosts = 0;           // 总文章数
let categories = [];
let quill = null;
let quillInitialized = false;

// ========================================
// DOM 元素
// ========================================
const postsContainer = document.getElementById('postsContainer');
const paginationDiv = document.getElementById('pagination');
const categoriesScroll = document.querySelector('.categories-scroll');

// 模态框
const postModal = document.getElementById('postModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');


// ========================================
// 注册 Quill 自定义视频格式
// ========================================
const BlockEmbed = Quill.import('blots/block/embed');

class VideoBlot extends BlockEmbed {
    static blotName = 'video';
    static tagName = 'video';

    static create(value) {
        const node = super.create(value);
        node.setAttribute('src', value);
        node.setAttribute('controls', 'true');
        node.setAttribute('width', '100%');
        node.style.maxHeight = '400px';
        return node;
    }

    static value(node) {
        return node.getAttribute('src');
    }
}

Quill.register(VideoBlot);


// 初始化富文本编辑器
function initQuill() {
    if (quillInitialized && quill) {
        quill.setContents([]);
        return;
    }
    
    quill = new Quill('#editorContainer', {
        theme: 'snow',
        placeholder: '写下你的想法...',
        modules: {
            toolbar: {
                container: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['archive'],   // 自定义压缩包按钮
                    ['clean']	// 清除格式
                ],
                handlers: {
                	'image': imageHandler,
                	'video': videoHandler,
                	'archive': archiveHandler // 自定义处理
                }
            }
        }
    });
    
    // 添加提示功能
    setTimeout(() => {
        const tooltips = {
            'ql-bold': '粗体 (Ctrl+B)',
            'ql-italic': '斜体 (Ctrl+I)',
            'ql-underline': '下划线 (Ctrl+U)',
            'ql-strike': '删除线',
            'ql-blockquote': '引用',
            'ql-code-block': '代码块',
            'ql-header': '标题',
            'ql-list': '列表',
            'ql-ordered': '有序列表',
            'ql-bullet': '无序列表',
            'ql-script': '上标下标',
            'ql-indent': '左右缩进',
            'ql-size': '字体大小',
            'ql-color': '字体颜色',
            'ql-background': '背景颜色',
            'ql-align': '对齐方式',
            'ql-link': '插入链接',
            'ql-image': '上传图片',
            'ql-video': '上传视频',
            'ql-clean': '清除格式',
            'ql-archive': '上传压缩包'
        };
        
        document.querySelectorAll('.ql-toolbar button, .ql-toolbar .ql-picker').forEach(el => {
        	 // 分别处理有序列表和无序列表
            if (el.classList.contains('ql-list')) {
                const value = el.getAttribute('value');
                if (value === 'ordered') {
                    el.title = '有序列表 (1, 2, 3)';
                } else if (value === 'bullet') {
                    el.title = '无序列表 (•, •, •)';
                }
                return;
            }
            // 分别处理上标下标
            if (el.classList.contains('ql-script')) {
                const value = el.getAttribute('value');
                if (value === 'sub') {
                    el.title = '下标';
                } else if (value === 'super') {
                    el.title = '上标';
                }
                return;
            }
        	// 分别处理左右缩进
            if (el.classList.contains('ql-indent')) {
                const value = el.getAttribute('value');
                if (value === '-1') {
                    el.title = '左缩进';
                } else if (value === '+1') {
                    el.title = '右缩进';
                }
                return;
            }
            for (const [cls, tip] of Object.entries(tooltips)) {
                if (el.classList.contains(cls)) {
                    el.title = tip;
                    break;
                }
            }
        });
    }, 200);
    
    quillInitialized = true;
}

// 图片上传处理
function imageHandler() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过5MB');
            return;
        }
        
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('uploadProgressFill');
        const statusSpan = document.getElementById('uploadStatus');
        if (progressDiv) progressDiv.style.display = 'block';
        if (progressFill) progressFill.style.width = '30%';
        if (statusSpan) statusSpan.textContent = '上传中...';
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const res = await fetch('/api/upload/image', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                if (progressFill) progressFill.style.width = '100%';
                if (statusSpan) statusSpan.textContent = '上传成功！';
                
                const range = quill.getSelection();
                const index = range ? range.index : 0;
                quill.insertEmbed(index, 'image', data.url);
                
                setTimeout(() => {
                    if (progressDiv) progressDiv.style.display = 'none';
                    if (progressFill) progressFill.style.width = '0%';
                }, 1000);
            } else {
                if (statusSpan) statusSpan.textContent = '上传失败';
                alert(data.message);
            }
        } catch (err) {
            console.error('上传错误:', err);
            if (statusSpan) statusSpan.textContent = '网络错误';
        }
    };
    input.click();
}

// 视频上传处理
function videoHandler() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/webm,video/quicktime';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > 50 * 1024 * 1024) {
            alert('视频大小不能超过50MB');
            return;
        }
        
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('uploadProgressFill');
        const statusSpan = document.getElementById('uploadStatus');
        if (progressDiv) progressDiv.style.display = 'block';
        if (progressFill) progressFill.style.width = '30%';
        if (statusSpan) statusSpan.textContent = '上传中...';
        
        const formData = new FormData();
        formData.append('video', file);
        
        try {
            const res = await fetch('/api/upload/video', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                if (progressFill) progressFill.style.width = '100%';
                if (statusSpan) statusSpan.textContent = '上传成功！';
                
                const range = quill.getSelection();
                const index = range ? range.index : 0;
                const videoHtml = `<video controls style="max-width:100%; max-height:400px;"><source src="${data.url}" type="${file.type}">您的浏览器不支持视频播放</video>`;
                quill.clipboard.dangerouslyPasteHTML(index, videoHtml);
                
                setTimeout(() => {
                    if (progressDiv) progressDiv.style.display = 'none';
                    if (progressFill) progressFill.style.width = '0%';
                }, 1000);
            } else {
                if (statusSpan) statusSpan.textContent = '上传失败';
                alert(data.message);
            }
        } catch (err) {
            console.error('上传错误:', err);
            if (statusSpan) statusSpan.textContent = '网络错误';
        }
    };
    input.click();
}

// 自定义压缩包上传函数
function archiveHandler() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.zip,.rar,.7z,.tar,.gz';
	input.onchange = async() => {
		const file = input.files[0];
		if(!file) return;

		if(file.size > 100 * 1024 * 1024) {
			alert('压缩包大小不能超过100MB');
			return;
		}

		const ext = file.name.split('.').pop().toLowerCase();
		if(!['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
			alert('只支持 zip, rar, 7z, tar, gz 格式');
			return;
		}

		const progressDiv = document.getElementById('uploadProgress');
		const progressFill = document.getElementById('uploadProgressFill');
		const statusSpan = document.getElementById('uploadStatus');
		progressDiv.style.display = 'block';
		progressFill.style.width = '30%';
		statusSpan.textContent = '上传中...';

		const formData = new FormData();
		formData.append('archive', file);

		try {
			const res = await fetch('/api/upload/archive', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem('token')
				},
				body: formData
			});
			const data = await res.json();

			if(data.success) {
				progressFill.style.width = '100%';
				statusSpan.textContent = '上传成功！';

				const range = quill.getSelection();
				const index = range ? range.index : quill.getLength();

				const sizeMB = (file.size / 1024 / 1024).toFixed(2);
				const downloadHtml = `<div style="margin:8px 0;"><a href="${data.url}" download="${file.name}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;background:#f1f5f9;padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;text-decoration:none;color:#334155;">📦 ${file.name} (${sizeMB} MB)</a></div>`;

				quill.clipboard.dangerouslyPasteHTML(index, downloadHtml);
				quill.setSelection(index + 1, 0);

				setTimeout(() => {
					progressDiv.style.display = 'none';
					progressFill.style.width = '0%';
				}, 1000);
			} else {
				statusSpan.textContent = '上传失败：' + data.message;
				alert(data.message);
			}
		} catch(err) {
			console.error('上传错误:', err);
			statusSpan.textContent = '网络错误';
		}
	};
	input.click();
}

// ========================================
// 初始化
async function init() {
    await loadCategories();
    await loadPosts();
    bindEvents();
    
    // 如果已登录，获取用户信息
    if (token) {
        try {
            const res = await fetch('/api/user/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
            }
        } catch (err) {
            console.error('获取用户信息失败:', err);
        }
    }
    updateUI();
}

// 更新UI（根据登录状态）
// 更新UI（根据登录状态）
function updateUI() {
    const hasToken = !!localStorage.getItem('token');
    const writeLink = document.getElementById('writeLink');
    const profileLink = document.getElementById('profileLink');
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    const heroWriteBtn = document.getElementById('heroWriteBtn');
    
    if (writeLink) writeLink.style.display = hasToken ? 'inline-flex' : 'none';
    if (heroWriteBtn) heroWriteBtn.style.display = hasToken ? 'inline-flex' : 'none';
    if (loginLink) loginLink.style.display = hasToken ? 'none' : 'inline-flex';
    if (registerLink) registerLink.style.display = hasToken ? 'none' : 'inline-flex';
    if (logoutLink) logoutLink.style.display = hasToken ? 'inline-flex' : 'none';
    
    // 显示/隐藏"我的"链接，并显示用户名
    if (profileLink) {
        if (hasToken && currentUser) {
            profileLink.style.display = 'inline-flex';
            profileLink.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
        } else {
            profileLink.style.display = 'none';
        }
    }
}

// 绑定事件
function bindEvents() {
    // 写文章按钮
    const writeLink = document.getElementById('writeLink');
    if (writeLink) {
        writeLink.addEventListener('click', (e) => {
            e.preventDefault();
            openPostModal();
        });
    }
    
    // 我的资料按钮 - 直接跳转，不需要 preventDefault
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            if (!localStorage.getItem('token')) {
                e.preventDefault();
                openLoginModal();
            }
            // 如果有 token，正常跳转到 /profile.html
        });
    }
    
    // 英雄区域的写文章按钮
    const heroWriteBtn = document.getElementById('heroWriteBtn');
    if (heroWriteBtn) {
        heroWriteBtn.addEventListener('click', () => openPostModal());
    }
    
    // 登录按钮
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }
    
    // 注册按钮
    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            openRegisterModal();
        });
    }
    
    // 退出按钮
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // 模态框关闭
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            if (postModal) postModal.style.display = 'none';
            if (loginModal) loginModal.style.display = 'none';
            if (registerModal) registerModal.style.display = 'none';
        });
    });
    
    // 点击背景关闭模态框
    window.addEventListener('click', (e) => {
        if (postModal && e.target === postModal) postModal.style.display = 'none';
        if (loginModal && e.target === loginModal) loginModal.style.display = 'none';
        if (registerModal && e.target === registerModal) registerModal.style.display = 'none';
    });
    
    // 登录/注册切换
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginModal) loginModal.style.display = 'none';
            openRegisterModal();
        });
    }
    
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerModal) registerModal.style.display = 'none';
            openLoginModal();
        });
    }
    
    // 登录按钮
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', login);
    
    // 注册按钮
    const registerSubmitBtn = document.getElementById('registerSubmitBtn');
    if (registerSubmitBtn) registerSubmitBtn.addEventListener('click', register);
    
    // 发表文章
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) publishBtn.addEventListener('click', publishPost);
    
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    if (cancelPostBtn) {
        cancelPostBtn.addEventListener('click', () => {
            if (postModal) postModal.style.display = 'none';
        });
    }
    
    // 登录框回车
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
    
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') register();
        });
    }
    
	const searchBtn = document.getElementById('searchBtn');
	if (searchBtn) {
	    searchBtn.addEventListener('click', doSearch);
	}
	
	const searchInput = document.getElementById('searchInput');
	if (searchInput) {
	    searchInput.addEventListener('keypress', (e) => {
	        if (e.key === 'Enter') doSearch();
	    });
	}
	
	const clearSearchBtn = document.getElementById('clearSearchBtn');
	if (clearSearchBtn) {
	    clearSearchBtn.addEventListener('click', clearSearch);
	}
	
	const backToAll = document.getElementById('backToAll');
	if (backToAll) {
	    backToAll.addEventListener('click', (e) => {
	        e.preventDefault();
	        clearSearch();
	    });
	}
}

// ========================================
// 分类相关
// ========================================
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
            categories = data.data;
            renderCategories();
        }
    } catch (err) {
        console.error('加载分类失败:', err);
    }
}

function renderCategories() {
    if (!categoriesScroll) return;
    
    let html = `
        <button class="category-btn active" data-category="all">
            <i class="fas fa-newspaper"></i> 全部文章
        </button>
    `;
    
    categories.forEach(cat => {
        html += `
            <button class="category-btn" data-category="${cat.id}">
                <i class="fas fa-tag"></i> ${cat.name}
            </button>
        `;
    });
    
    categoriesScroll.innerHTML = html;
    
    // 绑定分类点击事件
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            currentPage = 1;
            loadPosts();
        });
    });
}

// ========================================
// 文章相关
// ========================================
// 加载文章列表
async function loadPosts() {
    if (!postsContainer) return;
    
    postsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> 加载中...</div>';
    
    let url = `/api/posts?page=${currentPage}&limit=${currentLimit}`;
    
    if (currentCategory !== 'all') {
        url += `&category=${currentCategory}`;
    }
    
    if (currentKeyword) {
        url += `&keyword=${encodeURIComponent(currentKeyword)}`;
    }
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
            renderPosts(data.data, currentKeyword);
            
            totalPosts = data.total || 0;
            totalPages = Math.ceil(totalPosts / currentLimit);
            
            renderPagination();
            updateSearchInfo();
        } else {
            postsContainer.innerHTML = '<div class="loading-spinner">加载失败，请刷新重试</div>';
        }
    } catch (err) {
        console.error('加载文章失败:', err);
        postsContainer.innerHTML = '<div class="loading-spinner">网络错误，请稍后重试</div>';
    }
}

// 渲染文章列表（支持搜索关键词高亮）
function renderPosts(posts, keyword = null) {
    if (!posts.length) {
        postsContainer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-book-open"></i>
                <p>${keyword ? '没有找到相关文章' : '暂无文章，快来发表第一篇吧！'}</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="posts-grid">
            ${posts.map(post => {
                // 提取第一张图片
                let firstImage = '';
                const content = post.content || '';
                const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
                const pinnedIcon = post.is_pinned === 1 
            ? '<span class="pinned-badge-small"><i class="fas fa-thumbtack"></i> 置顶</span>' 
            : '';
                if (mdMatch) firstImage = mdMatch[1];
                if (!firstImage) {
                    const htmlMatch = content.match(/<img[^>]+src="([^">]+)"/);
                    if (htmlMatch) firstImage = htmlMatch[1];
                }
                
                // 标题高亮
                let title = escapeHtml(post.title);
                if (keyword) {
                    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
                    title = title.replace(regex, '<mark class="highlight">$1</mark>');
                }
                
                // 内容预览
                let textPreview = content
                    .replace(/!\[.*?\]\(.*?\)/g, '')
                    .replace(/<img[^>]+>/g, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                    .replace(/`(.*?)`/g, '$1')
                    .replace(/#{1,6}\s/g, '')
                    .replace(/\n/g, ' ')
                    .trim();
                
                let excerpt = textPreview.length > 150 
                    ? textPreview.substring(0, 150) + '...' 
                    : textPreview;
                
                // 内容预览高亮
                if (keyword && excerpt) {
                    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
                    excerpt = excerpt.replace(regex, '<mark class="highlight">$1</mark>');
                }
                
                return `
                    <article class="post-card">
                        ${firstImage ? `
                            <div class="post-card-image">
                                <a href="/post-detail.html?slug=${post.slug}">
                                    <img src="${firstImage}" alt="${escapeHtml(post.title)}" loading="lazy">
                                </a>
                            </div>
                        ` : ''}
                        <div class="post-card-content">
                            ${post.category_name ? `<span class="post-category">${escapeHtml(post.category_name)}</span>` : ''}
                            <h2 class="post-title">
                                <a href="/post-detail.html?slug=${post.slug}">${title}</a>
                                ${pinnedIcon}
                            </h2>
                            <div class="post-meta">
                                <div class="post-author">
                                    <img src="${post.avatar || '/uploads/avatars/default.png'}" alt="${escapeHtml(post.username)}">
                                    <span>${escapeHtml(post.username)}</span>
                                </div>
                                <span>•</span>
                                <span>${formatDate(post.created_at)}</span>
                            </div>
                            <p class="post-excerpt">${excerpt}</p>
                            <div class="post-stats">
                                <span><i class="far fa-eye"></i> ${post.view_count || 0} 阅读</span>
                            </div>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
    
    postsContainer.innerHTML = html;
}

// 转义正则表达式特殊字符
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 执行搜索
function doSearch() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput.value.trim();
    
    if (keyword) {
        currentKeyword = keyword;
        currentPage = 1;
        currentCategory = 'all';
        
        // 更新分类按钮激活状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const allBtn = document.querySelector('.category-btn[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');
        
        loadPosts();
    } else if (currentKeyword) {
        clearSearch();
    }
}

// 清空搜索
function clearSearch() {
    currentKeyword = null;
    currentPage = 1;
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    loadPosts();
}

// 更新搜索信息显示
function updateSearchInfo() {
    const searchInfo = document.getElementById('searchInfo');
    const searchCount = document.getElementById('searchCount');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (currentKeyword) {
        if (searchInfo) searchInfo.style.display = 'flex';
        if (searchCount) searchCount.textContent = totalPosts;
        if (clearSearchBtn) clearSearchBtn.style.display = 'inline-block';
    } else {
        if (searchInfo) searchInfo.style.display = 'none';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    }
}

// 渲染分页
function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1 && currentPage === 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="pagination-wrapper">
            <div class="pagination-controls">
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(1)">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> 上一页
                </button>
                <span class="pagination-info">第 ${currentPage} / ${totalPages} 页</span>
                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
                    下一页 <i class="fas fa-chevron-right"></i>
                </button>
                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${totalPages})">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
            <div class="pagination-settings">
                <span class="pagination-stats">共 ${totalPosts} 篇文章</span>
                <select id="perPageSelect" class="per-page-select">
                    <option value="5" ${currentLimit === 5 ? 'selected' : ''}>5条/页</option>
                    <option value="10" ${currentLimit === 10 ? 'selected' : ''}>10条/页</option>
                    <option value="20" ${currentLimit === 20 ? 'selected' : ''}>20条/页</option>
                    <option value="50" ${currentLimit === 50 ? 'selected' : ''}>50条/页</option>
                </select>
            </div>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
    
    // 绑定每页条数变化事件
    const perPageSelect = document.getElementById('perPageSelect');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
            currentLimit = parseInt(e.target.value);
            currentPage = 1;
            loadPosts();
        });
    }
}

// 切换页码
window.changePage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========================================
// 认证相关
// ========================================
// 打开写文章模态框
function openPostModal() {
    if (!localStorage.getItem('token')) {
        openLoginModal();
        return;
    }
    
    // 加载分类选项
    const categorySelect = document.getElementById('postCategory');
    if (categorySelect && categories.length) {
        categorySelect.innerHTML = '<option value="">未分类</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
    
    // 清空表单
    document.getElementById('postTitle').value = '';
    document.getElementById('postMessage').innerHTML = '';
    
    // 初始化编辑器
    setTimeout(() => {
        initQuill();
    }, 100);
    
    // 显示模态框
    postModal.style.display = 'flex';
}

function openLoginModal() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginMessage').innerHTML = '';
    loginModal.style.display = 'flex';
}

function openRegisterModal() {
    document.getElementById('regUsername').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('registerMessage').innerHTML = '';
    registerModal.style.display = 'flex';
}

// 登录
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msgDiv = document.getElementById('loginMessage');
    
    if (!email || !password) {
        msgDiv.innerHTML = '<div class="message error">请填写邮箱和密码</div>';
        return;
    }
    
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            token = data.token;
            currentUser = data.user;  // 保存用户信息
            
            loginModal.style.display = 'none';
            updateUI();  // 更新UI会显示用户名
            await loadPosts();
            
            msgDiv.innerHTML = '';
        } else {
            msgDiv.innerHTML = `<div class="message error">${data.message}</div>`;
        }
    } catch (err) {
        msgDiv.innerHTML = '<div class="message error">网络错误</div>';
    }
}

async function register() {
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const msgDiv = document.getElementById('registerMessage');
    
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            msgDiv.innerHTML = '<div class="message success">注册成功！请登录</div>';
            setTimeout(() => {
                registerModal.style.display = 'none';
                openLoginModal();
            }, 1500);
        } else {
            msgDiv.innerHTML = `<div class="message error">${data.message}</div>`;
        }
    } catch (err) {
        msgDiv.innerHTML = '<div class="message error">网络错误，请稍后重试</div>';
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    updateUI();
    if (currentCategory !== 'all') {
        currentCategory = 'all';
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'all');
        });
    }
    loadPosts();
}

// 发布文章
async function publishPost() {
    const title = document.getElementById('postTitle').value;
    const content = quill.root.innerHTML;  // 获取 HTML 内容
    const categoryId = document.getElementById('postCategory').value;
    const msgDiv = document.getElementById('postMessage');
    
    if (!title || !content || content === '<p><br></p>') {
        msgDiv.innerHTML = '<div class="message error">请填写标题和内容</div>';
        return;
    }
    
    // 清理 HTML 防止 XSS
    const cleanContent = DOMPurify.sanitize(content);
    
    const submitBtn = document.getElementById('publishBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 发布中...';
    
    try {
        const res = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ title, content: cleanContent, categoryId: categoryId || null })
        });
        const data = await res.json();
        
        if (data.success) {
            msgDiv.innerHTML = '<div class="message success">发表成功！</div>';
            setTimeout(() => {
                postModal.style.display = 'none';
                loadPosts();
            }, 1500);
        } else {
            msgDiv.innerHTML = `<div class="message error">${data.message}</div>`;
        }
    } catch (err) {
        console.error('发布错误:', err);
        msgDiv.innerHTML = '<div class="message error">网络错误，请稍后重试</div>';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========================================
// 工具函数
// ========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) return '刚刚';
        return `${hours}小时前`;
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}天前`;
    } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
}

// ========================================
// 富文本编辑器功能
// ========================================

// 获取当前选中的文本或光标位置
function getEditorSelection() {
    const textarea = document.getElementById('postContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    return { textarea, start, end, selectedText, beforeText, afterText };
}


// 打开写文章模态框时初始化编辑器
const originalOpenPostModal = window.openPostModal;
window.openPostModal = function() {
    if (originalOpenPostModal) originalOpenPostModal();
    setTimeout(() => initEditor(), 100);
};

// 启动
init();