// ========================================
// 全局变量
// ========================================
let token = localStorage.getItem('token');
let currentUser = null;
let currentPost = null;
let postId = null;
let categories = [];

const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('slug');

let editQuill = null;
let editQuillInitialized = false;

// DOM 元素
const postContainer = document.getElementById('postContainer');
const commentsSection = document.getElementById('commentsSection');
const editModal = document.getElementById('editModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const imageModal = document.getElementById('imageModal');

// 初始化编辑器的富文本
function initEditQuill(content) {
    if (editQuillInitialized && editQuill) {
        if (content) {
            editQuill.root.innerHTML = content;
        } else {
            editQuill.setContents([]);
        }
        return;
    }
    
    editQuill = new Quill('#editEditorContainer', {
        theme: 'snow',
        placeholder: '文章内容...',
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
                    ['clean']
                ],
                handlers: {
                    'image': editImageHandler,
                    'video': editVideoHandler,
                    'archive': editArchiveHandler  // 自定义处理
                }
            }
        }
    });
    
    if (content) {
        editQuill.root.innerHTML = content;
    }
    
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
    
    editQuillInitialized = true;
}

// 编辑器的图片上传
function editImageHandler() {
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
        
        const progressDiv = document.getElementById('editUploadProgress');
        const progressFill = document.getElementById('editUploadProgressFill');
        const statusSpan = document.getElementById('editUploadStatus');
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
                
                const range = editQuill.getSelection();
                const index = range ? range.index : 0;
                editQuill.insertEmbed(index, 'image', data.url);
                
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

// 编辑器的视频上传
function editVideoHandler() {
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
        
        const progressDiv = document.getElementById('editUploadProgress');
        const progressFill = document.getElementById('editUploadProgressFill');
        const statusSpan = document.getElementById('editUploadStatus');
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
                
                const range = editQuill.getSelection();
                const index = range ? range.index : 0;
                const videoHtml = `<video controls style="max-width:100%; max-height:400px;"><source src="${data.url}" type="${file.type}">您的浏览器不支持视频播放</video>`;
                editQuill.clipboard.dangerouslyPasteHTML(index, videoHtml);
                
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
function editArchiveHandler() {
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
    
    if (diff < 60 * 60 * 1000) return '刚刚';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    return date.toLocaleDateString('zh-CN');
}

function showMessage(element, message, isSuccess) {
    if (!element) return;
    element.innerHTML = `<div class="message ${isSuccess ? 'success' : 'error'}">${message}</div>`;
    setTimeout(() => { element.innerHTML = ''; }, 3000);
}

// ========================================
// 更新UI
// ========================================
// 更新UI
function updateUI() {
    const hasToken = !!localStorage.getItem('token');
    const writeLink = document.getElementById('writeLink');
    const profileLink = document.getElementById('profileLink');
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (writeLink) writeLink.style.display = hasToken ? 'inline-flex' : 'none';
    if (loginLink) loginLink.style.display = hasToken ? 'none' : 'inline-flex';
    if (registerLink) registerLink.style.display = hasToken ? 'none' : 'inline-flex';
    if (logoutLink) logoutLink.style.display = hasToken ? 'inline-flex' : 'none';
    
    // 显示用户名或"我的"
    if (profileLink) {
        if (hasToken && currentUser) {
            profileLink.style.display = 'inline-flex';
            profileLink.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
        } else {
            profileLink.style.display = 'none';
        }
    }
}

// ========================================
// 加载数据
// ========================================
// 获取当前用户信息
async function loadCurrentUser() {
    if (!token) return null;
    try {
        const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            updateUI();  // 更新导航栏显示用户名
            return currentUser;
        }
    } catch (err) {
        console.error('获取用户信息失败:', err);
    }
    return null;
}

async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) categories = data.data;
    } catch (err) {
        console.error('加载分类失败:', err);
    }
}

