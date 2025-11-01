# 🔊 ReadBuddy - AI-Powered Screen Reader

An intelligent Chrome extension that makes the web accessible for visually impaired users by summarizing text, describing images, and analyzing videos with AI-powered text-to-speech and **real-time continuous monitoring**.

> **Version 4.1.1** - Bug Fixes & Stability Improvements 🎈

## ✨ Features

### Core Features
- **📝 Text Summarization**: Condenses long articles into concise summaries
- **🖼️ Image Descriptions**: AI-generated captions for all images
- **🎬 Video Analysis**: Extracts and summarizes YouTube transcripts
- **🔊 Text-to-Speech**: Built-in voice narration with adjustable speed
- **⌨️ Keyboard Navigation**: Full keyboard control for screen reader mode

### 🆕 Continuous Monitoring Mode
- **🎥 Real-time Video Monitoring**: Automatically pauses video every 10 seconds, captures frames, and narrates what's happening
- **📄 Page Change Detection**: Monitors dynamic pages and announces new content as it appears
- **🔄 Automatic Narration**: Speaks descriptions without manual intervention
- **⚙️ Configurable Intervals**: Choose check frequency (5s, 10s, 15s, 30s)
- **🎯 Dual Mode**: Monitor videos OR pages OR both simultaneously

### 🎈 Floating Bubble Button
- **🔵 Always Visible**: Persistent floating button on every page
- **🎯 Always Active & Focused**: No need to click extension icon repeatedly
- **👆 One-Click Access**: Instant access to all features
- **🚀 Draggable**: Position anywhere on screen - remembers your preference
- **⚡ Quick Actions**: Analyze & Speak, Continuous Mode, Screen Reader
- **⚙️ Quick Settings**: Adjust speech speed and preferences on the fly
- **📊 Status Display**: Real-time feedback on what's happening
- **🔴 Visual Badge**: Shows when monitoring is active
- **✅ FIXED**: Now stays on top, drag-and-click works perfectly

### Accessibility First
- **♿ Designed for the visually impaired**
- **🚫 No visual interaction required**
- **🎤 Complete audio feedback**
- **⌨️ Full keyboard accessibility**

---

## 🚀 Installation

### Prerequisites
- **Python 3.9+** installed
- **Google Chrome** browser
- **Internet connection** for AI model downloads (first run only)

### Backend Setup

1. **Navigate to backend folder**:
```bash
cd backend
```

2. **Create a virtual environment**:
```bash
python -m venv .venv
```

3. **Activate the virtual environment**:
   - **Windows**: 
     ```bash
     .venv\Scripts\activate
     ```
   - **Mac/Linux**: 
     ```bash
     source .venv/bin/activate
     ```

4. **Install dependencies**:
```bash
pip install -r requirements.txt
```

5. **Run the backend server**:
```bash
uvicorn main:app --reload
```

✅ The server will start at `http://127.0.0.1:8000`

---

### Chrome Extension Setup

1. **Download/Clone this repository**

2. **Verify extension folder structure** ⚠️ **IMPORTANT - All files required**:
```
ReadBuddy/
├── frame-processor.js          ⭐ REQUIRED
├── page-change-detector.js     ⭐ REQUIRED
├── video-monitor.js
├── continuous-mode.js
├── content.js
├── background.js
├── bubble-button.js
├── popup.html
├── popup.js
├── manifest.json
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

> **⚠️ CRITICAL**: Make sure `frame-processor.js` and `page-change-detector.js` are present. These are NEW required files for continuous monitoring to work!

3. **Load extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top-right corner)
   - Click **"Load unpacked"**
   - Select the `ReadBuddy` extension folder
   - ✅ The extension icon should appear in your toolbar!

4. **Verify installation**:
   - Open any webpage (try `https://www.youtube.com`)
   - **Wait 2-3 seconds** for scripts to load
   - **Look for the purple bubble button** in the bottom-right corner 🎈
   - Click the bubble to open the control panel
   - OR click the ReadBuddy toolbar icon for the full popup interface

