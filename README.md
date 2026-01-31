# AI Quick Assistant - Chrome Extension

A powerful Chrome extension that lets you use AI to summarize text, generate replies, and create comments on any webpage. Works with OpenAI, Anthropic, Groq, and Google AI APIs.

## ✨ Features

- **Multi-Provider Support**: OpenAI (GPT), Anthropic (Claude), Groq (Llama), Google (Gemini)
- **Three Quick Actions**:
  - 📝 Summarize text
  - 💬 Generate reply
  - 💭 Generate comment
- **Auto-Copy**: Responses automatically copy to clipboard
- **Fast & Reliable**: Direct API calls, no bot detection issues
- **Privacy-Focused**: Your API key stays local in your browser

## 🚀 Quick Setup (5 minutes)

### 1. Install the Extension

1. Download all files to a folder called `ai-assistant`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `ai-assistant` folder

### 2. Get an API Key

Choose one provider (Groq recommended for free tier):

**🔥 Groq (Recommended - FREE & Fast)**
- Go to: https://console.groq.com/keys
- Sign up (free)
- Create an API key
- Model: `llama-3.3-70b-versatile`
- Cost: **100% FREE** with generous limits

**OpenAI (Paid - High Quality)**
- Go to: https://platform.openai.com/api-keys
- Sign up and add payment
- Create an API key
- Model: `gpt-4o-mini` (cheapest, $0.15 per 1M tokens)

**Anthropic (Paid - Claude)**
- Go to: https://console.anthropic.com/settings/keys
- Sign up and add payment
- Create an API key
- Model: `claude-3-5-haiku-20241022` (fast & cheap)

**Google (Free Tier Available)**
- Go to: https://aistudio.google.com/app/apikey
- Sign up (free tier available)
- Create an API key
- Model: `gemini-1.5-flash`

### 3. Configure Extension

1. Click the extension icon in Chrome toolbar
2. Select your AI provider
3. Choose a model
4. Paste your API key
5. Click "Test API Connection"
6. If successful, click "Save Settings"

Done! 🎉

## 📖 How to Use

1. **Select any text** on any webpage
2. **Right-click** on the selection
3. **Choose an action**:
   - "Summarize with AI"
   - "Generate Reply with AI"
   - "Generate Comment with AI"
4. **Wait for popup** (appears near your selection)
5. **Response auto-copies** to clipboard
6. **Paste anywhere** you need it!

## 💰 Cost Comparison

### Free / Very Cheap Options:

| Provider | Model | Cost | Speed | Quality |
|----------|-------|------|-------|---------|
| **Groq** | Llama 3.3 70B | FREE | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| Google | Gemini Flash | FREE (limits) | ⚡⚡ | ⭐⭐⭐⭐ |
| OpenAI | GPT-4o Mini | ~$0.0001/use | ⚡⚡ | ⭐⭐⭐⭐⭐ |

### Premium Options:

| Provider | Model | Cost | Speed | Quality |
|----------|-------|------|-------|---------|
| OpenAI | GPT-4o | ~$0.003/use | ⚡⚡ | ⭐⭐⭐⭐⭐ |
| Anthropic | Claude 3.5 Sonnet | ~$0.002/use | ⚡⚡ | ⭐⭐⭐⭐⭐ |

**Recommendation**: Start with **Groq** (it's free and fast!)

## 🔐 Privacy & Security

- ✅ API keys stored locally in your browser only
- ✅ No data sent to extension servers (there are none!)
- ✅ Direct communication with your chosen AI provider
- ✅ You control your data and costs

## ⚙️ Available Models

### OpenAI
- `gpt-4o` - Latest, most capable (expensive)
- `gpt-4o-mini` - Great quality, very cheap ⭐
- `gpt-4-turbo` - Previous flagship
- `gpt-3.5-turbo` - Fastest, cheapest

### Anthropic (Claude)
- `claude-3-5-sonnet-20241022` - Best Claude
- `claude-3-5-haiku-20241022` - Fast & cheap ⭐
- `claude-3-opus-20240229` - Previous flagship

### Groq (FREE!)
- `llama-3.3-70b-versatile` - Best balance ⭐
- `llama-3.1-70b-versatile` - Very capable
- `mixtral-8x7b-32768` - Fast & efficient
- `llama-3.1-8b-instant` - Ultra fast

### Google
- `gemini-2.0-flash-exp` - Latest (experimental)
- `gemini-1.5-flash` - Fast & efficient ⭐
- `gemini-1.5-pro` - Most capable

## 🛠️ Customization

### Change Prompts

Edit `background.js` to customize prompts:

```javascript
switch(action) {
  case "summarize":
    prompt = `Your custom summarize prompt:\n\n${selectedText}`;
    break;
  // ...
}
```

### Add Custom Actions

1. Add context menu in `background.js`:
```javascript
chrome.contextMenus.create({
  id: "myAction",
  title: "My Custom Action",
  contexts: ["selection"]
});
```

2. Handle it in the switch:
```javascript
case "myAction":
  prompt = `Your prompt: ${selectedText}`;
  break;
```

## 🐛 Troubleshooting

### "No API key configured"
- Click extension icon
- Enter your API key
- Click Save Settings

### "API Error: Invalid API key"
- Check your API key is correct
- Make sure you copied it completely
- Try regenerating the key

### "API Error: 429 / Rate limit"
- You've hit your provider's rate limit
- Wait a few minutes
- Consider upgrading your plan

### Popup doesn't appear
- Check browser console (F12) for errors
- Make sure extension is enabled
- Try reloading the page

### "Insufficient quota"
- OpenAI: Add payment method and credits
- Groq: Should never happen (generous free tier)
- Google: Check your free tier limits

## 📊 Usage Estimates

For typical use (100 requests/day):

| Provider | Model | Monthly Cost |
|----------|-------|--------------|
| Groq | Llama 3.3 70B | **$0.00** |
| Google | Gemini Flash | **$0.00** (within free tier) |
| OpenAI | GPT-4o Mini | ~$0.45 |
| OpenAI | GPT-4o | ~$9.00 |
| Anthropic | Claude Haiku | ~$6.00 |

## 🔄 Updates

The extension automatically uses the latest API endpoints. No updates needed unless you want new features.

## 📝 Files Structure

```
ai-assistant/
├── manifest.json          # Extension config
├── background.js          # API handlers
├── content.js            # Popup & clipboard
├── popup.css             # Styling
├── settings.html         # Settings UI
├── settings.js           # Settings logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## 🤝 Contributing

Want to add support for another AI provider?

1. Add API handler in `background.js`:
```javascript
async function queryYourProvider(prompt, apiKey, model) {
  // Your API call here
}
```

2. Add to switch in `queryLLM()`
3. Add models to `settings.js`
4. Done!

## ⚠️ Important Notes

- API keys are sensitive - don't share them
- Monitor your usage to avoid unexpected costs
- Free tiers have rate limits
- Some providers require payment method on file

## 📧 Support

Issues? 
1. Check troubleshooting section above
2. Verify API key is correct
3. Check browser console for errors
4. Try a different AI provider

## 📜 License

MIT License - Feel free to modify and distribute

---

**Enjoy AI-powered browsing! 🚀**

Built with ❤️ for productivity
