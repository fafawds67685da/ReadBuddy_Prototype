document.getElementById("summarizeBtn").addEventListener("click", async () => {
  // Get page text from active tab
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  }, async (results) => {
    const text = results[0].result.slice(0, 2000); // limit for demo
    const response = await fetch("http://127.0.0.1:8000/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    document.getElementById("output").innerText = data.summary || "Error summarizing text.";
  });
});