5. **If bubble doesn't appear**:
   ```
   1. Press F12 to open Console
   2. Look for these messages:
      ✅ "FrameProcessor loaded"
      ✅ "PageChangeDetector loaded"
      ✅ "VideoMonitor loaded"
      ✅ "ContinuousMode loaded"
      ✅ "ReadBuddy content script loaded"
      ✅ "Bubble button script loaded"
   
   3. If any are missing:
      - Check all files are in the extension folder
      - Reload extension at chrome://extensions/
      - Refresh the webpage
      - Wait 3 seconds and try again
   ```

---

## 📖 How to Use

### 🎈 Quick Start with Bubble Button (Recommended!)

**The easiest way to use ReadBuddy:**

1. **Start the backend server**: 
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
   
2. **Navigate to any webpage** in Chrome (YouTube, news sites, etc.)

3. **Wait 2-3 seconds** for scripts to load (first time only)

4. **Look for the purple bubble** in the bottom-right corner 🔵

5. **Click the bubble** to open the control panel

6. Choose your action:
   - **"Analyze & Speak"** - Instant page analysis with audio narration
   - **"Start Continuous Mode"** - Real-time monitoring every 10 seconds
   - **"Toggle Screen Reader"** - Keyboard navigation mode

**Bubble Features:**
- ✅ **Drag & Drop**: Click and drag the bubble to your preferred corner
- ✅ **Stays Put**: Your position is saved across sessions
- ✅ **Quick Settings**: Adjust speech speed without opening the popup
- ✅ **Status Updates**: See what's happening in real-time
- ✅ **Badge Notification**: Red badge shows when continuous mode is active
- ✅ **Always On Top**: Bubble stays visible over all content

### Traditional Popup Interface

1. **Start the backend server** (if not already running)
2. **Navigate to any webpage** in Chrome
3. **Click the ReadBuddy icon** in the browser toolbar
4. Choose your mode:
   - **"Analyze & Speak"** - One-time analysis
   - **"Start Continuous Mode"** - Real-time monitoring

**Both interfaces work together!** You can use the bubble for quick access or the popup for detailed settings.

---

### 🎯 Continuous Monitoring Mode

**Perfect for video content and dynamic pages!**

#### Via Bubble Button (Easiest):
1. Click the purple bubble 🔵
2. Click **"Start Continuous Mode"**
3. Watch the **red badge** appear on the bubble (shows it's active)
4. Listen as ReadBuddy automatically narrates changes every 10 seconds
5. Click **"Stop Continuous Mode"** when done

#### Via Popup (Advanced):
1. Click the ReadBuddy toolbar icon
2. Click **"Start Continuous Mode"** button
3. Configure your preferences:
   - **Check Interval**: How often to check (5, 10, 15, or 30 seconds)
   - **Monitor Videos**: ✅ Enable video frame analysis
   - **Monitor Page**: ✅ Enable page change detection
4. Click **Start** and let ReadBuddy work automatically!

#### What Happens During Continuous Mode:
```
⏰ Every 10 seconds (configurable):

🎬 If video is playing:
   ├─ Pauses video temporarily
   ├─ Captures 3 frames from last 10 seconds
   ├─ Sends frames to AI backend
   ├─ Receives description of what's happening
   ├─ Resumes video playback
   └─ Speaks narration aloud

📄 If no video (or page monitoring enabled):
   ├─ Scans page for changes
   ├─ Detects new images, text, elements
   ├─ Sends new content to backend
   ├─ Receives summary of changes
   └─ Speaks updates aloud

🔄 Process repeats until you click "Stop"
```

#### Perfect Use Cases:
- **YouTube tutorials** - Get audio descriptions of visual demonstrations
- **Live news feeds** - Hear updates as they appear
- **Social media** - Monitor feeds with automatic narration
- **Video lectures** - Access visual content through audio
- **Recipe videos** - Hear descriptions of cooking steps
- **Product demos** - Understand visual features without watching

---

### ⌨️ Keyboard Navigation Mode

**Screen reader for full keyboard control:**

#### Activate:
- **Via Bubble**: Click bubble → Click **"Toggle Screen Reader"**
- **Via Keyboard**: Press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac)

#### Navigation Keys:

