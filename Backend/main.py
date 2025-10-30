from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from PIL import Image, UnidentifiedImageError
import requests
import io
import urllib3
from urllib.parse import urlparse, parse_qs

# Disable SSL warnings for sites with invalid certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI(
    title="ReadBuddy AI Backend",
    description="Summarizes webpage text, generates captions for images, and analyzes videos",
    version="3.0.0"
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

# FIX: Add padding and batch processing configuration
captioner = pipeline(
    "image-to-text", 
    model="Salesforce/blip-image-captioning-large",
    max_new_tokens=50  # Limit caption length for faster processing
)
print("✅ Models loaded successfully!")

def extract_youtube_id(url):
    """Extract YouTube video ID from URL"""
    try:
        parsed = urlparse(url)
        if 'youtube.com' in parsed.netloc:
            return parse_qs(parsed.query).get('v', [None])[0]
        elif 'youtu.be' in parsed.netloc:
            return parsed.path.strip('/')
    except:
        pass
    return None

def get_youtube_transcript(video_id):
    """Get YouTube video transcript using youtube-transcript-api"""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join([item['text'] for item in transcript])
        return full_text
    except Exception as e:
        print(f"⚠️ Could not get YouTube transcript: {e}")
        return None

def generate_caption_safe(image):
    """Safely generate caption for a single image with proper error handling"""
    try:
        # Process single image with explicit parameters
        result = captioner(image, max_new_tokens=50)
        return result[0]["generated_text"]
    except Exception as e:
        print(f"   ⚠️ Caption generation error: {str(e)[:100]}")
        return None

@app.post("/analyze-page")
async def analyze_page(request: Request):
    """
    Receives webpage text + image URLs + video URLs from Chrome extension.
    Returns summarized text, AI-generated image captions, and video descriptions.
    """
    try:
        data = await request.json()
        text = data.get("text", "")
        image_urls = data.get("images", [])
        video_urls = data.get("videos", [])
        
        print(f"📥 Received {len(image_urls)} images, {len(video_urls)} videos")
        
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
                try:
                    image_data = io.BytesIO(response.content)
                    image = Image.open(image_data).convert("RGB")
                    
                    # Check if image is reasonably sized
                    width, height = image.size
                    print(f"   Image size: {width}x{height}")
                    
                    if width < 50 or height < 50:
                        print(f"   ⚠️ Image too small, skipping")
                        continue
                    
                    # FIX: Use the safe caption generation function
                    caption_text = generate_caption_safe(image)
                    
                    if caption_text:
                        image_descriptions.append({
                            "url": url,
                            "caption": caption_text,
                            "size": f"{width}x{height}"
                        })
                        
                        print(f"   ✅ Caption: {caption_text[:60]}...")
                        valid_images += 1
                    else:
                        print(f"   ⚠️ Could not generate caption")
                    
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

        # --- VIDEO ANALYSIS ---
        video_descriptions = []
        valid_videos = 0
        
        for idx, url in enumerate(video_urls, 1):
            if valid_videos >= 3:  # Limit to 3 videos
                break
            
            try:
                print(f"🎬 Processing video {idx}: {url[:70]}...")
                
                # Check if it's a YouTube video
                youtube_id = extract_youtube_id(url)
                
                if youtube_id:
                    print(f"   📺 YouTube video detected: {youtube_id}")
                    
                    # Try to get transcript
                    transcript = get_youtube_transcript(youtube_id)
                    
                    if transcript and len(transcript.strip()) > 50:
                        # Summarize transcript
                        transcript_chunk = transcript[:2000]
                        try:
                            summary = summarizer(transcript_chunk, max_length=150, min_length=50, do_sample=False)
                            
                            video_descriptions.append({
                                "url": url,
                                "type": "youtube",
                                "description": summary[0]["summary_text"],
                                "method": "transcript"
                            })
                            
                            print(f"   ✅ Summarized YouTube transcript")
                            valid_videos += 1
                        except Exception as e:
                            print(f"   ⚠️ Error summarizing transcript: {e}")
                            video_descriptions.append({
                                "url": url,
                                "type": "youtube",
                                "description": f"YouTube video found (ID: {youtube_id}) but could not summarize transcript.",
                                "method": "metadata"
                            })
                            valid_videos += 1
                    else:
                        video_descriptions.append({
                            "url": url,
                            "type": "youtube",
                            "description": f"YouTube video found (ID: {youtube_id}) but transcript is unavailable. This may be a video without captions.",
                            "method": "metadata"
                        })
                        valid_videos += 1
                else:
                    # Non-YouTube videos
                    video_descriptions.append({
                        "url": url,
                        "type": "video",
                        "description": "Video detected but detailed analysis requires YouTube transcript or additional processing.",
                        "method": "detection"
                    })
                    valid_videos += 1
                        
            except Exception as e:
                print(f"   ⚠️ Video error: {str(e)[:100]}")
                continue

        if not video_descriptions:
            video_descriptions = [{"description": "No videos found on this page.", "url": "", "type": "none"}]

        print(f"✅ Processing complete. {valid_images} images, {valid_videos} videos")
        
        return {
            "summaries": summaries,
            "image_descriptions": image_descriptions,
            "video_descriptions": video_descriptions,
            "count": {
                "images_processed": valid_images,
                "images_received": len(image_urls),
                "videos_processed": valid_videos,
                "videos_received": len(video_urls),
                "text_chunks": len(summaries)
            }
        }
        
    except Exception as e:
        print(f"❌ Error in /analyze-page: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}