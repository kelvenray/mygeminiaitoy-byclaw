// Gemini AI Web App - 后端服务器
const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gemini-web-app-secret-key-2026';

// 初始化数据库
const db = new Database(path.join(__dirname, 'data.db'));

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    api_url TEXT,
    api_key TEXT,
    default_model TEXT DEFAULT 'gemini-3-pro-preview',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    ai_message TEXT NOT NULL,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));

// JWT 验证中间件
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }
    
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token 无效' });
    }
}

// ==================== 用户 API ====================

// 注册
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: '密码至少4位' });
    }
    
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        
        const stmt = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
        stmt.run(userId, username, passwordHash);
        
        // 创建默认设置
        const settingsStmt = db.prepare('INSERT INTO user_settings (user_id) VALUES (?)');
        settingsStmt.run(userId);
        
        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ success: true, token, username });
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        res.status(500).json({ error: '注册失败' });
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username);
        
        if (!user) {
            return res.status(400).json({ error: '用户不存在' });
        }
        
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(400).json({ error: '密码错误' });
        }
        
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ success: true, token, username: user.username });
    } catch (e) {
        res.status(500).json({ error: '登录失败' });
    }
});

// 获取当前用户信息
app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ username: req.username });
});

// ==================== 设置 API ====================

// 获取设置
app.get('/api/settings', authMiddleware, (req, res) => {
    try {
        const stmt = db.prepare('SELECT api_url, api_key, default_model FROM user_settings WHERE user_id = ?');
        const settings = stmt.get(req.userId);
        
        if (!settings) {
            return res.json({ apiUrl: '', apiKey: '', defaultModel: 'gemini-3-pro-preview' });
        }
        
        res.json({
            apiUrl: settings.api_url || '',
            apiKey: settings.api_key || '',
            defaultModel: settings.default_model || 'gemini-3-pro-preview'
        });
    } catch (e) {
        res.status(500).json({ error: '获取设置失败' });
    }
});

// 保存设置
app.post('/api/settings', authMiddleware, (req, res) => {
    const { apiUrl, apiKey, defaultModel } = req.body;
    
    console.log('[Settings] Saving for user:', req.userId);
    console.log('[Settings] apiUrl:', apiUrl ? 'provided' : 'empty');
    console.log('[Settings] apiKey length:', apiKey ? apiKey.length : 0);
    
    try {
        const stmt = db.prepare(`
            UPDATE user_settings 
            SET api_url = ?, api_key = ?, default_model = ? 
            WHERE user_id = ?
        `);
        const result = stmt.run(apiUrl || '', apiKey || '', defaultModel || 'gemini-3-pro-preview', req.userId);
        console.log('[Settings] Update result:', result.changes, 'rows changed');
        
        res.json({ success: true });
    } catch (e) {
        console.error('[Settings] Error:', e);
        res.status(500).json({ error: '保存设置失败' });
    }
});

// ==================== API 代理 ====================

app.use('/api', async (req, res) => {
    const apiKey = req.headers['x-goog-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'Missing API key' });
    }
    
    const GEMINI_PROXY = process.env.GEMINI_PROXY || 'https://aibot.techmaninfo.ltd/gemini';
    const targetUrl = `${GEMINI_PROXY}${req.path}`;
    
    console.log(`[Proxy] ${req.method} ${targetUrl}`);
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            }
        };
        
        if (req.method !== 'GET' && req.body) {
            options.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(targetUrl, options);
        const data = await response.json();
        
        res.status(response.status).json(data);
        
    } catch (error) {
        console.error('[Proxy Error]', error);
        res.status(500).json({ 
            error: 'Proxy request failed',
            message: error.message 
        });
    }
});

// 测试 API 连接
app.post('/api/test-connection', async (req, res) => {
    const { apiUrl, apiKey } = req.body;
    
    if (!apiUrl || !apiKey) {
        return res.status(400).json({ 
            success: false, 
            error: '缺少 API 地址或密钥' 
        });
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        const url = `${apiUrl}/models`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-goog-api-key': apiKey
            }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                const errorMsg = errorData.error?.message || `API 返回 ${response.status}`;
                return res.json({ success: false, error: errorMsg });
            } catch {
                return res.json({ success: false, error: `API 返回 ${response.status}` });
            }
        }
        
        const data = JSON.parse(responseText);
        res.json({ success: true, modelCount: data.models?.length || 0 });
        
    } catch (error) {
        res.json({ success: false, error: `连接失败: ${error.message}` });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.1.0'
    });
});

// 所有其他请求返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║     🤖 Gemini AI Web App 已启动 (v1.1.0)        ║
╠════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                   ║
║  数据库: SQLite (data.db)                       ║
║  功能: 用户认证 + 设置持久化                     ║
╚════════════════════════════════════════════════╝
    `);
});
