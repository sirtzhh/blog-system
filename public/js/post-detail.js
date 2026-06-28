// ========================================
// 全局变量
// ========================================
let token = localStorage.getItem('token');
let currentUser = null;
let currentPost = null;
let postId = null;
let categories = [];
let editQuill = null;
let editQuillInitialized = false;

const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('slug');

// DOM 元素
const postContainer = document.getElementById('postContainer');
const commentsSection = document.getElementById('commentsSection');
const editModal = document.getElementById('editModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const imageModal = document.getElementById('imageModal');

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

function openModal(modal) { if (modal) modal.style.display = 'flex'; }
function closeModal(modal) { if (modal) modal.style.display = 'none'; }

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'none';
}

// ========================================
// 更新 UI
// ========================================
function updateUI() {
    const hasToken = !!localStorage.getItem('token');
    document.getElementById('writeLink').style.display = hasToken ? 'inline-flex' : 'none';
    document.getElementById('profileLink').style.display = hasToken ? 'inline-flex' : 'none';
    document.getElementById('loginLink').style.display = hasToken ? 'none' : 'inline-flex';
    document.getElementById('registerLink').style.display = hasToken ? 'none' : 'inline-flex';
    document.getElementById('logoutLink').style.display = hasToken ? 'inline-flex' : 'none';
}

// ========================================
// 加载数据
// ========================================
async function loadCurrentUser() {
    if (!token) return null;
    try {
        const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            updateUI();
            return currentUser;
        }
    } catch (err) { return null; }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) categories = data.data;
    } catch (err) { console.error('加载分类失败:', err); }
}

// ========================================
// 文章渲染
// ========================================
function renderPost(post) {
    const isAuthor = currentUser && (currentUser.id === post.user_id);
    const isAdmin = currentUser && currentUser.role === 'admin';
    const canPin = isAdmin;

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
// 置顶功能
// ========================================
async function togglePin() {
    if (!currentPost) return;
    try {
        const res = await fetch(`/api/posts/${currentPost.id}/pin`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            showMessage(document.getElementById('editMessage'), data.message, true);
            await loadPost();
        }
    } catch (err) {
        console.error('切换置顶错误:', err);
    }
}

// ========================================
// 删除文章
// ========================================
function confirmDelete() {
    if (confirm('确定要删除这篇文章吗？此操作不可恢复！')) deletePost();
}

async function deletePost() {
    try {
        const res = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) window.location.href = '/';
        else alert(data.message);
    } catch (err) { alert('删除失败'); }
}

// ========================================
// 编辑文章 - Quill 编辑器
// ========================================

// 1. 引入 Quill 的核心模块
const BlockEmbed = Quill.import('blots/block/embed');

// 2. 定义一个“视频格式”类，让它继承自 BlockEmbed
class VideoBlot extends BlockEmbed {
    // 告诉 Quill，这个格式对应的 HTML 标签是 video
    static blotName = 'video';
    static tagName = 'video';

    // 这个方法用于从 DOM 元素创建数据
    static create(value) {
        const node = super.create(value);
        node.setAttribute('src', value);
        node.setAttribute('controls', 'true');
        node.setAttribute('width', '100%');
        node.style.maxHeight = '400px';
        return node;
    }

    // 这个方法用于从数据获取 HTML 值
    static value(node) {
        return node.getAttribute('src');
    }
}

// 3. 将自定义的 VideoBlot 注册到 Quill 中
Quill.register(VideoBlot);