| Key | Action |
|-----|--------|
| **J** | Navigate to next element |
| **K** | Navigate to previous element |
| **H** | Jump to next heading |
| **L** | Jump to next link |
| **B** | Jump to next button |
| **G** | Jump to next image |
| **F** | Jump to next form field |
| **R** | Repeat current element |
| **S** | Stop speaking |
| **Enter** | Activate current element (click) |
| **Escape** | Stop speaking |
| **Ctrl+Shift+R** | Toggle screen reader on/off |

---

### ⚙️ Settings

#### Quick Settings (Bubble Button):
- **Speech Speed**: Drag slider from 0.5x to 2.0x
- **Auto-speak**: Toggle automatic narration on/off

#### Advanced Settings (Popup):
- **Speech Speed**: Adjust from 0.5x to 2.0x (1.0x is normal)
- **Auto-speak**: Automatically read results when analysis completes
- **Monitoring Interval**: Set check frequency (5s, 10s, 15s, 30s)
- **Video Monitoring**: Toggle video frame analysis
- **Page Monitoring**: Toggle page change detection

---

## 🎯 Use Cases

### For Visually Impaired Users
- **📰 Reading News**: Get quick summaries of long articles
- **🛒 Shopping**: Understand product images without vision
- **📚 Research**: Navigate academic papers efficiently
- **🎥 Learning**: Access video content through audio descriptions
- **📱 Social Media**: Monitor feeds with automatic narration
- **🌐 Web Browsing**: Independently explore any website
- **🎈 Always Accessible**: Bubble button keeps controls at your fingertips

### For Everyone
- **🚗 Hands-free browsing** while commuting (passenger mode)
- **👀 Eye strain relief** from screen time
- **📖 Multitasking** - listen while doing other tasks
- **🎓 Learning** - audio reinforcement of visual content
- **⚡ Quick Access** - Bubble button for instant control
- **🌙 Screen fatigue** - listen instead of reading

---

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Transformers (HuggingFace)**: 
  - `facebook/bart-large-cnn` - Text summarization
  - `Salesforce/blip-image-captioning-large` - Image captioning
- **YouTube Transcript API**: Extract video transcripts
- **Pillow (PIL)**: Image processing and validation
- **NumPy**: Frame comparison for motion detection

### Frontend
- **Chrome Extensions API**: Manifest V3
- **Web Speech API**: Built-in text-to-speech
- **Canvas API**: Video frame capture
- **MutationObserver**: Real-time DOM change detection
- **Chrome Alarms API**: Scheduled continuous monitoring
- **Vanilla JavaScript**: No frameworks, lightweight and fast

---

## 📁 Complete File Structure

```
ReadBuddy/
├── Backend/
│   ├── main.py                 # FastAPI server with AI models
│   └── requirements.txt        # Python dependencies
│
└── Extension/
    ├── manifest.json           # Extension configuration (v4.1.1)
    ├── popup.html              # Extension popup UI
    ├── popup.js                # Popup logic
    ├── background.js           # Service worker & state management
    ├── content.js              # Page interaction & screen reader
    ├── bubble-button.js        # Floating bubble interface (FIXED)
    ├── frame-processor.js      # ⭐ NEW: Video frame capture
    ├── video-monitor.js        # Video detection & analysis
    ├── page-change-detector.js # ⭐ NEW: DOM change monitoring
    ├── continuous-mode.js      # Orchestrates monitoring (FIXED)
    └── icons/
        ├── icon16.png
        ├── icon32.png
        ├── icon48.png
        └── icon128.png
```

> **⭐ NEW FILES in v4.1.1**:
> - `frame-processor.js` - Required for video frame capture
> - `page-change-detector.js` - Required for page change detection
> 
> **🔧 FIXED FILES in v4.1.1**:
> - `manifest.json` - Changed script loading timing
> - `bubble-button.js` - Fixed drag/click conflicts and z-index
> - `continuous-mode.js` - Fixed dependency loading race conditions

---

## 🐛 Troubleshooting

### Extension Issues

#### 🔴 Bubble button not appearing

**Most Common Fix:**
1. **Refresh the webpage** (F5 or Ctrl+R)
2. **Wait 3 seconds** for scripts to load
3. Look for purple bubble in bottom-right corner

**If still not appearing:**
1. Press **F12** to open browser console
2. Look for error messages (red text)
3. Check if these messages appear:
   ```
   ✅ "FrameProcessor loaded"
   ✅ "PageChangeDetector loaded"
   ✅ "VideoMonitor loaded"
   ✅ "ContinuousMode loaded"
   ✅ "ReadBuddy content script loaded"
   ✅ "Bubble button script loaded"
   ```
