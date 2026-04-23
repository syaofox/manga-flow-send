const SOURCE_PATTERNS = [
  { pattern: /baozimh\.com\/comic\/([^/]+)/, source: "baozimh", name: "包子漫画" },
  { pattern: /manhuagui\.com\/comic\/([^/]+)/, source: "manhuagui", name: "漫画柜" },
  { pattern: /18comic\.vip\/album\/([^/]+)/, source: "jinmantiantang", name: "禁漫天堂" },
  { pattern: /wnacg\.com\/photos-index-aid-(\d+)/, source: "wnacg", name: "绅士漫画" },
  { pattern: /love4u\.net\/(\d+)/, source: "love4u", name: "Love4u" },
  { pattern: /mycomic\.com\/comics\/([^/]+)/, source: "mycomic", name: "MyComic" },
];

const TITLE_SELECTORS = {
  "baozimh": "h1.comics-detail__title",
  "manhuagui": "h1.book-title",
  "jinmantiantang": "h1.title",
  "wnacg": "h2.title",
  "love4u": "h2[itemprop='name']",
  "mycomic": "h1.title",
};

function detectSource() {
  const url = window.location.href;
  
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

function getPageTitle() {
  const sourceInfo = detectSource();
  if (!sourceInfo) return null;
  
  const selector = TITLE_SELECTORS[sourceInfo.source];
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : document.title;
}

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
    
    const title = getPageTitle() || "未知标题";
    
    const confirmed = confirm(
      `是否将以下漫画添加到 Mangaaflow 收藏？\n\n` +
      `标题: ${title}\n` +
      `来源: ${sourceInfo.name}\n` +
      `URL: ${sourceInfo.url}`
    );
    
    if (!confirmed) return;
    
    btn.disabled = true;
    btn.textContent = "发送中...";
    
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
      
      btn.innerHTML = "❤️ 添加到收藏";
    });
  };
  
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createFloatingButton);
} else {
  createFloatingButton();
}