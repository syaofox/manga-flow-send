document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("mangaflowUrl");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");
  
  chrome.storage.local.get(["mangaflowUrl"], (result) => {
    if (result.mangaflowUrl) {
      urlInput.value = result.mangaflowUrl;
    }
  });
  
  saveBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      status.textContent = "请输入后端地址";
      status.className = "status error";
      return;
    }
    
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