4. If any are missing:
   - Go to `chrome://extensions/`
   - Find ReadBuddy
   - Click the **refresh icon** 🔄
   - Close ALL tabs
   - Open a new tab and wait 3 seconds

**If STILL not working:**
- Verify `frame-processor.js` and `page-change-detector.js` exist in extension folder
- These are NEW required files - download them from the artifacts above
- Reload extension after adding files

---

#### 🔴 "Could not communicate with page. Try refreshing."

**Solution:**
1. **Refresh the webpage** (F5)
2. **Wait 3 seconds** for content scripts to inject
3. Try clicking the bubble or starting continuous mode again

**If error persists:**
1. Go to `chrome://extensions/`
2. Click **"Details"** on ReadBuddy
3. Scroll down to **"Inspect views"**
4. Click **"service worker"** to see background errors
5. Look for connection errors
6. Reload extension and refresh page

**Root Cause**: Content scripts need time to load. This is normal on first page load.

---

#### 🔴 Bubble button not dragging properly

**Solution:**
- Click and **hold** on the bubble (not the badge)
- Drag to desired position
- Release mouse button
- Position is automatically saved

**If dragging triggers click:**
- This is fixed in v4.1.1
- Make sure you have the latest `bubble-button.js`
- Reload extension if using old version

---

#### 🔴 Continuous mode fails to start

**Common causes:**

**1. "ContinuousMode not available"**
```
Cause: Scripts haven't loaded yet
Fix: Refresh page, wait 3 seconds, try again
```

**2. "Could not establish connection"**
```
Cause: Extension not properly loaded
Fix: 
  1. Go to chrome://extensions/
  2. Reload ReadBuddy extension
  3. Refresh your webpage
  4. Wait 3 seconds
  5. Try again
```

**3. "Dependencies not ready"**
```
Cause: frame-processor.js or page-change-detector.js missing
Fix:
  1. Check extension folder for these files
  2. Download from artifacts if missing
  3. Reload extension
  4. Refresh page
```

**Debug in Console:**
```javascript
// Open Console (F12), type:
window.continuousModeInstance

// Should show:
ContinuousMode { 
  enabled: false, 
  dependenciesReady: true,  // ← Must be true
  config: null 
}

// If dependenciesReady is false:
// 1. Check console for "loaded" messages
// 2. Reload extension
// 3. Refresh page
```

---

#### 🔴 Content scripts not loading

**Check browser console (F12) for:**
```
❌ "Uncaught ReferenceError: VideoMonitor is not defined"
   → frame-processor.js or video-monitor.js missing

❌ "Uncaught ReferenceError: PageChangeDetector is not defined"
   → page-change-detector.js missing

❌ "Failed to load resource"
   → File name typo or missing file
```

**Solution:**
1. Verify ALL 9 JavaScript files exist in extension folder:
   - `frame-processor.js` ⭐
   - `page-change-detector.js` ⭐
   - `video-monitor.js`
   - `continuous-mode.js`
   - `content.js`
   - `background.js`
   - `bubble-button.js`
   - `popup.js`

2. Check file names are **exact** (case-sensitive)
3. Reload extension in `chrome://extensions/`
4. Refresh webpage

---

#### 🔴 Video frame capture blocked

**Error**: "Video frame analysis unavailable" or "CORS restriction"

**Affected sites:** Netflix, Amazon Prime, Disney+, Hulu

**Reason:** DRM/CORS protection prevents frame capture

**What ReadBuddy does:**
- Detects when frame capture is blocked
- Falls back to basic metadata (video title, duration, current time)
- Still monitors page changes if enabled

**This is expected behavior** - DRM-protected content cannot be captured by design.

---

### Backend Issues

#### 🔴 "Models not loading" or slow first startup

**Solution:**
- First run downloads AI models (~2GB total)
- This can take 5-10 minutes depending on internet speed
- Models are cached after first download
- Ensure you have at least **4GB free RAM**
- Check internet connection during first run

**Models downloaded:**
```
facebook/bart-large-cnn (~1.6GB)
Salesforce/blip-image-captioning-large (~500MB)
```

