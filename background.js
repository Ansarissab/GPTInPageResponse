// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize",
    title: "Summarize with AI",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "generateReply",
    title: "Generate Reply with AI",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "generateComment",
    title: "Generate Comment with AI",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "factCheck",
    title: "Fact Check with AI",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "askQuestion",
    title: "Ask Question about this...",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.selectionText) {
    const action = info.menuItemId;
    handleAction(action, info.selectionText, tab);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    // Handle sidebar toggle
    if (command === 'toggle-sidebar') {
      await sendMessageSafely(tab.id, {
        type: "toggleSidebar"
      });
      return;
    }

    // Get selected text from the tab
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = result?.result;

    if (!selectedText || selectedText.trim() === '') {
      // Show error popup if no text selected
      await sendMessageSafely(tab.id, {
        type: "showPopup",
        content: "Please select some text first!",
        error: true
      });
      return;
    }

    // Map command to action
    const actionMap = {
      'summarize-selection': 'summarize',
      'generate-reply': 'generateReply',
      'generate-comment': 'generateComment',
      'fact-check-selection': 'factCheck',
      'ask-question-selection': 'askQuestion'
    };

    const action = actionMap[command];
    if (action) {
      handleAction(action, selectedText, tab);
    }
  } catch (error) {
    console.error('[Background] Command error:', error);
  }
});

// Default prompts
const DEFAULT_PROMPTS = {
  summarize: "Please provide a concise summary of the following text. Focus on the main points and key takeaways:\n\n{selectedText}",
  generateReply: "Generate a professional and thoughtful reply to the following message. The reply should be:\n- Friendly and courteous\n- Brief (2-3 sentences)\n- Directly address the main points\n\nMessage:\n{selectedText}",
  generateComment: "Generate an insightful comment in response to the following text. The comment should:\n- Add value to the discussion\n- Be constructive and respectful\n- Show understanding of the content\n\nContent:\n{selectedText}",
  factCheck: "Current Date/Time: {currentDate}\n\nYou are a Fact-Checker. Your goal is to verify the accuracy of the following text. \n\nINSTRUCTIONS:\n1. Perform a simulated Google Search for the specific claims in the text.\n2. Verify the information against the most recent data available up to {currentDate}.\n3. Highlight specific inaccuracies or misleading statements.\n4. Provide the correct information with context.\n5. Cite sources if possible.\n\nText to Verify:\n{selectedText}"
};

// Helper function to ensure content script is loaded
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { type: "ping" });
    return true;
  } catch (error) {
    // Content script not loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      // Also inject the CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['popup.css']
      });

      // Wait a bit for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      return false;
    }
  }
}

// Safe message sending with error handling
async function sendMessageSafely(tabId, message) {
  try {
    // Ensure content script is loaded first
    const isReady = await ensureContentScript(tabId);
    if (!isReady) {
      throw new Error('Unable to load extension on this page. Some pages (like chrome:// URLs) are protected.');
    }

    // Send the message
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (error) {
    console.error('Error sending message to content script:', error);
    // Try one more time after a delay
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      await chrome.tabs.sendMessage(tabId, message);
      return true;
    } catch (retryError) {
      throw new Error('Failed to communicate with page. Please refresh and try again.');
    }
  }
}

