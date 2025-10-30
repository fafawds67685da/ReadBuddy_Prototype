from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from PIL import Image, UnidentifiedImageError
import requests
import io
import urllib3

# Disable SSL warnings for sites with invalid certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI(
    title="ReadBuddy AI Backend",
    description="Summarizes webpage text and generates captions for images",
    version="2.0.0"
)

# Allow Chrome extension access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
print("⏳ Loading AI models (this may take a minute)...")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
captioner = pipeline("image-to-text", model="Salesforce/blip-image-captioning-large")
print("✅ Models loaded successfully!")

@app.post("/analyze-page")
async def analyze_page(request: Request):
    """
    Receives webpage text + image URLs from Chrome extension.
    Returns summarized text and AI-generated image captions.
    """
    try:
        data = await request.json()
        text = data.get("text", "")
        image_urls = data.get("images", [])
        
        print(f"📥 Received {len(image_urls)} image URLs")
        
        # --- TEXT SUMMARIZATION ---
        summaries = []
        if text and text.strip():
            # Split text into 2000-character chunks to avoid token limit
            chunks = [text[i:i + 2000] for i in range(0, len(text), 2000)]
            for idx, chunk in enumerate(chunks, 1):
                try:
                    summary = summarizer(chunk, max_length=130, min_length=30, do_sample=False)
                    summaries.append(summary[0]["summary_text"])
                    print(f"✅ Summarized chunk {idx}/{len(chunks)}")
                except Exception as e:
                    summaries.append(f"⚠️ Error summarizing chunk {idx}: {str(e)}")
        else:
            summaries = ["No readable text found on this page."]

        # --- IMAGE CAPTIONING ---
        image_descriptions = []
        valid_images = 0
        
        for idx, url in enumerate(image_urls, 1):
            if valid_images >= 5:
                break  # Limit processing for speed
                
            if not url.startswith("http"):
                print(f"⚠️ Skipping non-HTTP URL: {url[:70]}")
                continue

            try:
                print(f"🔍 Processing image {idx}: {url[:70]}...")
                
                # Download the image with proper headers
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(
                    url, 
                    timeout=10, 
                    verify=False, 
                    stream=True, 
                    allow_redirects=True,
                    headers=headers
                )
                response.raise_for_status()
                
                # Check content type
                content_type = response.headers.get("Content-Type", "").lower()
                print(f"   Content-Type: {content_type}")
                
                # Try to open the image regardless of content-type header
                # (some servers report wrong content-type)
                try:
                    image_data = io.BytesIO(response.content)
                    image = Image.open(image_data).convert("RGB")
                    
                    # Check if image is reasonably sized
                    width, height = image.size
                    print(f"   Image size: {width}x{height}")
                    
                    if width < 50 or height < 50:
                        print(f"   ⚠️ Image too small, skipping")
                        continue
                    
                    # Generate caption
                    caption = captioner(image)
                    caption_text = caption[0]["generated_text"]
                    
                    image_descriptions.append({
                        "url": url,
                        "caption": caption_text,
                        "size": f"{width}x{height}"
                    })
                    
                    print(f"   ✅ Caption: {caption_text[:60]}...")
                    valid_images += 1
                    
                except UnidentifiedImageError:
                    print(f"   ⚠️ Cannot identify image format")
                    continue
                    
            except requests.exceptions.RequestException as e:
                print(f"   ⚠️ Request error: {str(e)[:100]}")
                continue
            except Exception as e:
                print(f"   ⚠️ Unexpected error: {str(e)[:100]}")
                continue

        if not image_descriptions:
            image_descriptions = [{"caption": "No valid images found or could not generate captions.", "url": "", "size": ""}]

        print(f"✅ Processing complete. Processed {valid_images} images successfully.")
        
        return {
            "summaries": summaries,
            "image_descriptions": image_descriptions,
            "count": {
                "images_processed": valid_images,
                "images_received": len(image_urls),
                "text_chunks": len(summaries)
            }
        }
        
    except Exception as e:
        print(f"❌ Error in /analyze-page: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}