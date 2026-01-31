# AI Quick Assistant (v2.0) - Chrome Extension

A feature-rich Chrome extension that integrates powerful AI models directly into your browsing experience. Summarize text, generate replies, chat with pages, and keep track of your AI interactions—all in one place.

## ✨ Key Features

- **Multi-Provider Support**: 
  - **OpenAI** (GPT-4o, GPT-4o-mini)
  - **Anthropic** (Claude 3.5 Sonnet/Haiku)
  - **Google Gemini** (1.5 Flash/Pro, 2.0 Flash)
  - **Groq** (Llama 3, Mixtral) — *Free & Ultra Fast!*
  - **OpenRouter** — *Access any model!*
- **Persistent AI Sidebar**: A side-panel for continuous chatting with page awareness.
- **Smart Selection Toolbar**: Quick actions (Summarize, Reply, Comment) appear instantly when you select text.
- **Floating Action Button (FAB)**: Quick access to the sidebar and history from any corner of the page.
- **Advanced History Tracking**: Every response is saved with metadata (model, provider, page URL) and is fully searchable.
- **Voice Input**: Talk to your AI assistant using built-in speech recognition.
- **Slash Commands**: Use `/summarize`, `/explain`, `/fix`, or `/translate` directly in the chat.
- **Export Capabilities**: Download your chat history as Markdown files.
- **Privacy-First**: Your API keys are stored locally in your browser. No middleman and no data tracking.

## 🚀 Quick Setup (3 minutes)

### 1. Install the Extension
1. Download this repository as a ZIP and extract it.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** and select the extracted folder.

### 2. Configure Your API Key
1. Click the extension icon in your toolbar (Settings popup will appear).
2. Select your preferred **AI Provider**.
3. Paste your **API Key**.
4. Click **"Save Settings"**.

*Recommendation: Use **Groq** for a fast, free experience!*

## 📖 How to Use

### 🖱️ Selection Tools
1. **Select text** on any webpage.
2. A **floating toolbar** will appear near your cursor.
3. Click an action (Summarize, Reply, etc.) to see the AI response in a draggable popup.
4. Alternatively, **Right-click** the selection to see the same actions in the context menu.

### 💬 AI Sidebar
- Click the **Floating Action Button (FAB)** in the bottom-right corner and select the chat icon.
- Press `Alt+Shift+A` to toggle it.
- Type your questions or use **Slash Commands** for common tasks.
- Enable/Disable **"Page Aware Mode"** to provide the AI with context from the current tab.

### 🎙️ Voice Input
1. Open the sidebar.
2. Click the **Microphone icon**.
3. Speak your request and watch it transcribe in real-time.

### 📂 History & Export
- Access the full history by clicking the clock icon in the FAB or Sidebar.
- Browse past interactions with specialized metadata.
- Use the **Export icon** in the Sidebar to download your current chat session as a Markdown file.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Summarize selected text |
| `Alt+Shift+R` | Generate reply to selected text |
| `Alt+Shift+C` | Generate comment for selected text |
| `Alt+Shift+A` | Toggle AI Sidebar |

## 🪄 Slash Commands (Sidebar Only)

- `/summarize` - Summarize the whole page or previous messages.
- `/explain` - Ask for a detailed explanation of the current topic.
- `/fix` - Paste code or text to fix errors.
- `/translate` - Translate content to a specified language.

## 📊 Cost & Performance

| Provider | Best Model | Cost | Speed | Recommendation |
|----------|------------|------|-------|----------------|
| **Groq** | Llama 3.3 70B | **FREE** | ⚡⚡⚡ | Best for general use |
| **Google** | Gemini Flash | **FREE** (limits) | ⚡⚡ | Best for long context |
| **OpenAI** | GPT-4o Mini | Ultra Cheap | ⚡⚡ | Best all-rounder |
| **Anthropic**| Claude 3.5 Sonnet| Premium | ⚡⚡ | Best for coding/logic |

## 🛠️ Project Structure

```text
ai-assistant/
├── manifest.json       # Extension manifest (v3)
├── js/                 # Javascript logic
│   ├── background.js   # Service worker & API handlers
│   ├── content.js      # Page injections (Toolbar, FAB, Popups)
│   ├── sidebar.js      # Sidebar interactive logic
│   ├── settings.js     # Settings management
│   └── history.js      # History retrieval & display
├── html/               # UI Layouts
│   ├── settings.html   # Main settings popup
│   ├── sidebar.html    # Sidebar interface
│   └── history.html    # Full-page history viewer
├── css/                # Styling
│   ├── popup.css       # Draggable popup styles
│   ├── sidebar.css     # Sidebar appearance
│   └── fab.css         # Floating Action Button styles
├── icons/              # Extension brand assets
└── lib/                # External libraries (e.g., marked.js)
```

## 🔐 Privacy & Safety
- **Local Storage**: Your keys never leave your device.
- **Direct Access**: The extension connects directly to the AI providers (OpenAI, Anthropic, etc.).
- **No Analytics**: We don't track what you ask or what pages you visit.

## 📜 License
MIT License - Feel free to fork, modify, and improve!

---
**Built for high-performance productivity. Enjoy your AI-powered web! 🚀 By [Zahid Ansari](https://github.com/Ansarissab)**