async function handleAction(action, selectedText, tab) {
  console.log('[Background] Action triggered:', action);
  console.log('[Background] Selected text:', selectedText.substring(0, 100) + '...');

  // Get custom prompts from storage
  const settings = await chrome.storage.local.get([
    'promptSummarize',
    'promptReply',
    'promptComment'
  ]);

  let promptTemplate;
  switch (action) {
    case "summarize":
      promptTemplate = settings.promptSummarize || DEFAULT_PROMPTS.summarize;
      break;
    case "generateReply":
      promptTemplate = settings.promptReply || DEFAULT_PROMPTS.generateReply;
      break;
    case "generateComment":
      promptTemplate = settings.promptComment || DEFAULT_PROMPTS.generateComment;
      break;
    case "factCheck":
      promptTemplate = DEFAULT_PROMPTS.factCheck;
      break;
    case "askQuestion":
      // For Ask Question, we need to get input from the user first
      console.log('[Background] Requesting question input from user...');
      try {
        await sendMessageSafely(tab.id, {
          type: "getQuestionInput",
          selectedText: selectedText
        });
      } catch (error) {
        console.error('[Background] Failed to request input:', error);
      }
      return; // Stop here, wait for callback
  }

  // Replace placeholder with actual selected text
  let prompt = promptTemplate.replace(/{selectedText}/g, selectedText);

  // Inject current date/time if placeholder exists
  const now = new Date().toLocaleString();
  prompt = prompt.replace(/{currentDate}/g, now);

  console.log('[Background] Using prompt template:', promptTemplate.substring(0, 50) + '...');

  try {
    console.log('[Background] Showing loading popup...');
    // Show loading popup
    await sendMessageSafely(tab.id, {
      type: "showPopup",
      content: "Processing...",
      loading: true
    });

    console.log('[Background] Querying LLM...');
    const response = await queryLLM(prompt);
    console.log('[Background] LLM Response received:', response.substring(0, 100) + '...');

    // Save to history
    const settings = await chrome.storage.local.get(['provider', 'model']);
    await saveToHistory({
      timestamp: new Date().toISOString(),
      action: action,
      inputText: selectedText,
      prompt: prompt,
      response: response,
      provider: settings.provider || 'unknown',
      model: settings.model || 'unknown',
      pageUrl: tab.url,
      pageTitle: tab.title
    });

    // Send response to content script
    console.log('[Background] Sending response to content script...');
    await sendMessageSafely(tab.id, {
      type: "showPopup",
      content: response,
      loading: false
    });
    console.log('[Background] Response sent successfully');
  } catch (error) {
    console.error("[Background] Query error:", error);

    // Format error message for better readability
    let errorMessage = error.message || "Unknown error occurred";

    // Extract key information from quota errors
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      if (errorMessage.includes("gemini") || errorMessage.includes("google")) {
        errorMessage = "⚠️ Google Gemini quota exceeded (20 requests/day on free tier).\n\nSwitch to:\n• OpenRouter (free models available)\n• Groq (unlimited free tier)\n• Or wait ~36 seconds and try again";
      } else if (errorMessage.includes("retry")) {
        const retryMatch = errorMessage.match(/retry in (\d+)/);
        if (retryMatch) {
          errorMessage = `⚠️ Rate limit exceeded. Please wait ${retryMatch[1]} seconds and try again.`;
        }
      }
    } else if (errorMessage.includes("API key")) {
      errorMessage = "🔑 Invalid API key. Please check your settings.";
    } else if (errorMessage.includes("401") || errorMessage.includes("authentication")) {
      errorMessage = "🔑 Authentication failed. Please check your API key in settings.";
    } else if (errorMessage.includes("402") || errorMessage.includes("billing")) {
      errorMessage = "💳 Billing issue. Please check your account billing status.";
    } else if (errorMessage.length > 200) {
      // Truncate very long error messages
      errorMessage = errorMessage.substring(0, 200) + "...\n\nCheck console for full error.";
    }

    try {
      await sendMessageSafely(tab.id, {
        type: "showPopup",
        content: errorMessage,
        loading: false,
        error: true
      });
    } catch (msgError) {
      console.error("[Background] Failed to show error popup:", msgError);
    }
  }
}

// Save to history
// Save to history
async function saveToHistory(historyEntry) {
  try {
    let { responseHistory } = await chrome.storage.local.get(['responseHistory']);

    // Ensure responseHistory is an array
    if (!Array.isArray(responseHistory)) {
      console.warn('[Background] responseHistory was not an array, resetting to empty array');
      responseHistory = [];
    }

    // Add new entry at the beginning (most recent first)
    responseHistory.unshift(historyEntry);

    // Keep only last 100 entries to avoid storage bloat
    const trimmedHistory = responseHistory.slice(0, 100);

    await chrome.storage.local.set({ responseHistory: trimmedHistory });

    // Verify save
    const check = await chrome.storage.local.get(['responseHistory']);
    if (check.responseHistory && check.responseHistory.length > 0 && check.responseHistory[0].timestamp === historyEntry.timestamp) {
      console.log('[Background] History saved successfully:', historyEntry);
    } else {
      console.error('[Background] History save verification failed');
    }
  } catch (error) {
    console.error('[Background] Failed to save history:', error);
  }
}