---

#### 🔴 "Port 8000 already in use"

**Solution:**
```bash
# Option 1: Kill the process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9

# Option 2: Use different port
uvicorn main:app --reload --port 8001
```

**If using different port**, update these files:
- `popup.js` (around line 92)
- `background.js` (around line 154)
- `continuous-mode.js` (around line 180)

Change all:
```javascript
fetch("http://127.0.0.1:8000/analyze-page"
```
To:
```javascript
fetch("http://127.0.0.1:8001/analyze-page"
```

---

#### 🔴 Backend not responding

**Check if backend is running:**
1. Open browser and go to: `http://127.0.0.1:8000/docs`
2. You should see FastAPI documentation page
3. If page doesn't load, backend isn't running

**Solution:**
```bash
# Navigate to backend folder
cd backend

# Activate virtual environment
# Windows:
.venv\Scripts\activate

# Mac/Linux:
source .venv/bin/activate

# Start server
uvicorn main:app --reload
```

**Check for errors in terminal:**
```
❌ "ModuleNotFoundError" → Run: pip install -r requirements.txt
❌ "Port already in use" → See port 8000 fix above
❌ "CUDA out of memory" → Restart backend, close other apps
```

---

### Performance Issues

#### 🔴 Slow analysis (takes >10 seconds)

**Solutions:**
1. **Reduce check interval**:
   - Open popup → Set to 15 or 30 seconds
   - Fewer checks = less processing

2. **Disable unused features**:
   - Uncheck "Monitor Videos" if not watching videos
   - Uncheck "Monitor Page" if not needed

3. **Limit images**:
   - Edit `popup.js` line 105
   - Change `.slice(0, 10)` to `.slice(0, 5)`
   - Fewer images = faster analysis

4. **System resources**:
   - Close other heavy applications
   - Ensure at least 4GB RAM available
   - Backend uses ~2GB RAM when models loaded

---

#### 🔴 High CPU usage

**Normal behavior:**
- CPU spike during analysis (2-3 seconds)
- Then drops back to idle
- This is normal for AI processing

**If CPU stays high:**
1. Increase monitoring interval to 30 seconds
2. Stop continuous mode when not needed
3. Restart backend server:
   ```bash
   # Ctrl+C to stop, then:
   uvicorn main:app --reload
   ```

---

## 🎈 Bubble Button Tips

### Best Practices:
- **Position it once**: Drag to your preferred corner - it remembers!
- **Leave panel open**: Keep open while browsing if you use it frequently
- **Quick checks**: Use "Analyze & Speak" for instant page summaries
- **Monitor indicator**: Red badge shows when continuous mode is active
- **Audio feedback**: Every action has voice confirmation
- **Keyboard friendly**: Tab to bubble, Enter to activate

### Customization:
- Position saved per-browser (syncs across devices if Chrome sync enabled)
- Place in different corners for different use cases
- Move it out of the way of page content
- Stays put even when scrolling

### Accessibility:
- **Keyboard navigation**: Fully keyboard accessible
- **Screen reader friendly**: Proper ARIA labels on all controls
- **Audio feedback**: Voice announcements for all actions
- **High contrast**: Purple gradient easy to see
- **Large touch target**: 60px diameter for easy clicking

---

## 🔒 Privacy & Security

- ✅ **All processing is local** - No data sent to external servers (except localhost backend)
- ✅ **No data collection** - Your browsing stays completely private
- ✅ **Open source** - Inspect all code yourself
- ✅ **No tracking** - No analytics, no telemetry
- ⚠️ **Requires localhost backend** - Must run on your machine
- ⚠️ **Cannot access DRM content** - Protected videos blocked by browser design

**What we access:**
- Page text and images (only when you click analyze)
- Video frames (only when continuous mode active)
- All processing happens on YOUR computer

**What we DON'T access:**
- Passwords or login credentials
- Banking information
- Private/incognito browsing
- DRM-protected content

---

## 🔮 Future Enhancements

