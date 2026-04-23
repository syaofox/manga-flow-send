# Chrome 插件开发指导 - Mangaaflow 收藏助手

基于用户需求：本插件用于在各漫画源网站上添加浮动按钮，一键将当前漫画页面添加到 Mangaaflow 收藏。

---

## 功能需求

1. **部署方式**：用户从 Chrome 开发者模式加载源代码文件夹（推荐开发）
2. **交互方式**：点击按钮后弹出确认框，显示检测到的标题、来源，确认后发送到后端
3. **认证方式**：用户首次使用需配置 Mangaaflow 服务地址（默认 `http://localhost:8000`）

---

## 支持的漫画源

| 站点 | 域名 | 详情页 URL 格式 |
|------|------|----------------|
| 包子漫画 | baozimh.com | `{base}/comic/{id}` |
| 漫画柜 | manhuagui.com | `{base}/comic/{id}` |
| 禁漫天堂 | 18comic.vip | `{base}/album/{id}` |
| 绅士漫画 | wnacg.com | `{base}/photos-index-aid-{id}.html` |
| Love4u | love4u.net | `{base}/{id}/` |
| MyComic | mycomic.com | `{base}/comics/{id}` |

---

## 插件结构

```
mangaflow-collector/
├── manifest.json          # 插件清单
├── popup.html         # 设置弹窗页面
├── popup.js          # 设置弹窗逻辑
├── content.js       # 内容脚本（注入浮动按钮）
├── background.js    # 后台脚本
└── styles.css      # 浮动按钮样式
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Mangaaflow 收藏助手",
  "version": "1.0.0",
  "description": "一键将漫画添加到 Mangaaflow 收藏",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://*/*",
    "http://localhost:8000"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "content_scripts": [
    {
      "matches": [
        "*://baozimh.com/*",
        "*://manhuagui.com/*",
        "*://18comic.vip/*",
        "*://wnacg.com/*",
        "*://love4u.net/*",
        "*://mycomic.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### background.js

```javascript
// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addToMangaflow") {
    const { url, title, thumbnail } = request.data;
    
    chrome.storage.local.get(["mangaflowUrl"], async (result) => {
      const baseUrl = result.mangaflowUrl || "http://localhost:8000";
      
      try {
        const response = await fetch(`${baseUrl}/api/favorites/add-by-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        sendResponse({ success: response.ok, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // 异步响应
  }
});
```

### content.js（内容脚本）

```javascript
// 各站 URL 模式识别
const SOURCE_PATTERNS = [
  { pattern: /baozimh\.com\/comic\/([^/]+)/, source: "baozimh", name: "包子漫画" },
  { pattern: /manhuagui\.com\/comic\/([^/]+)/, source: "manhuagui", name: "漫画柜" },
  { pattern: /18comic\.vip\/album\/([^/]+)/, source: "jinmantiantang", name: "禁漫天堂" },
  { pattern: /wnacg\.com\/photos-index-aid-(\d+)/, source: "wnacg", name: "绅士漫画" },
  { pattern: /love4u\.net\/(\d+)/, source: "love4u", name: "Love4u" },
  { pattern: /mycomic\.com\/comics\/([^/]+)/, source: "mycomic", name: "MyComic" },
];

// 提取当前页面标题的方法（各站不同）
const TITLE_SELECTORS = {
  "baozimh": "h1.comics-detail__title",
  "manhuagui": "h1.book-title",
  "jinmantiantang": "h1.title",
  "wnacg": "h2.title",
  "love4u": "h2[itemprop = 'name']",
  "mycomic": "h1.title",
};

// 检测当前站点
function detectSource() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  for (const sp of SOURCE_PATTERNS) {
    if (sp.pattern.test(url)) {
      return {
        source: sp.source,
        name: sp.name,
        url: window.location.href,
      };
    }
  }
  return null;
}

// 获取页面标题
function getPageTitle() {
  const sourceInfo = detectSource();
  if (!sourceInfo) return null;
  
  const selector = TITLE_SELECTORS[sourceInfo.source];
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : document.title;
}

// 创建浮动按钮
function createFloatingButton() {
  if (document.getElementById("mangaflow-collector-btn")) return;
  
  const sourceInfo = detectSource();
  if (!sourceInfo) return;
  
  const btn = document.createElement("button");
  btn.id = "mangaflow-collector-btn";
  btn.innerHTML = "❤️ 添加到收藏";
  btn.title = `检测到: ${sourceInfo.name}`;
  
  btn.onclick = async (e) => {
    e.preventDefault();
    
    // 获取页面标题
    const title = getPageTitle() || "未知标题";
    
    // 显示确认弹窗
    const confirmed = confirm(
      `是否将以下漫画添加到 Mangaaflow 收藏？\n\n` +
      `标题: ${title}\n` +
      `来源: ${sourceInfo.name}\n` +
      `URL: ${sourceInfo.url}`
    );
    
    if (!confirmed) return;
    
    // 禁用按钮，显示加载状态
    btn.disabled = true;
    btn.textContent = "发送中...";
    
    // 发送到后台脚本
    chrome.runtime.sendMessage({
      action: "addToMangaflow",
      data: {
        url: sourceInfo.url,
        title: title,
        thumbnail: ""
      }
    }, (response) => {
      btn.disabled = false;
      
      if (response && response.success) {
        alert("✅ 添加成功！");
      } else {
        alert("❌ 添加失败: " + (response?.error || "未知错误"));
      }
      
      // 恢复按钮文本
      btn.innerHTML = "❤️ 添加到收藏";
    });
  };
  
  // 添加样式
  const style = document.createElement("style");
  style.textContent = `
    #mangaflow-collector-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
      transition: all 0.3s ease;
    }
    #mangaflow-collector-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
    }
    #mangaflow-collector-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
  `;
  
  document.body.appendChild(style);
  document.body.appendChild(btn);
}

// 页面加载完成后注入按钮
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createFloatingButton);
} else {
  createFloatingButton();
}
```

### popup.html（设置页面）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 300px; padding: 20px; font-family: -apple-system, sans-serif; }
    h2 { margin-top: 0; color: #333; }
    label { display: block; margin-bottom: 8px; font-weight: 500; }
    input { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #4a90d9; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
    button:hover { background: #357abd; }
    .status { margin-top: 15px; padding: 10px; border-radius: 6px; display: none; }
    .status.success { background: #d4edda; color: #155724; display: block; }
    .status.error { background: #f8d7da; color: #721c24; display: block; }
  </style>
</head>
<body>
  <h2>Mangaaflow 设置</h2>
  
  <label>后端地址</label>
  <input type="text" id="mangaflowUrl" placeholder="http://localhost:8000">
  
  <button id="saveBtn">保存</button>
  <div id="status" class="status"></div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### popup.js

```javascript
document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("mangaflowUrl");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");
  
  // 加载已保存的地址
  chrome.storage.local.get(["mangaflowUrl"], (result) => {
    if (result.mangaflowUrl) {
      urlInput.value = result.mangaflowUrl;
    }
  });
  
  // 保存地址
  saveBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      status.textContent = "请输入后端地址";
      status.className = "status error";
      return;
    }
    
    // 验证格式
    try {
      new URL(url);
    } catch {
      status.textContent = "无效的 URL 格式";
      status.className = "status error";
      return;
    }
    
    chrome.storage.local.set({ mangaflowUrl: url }, () => {
      status.textContent = "✅ 保存成功！";
      status.className = "status success";
    });
  });
});
```

---

## 安装步骤

1. 创建文件夹 `mangaflow-collector`，将上述文件放入
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `mangaflow-collector` 文件夹

---

## 使用方法

1. 点击浏览器工具栏的插件图标，设置 Mangaaflow 后端地址（如 `http://localhost:8000`）
2. 访问任意支持的漫画站详情页
3. 页面右下角显示浮动按钮「❤️ 添加到收藏」
4. 点击按钮，弹出确认框，确认后即可添加到收藏

---

## 注意事项

1. **跨域请求**：后端需允许来自插件的跨域请求，或在 Chrome 启动参数中添加 `--disable-web-security`
2. **Rate Limiting**：后端 `add-by-url` API 内部已受速率限制器保护
3. **图标**：需要准备一个 `icon.png`（16x16, 48x48, 128x128）放入插件目录