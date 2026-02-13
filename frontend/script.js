// Gemini AI Web App - 前端逻辑

// API 配置 - 根据当前路径自动适配
const APP_BASE = window.location.pathname.startsWith('/app') ? '/app' : '';
const API_BASE = window.location.origin + APP_BASE + '/api';

// 状态管理
const state = {
    isLoggedIn: false,
    currentUser: null,
    token: localStorage.getItem('token') || '',
    apiUrl: '',
    apiKey: '',
    defaultModel: 'gemini-3-pro-preview',
    chatHistory: [],
    imageHistory: [],
    currentConversation: []
};

// DOM 元素
const elements = {
    // Pages
    loginPage: document.getElementById('login-page'),
    appPage: document.getElementById('app-page'),
    
    // Login
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    remember: document.getElementById('remember'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    
    // App
    currentUser: document.getElementById('current-user'),
    logoutBtn: document.getElementById('logout-btn'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    navItems: document.querySelectorAll('.nav-item'),
    contentPages: document.querySelectorAll('.content-page'),
    
    // Chat
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    modelSelect: document.getElementById('model-select'),
    typingIndicator: document.getElementById('typing-indicator'),
    chatAttachment: document.getElementById('chat-attachment'),
    attachmentBtn: document.getElementById('attachment-btn'),
    attachmentsPreview: document.getElementById('attachments-preview'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    
    // Image
    imagePrompt: document.getElementById('image-prompt'),
    styleSelect: document.getElementById('style-select'),
    sizeSelect: document.getElementById('size-select'),
    generateBtn: document.getElementById('generate-btn'),
    imageLoading: document.getElementById('image-loading'),
    imageGrid: document.getElementById('image-grid'),
    exampleBtns: document.querySelectorAll('.example-btn'),
    referenceImage: document.getElementById('reference-image'),
    uploadReferenceBtn: document.getElementById('upload-reference-btn'),
    referencePreviews: document.getElementById('reference-previews'),
    
    // Settings
    apiUrlInput: document.getElementById('api-url'),
    apiKeyInput: document.getElementById('api-key'),
    toggleApiKey: document.getElementById('toggle-api-key'),
    modelDefault: document.getElementById('model-default'),
    testApiBtn: document.getElementById('test-api-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    apiStatus: document.getElementById('api-status'),
    
    // History
    historyTabs: document.querySelectorAll('.history-tab'),
    chatHistoryList: document.getElementById('chat-history'),
    imageHistoryList: document.getElementById('image-history')
};

// 当前附件状态（支持多个文件）
let attachments = [];
let referenceImages = []; // 改为支持多张参考图片

// 文件类型图标映射
const fileIcons = {
    'image': 'fa-image',
    'pdf': 'fa-file-pdf',
    'word': 'fa-file-word',
    'excel': 'fa-file-excel',
    'powerpoint': 'fa-file-powerpoint',
    'text': 'fa-file-alt',
    'code': 'fa-file-code',
    'default': 'fa-file'
};

function getFileType(file) {
    const type = file.type;
    const name = file.name.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'excel';
    if (type.includes('powerpoint') || type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'powerpoint';
    if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) return 'text';
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.java') || name.endsWith('.cpp')) return 'code';
    return 'default';
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadSettings();
    checkLoginStatus();
});

function initApp() {
    // 登录事件
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.registerBtn.addEventListener('click', handleRegister);
    
    // 回车登录
    elements.password.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // 退出登录
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // 侧边栏切换
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    
    // 移动端菜单按钮
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Mobile menu clicked');
            toggleSidebar();
        });
    }
    
    // 侧边栏关闭按钮（移动端）
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }
    
    // 点击遮罩关闭侧边栏
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // 导航 - 重新获取确保最新
    const navItems = document.querySelectorAll('.nav-item');
    console.log('Nav items found:', navItems.length);
    navItems.forEach((item, index) => {
        console.log(`Binding nav item ${index}:`, item.dataset.page);
        item.addEventListener('click', handleNavigation);
    });
    
    // 聊天
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 自动调整输入框高度
    elements.chatInput.addEventListener('input', autoResizeTextarea);
    
    // 聊天附件
    if (elements.attachmentBtn) {
        elements.attachmentBtn.addEventListener('click', () => {
            elements.chatAttachment.click();
        });
    }
    
    if (elements.chatAttachment) {
        elements.chatAttachment.addEventListener('change', handleAttachmentUpload);
    }
    
    if (elements.clearChatBtn) {
        elements.clearChatBtn.addEventListener('click', clearChatHistory);
    }
    
    // 图像生成
    elements.generateBtn.addEventListener('click', generateImage);
    
    // 参考图片上传
    if (elements.uploadReferenceBtn) {
        elements.uploadReferenceBtn.addEventListener('click', () => {
            elements.referenceImage.click();
        });
    }
    
    if (elements.referenceImage) {
        elements.referenceImage.addEventListener('change', handleReferenceImageUpload);
    }
    
    if (elements.removeReference) {
        elements.removeReference.addEventListener('click', clearReferenceImage);
    }
    
    elements.exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.imagePrompt.value = btn.dataset.prompt;
        });
    });
    
    // 设置
    elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
    elements.testApiBtn.addEventListener('click', testApiConnection);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    
    // 历史
    elements.historyTabs.forEach(tab => {
        tab.addEventListener('click', () => switchHistoryTab(tab.dataset.type));
    });
}