function initEditQuill(content) {
    if (editQuillInitialized && editQuill) {
        if (content) {
            editQuill.root.innerHTML = content;
        } else {
            editQuill.setContents([]);
        }
        return;
    }

    // 压缩包上传
    function editArchiveHandler() {
        if (!localStorage.getItem('token')) {
            openModal(loginModal);
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip,.rar,.7z,.tar,.gz';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            if (file.size > 100 * 1024 * 1024) {
                alert('压缩包大小不能超过100MB');
                return;
            }

            const ext = file.name.split('.').pop().toLowerCase();
            if (!['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                alert('只支持 zip, rar, 7z, tar, gz 格式');
                return;
            }

            const progressDiv = document.getElementById('editUploadProgress');
            const progressFill = document.getElementById('editUploadProgressFill');
            const statusSpan = document.getElementById('editUploadStatus');
            if (progressDiv) {
                progressDiv.style.display = 'block';
                if (progressFill) progressFill.style.width = '30%';
                if (statusSpan) statusSpan.textContent = '上传中...';
            }

            const formData = new FormData();
            formData.append('archive', file);

            try {
                const res = await fetch('/api/upload/archive', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    if (progressFill) progressFill.style.width = '100%';
                    if (statusSpan) statusSpan.textContent = '上传成功！';

                    const range = editQuill.getSelection();
                    const index = range ? range.index : editQuill.getLength();
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    const downloadHtml = `<div style="margin:8px 0;"><a href="${data.url}" download="${file.name}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;background:#f1f5f9;padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;text-decoration:none;color:#334155;">📦 ${file.name} (${sizeMB} MB)</a></div>`;
                    editQuill.clipboard.dangerouslyPasteHTML(index, downloadHtml);
                    editQuill.setSelection(index + 1, 0);

                    setTimeout(() => {
                        if (progressDiv) progressDiv.style.display = 'none';
                        if (progressFill) progressFill.style.width = '0%';
                    }, 2000);
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

    // 图片上传
    function editImageHandler() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/gif,image/webp';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
                alert('图片大小不能超过10MB');
                return;
            }
            const progressDiv = document.getElementById('editUploadProgress');
            const progressFill = document.getElementById('editUploadProgressFill');
            const statusSpan = document.getElementById('editUploadStatus');
            if (progressDiv) {
                progressDiv.style.display = 'block';
                if (progressFill) progressFill.style.width = '30%';
                if (statusSpan) statusSpan.textContent = '上传中...';
            }
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
                    const index = range ? range.index : editQuill.getLength();
                    editQuill.insertEmbed(index, 'image', data.url);
                    setTimeout(() => {
                        if (progressDiv) progressDiv.style.display = 'none';
                        if (progressFill) progressFill.style.width = '0%';
                    }, 2000);
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

    // 视频上传
    function editVideoHandler() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/mp4,video/webm,video/quicktime';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 100 * 1024 * 1024) {
                alert('视频大小不能超过100MB');
                return;
            }
            const progressDiv = document.getElementById('editUploadProgress');
            const progressFill = document.getElementById('editUploadProgressFill');
            const statusSpan = document.getElementById('editUploadStatus');
            if (progressDiv) {
                progressDiv.style.display = 'block';
                if (progressFill) progressFill.style.width = '30%';
                if (statusSpan) statusSpan.textContent = '上传中...';
            }
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
                    const index = range ? range.index : editQuill.getLength();
                    //const videoHtml = `<video controls style="max-width:100%; max-height:400px;"><source src="${data.url}" type="${file.type}">您的浏览器不支持视频播放</video>`;
                    //editQuill.clipboard.dangerouslyPasteHTML(index, videoHtml);
                    editQuill.insertEmbed(index, 'video', data.url);
    				editQuill.setSelection(index + 1, 0);
    				
                    setTimeout(() => {
                        if (progressDiv) progressDiv.style.display = 'none';
                        if (progressFill) progressFill.style.width = '0%';
                    }, 2000);
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
                    ['link', 'image', 'video'],
                    ['clean'],
                    ['archive']
                ],
                handlers: {
                    'image': editImageHandler,
                    'video': editVideoHandler,
                    'archive': editArchiveHandler
                }
            }
        }
    });

    if (content) {
        editQuill.root.innerHTML = content;
    }

    editQuillInitialized = true;
}

// ========================================
// 打开编辑模态框
// ========================================
async function openEditModal() {
    if (!currentPost) return;

    document.getElementById('editTitle').value = currentPost.title;
    document.getElementById('editContent').value = currentPost.content;

    const categorySelect = document.getElementById('editCategory');
    if (categorySelect && categories.length) {
        categorySelect.innerHTML = '<option value="">未分类</option>' +
            categories.map(c => `<option value="${c.id}" ${currentPost.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    }
    document.getElementById('editMessage').innerHTML = '';

    editModal.style.display = 'flex';

    setTimeout(() => {
        initEditQuill(currentPost.content);
    }, 100);
}

// ========================================
// 保存编辑
// ========================================
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
            
            // 如果 slug 变化了，跳转到新的 URL
            if (updatedPost && updatedPost.slug) {
                setTimeout(() => {
                    window.location.href = `/post-detail.html?slug=${updatedPost.slug}`;
                }, 800);
            } else {
                // 如果没返回 slug，直接刷新当前页面
                setTimeout(() => {
                    window.location.reload();
                }, 800);
            }
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

async function deleteComment(id) {
    if (!confirm('确定删除这条评论吗？')) return;
    try {
        await fetch(`/api/comments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        loadComments();
    } catch (err) {}
}

// ========================================
// 登录/注册
// ========================================
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msgDiv = document.getElementById('loginMessage');
    if (!email || !password) { showMessage(msgDiv, '请填写邮箱和密码', false); return; }
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
            currentUser = data.user;
            closeModal(loginModal);
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
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.success) {
            showMessage(msgDiv, '注册成功！请登录', true);
            setTimeout(() => {
                closeModal(registerModal);
                openModal(loginModal);
            }, 1500);
        } else {
            showMessage(msgDiv, data.message, false);
        }
    } catch (err) {
        showMessage(msgDiv, '网络错误', false);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// ========================================
// 事件绑定
// ========================================
function bindEvents() {
    // 模态框关闭
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
        if (e.target === imageModal) closeImageModal();
    });

    // 保存编辑
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
    document.getElementById('writeLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/';
    });

    // 图片点击放大
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && e.target.closest('.post-content')) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            if (modal && modalImg) {
                modal.style.display = 'flex';
                modalImg.src = e.target.src;
            }
        }
    });

    // 评论回复
    document.addEventListener('click', (e) => {
        if (e.target.classList?.contains('reply-btn')) {
            const form = document.getElementById(`reply-form-${e.target.dataset.id}`);
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
        if (e.target.classList?.contains('delete-comment-btn')) {
            deleteComment(e.target.dataset.id);
        }
    });
}

// ========================================
// 初始化
// ========================================
async function init() {
    updateUI();
    await loadCurrentUser();
    await loadCategories();
    await loadPost();
    await loadComments();
    bindEvents();
}

init();