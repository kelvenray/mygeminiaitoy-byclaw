# Gemini AI Web App

一个模仿 Gemini 界面的智能对话与图像生成平台。

## 功能

- 🔐 用户登录/注册
- 💬 智能对话（支持多轮对话）
- 🖼️ 图像生成
- 📜 历史记录
- ⚙️ API 配置

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动服务

```bash
# 在项目根目录
npm start

# 或者开发模式（自动重载）
npm run dev
```

### 3. 访问应用

打开浏览器访问: http://localhost:3000

## 配置

### API 设置

在应用的「API 设置」页面配置：

1. **API 中转地址**: 你的 Gemini API 代理地址
   - 默认: `https://aibot.techmaninfo.ltd/gemini`
   
2. **API 密钥**: 你的 Google Gemini API Key

3. **默认模型**: 选择默认使用的模型
   - gemini-pro
   - gemini-pro-vision
   - gemini-ultra

### 环境变量（可选）

创建 `backend/.env` 文件：

```env
PORT=3000
GEMINI_PROXY=https://your-proxy-server.com/gemini
```

## 项目结构

```
gemini-web-app/
├── frontend/
│   ├── index.html      # 主页面
│   ├── style.css       # 样式（Gemini 深色主题）
│   └── script.js       # 前端逻辑
├── backend/
│   ├── server.js       # Express 服务器
│   └── package.json    # 后端依赖
├── package.json        # 根 package.json
└── README.md           # 说明文档
```

## 技术栈

- **前端**: HTML + CSS + JavaScript（原生）
- **后端**: Node.js + Express
- **API**: Google Gemini API

## 注意事项

1. 图像生成功能需要 Gemini API 支持（部分模型可能不支持）
2. 用户数据存储在浏览器 localStorage 中
3. API 密钥安全存储在本地，不会上传到服务器

## License

MIT