// Listen for messages from content script (toolbar clicks)
let lastAction = null;
let lastSelectedText = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'contextMenuClick') {
    lastAction = request.action;
    lastSelectedText = request.selectedText;
    handleAction(request.action, request.selectedText, sender.tab);
    sendResponse({ success: true });
  } else if (request.type === 'modifyResponse') {
    // Handle quick actions (shorter, longer)
    const tab = sender.tab;
    (async () => {
      try {
        await sendMessageSafely(tab.id, {
          type: "showPopup",
          content: "Processing...",
          loading: true
        });

        const response = await queryLLM(request.prompt);

        await sendMessageSafely(tab.id, {
          type: "showPopup",
          content: response,
          loading: false
        });

        // Save to history
        const settings = await chrome.storage.local.get(['provider', 'model']);
        await saveToHistory({
          timestamp: new Date().toISOString(),
          action: request.action,
          inputText: request.prompt,
          prompt: request.prompt,
          response: response,
          provider: settings.provider || 'unknown',
          model: settings.model || 'unknown',
          pageUrl: tab.url,
          pageTitle: tab.title,
          isModification: true
        });
      } catch (error) {
        await sendMessageSafely(tab.id, {
          type: "showPopup",
          content: `Error: ${error.message}`,
          loading: false,
          error: true
        });
      }
    })();
    sendResponse({ success: true });
  } else if (request.type === 'regenerate') {
    // Regenerate last response
    if (lastAction && lastSelectedText && sender.tab) {
      handleAction(lastAction, lastSelectedText, sender.tab);
    }
    sendResponse({ success: true });
  } else if (request.type === 'sidebarQuery') {
    // Handle queries from sidebar
    (async () => {
      try {
        const response = await queryLLM(request.prompt);

        // Save to history
        const settings = await chrome.storage.local.get(['provider', 'model']);
        await saveToHistory({
          timestamp: new Date().toISOString(),
          action: 'sidebar_chat',
          inputText: request.prompt,
          prompt: request.prompt,
          response: response,
          provider: settings.provider || 'unknown',
          model: settings.model || 'unknown',
          pageUrl: sender.tab.url,
          pageTitle: sender.tab.title
        });

        sendResponse({ success: true, content: response });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  } else if (request.type === 'getHistory') {
    // Get response history
    (async () => {
      const { responseHistory = [] } = await chrome.storage.local.get(['responseHistory']);
      console.log('[Background] Sending history to UI, count:', responseHistory.length);
      sendResponse({ success: true, history: responseHistory });
    })();
    return true;
  } else if (request.type === 'exportHistory') {
    (async () => {
      try {
        // Export history as text
        const { responseHistory = [] } = await chrome.storage.local.get(['responseHistory']);
        const textContent = formatHistoryAsText(responseHistory);
        sendResponse({ success: true, content: textContent });
      } catch (error) {
        console.error('[Background] Export error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.type === 'clearHistory') {
    (async () => {
      try {
        // Clear all history
        await chrome.storage.local.set({ responseHistory: [] });
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] Clear error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.type === 'submitQuestion') {
    // Handle question submitted by user
    const { question, selectedText } = request;
    const tab = sender.tab;

    (async () => {
      try {
        await sendMessageSafely(tab.id, {
          type: "showPopup",
          content: "Thinking...",
          loading: true
        });

        const prompt = `Answer the following question based on the context provided.\n\nContext:\n${selectedText}\n\nQuestion:\n${question}`;
        const response = await queryLLM(prompt);

        await sendMessageSafely(tab.id, {
          type: "showPopup",
          content: response,
          loading: false
        });

        // Save to history
        const settings = await chrome.storage.local.get(['provider', 'model']);
        await saveToHistory({
          timestamp: new Date().toISOString(),
          action: 'askQuestion',
          inputText: `${question}\n\nContext: ${selectedText.substring(0, 100)}...`,
          prompt: prompt,
          response: response,
          provider: settings.provider || 'unknown',
          model: settings.model || 'unknown',
          pageUrl: tab.url,
          pageTitle: tab.title
        });
      } catch (error) {
        await sendMessageSafely(tab.id, {
          type: "showPopup",
          content: `Error: ${error.message}`,
          loading: false,
          error: true
        });
      }
    })();
    sendResponse({ success: true });
    return true;
  }
  return true;
});

function formatHistoryAsText(history) {
  if (history.length === 0) {
    return 'No history available.';
  }

  let text = '='.repeat(80) + '\n';
  text += 'AI ASSISTANT - RESPONSE HISTORY\n';
  text += `Exported: ${new Date().toLocaleString()}\n`;
  text += `Total Entries: ${history.length}\n`;
  text += '='.repeat(80) + '\n\n';

  history.forEach((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleString();
    const actionName = entry.action === 'summarize' ? 'Summarize' :
      entry.action === 'generateReply' ? 'Generate Reply' :
        entry.action === 'generateComment' ? 'Generate Comment' :
          entry.action === 'factCheck' ? 'Fact Check' :
            entry.action === 'askQuestion' ? 'Asked Question' :
              entry.action === 'shorter' ? 'Make Shorter' :
                entry.action === 'longer' ? 'Make Longer' :
                  entry.action === 'regenerate' ? 'Regenerate' :
                    entry.action || 'Unknown';

    text += `-`.repeat(80) + '\n';
    text += `Entry #${index + 1}\n`;
    text += `-`.repeat(80) + '\n';
    text += `Date/Time: ${date}\n`;
    text += `Action: ${actionName}${entry.isModification ? ' (Modification)' : ''}\n`;
    text += `Model: ${entry.model}\n`;
    text += `Provider: ${entry.provider}\n`;
    text += `Page: ${entry.pageTitle || 'Unknown'}\n`;
    text += `URL: ${entry.pageUrl || 'Unknown'}\n`;
    text += '\n';

    if (!entry.isModification) {
      text += 'INPUT TEXT:\n';
      text += entry.inputText.substring(0, 500) + (entry.inputText.length > 500 ? '...' : '') + '\n';
      text += '\n';
    }

    text += 'AI RESPONSE:\n';
    text += entry.response + '\n';
    text += '\n';
  });

  text += '='.repeat(80) + '\n';
  text += 'END OF HISTORY\n';
  text += '='.repeat(80) + '\n';

  return text;
}

async function queryLLM(prompt) {
  // Get settings
  const settings = await chrome.storage.local.get(['provider', 'apiKey', 'model']);

  if (!settings.apiKey) {
    throw new Error("No API key configured. Click the extension icon to set up.");
  }

  const provider = settings.provider || 'openai';

  switch (provider) {
    case 'openai':
      return await queryOpenAI(prompt, settings.apiKey, settings.model || 'gpt-4o-mini');
    case 'anthropic':
      return await queryAnthropic(prompt, settings.apiKey, settings.model || 'claude-3-5-haiku-20241022');
    case 'groq':
      return await queryGroq(prompt, settings.apiKey, settings.model || 'llama-3.3-70b-versatile');
    case 'google':
      return await queryGoogle(prompt, settings.apiKey, settings.model || 'gemini-2.0-flash-exp');
    case 'openrouter':
      return await queryOpenRouter(prompt, settings.apiKey, settings.model || 'google/gemini-2.0-flash-exp:free');
    default:
      throw new Error("Unknown provider");
  }
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 60000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });

  clearTimeout(id);
  return response;
}

async function queryOpenAI(prompt, apiKey, model) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function queryAnthropic(prompt, apiKey, model) {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function queryGroq(prompt, apiKey, model) {
  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function queryGoogle(prompt, apiKey, model) {
  console.log('[Background] Querying Google with model:', model);

  if (!model || model === 'undefined') {
    throw new Error('No model selected. Please select a Gemini model in settings.');
  }

  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Background] Google API error:', response.status, errorText);
    let errorMessage = `Google API error: ${response.status}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || errorMessage;
    } catch (e) {
      // Could not parse error
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('[Background] Google API response:', data);

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response from Google API');
  }

  return data.candidates[0].content.parts[0].text;
}

async function queryOpenRouter(prompt, apiKey, model) {
  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/your-username/your-repo', // Replace with your app's URL
      'X-Title': 'AI Assistant Extension' // Replace with your app's name
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  throw new Error("Invalid response format from OpenRouter");
}

// Listen for test requests from settings
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "testAPI") {
    queryLLM("Say 'Hello! API is working correctly.' in a friendly way.")
      .then(result => {
        sendResponse({ success: true, message: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});
