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
    
    return true;
  }
});