# 🔊 ReadBuddy - AI-Powered Screen Reader

An intelligent Chrome extension that makes the web accessible for visually impaired users by summarizing text, describing images, and analyzing videos with AI-powered text-to-speech.

## ✨ Features

- **📝 Text Summarization**: Condenses long articles into concise summaries
- **🖼️ Image Descriptions**: AI-generated captions for all images
- **🎬 Video Analysis**: Extracts and summarizes YouTube transcripts
- **🔊 Text-to-Speech**: Built-in voice narration with adjustable speed
- **⌨️ Keyboard Navigation**: Full keyboard control for screen reader mode
- **♿ Accessibility First**: Designed specifically for visually impaired users

## 🚀 Installation

### Backend Setup

1. **Install Python 3.9+** (if not already installed)

2. **Create a virtual environment**:
```bash
python -m venv .venv
```

3. **Activate the virtual environment**:
   - Windows: `.venv\Scripts\activate`
   - Mac/Linux: `source .venv/bin/activate`

4. **Install dependencies**:
```bash
pip install -r requirements.txt
```

5. **Run the backend server**:
```bash
uvicorn main:app --reload
```

The server will start at `http://127.0.0.1:8000`

### Chrome Extension Setup

1. **Prepare extension files**:
   - Create a folder named `ReadBuddy`
   - Add these files:
     - `manifest.json`
     - `popup.html`
     - `popup.js`
     - `content.js`
     - `background.js`

2. **Create icon folder**:
   - Create a folder called `icons` inside `ReadBuddy`
   - Add icon images (16x16, 32x32, 48x48, 128x128) named:
     - `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - Or download free icons from [Flaticon](https://www.flaticon.com/)

3. **Load extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `ReadBuddy` folder
   - The extension icon should appear in your toolbar!

## 📖 How to Use

### Quick Start

1. **Start the backend**: Run `uvicorn main:app --reload`
2. **Navigate to any webpage**
3. **Click the ReadBuddy icon** in Chrome toolbar
4. **Click "Analyze & Speak"** button

### Keyboard Navigation Mode

Press **Ctrl+Alt+R** on any webpage to enable screen reader mode:

- **J** - Navigate to next element
- **K** - Navigate to previous element
- **H** - Jump to next heading
- **L** - Jump to next link
- **B** - Jump to next button
- **G** - Jump to next image
- **F** - Jump to next form field
- **R** - Repeat current element
- **S** - Stop speaking
- **Enter** - Activate current element
- **Ctrl+Alt+R** - Toggle screen reader on/off

### Settings

- **Speech Speed**: Adjust from 0.5x to 2.0x
- **Auto-speak**: Automatically read results when analysis completes

## 🎯 Use Cases

- **📰 Reading News**: Get quick summaries of long articles
- **🛒 Shopping**: Understand product images without vision
- **📚 Research**: Navigate academic papers efficiently
- **🎥 Learning**: Access video content through transcripts
- **🌐 Web Browsing**: Independently explore any website

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Transformers (HuggingFace)**: 
  - BART for text summarization
  - BLIP for image captioning
- **YouTube Transcript API**: Extract video transcripts

### Frontend
- **Chrome Extensions API**: Manifest V3
- **Web Speech API**: Built-in text-to-speech
- **Vanilla JavaScript**: No frameworks, lightweight

## 📁 File Structure

```
ReadBuddy/
├── Backend/
│   ├── main.py
│   └── requirements.txt
│
└── Extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── content.js
    ├── background.js
    └── icons/
        ├── icon16.png
        ├── icon32.png
        ├── icon48.png
        └── icon128.png
```

## 🐛 Troubleshooting

### Backend Issues

**Error: Models not loading**
- Ensure you have enough RAM (4GB minimum)
- First load downloads models (~2GB), please wait

**Error: Port 8000 already in use**
```bash
uvicorn main:app --reload --port 8001
```
Then update popup.js to use port 8001

### Extension Issues

**"Could not extract page content"**
- Refresh the page and try again
- Some websites block content extraction

**TTS not working**
- Check Chrome sound settings
- Try a different voice in system settings

**Images not processing**
- Some images are blocked by CORS
- Extension processes first 10 images only

## 🔮 Future Enhancements

- [ ] Braille output support
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Custom voice options
- [ ] Mobile app version
- [ ] Advanced video analysis with frame extraction

## 📝 License

MIT License - Free to use and modify

## 🤝 Contributing

Contributions welcome! This project aims to make the web more accessible for everyone.

## 💡 Credits

Built with ❤️ for making the internet accessible to all users.

**AI Models**:
- facebook/bart-large-cnn (Text Summarization)
- Salesforce/blip-image-captioning-large (Image Captioning)

---

*ReadBuddy - Because everyone deserves equal access to information* ♿