// ==================== 登录系统 ====================

function handleLogin() {
    const username = elements.username.value.trim();
    const password = elements.password.value.trim();
    
    if (!username || !password) {
        showError('请输入用户名和密码');
        return;
    }
    
    showError('登录中...');
    
    fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.success) {
            state.currentUser = username;
            state.isLoggedIn = true;
            state.token = data.token;
            localStorage.setItem('token', data.token);
            showApp();
            loadUserSettings();
        } else {
            showError(data.error || '登录失败');
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        showError('连接失败，请检查网络或刷新页面重试');
    });
}

function handleRegister() {
    const username = elements.username.value.trim();
    const password = elements.password.value.trim();
    
    if (!username || !password) {
        showError('请输入用户名和密码');
        return;
    }
    
    if (password.length < 4) {
        showError('密码至少4位');
        return;
    }
    
    showError('注册中...');
    
    fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.success) {
            state.currentUser = username;
            state.isLoggedIn = true;
            state.token = data.token;
            localStorage.setItem('token', data.token);
            showApp();
            showSuccess('注册成功！');
        } else {
            showError(data.error || '注册失败');
        }
    })
    .catch(err => {
        console.error('Register error:', err);
        showError('连接失败，请检查网络或刷新页面重试');
    });
}

function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // 验证 token
        fetch(`${API_BASE}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.username) {
                state.currentUser = data.username;
                state.isLoggedIn = true;
                state.token = token;
                showApp();
                loadUserSettings();
            } else {
                localStorage.removeItem('token');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
        });
    }
}

function loadUserSettings() {
    fetch(`${API_BASE}/settings`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
    })
    .then(res => res.json())
    .then(data => {
        state.apiUrl = data.apiUrl || '';
        state.apiKey = data.apiKey || '';
        state.defaultModel = data.defaultModel || 'gemini-3-pro-preview';
        
        elements.apiUrlInput.value = state.apiUrl;
        elements.apiKeyInput.value = state.apiKey;
        elements.modelDefault.value = state.defaultModel;
        elements.modelSelect.value = state.defaultModel;
        
        updateApiStatus();
    });
}

function saveSettings() {
    state.apiUrl = elements.apiUrlInput.value.trim();
    state.apiKey = elements.apiKeyInput.value.trim();
    state.defaultModel = elements.modelDefault.value;
    
    console.log('Saving settings:', {
        apiUrl: state.apiUrl,
        keyLength: state.apiKey ? state.apiKey.length : 0,
        model: state.defaultModel
    });
    
    // 保存到后端
    fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
            apiUrl: state.apiUrl,
            apiKey: state.apiKey,
            defaultModel: state.defaultModel
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log('Save result:', data);
        if (data.success) {
            elements.modelSelect.value = state.defaultModel;
            updateApiStatus();
            showSuccess('设置已保存');
        } else {
            showError('保存失败: ' + (data.error || '未知错误'));
        }
    })
    .catch(err => {
        console.error('Save error:', err);
        showError('保存失败: ' + err.message);
    });
}

// ==================== API 测试 ====================

function handleLogout() {
    state.isLoggedIn = false;
    state.currentUser = null;
    localStorage.removeItem('currentUser');
    showLogin();
}

function showApp() {
    elements.loginPage.classList.remove('active');
    elements.appPage.classList.add('active');
    elements.currentUser.textContent = state.currentUser;
}

function showLogin() {
    elements.appPage.classList.remove('active');
    elements.loginPage.classList.add('active');
    elements.username.value = '';
    elements.password.value = '';
}

// ==================== 导航 ====================

function handleNavigation(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const page = e.currentTarget.dataset.page;
    console.log('Navigation clicked:', page);
    
    if (!page) {
        console.error('No page data attribute found');
        return;
    }
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // 切换页面 - 使用 display 属性
    document.querySelectorAll('.content-page').forEach(p => {
        p.style.display = 'none';
    });
    
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
        console.log('Showing page:', page);
    } else {
        console.error('Page not found:', `${page}-page`);
    }
    
    // 移动端：导航后关闭侧边栏
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isMobile = window.innerWidth <= 768;
    
    console.log('toggleSidebar called, isMobile:', isMobile);
    
    if (!sidebar) {
        console.error('Sidebar not found!');
        return;
    }
    
    if (isMobile) {
        // 移动端：显示/隐藏侧边栏和遮罩
        sidebar.classList.toggle('open');
        if (overlay) {
            overlay.classList.toggle('active');
        }
        console.log('Sidebar open:', sidebar.classList.contains('open'));
    } else {
        // 桌面端：折叠/展开
        const mainContent = document.querySelector('.main-content');
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            mainContent.style.marginLeft = '60px';
        } else {
            mainContent.style.marginLeft = '260px';
        }
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ==================== 聊天功能 ====================

async function sendMessage() {
    const message = elements.chatInput.value.trim();
    if (!message && attachments.length === 0) return;
    
    // 检查API配置 - 实时读取输入框的值
    const currentApiUrl = elements.apiUrlInput.value.trim() || state.apiUrl;
    const currentApiKey = elements.apiKeyInput.value.trim() || state.apiKey;
    
    if (!currentApiUrl || !currentApiKey) {
        showError('请先在设置中配置 API 地址和密钥，并点击"保存设置"');
        // 自动跳转到设置页面
        const settingsNav = document.querySelector('[data-page="settings"]');
        if (settingsNav) settingsNav.click();
        return;
    }
    
    // 更新 state
    state.apiUrl = currentApiUrl;
    state.apiKey = currentApiKey;
    
    // 添加用户消息
    const messageContent = attachments.length > 0 
        ? { text: message, attachments: [...attachments] }
        : message;
    addMessage(messageContent, 'user');
    
    const attachmentsToSend = [...attachments];
    elements.chatInput.value = '';
    clearAttachments();
    autoResizeTextarea.call(elements.chatInput);
    
    // 显示加载状态
    elements.typingIndicator.classList.add('active');
    elements.sendBtn.disabled = true;
    
    try {
        // 保存到当前对话
        state.currentConversation.push({ role: 'user', content: message, attachments: attachmentsToSend });
        
        // 调用 Gemini API
        const response = await callGeminiAPI(state.currentConversation);
        
        // 添加AI回复
        addMessage(response, 'ai');
        state.currentConversation.push({ role: 'model', content: response });
        
        // 保存到历史
        saveChatHistory(message, response);
        
    } catch (error) {
        console.error('API Error:', error);
        addMessage(`错误: ${error.message}`, 'error');
    } finally {
        elements.typingIndicator.classList.remove('active');
        elements.sendBtn.disabled = false;
    }
}

// 处理附件上传（支持多文件）
function handleAttachmentUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Gemini API 支持的文件类型
    const supportedTypes = [
        'image/',  // 所有图片类型
        'application/pdf',
        'text/plain',
        'text/markdown',
        'text/csv'
    ];
    
    const unsupportedFiles = [];
    const validFiles = [];
    
    files.forEach(file => {
        const isSupported = supportedTypes.some(type => 
            file.type.startsWith(type) || file.type === type
        );
        
        if (isSupported) {
            validFiles.push(file);
        } else {
            unsupportedFiles.push(file.name);
        }
    });
    
    // 显示不支持的文件提示
    if (unsupportedFiles.length > 0) {
        showError(`不支持的文件类型: ${unsupportedFiles.join(', ')}\n\nGemini API 仅支持：图片、PDF、文本文件（.txt、.md、.csv）`);
    }
    
    // 只处理支持的文件
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const attachment = {
                name: file.name,
                type: file.type,
                fileType: getFileType(file),
                data: event.target.result
            };
            attachments.push(attachment);
            renderAttachmentsPreview();
        };
        reader.readAsDataURL(file);
    });
    
    // 清空 input 以便重复选择同一文件
    e.target.value = '';
}

// 渲染附件预览
function renderAttachmentsPreview() {
    const container = elements.attachmentsPreview;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (attachments.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    attachments.forEach((att, index) => {
        const div = document.createElement('div');
        div.className = 'attachment-item';
        
        if (att.fileType === 'image') {
            div.innerHTML = `
                <img src="${att.data}" alt="${escapeHtml(att.name)}">
                <button class="remove-attachment" onclick="removeAttachment(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else {
            const icon = fileIcons[att.fileType] || fileIcons.default;
            div.innerHTML = `
                <div class="file-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <span class="file-name">${escapeHtml(att.name)}</span>
                <button class="remove-attachment" onclick="removeAttachment(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
        
        container.appendChild(div);
    });
}

// 移除单个附件
function removeAttachment(index) {
    attachments.splice(index, 1);
    renderAttachmentsPreview();
}

// 清除所有附件
function clearAttachments() {
    attachments = [];
    if (elements.chatAttachment) {
        elements.chatAttachment.value = '';
    }
    renderAttachmentsPreview();
}

// 清除聊天历史
function clearChatHistory() {
    state.currentConversation = [];
    elements.chatMessages.innerHTML = `
        <div class="message ai">
            <div class="message-content">
                <p>你好！我是 Gemini AI 助手。有什么我可以帮助你的吗？</p>
            </div>
        </div>
    `;
}

function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let label = '';
    let displayContent = '';
    
    if (type === 'ai') {
        label = '<strong>Gemini AI:</strong> ';
        // AI 消息使用 Markdown 渲染
        if (typeof marked !== 'undefined') {
            displayContent = marked.parse(content);
        } else {
            displayContent = escapeHtml(content).replace(/\n/g, '<br>');
        }
    } else if (type === 'error') {
        label = '<strong>⚠️ 错误:</strong> ';
        displayContent = escapeHtml(content);
    } else {
        // 用户消息 - 检查是否有附件
        let textContent = typeof content === 'object' ? content.text : content;
        let messageAttachments = typeof content === 'object' ? content.attachments : null;
        
        displayContent = '';
        
        // 显示附件
        if (messageAttachments && messageAttachments.length > 0) {
            displayContent += '<div class="message-attachments">';
            messageAttachments.forEach(att => {
                if (att.fileType === 'image') {
                    displayContent += `<img src="${att.data}" style="max-width: 200px; border-radius: 8px; margin: 4px;">`;
                } else {
                    const icon = fileIcons[att.fileType] || fileIcons.default;
                    displayContent += `
                        <div class="file-badge">
                            <i class="fas ${icon}"></i>
                            <span>${escapeHtml(att.name)}</span>
                        </div>
                    `;
                }
            });
            displayContent += '</div>';
        }
        
        // 显示文本
        if (textContent) {
            displayContent += escapeHtml(textContent).replace(/\n/g, '<br>');
        }
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">${label}${displayContent}</div>
        <div class="message-time">${time}</div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function callGeminiAPI(conversation) {
    const model = elements.modelSelect.value;
    
    // 确保使用最新的 API 配置
    if (!state.apiUrl) {
        state.apiUrl = elements.apiUrlInput.value.trim();
    }
    if (!state.apiKey) {
        state.apiKey = elements.apiKeyInput.value.trim();
    }
    
    console.log('Calling Gemini API:', {
        url: state.apiUrl,
        keyLength: state.apiKey ? state.apiKey.length : 0,
        model: model
    });
    
    const url = `${state.apiUrl}/models/${model}:generateContent`;
    
    // 构建 Gemini 格式的请求体 - 支持多文件
    const contents = conversation.map(msg => {
        const parts = [];
        
        // 添加文本
        if (msg.content) {
            parts.push({ text: msg.content });
        }
        
        // 添加附件（如果有）
        if (msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach(att => {
                // 从 data URL 提取 base64 数据
                const base64Match = att.data.match(/^data:([^;]+);base64,(.+)$/);
                if (base64Match) {
                    parts.push({
                        inlineData: {
                            mimeType: base64Match[1],
                            data: base64Match[2]
                        }
                    });
                }
            });
        }
        
        return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts: parts.length > 0 ? parts : [{ text: '' }]
        };
    });
    
    // 启用 Google Search Grounding（让模型可以搜索网络获取最新信息）
    const body = {
        contents,
        tools: [{
            googleSearch: {}
        }]
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': state.apiKey
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('API Error:', error);
        throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    // 提取回复文本
    if (data.candidates && data.candidates[0]?.content?.parts) {
        return data.candidates[0].content.parts
            .map(part => part.text || '')
            .join('');
    }
    
    throw new Error('无法解析 API 响应');
}

function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

// ==================== 图像生成 ====================

async function generateImage() {
    const prompt = elements.imagePrompt.value.trim();
    if (!prompt) {
        showError('请输入图像描述');
        return;
    }
    
    // 实时读取 API 配置
    let apiUrl = elements.apiUrlInput.value.trim() || state.apiUrl;
    const apiKey = elements.apiKeyInput.value.trim() || state.apiKey;
    
    // 清理 API URL（移除末尾斜杠）
    apiUrl = apiUrl.replace(/\/+$/, '');
    
    if (!apiUrl || !apiKey) {
        showError('请先在设置中配置 API');
        return;
    }
    
    // 获取用户选择的模型
    const modelSelect = document.getElementById('image-model-select');
    const model = modelSelect ? modelSelect.value : 'gemini-3-pro-image-preview';
    
    console.log('Generating image with model:', model);
    
    elements.generateBtn.disabled = true;
    elements.imageLoading.classList.add('active');
    
    try {
        const url = `${apiUrl}/models/${model}:generateContent`;
        
        // 构建请求内容 - 支持多张参考图片
        const parts = [];
        
        // 添加所有参考图片（如果有）
        if (referenceImages.length > 0) {
            referenceImages.forEach(img => {
                const base64Match = img.data.match(/^data:(.+);base64,(.+)$/);
                if (base64Match) {
                    parts.push({
                        inlineData: {
                            mimeType: base64Match[1],
                            data: base64Match[2]
                        }
                    });
                }
            });
        }
        
        // 添加文本提示
        parts.push({ text: prompt });
        
        // 根据 sizeSelect 值映射到 aspectRatio
        const sizeToRatio = {
            '1024x1024': '1:1',
            '1792x1024': '16:9',
            '1024x1792': '9:16'
        };
        const selectedSize = elements.sizeSelect.value;
        // 默认使用 1:1 比例
        const aspectRatio = selectedSize ? sizeToRatio[selectedSize] : '1:1';
        const imageSize = selectedSize ? selectedSize.split('x')[0] : '1024';
        
        // 根据不同模型构建不同的请求体
        const requestBody = {
            contents: [{
                parts: parts
            }]
        };
        
        if (model.includes('gemini-3-pro-image')) {
            // Gemini 3 Pro Image - 必须使用 imageConfig 格式
            requestBody.generationConfig = {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: imageSize
                }
            };
        } else if (model.includes('2.0-flash')) {
            // Gemini 2.0 Flash - 使用 responseModalities 格式
            requestBody.generationConfig = {
                responseModalities: ["TEXT", "IMAGE"]
            };
        } else if (model.includes('imagen')) {
            // Imagen 3 - 不支持参考图片，只发送文本
            requestBody.contents[0].parts = [{ text: prompt }];
            requestBody.generationConfig = {
                responseModalities: ["IMAGE"]
            };
        }
        
        console.log('Image request:', JSON.stringify(requestBody, null, 2));
        console.log('Request URL:', url);
        console.log('API Key length:', apiKey ? apiKey.length : 0);
        
        // 使用官方正确的 API 格式
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        const responseText = await response.text();
        console.log('Response text:', responseText.substring(0, 500));
        
        if (!response.ok) {
            let errorMsg = `API 返回 ${response.status}`;
            try {
                const errorJson = JSON.parse(responseText);
                errorMsg = errorJson.error?.message || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error('API 返回的不是有效 JSON: ' + responseText.substring(0, 100));
        }
        
        console.log('Image API response:', JSON.stringify(data, null, 2));
        
        // 检查是否有错误
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }
        
        // 处理图像响应
        if (data.candidates?.[0]?.content?.parts) {
            const imagePart = data.candidates[0].content.parts.find(p => p.inlineData);
            if (imagePart) {
                const imageSrc = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
                addGeneratedImage(imageSrc, prompt);
                saveImageHistory(prompt, imageSrc);
            } else {
                // 没有图像，可能是文本响应
                const textPart = data.candidates[0].content.parts.find(p => p.text);
                if (textPart) {
                    addImagePlaceholder(prompt, textPart.text);
                } else {
                    addImagePlaceholder(prompt, '未能生成图像，请尝试其他模型或描述');
                }
            }
        } else if (data.candidates?.[0]?.finishReason === 'MALFORMED_FUNCTION_CALL') {
            // 特殊处理：模型尝试调用不支持的功能
            const finishMsg = data.candidates[0].finishMessage || '';
            if (finishMsg.includes('inpainting')) {
                addImagePlaceholder(prompt, '⚠️ Gemini 3 Pro Image 不支持参考图片编辑功能\n\n请尝试：\n1. 移除参考图片，只用文字描述\n2. 或选择 "2.0 Flash" 模型');
            } else {
                addImagePlaceholder(prompt, `模型功能调用错误: ${finishMsg}\n\n请尝试其他模型或描述`);
            }
        } else if (data.predictions) {
            // Imagen 3 格式
            const prediction = data.predictions[0];
            if (prediction.bytesBase64Encoded) {
                const imageSrc = `data:image/png;base64,${prediction.bytesBase64Encoded}`;
                addGeneratedImage(imageSrc, prompt);
                saveImageHistory(prompt, imageSrc);
            }
        } else {
            console.error('Unexpected response format:', data);
            addImagePlaceholder(prompt, `API 响应格式异常: ${JSON.stringify(data).substring(0, 200)}`);
        }
        
    } catch (error) {
        console.error('Image generation error:', error);
        addImagePlaceholder(prompt, `生成失败: ${error.message}\n\n请尝试选择其他图像生成模型`);
    } finally {
        elements.generateBtn.disabled = false;
        elements.imageLoading.classList.remove('active');
    }
}

function addGeneratedImage(src, prompt) {
    // 清除占位符
    const placeholder = elements.imageGrid.querySelector('.image-placeholder');
    if (placeholder) placeholder.remove();
    
    const imageDiv = document.createElement('div');
    imageDiv.className = 'generated-image';
    imageDiv.innerHTML = `
        <img src="${src}" alt="${escapeHtml(prompt)}" onclick="previewImage('${src}')">
        <div class="image-actions">
            <button class="btn-icon" onclick="previewImage('${src}')" title="预览">
                <i class="fas fa-search-plus"></i>
            </button>
            <button class="btn-icon" onclick="downloadImage('${src}', '${escapeHtml(prompt).substring(0, 20)}')" title="下载">
                <i class="fas fa-download"></i>
            </button>
        </div>
        <p class="image-prompt">${escapeHtml(prompt)}</p>
    `;
    
    elements.imageGrid.insertBefore(imageDiv, elements.imageGrid.firstChild);
}

// 图像预览
function previewImage(src) {
    // 创建预览遮罩
    const overlay = document.createElement('div');
    overlay.className = 'image-preview-overlay';
    overlay.onclick = () => overlay.remove();
    
    overlay.innerHTML = `
        <div class="image-preview-container">
            <img src="${src}" alt="Preview">
            <button class="preview-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="preview-actions">
                <button class="btn btn-primary" onclick="downloadImage('${src}', 'gemini-image')">
                    <i class="fas fa-download"></i> 下载图片
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// 下载图像
function downloadImage(src, filename) {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${filename || 'gemini-image'}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function addImagePlaceholder(prompt, message) {
    const placeholder = elements.imageGrid.querySelector('.image-placeholder');
    if (placeholder) {
        placeholder.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>${escapeHtml(message)}</p>
        `;
    }
}

// ==================== 设置 ====================

function loadSettings() {
    elements.apiUrlInput.value = state.apiUrl;
    elements.apiKeyInput.value = state.apiKey;
    elements.modelDefault.value = state.defaultModel;
    elements.modelSelect.value = state.defaultModel;
    
    updateApiStatus();
}

async function testApiConnection() {
    // 直接读取输入框的值
    const apiUrl = elements.apiUrlInput.value.trim();
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiUrl || !apiKey) {
        showError('请先填写 API 地址和密钥');
        return;
    }
    
    elements.testApiBtn.disabled = true;
    elements.testApiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
    
    try {
        // 直接测试 Gemini API（不需要后端认证）
        const testUrl = `${apiUrl}/models?key=${apiKey}`;
        const response = await fetch(testUrl, {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            const modelCount = data.models ? data.models.length : 0;
            showSuccess(`连接成功！发现 ${modelCount} 个模型`);
            elements.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>已连接</span>';
            elements.apiStatus.classList.add('configured');
        } else {
            const errorText = await response.text();
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.error?.message || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        showError(`连接失败: ${error.message}`);
        elements.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>连接失败</span>';
        elements.apiStatus.classList.remove('configured');
    } finally {
        elements.testApiBtn.disabled = false;
        elements.testApiBtn.innerHTML = '<i class="fas fa-plug"></i> 测试连接';
    }
}

function updateApiStatus() {
    if (state.apiUrl && state.apiKey) {
        elements.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>已配置</span>';
        elements.apiStatus.classList.add('configured');
    } else {
        elements.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>未配置</span>';
        elements.apiStatus.classList.remove('configured');
    }
}

function toggleApiKeyVisibility() {
    const type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
    elements.apiKeyInput.type = type;
    elements.toggleApiKey.innerHTML = type === 'password' 
        ? '<i class="fas fa-eye"></i>' 
        : '<i class="fas fa-eye-slash"></i>';
}

// ==================== 历史记录 ====================

function saveChatHistory(userMessage, aiResponse) {
    const history = {
        id: Date.now(),
        user: userMessage,
        ai: aiResponse,
        model: elements.modelSelect.value,
        time: new Date().toLocaleString('zh-CN')
    };
    
    state.chatHistory.unshift(history);
    if (state.chatHistory.length > 50) state.chatHistory.pop();
    
    localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
    updateHistoryDisplay();
}

function saveImageHistory(prompt, imageData) {
    const history = {
        id: Date.now(),
        prompt,
        style: elements.styleSelect.value,
        size: elements.sizeSelect.value,
        time: new Date().toLocaleString('zh-CN')
    };
    
    state.imageHistory.unshift(history);
    if (state.imageHistory.length > 30) state.imageHistory.pop();
    
    localStorage.setItem('imageHistory', JSON.stringify(state.imageHistory));
    updateHistoryDisplay();
}

function switchHistoryTab(type) {
    elements.historyTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    elements.chatHistoryList.style.display = type === 'chat' ? 'grid' : 'none';
    elements.imageHistoryList.style.display = type === 'image' ? 'grid' : 'none';
}

function updateHistoryDisplay() {
    // 更新聊天历史
    elements.chatHistoryList.innerHTML = state.chatHistory.length === 0 
        ? '<div class="history-item"><p>暂无历史记录</p></div>'
        : state.chatHistory.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-icon"><i class="fas fa-comment"></i></div>
                <div class="history-details">
                    <h4>${escapeHtml(item.user.substring(0, 30))}${item.user.length > 30 ? '...' : ''}</h4>
                    <p>${escapeHtml(item.ai.substring(0, 50))}...</p>
                    <div class="history-meta">
                        <span class="time">${item.time}</span>
                        <span class="model">${item.model}</span>
                    </div>
                </div>
                <button class="history-action" onclick="loadChatHistory(${item.id})">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        `).join('');
    
    // 更新图像历史
    elements.imageHistoryList.innerHTML = state.imageHistory.length === 0
        ? '<div class="history-item"><p>暂无图像历史</p></div>'
        : state.imageHistory.map(item => `
            <div class="history-item image-item" data-id="${item.id}">
                <div class="history-icon"><i class="fas fa-image"></i></div>
                <div class="history-details">
                    <h4>${escapeHtml(item.prompt.substring(0, 30))}${item.prompt.length > 30 ? '...' : ''}</h4>
                    <div class="history-meta">
                        <span class="time">${item.time}</span>
                        <span class="style">${item.style}</span>
                        <span class="size">${item.size}</span>
                    </div>
                </div>
                <button class="history-action">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `).join('');
}

function loadChatHistory(id) {
    const item = state.chatHistory.find(h => h.id === id);
    if (item) {
        // 切换到聊天页面
        elements.navItems.forEach(n => n.classList.remove('active'));
        document.querySelector('[data-page="chat"]').classList.add('active');
        elements.contentPages.forEach(p => p.classList.remove('active'));
        document.getElementById('chat-page').classList.add('active');
        
        // 清空当前对话并加载历史
        elements.chatMessages.innerHTML = '';
        state.currentConversation = [];
        
        addMessage(item.user, 'user');
        addMessage(item.ai, 'ai');
        
        state.currentConversation = [
            { role: 'user', content: item.user },
            { role: 'model', content: item.ai }
        ];
    }
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showToast(message, type = 'info') {
    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? 'var(--error)' : type === 'success' ? 'var(--success)' : 'var(--accent-primary)'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: var(--shadow-lg);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 处理参考图片上传（支持多张）
function handleReferenceImageUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showError(`${file.name} 不是图片文件`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            referenceImages.push({
                name: file.name,
                data: event.target.result
            });
            renderReferencePreviews();
        };
        reader.readAsDataURL(file);
    });
    
    // 清空 input 以便重复选择
    e.target.value = '';
}

// 渲染参考图片预览
function renderReferencePreviews() {
    const container = elements.referencePreviews;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (referenceImages.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    referenceImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'reference-item';
        div.innerHTML = `
            <img src="${img.data}" alt="${escapeHtml(img.name)}">
            <button class="remove-reference" onclick="removeReferenceImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

// 移除单张参考图片
function removeReferenceImage(index) {
    referenceImages.splice(index, 1);
    renderReferencePreviews();
}

// 清除所有参考图片
function clearReferenceImages() {
    referenceImages = [];
    if (elements.referenceImage) {
        elements.referenceImage.value = '';
    }
    renderReferencePreviews();
}

// 初始化历史显示
updateHistoryDisplay();
