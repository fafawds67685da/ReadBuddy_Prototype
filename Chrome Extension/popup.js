document.getElementById("summarizeBtn").addEventListener("click", async () => {
  try {
    // Show loading state
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "⏳ Analyzing page... Please wait...";
    
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Extract text + valid image URLs from the active webpage
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          const text = document.body.innerText.slice(0, 4000);
          
          // 🧠 Get all images with relaxed filtering
          const images = Array.from(document.images)
            .filter(img => {
              const src = img.src || "";
              const isValidSize = img.width > 100 && img.height > 100; // Reduced from 200
              const isHttp = src.startsWith("http");
              
              // Don't filter by file extension - let backend validate
              return isValidSize && isHttp;
            })
            .map(img => img.src)
            .slice(0, 10); // Send up to 10 images to backend
          
          return { text, images };
        },
      },
      async (results) => {
        if (!results || !results[0] || !results[0].result) {
          outputDiv.innerText = "⚠️ Could not extract page content.";
          return;
        }
        
        const { text, images } = results[0].result;
        console.log("🧩 Text length:", text.length);
        console.log("🖼️ Found image URLs:", images);
        
        // Send content to backend
        const response = await fetch("http://127.0.0.1:8000/analyze-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, images }),
        });
        
        const data = await response.json();
        console.log("✅ Backend Response:", data);
        
        // --- DISPLAY OUTPUT ---
        let output = "";
        
        // 🧠 Text Section
        output += '<div style="margin-bottom: 20px;">';
        output += '<h3 style="color: #2563eb; margin-bottom: 10px;">📝 Text Summary</h3>';
        
        if (data.summaries && data.summaries.length > 0) {
          data.summaries.forEach((summary, i) => {
            output += `<p style="margin-bottom: 12px; padding: 10px; background: #f3f4f6; border-radius: 6px;">${summary}</p>`;
          });
        } else {
          output += '<p style="color: #dc2626;">⚠️ No summary generated.</p>';
        }
        output += '</div>';
        
        // 🖼️ Image Section
        output += '<div>';
        output += '<h3 style="color: #2563eb; margin-bottom: 10px;">🖼️ Image Descriptions</h3>';
        
        if (data.image_descriptions && data.image_descriptions.length > 0) {
          data.image_descriptions.forEach((item, i) => {
            if (typeof item === 'string') {
              output += `<p style="margin-bottom: 8px;">• ${item}</p>`;
            } else {
              output += `<div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-left: 3px solid #10b981; border-radius: 4px;">`;
              output += `<p style="margin-bottom: 4px;"><strong>Image ${i + 1}:</strong> ${item.caption}</p>`;
              if (item.size) {
                output += `<p style="font-size: 11px; color: #6b7280;">Size: ${item.size}</p>`;
              }
              output += `</div>`;
            }
          });
        } else {
          output += '<p style="color: #dc2626;">No valid images found or could not generate descriptions.</p>';
        }
        
        // Stats
        if (data.count) {
          output += `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">`;
          output += `Processed ${data.count.images_processed} of ${data.count.images_received} images`;
          output += `</p>`;
        }
        
        output += '</div>';
        
        // Update popup display
        outputDiv.innerHTML = output;
        outputDiv.style.whiteSpace = "normal";
        outputDiv.style.lineHeight = "1.6";
      }
    );
  } catch (err) {
    document.getElementById("output").innerHTML = `<p style="color: #dc2626;">❌ Error: ${err.message}</p>`;
    console.error("❌ Extension Error:", err);
  }
});