// ========================================
// 文章渲染
// ========================================
// 在 renderPost 函数中添加置顶按钮显示逻辑
function renderPost(post) {
    const isAuthor = currentUser && (currentUser.id === post.user_id);
    const isAdmin = currentUser && currentUser.role === 'admin';
    const canPin = isAdmin;
    
    // 直接使用 HTML 内容（已清理）
    const renderedContent = DOMPurify.sanitize(post.content || '');
    
    const pinnedBadge = post.is_pinned === 1 ? '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> 置顶</span>' : '';
    
    const html = `
        <h1>${pinnedBadge} ${escapeHtml(post.title)}</h1>
        <div class="post-meta">
            <div class="post-author-info">
                <img src="${post.avatar || '/uploads/avatars/default.png'}" alt="${escapeHtml(post.username)}">
                <div>
                    <strong>${escapeHtml(post.username)}</strong>
                    <div class="post-time">${formatDate(post.created_at)}</div>
                </div>
            </div>
            ${(isAuthor || isAdmin) ? `
                <div class="post-actions">
                    <button class="edit-btn" id="openEditBtn"><i class="fas fa-edit"></i> 编辑</button>
                    ${canPin ? `<button class="pin-btn" id="pinPostBtn"><i class="fas fa-thumbtack"></i> ${post.is_pinned === 1 ? '取消置顶' : '置顶'}</button>` : ''}
                    <button class="delete-btn" id="deletePostBtn"><i class="fas fa-trash"></i> 删除</button>
                </div>
            ` : ''}
        </div>
        ${post.category_name ? `<div class="post-category-tag">${escapeHtml(post.category_name)}</div>` : ''}
        <div class="post-content">${renderedContent}</div>
        <div class="post-stats">
            <span><i class="far fa-eye"></i> ${post.view_count || 0} 阅读</span>
        </div>
    `;
    
    postContainer.innerHTML = html;
    
    document.getElementById('openEditBtn')?.addEventListener('click', openEditModal);
    document.getElementById('deletePostBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('pinPostBtn')?.addEventListener('click', togglePin);
}

// 切换置顶
async function togglePin() {
    if (!currentPost) return;
    
    try {
        const res = await fetch(`/api/posts/${currentPost.id}/pin`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        
        if (data.success) {
            showMessage(document.getElementById('postMessage'), data.message, true);
            // 刷新文章内容
            await loadPost();
        } else {
            showMessage(document.getElementById('postMessage'), data.message, false);
        }
    } catch (err) {
        console.error('切换置顶错误:', err);
        showMessage(document.getElementById('postMessage'), '操作失败', false);
    }
}

async function loadPost() {
    postContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> 加载中...</div>';
    try {
        const res = await fetch(`/api/posts/${slug}`);
        const data = await res.json();
        if (data.success) {
            currentPost = data.data;
            postId = currentPost.id;
            renderPost(currentPost);
            document.title = `${currentPost.title} - 卧狮博客`;
        } else {
            postContainer.innerHTML = '<div class="loading-spinner">文章不存在或已被删除</div>';
        }
    } catch (err) {
        postContainer.innerHTML = '<div class="loading-spinner">加载失败，请刷新重试</div>';
    }
}

// ========================================
// 评论功能
// ========================================
async function loadComments() {
    if (!commentsSection || !postId) return;
    commentsSection.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> 加载评论...</div>';
    
    try {
        const res = await fetch(`/api/comments/post/${postId}`);
        const data = await res.json();
        if (data.success) {
            renderComments(data.data, data.count);
        }
    } catch (err) {
        commentsSection.innerHTML = '<div class="loading-spinner">加载评论失败</div>';
    }
}

function renderComments(comments, count) {
    let html = `<div class="comments-title"><i class="fas fa-comments"></i> 评论 ${count > 0 ? `(${count})` : ''}</div>`;
    
    if (token) {
        html += `
            <div class="comment-form">
                <textarea id="commentContent" rows="3" placeholder="写下你的评论..."></textarea>
                <div class="comment-submit"><button id="submitCommentBtn" class="btn-primary">发表评论</button></div>
                <div id="commentMsg" class="message"></div>
            </div>
        `;
    } else {
        html += `<div class="login-to-comment"><i class="fas fa-lock"></i> <a href="javascript:void(0)" id="loginToComment">登录</a> 后发表评论</div>`;
    }
    
    if (comments.length === 0) {
        html += `<div class="no-comments">暂无评论，来做第一个评论的人吧！</div>`;
    } else {
        html += `<div class="comments-list">${comments.map(c => renderCommentItem(c)).join('')}</div>`;
    }
    
    commentsSection.innerHTML = html;
    
    document.getElementById('submitCommentBtn')?.addEventListener('click', submitComment);
    document.getElementById('loginToComment')?.addEventListener('click', () => openModal(loginModal));
}

function renderCommentItem(comment) {
    const isAuthor = currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin');
    return `
        <div class="comment-item" id="comment-${comment.id}">
            <div class="comment-header">
                <img src="${comment.avatar || '/uploads/avatars/default.png'}" alt="${escapeHtml(comment.username)}">
                <span class="comment-author">${escapeHtml(comment.username)}</span>
                <span class="comment-time">${formatDate(comment.created_at)}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                ${token ? `<button class="reply-btn" data-id="${comment.id}"><i class="fas fa-reply"></i> 回复</button>` : ''}
                ${isAuthor ? `<button class="delete-comment-btn" data-id="${comment.id}" style="color:#dc2626;"><i class="fas fa-trash"></i> 删除</button>` : ''}
            </div>
            <div id="reply-form-${comment.id}" class="reply-form" style="display:none;">
                <textarea id="replyContent-${comment.id}" rows="2" placeholder="写下你的回复..."></textarea>
                <div class="reply-submit"><button onclick="submitReply(${comment.id})">发送回复</button></div>
            </div>
        </div>
    `;
}

async function submitComment() {
    const content = document.getElementById('commentContent')?.value;
    if (!content?.trim()) {
        showMessage(document.getElementById('commentMsg'), '请输入评论内容', false);
        return;
    }
    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ content: content.trim(), postId: postId })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('commentContent').value = '';
            showMessage(document.getElementById('commentMsg'), '评论发表成功', true);
            loadComments();
        } else {
            showMessage(document.getElementById('commentMsg'), data.message, false);
        }
    } catch (err) {
        showMessage(document.getElementById('commentMsg'), '网络错误', false);
    }
}