- [ ] Braille output support
- [ ] Multi-language support (30+ languages)
- [ ] Offline mode with smaller local models
- [ ] Custom voice options (Google TTS, Azure, ElevenLabs)
- [ ] Mobile app version (Android/iOS)
- [ ] Advanced video analysis with object tracking
- [ ] OCR for images with text
- [ ] PDF document support
- [ ] Optional cloud backend (for users without local setup)
- [ ] Voice control ("ReadBuddy, next paragraph")
- [ ] Customizable bubble themes and colors
- [ ] Multiple bubble positions (save presets)
- [ ] Sentiment analysis of content
- [ ] Content filtering options

---

## 📝 License

MIT License - Free to use and modify

---

## 🤝 Contributing

Contributions welcome! This project aims to make the web more accessible for everyone.

**Areas for contribution:**
- Additional language support
- Performance optimizations
- New accessibility features
- Bug fixes and testing
- Documentation improvements
- Bubble button enhancements
- Mobile compatibility

**How to contribute:**
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit pull request

---

## 💡 Credits

Built with ❤️ for making the internet accessible to all users.

**AI Models:**
- `facebook/bart-large-cnn` - Text Summarization
- `Salesforce/blip-image-captioning-large` - Image Captioning

**Special Thanks:**
- HuggingFace Transformers team
- Chrome Extensions community
- Accessibility advocates worldwide
- Open source contributors

---

## 📞 Support

### Getting Help

**Issues?** Open a GitHub issue with:
- Browser console errors (F12 → Console tab)
- Extension console errors (`chrome://extensions` → Details → Inspect views → service worker)
- Backend terminal output
- Steps to reproduce
- Screenshots (if helpful)
- Your Chrome version
- Your OS (Windows/Mac/Linux)

**Feature requests?** We'd love to hear your ideas!

### Quick Diagnostics

**Run this in browser console (F12):**
```javascript
// Check if all components loaded
console.log('FrameProcessor:', window.FrameProcessor ? '✅' : '❌');
console.log('PageChangeDetector:', window.PageChangeDetector ? '✅' : '❌');
console.log('VideoMonitor:', window.VideoMonitor ? '✅' : '❌');
console.log('ContinuousMode:', window.continuousModeInstance ? '✅' : '❌');
console.log('Dependencies ready:', window.continuousModeInstance?.dependenciesReady ? '✅' : '❌');

// Check bubble
console.log('Bubble exists:', document.getElementById('readbuddy-bubble') ? '✅' : '❌');
```

**Expected output:**
```
FrameProcessor: ✅
PageChangeDetector: ✅
VideoMonitor: ✅
ContinuousMode: ✅
Dependencies ready: ✅
Bubble exists: ✅
```

If any show ❌, reload extension and refresh page.

---

## 📊 Version History

### v4.1.1 (Current) - Bug Fixes & Stability
- ✅ Fixed bubble button drag/click conflicts
- ✅ Fixed continuous mode dependency loading
- ✅ Added frame-processor.js for video capture
- ✅ Added page-change-detector.js for DOM monitoring
- ✅ Improved script loading timing
- ✅ Better error handling and recovery
- ✅ Enhanced z-index management

### v4.1.0 - Floating Bubble Button
- Added persistent floating bubble interface
- Real-time status display
- Quick settings access
- Draggable positioning with memory

### v4.0.0 - Continuous Monitoring
- Real-time video frame analysis
- Page change detection
- Automatic narration
- Configurable intervals

### v3.0.0 - Screen Reader Mode
- Keyboard navigation
- Element-by-element reading
- Accessibility shortcuts

---

*ReadBuddy - Because everyone deserves equal access to information* ♿

**Version 4.1.1** - Now with Improved Stability! 🎈

---

## 🚦 Quick Start Checklist

- [ ] Backend installed and running (`uvicorn main:app --reload`)
- [ ] Extension loaded in Chrome (`chrome://extensions/`)
- [ ] All 9 .js files present in extension folder
- [ ] `frame-processor.js` exists ⭐
- [ ] `page-change-detector.js` exists ⭐
- [ ] Extension reloaded after adding files
- [ ] Webpage refreshed and waited 3 seconds
- [ ] Purple bubble visible in bottom-right
- [ ] Bubble clickable and panel opens
- [ ] "Analyze & Speak" works
- [ ] "Start Continuous Mode" works
- [ ] Console shows no errors (F12)

If all checked ✅, you're ready to use ReadBuddy!