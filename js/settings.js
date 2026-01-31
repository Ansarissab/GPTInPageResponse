const models = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o (Recommended)" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Recommended)" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" }
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Recommended)" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" }
  ],
  google: [
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Recommended)" },
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Recommended)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" }
  ],
  openrouter: [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash (Free)" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "google/gemini-flash-1.5", name: "Gemini 1.5 Flash" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B (Free)" },
    { id: "qwen/qwen-2-7b-instruct:free", name: "Qwen 2 7B (Free)" },
    { id: "microsoft/phi-3-medium-128k-instruct:free", name: "Phi-3 Medium (Free)" }
  ]
};

const apiKeyLinks = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  groq: "https://console.groq.com/keys",
  gemini: "https://aistudio.google.com/app/apikey",
  openrouter: "https://openrouter.ai/keys"
};

const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const modelInfoEl = document.getElementById("model-info");
const apiKeyEl = document.getElementById("apiKey");
const apiKeyLinkEl = document.getElementById("apiKeyLink");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const statusEl = document.getElementById("status");
const resetPromptsBtn = document.getElementById("resetPromptsBtn");
const promptSummarizeEl = document.getElementById("promptSummarize");
const promptReplyEl = document.getElementById("promptReply");
const promptCommentEl = document.getElementById("promptComment");

// Default prompts
const DEFAULT_PROMPTS = {
  summarize: "Please provide a concise summary of the following text. Focus on the main points and key takeaways:\n\n{selectedText}",
  generateReply: "Generate a professional and thoughtful reply to the following message. The reply should be:\n- Friendly and courteous\n- Brief (2-3 sentences)\n- Directly address the main points\n\nMessage:\n{selectedText}",
  generateComment: "Generate an insightful comment in response to the following text. The comment should:\n- Add value to the discussion\n- Be constructive and respectful\n- Show understanding of the content\n\nContent:\n{selectedText}"
};

// Load saved settings
chrome.storage.local.get(["provider", "model", "apiKey", "promptSummarize", "promptReply", "promptComment"], (result) => {
  if (result.provider) {
    providerEl.value = result.provider;
  }
  updateModels();

  if (result.model) {
    modelEl.value = result.model;
    updateModelInfo();
  }

  if (result.apiKey) {
    apiKeyEl.value = result.apiKey;
  }

  // Load custom prompts
  if (result.promptSummarize) {
    promptSummarizeEl.value = result.promptSummarize;
  }
  if (result.promptReply) {
    promptReplyEl.value = result.promptReply;
  }
  if (result.promptComment) {
    promptCommentEl.value = result.promptComment;
  }
});

// Update models when provider changes
providerEl.addEventListener("change", () => {
  updateModels();
  updateApiKeyLink();
});

// Update model info when model changes
modelEl.addEventListener("change", updateModelInfo);

function updateModels() {
  const provider = providerEl.value;
  const providerModels = models[provider];

  modelEl.innerHTML = "";
  providerModels.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    modelEl.appendChild(option);
  });

  updateModelInfo();
  updateApiKeyLink();
}

function updateModelInfo() {
  const provider = providerEl.value;
  const modelValue = modelEl.value;
  const model = models[provider].find((m) => m.value === modelValue);

  if (model) {
    modelInfoEl.textContent = model.info;
  }
}

function updateApiKeyLink() {
  const provider = providerEl.value;
  apiKeyLinkEl.href = apiKeyLinks[provider];
}

// Save settings
saveBtn.addEventListener("click", async () => {
  const provider = providerEl.value;
  const model = modelEl.value;
  const apiKey = apiKeyEl.value.trim();
  const promptSummarize = promptSummarizeEl.value.trim();
  const promptReply = promptReplyEl.value.trim();
  const promptComment = promptCommentEl.value.trim();

  if (!apiKey) {
    showStatus("Please enter an API key", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    await chrome.storage.local.set({
      provider,
      model,
      apiKey,
      promptSummarize,
      promptReply,
      promptComment
    });
    showStatus("Settings saved successfully! ✓", "success");
    saveBtn.textContent = "Save Settings";
    saveBtn.disabled = false;
  } catch (error) {
    showStatus("Failed to save settings", "error");
    saveBtn.textContent = "Save Settings";
    saveBtn.disabled = false;
  }
});

// Test API
testBtn.addEventListener("click", async () => {
  const provider = providerEl.value;
  const model = modelEl.value;
  const apiKey = apiKeyEl.value.trim();

  if (!apiKey) {
    showStatus("Please enter an API key first", "error");
    return;
  }

  // Save settings first
  await chrome.storage.local.set({ provider, model, apiKey });

  testBtn.disabled = true;
  testBtn.textContent = "Testing...";
  showStatus("Testing API connection...", "info");

  try {
    const response = await chrome.runtime.sendMessage({ type: "testAPI" });

    if (response.success) {
      showStatus(`✓ Success! Response: "${response.message}"`, "success");
    } else {
      showStatus(`✗ API Error: ${response.error}`, "error");
    }
  } catch (error) {
    showStatus(`✗ Test failed: ${error.message}`, "error");
  }

  testBtn.disabled = false;
  testBtn.textContent = "Test API Connection";
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;

  if (type === "success") {
    setTimeout(() => {
      statusEl.className = "status";
    }, 3000);
  }
}

// Reset prompts to defaults
resetPromptsBtn.addEventListener("click", () => {
  promptSummarizeEl.value = DEFAULT_PROMPTS.summarize;
  promptReplyEl.value = DEFAULT_PROMPTS.generateReply;
  promptCommentEl.value = DEFAULT_PROMPTS.generateComment;
  showStatus("Prompts reset to defaults. Click Save to apply.", "info");
});

// Initialize
updateApiKeyLink();