window.submitReply = async function(commentId) {
    const content = document.getElementById(`replyContent-${commentId}`)?.value;
    if (!content?.trim()) return;
    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ content: content.trim(), postId: postId, parentId: commentId })
        });
        if (res.ok) {
            document.getElementById(`reply-form-${commentId}`).style.display = 'none';
            loadComments();
        }
    } catch (err) {}
};

// ========================================
// 文章编辑
// ========================================
// 打开编辑模态框
async function openEditModal() {
    if (!currentPost) return;
    
    document.getElementById('editTitle').value = currentPost.title;
    
    const categorySelect = document.getElementById('editCategory');
    if (categorySelect && categories.length) {
        categorySelect.innerHTML = '<option value="">未分类</option>' + 
            categories.map(c => `<option value="${c.id}" ${currentPost.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    }
    document.getElementById('editMessage').innerHTML = '';
    
    // 初始化编辑器并加载内容
    setTimeout(() => {
        initEditQuill(currentPost.content);
    }, 100);
    
    editModal.style.display = 'flex';
}

// 保存编辑
// 保存编辑
async function saveEdit() {
    const title = document.getElementById('editTitle').value;
    const content = editQuill.root.innerHTML;
    const categoryId = document.getElementById('editCategory').value;
    const msgDiv = document.getElementById('editMessage');
    
    if (!title || !content || content === '<p><br></p>') {
        showMessage(msgDiv, '请填写标题和内容', false);
        return;
    }
    
    const cleanContent = DOMPurify.sanitize(content);
    
    const saveBtn = document.getElementById('saveEditBtn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';
    
    try {
        const res = await fetch(`/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                title: title,
                content: cleanContent,
                categoryId: categoryId || null
            })
        });
        const data = await res.json();
        
        if (data.success) {
            showMessage(msgDiv, '保存成功！正在跳转...', true);
            
            // 获取更新后的文章数据（包含新的 slug）
            const updatedPost = data.data;
            const newSlug = updatedPost.slug;
            
            // 延迟1秒后跳转到新的文章详情页
            setTimeout(() => {
                window.location.href = `/post-detail.html?slug=${newSlug}`;
            }, 1000);
        } else {
            showMessage(msgDiv, data.message, false);
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    } catch (err) {
        console.error('保存错误:', err);
        showMessage(msgDiv, '网络错误', false);
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function confirmDelete() {
    if (confirm('确定要删除这篇文章吗？此操作不可恢复！')) deletePost();
}

async function deletePost() {
    try {
        const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (data.success) window.location.href = '/';
        else alert(data.message);
    } catch (err) {
        alert('删除失败');
    }
}

// ========================================
// 编辑器功能
// ========================================
function insertFormat(format) {
    const textarea = document.getElementById('editContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    let result = '', cursor = 0;
    
    const formats = {
        bold: ['**', '**'], italic: ['*', '*'], underline: ['<u>', '</u>'],
        h1: ['\n# ', '\n'], h2: ['\n## ', '\n'], h3: ['\n### ', '\n'],
        ul: ['\n- ', '\n'], ol: ['\n1. ', '\n'], quote: ['\n> ', '\n'],
        code: ['`', '`'], link: ['[', '](https://)'], image: ['![', '](https://)']
    };
    
    if (formats[format]) {
        result = formats[format][0] + (selected || (format === 'link' ? '链接文字' : format === 'image' ? '图片描述' : '内容')) + formats[format][1];
        cursor = result.length;
    }
    
    textarea.value = textarea.value.substring(0, start) + result + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + cursor, start + cursor);
}

async function uploadLocalImage() {
    if (!token) { openModal(loginModal); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('图片不能超过5MB'); return; }
        
        const progressDiv = document.getElementById('editUploadProgress');
        const progressFill = document.getElementById('editUploadProgressFill');
        const statusSpan = document.getElementById('editUploadStatus');
        progressDiv.style.display = 'block';
        progressFill.style.width = '30%';
        statusSpan.textContent = '上传中...';
        
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await fetch('/api/upload/image', {
                method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData
            });
            const data = await res.json();
            if (data.success) {
                progressFill.style.width = '100%';
                statusSpan.textContent = '上传成功！';
                const textarea = document.getElementById('editContent');
                const start = textarea.selectionStart;
                const imgMarkdown = `![图片](${data.url})`;
                textarea.value = textarea.value.substring(0, start) + imgMarkdown + textarea.value.substring(start);
                textarea.focus();
                setTimeout(() => progressDiv.style.display = 'none', 1000);
            } else {
                statusSpan.textContent = '上传失败';
                setTimeout(() => progressDiv.style.display = 'none', 2000);
            }
        } catch (err) {
            statusSpan.textContent = '网络错误';
            setTimeout(() => progressDiv.style.display = 'none', 2000);
        }
    };
    input.click();
}

