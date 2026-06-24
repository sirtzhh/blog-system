// ========================================
// 全局变量
// ========================================
let token = localStorage.getItem('token');
let currentUser = null;

// ========================================
// 检查登录状态
// ========================================
function checkAuth() {
    if (!token) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// ========================================
// 显示消息
// ========================================
function showMessage(element, message, isSuccess) {
    if (!element) return;
    element.innerHTML = `<div class="message ${isSuccess ? 'success' : 'error'}">${message}</div>`;
    setTimeout(() => {
        if (element) element.innerHTML = '';
    }, 3000);
}

// ========================================
// 字符计数功能
// ========================================
function initBioCounter() {
    const bioTextarea = document.getElementById('bio');
    const bioCountSpan = document.getElementById('bioCount');
    const maxLength = 200;
    
    if (bioTextarea && bioCountSpan) {
        const updateCount = () => {
            const length = bioTextarea.value.length;
            bioCountSpan.textContent = length;
            
            const counterDiv = document.querySelector('.bio-counter');
            if (counterDiv) {
                if (length > maxLength) {
                    counterDiv.classList.add('danger');
                    counterDiv.classList.remove('warning');
                } else if (length > maxLength * 0.8) {
                    counterDiv.classList.add('warning');
                    counterDiv.classList.remove('danger');
                } else {
                    counterDiv.classList.remove('warning', 'danger');
                }
            }
        };
        
        bioTextarea.addEventListener('input', updateCount);
        updateCount();
    }
}

// ========================================
// 加载用户资料
// ========================================
async function loadProfile() {
    if (!checkAuth()) return;
    
    try {
        const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('username').textContent = currentUser.username;
            document.getElementById('email').textContent = currentUser.email;
            document.getElementById('avatar').src = currentUser.avatar || '/uploads/avatars/default.png';
            document.getElementById('bio').value = currentUser.bio || '';
            document.getElementById('createdAt').textContent = new Date(currentUser.created_at).toLocaleDateString('zh-CN');
            
            // 初始化字符计数
            initBioCounter();
            // 加载统计数据
            await loadStats();
        } else {
            if (data.message === '请先登录') {
                localStorage.removeItem('token');
                window.location.href = '/';
            }
        }
    } catch (err) {
        console.error('加载资料失败:', err);
        document.getElementById('username').textContent = '加载失败';
    }
}

// ========================================
// 保存资料
// ========================================
async function saveProfile() {
    const bio = document.getElementById('bio').value;
    const msgDiv = document.getElementById('profileMessage');
    const saveBtn = document.getElementById('saveProfileBtn');
    
    if (bio.length > 200) {
        showMessage(msgDiv, '个人简介不能超过200个字符', false);
        return;
    }
    
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 保存中...';
    
    try {
        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ bio })
        });
        const data = await res.json();
        
        if (data.success) {
            showMessage(msgDiv, '资料更新成功', true);
        } else {
            showMessage(msgDiv, data.message || '保存失败', false);
        }
    } catch (err) {
        console.error('保存资料错误:', err);
        showMessage(msgDiv, '网络错误，请稍后重试', false);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// ========================================
// 上传头像
// ========================================
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const msgDiv = document.getElementById('avatarMessage');
    msgDiv.innerHTML = '<span style="color:#5f43b2">上传中...</span>';
    
    try {
        const res = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        

        
        if (data.success) {
            document.getElementById('avatar').src = data.avatar + '?t=' + Date.now();
            msgDiv.innerHTML = '<span style="color:green">头像更新成功</span>';
            setTimeout(() => { msgDiv.innerHTML = ''; }, 2000);
        } else {
            msgDiv.innerHTML = '<span style="color:red">' + (data.message || '上传失败') + '</span>';
        }
    } catch (err) {
        console.error('上传头像错误:', err);
        msgDiv.innerHTML = '<span style="color:red">网络错误，上传失败</span>';
    }
}

// ========================================
// 加载统计数据
// ========================================
async function loadStats() {
    if (!currentUser) return;
    
    try {
        // 获取用户的所有文章
        const res = await fetch(`/api/posts?userId=${currentUser.id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        
        if (data.success) {
            const posts = data.data || [];
            const postCount = posts.length;
            
            let totalViews = 0;
            let totalComments = 0;
            
            // 遍历文章获取阅读量和评论数
            for (const post of posts) {
                totalViews += post.view_count || 0;
                
                try {
                    const commentRes = await fetch(`/api/comments/post/${post.id}`);
                    const commentData = await commentRes.json();
                    totalComments += commentData.count || 0;
                } catch (err) {
                    console.error('获取评论数失败:', err);
                }
            }
            
            document.getElementById('postCount').textContent = postCount;
            document.getElementById('viewCount').textContent = totalViews;
            document.getElementById('commentCount').textContent = totalComments;
        } else {
            document.getElementById('postCount').textContent = '0';
            document.getElementById('viewCount').textContent = '0';
            document.getElementById('commentCount').textContent = '0';
        }
    } catch (err) {
        console.error('加载统计失败:', err);
        document.getElementById('postCount').textContent = '0';
        document.getElementById('viewCount').textContent = '0';
        document.getElementById('commentCount').textContent = '0';
    }
}

// ========================================
// 退出登录
// ========================================
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// 修改密码
async function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const msgDiv = document.getElementById('passwordMessage');
    
    // 验证
    if (!oldPassword || !newPassword || !confirmPassword) {
        showMessage(msgDiv, '请填写所有密码字段', false);
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage(msgDiv, '新密码至少6个字符', false);
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage(msgDiv, '两次输入的新密码不一致', false);
        return;
    }
    
    const btn = document.getElementById('changePasswordBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 修改中...';
    
    try {
        const res = await fetch('/api/user/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
        });
        const data = await res.json();
        
        if (data.success) {
            showMessage(msgDiv, '✅ ' + data.message, true);
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showMessage(msgDiv, '❌ ' + data.message, false);
        }
    } catch (err) {
        console.error('修改密码错误:', err);
        showMessage(msgDiv, '❌ 网络错误，请稍后重试', false);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ========================================
// 绑定事件
// ========================================
function bindEvents() {
    // 保存资料按钮
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfile);
    }
    
    // 头像上传按钮
    const avatarUploadBtn = document.getElementById('avatarUploadBtn');
    const avatarInput = document.getElementById('avatarInput');
    
    if (avatarUploadBtn && avatarInput) {
    	console.log('zhhzhhzhhzhhzhhzhhzhhzhhzhh')
    	avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 检查文件类型
                if (!file.type.startsWith('image/')) {
                    alert('请选择图片文件');
                    return;
                }
                // 检查文件大小（2MB）
                if (file.size > 2 * 1024 * 1024) {
                    alert('图片大小不能超过2MB');
                    return;
                }
                uploadAvatar(file);
            }
        });
    	console.log('aaaaaaaaaaaaaaaaaaaaaaa')
        avatarUploadBtn.addEventListener('click', () => {
            avatarInput.click();
        });
        console.log('bbbbbbbbbbbbbbbbbb')
     }
    
    // 退出登录
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // 修改密码
	document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
}

// ========================================
// 初始化
// ========================================
async function init() {
    if (!checkAuth()) return;
    await loadProfile();
    bindEvents();
}

// 启动
init();