// ========================================
// 模态框
// ========================================
function openModal(modal) { if (modal) modal.style.display = 'flex'; }
function closeModal(modal) { if (modal) modal.style.display = 'none'; }

// 登录
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msgDiv = document.getElementById('loginMessage');
    
    if (!email || !password) {
        showMessage(msgDiv, '请填写邮箱和密码', false);
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
            
            closeModal(loginModal);
            updateUI();  // 更新UI显示用户名
            location.reload();
        } else {
            showMessage(msgDiv, data.message, false);
        }
    } catch (err) {
        showMessage(msgDiv, '网络错误', false);
    }
}

async function register() {
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const msgDiv = document.getElementById('registerMessage');
    if (!username || !email || !password) { showMessage(msgDiv, '请填写所有字段', false); return; }
    try {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
        const data = await res.json();
        if (data.success) {
            showMessage(msgDiv, '注册成功！请登录', true);
            setTimeout(() => { closeModal(registerModal); openModal(loginModal); }, 1500);
        } else {
            showMessage(msgDiv, data.message, false);
        }
    } catch (err) {
        showMessage(msgDiv, '网络错误', false);
    }
}

function logout() { localStorage.removeItem('token'); window.location.href = '/'; }


// 关闭图片放大模态框
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'none';
}

// 打开图片放大模态框
function openImageModal(imgSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    if (modal && modalImg) {
        modal.style.display = 'flex';
        modalImg.src = imgSrc;
    }
}

// ========================================
// 事件绑定
// ========================================
function bindEvents() {
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(editModal);
            closeModal(loginModal);
            closeModal(registerModal);
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal(editModal);
        if (e.target === loginModal) closeModal(loginModal);
        if (e.target === registerModal) closeModal(registerModal);
        if (e.target === imageModal) imageModal.style.display = 'none';
    });
    
    document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('loginSubmitBtn')?.addEventListener('click', login);
    document.getElementById('registerSubmitBtn')?.addEventListener('click', register);
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(registerModal);
    });
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(registerModal);
        openModal(loginModal);
    });
    document.getElementById('logoutLink')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('writeLink')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = '/'; });
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => insertFormat(btn.dataset.format));
    });
    document.getElementById('editUploadImageBtn')?.addEventListener('click', uploadLocalImage);
    
    document.addEventListener('click', (e) => {
        if (e.target.classList?.contains('reply-btn')) {
            const form = document.getElementById(`reply-form-${e.target.dataset.id}`);
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
        if (e.target.classList?.contains('delete-comment-btn')) deleteComment(e.target.dataset.id);
        if (e.target.tagName === 'IMG' && e.target.closest('.post-content')) {
            openImageModal(e.target.src);
        }
    });
    
    // 点击模态框背景关闭
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('click', function(e) {
            // 如果点击的是模态框本身（背景），关闭
            if (e.target === imageModal) {
                closeImageModal();
            }
        });
    }
}



async function deleteComment(id) {
    if (!confirm('确定删除这条评论吗？')) return;
    try {
        await fetch(`/api/comments/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        loadComments();
    } catch (err) {}
}

// ========================================
// 初始化
// ========================================
// 初始化
async function init() {
    updateUI();
    await loadCurrentUser();  // 获取当前用户信息
    await loadCategories();
    await loadPost();
    await loadComments();
    bindEvents();
}

init();