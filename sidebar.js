console.log('[Sidebar] Script loaded');

// State
let isPageAwareMode = true;
let chatHistory = [];
let currentPageContext = null;

// DOM Elements
const closeBtn = document.getElementById('sidebar-close-btn');
const contextToggle = document.getElementById('context-toggle');
const contextStatus = document.getElementById('context-status');
const contextText = document.getElementById('context-text');
const chatHistoryEl = document.getElementById('chat-history');
const sidebarInput = document.getElementById('sidebar-input');
const sendBtn = document.getElementById('send-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const quickCommandsEl = document.getElementById('quick-commands');

// Voice input state
let recognition = null;
let isListening = false;

// Initialize
loadChatHistory();
requestPageContext();
initializeVoiceInput();

// Event Listeners
closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ type: 'closeSidebar' }, '*');
});

contextToggle.addEventListener('click', () => {
    isPageAwareMode = !isPageAwareMode;
    updateContextUI();
    if (isPageAwareMode) {
        requestPageContext();
    }
});

sendBtn.addEventListener('click', sendMessage);

clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all chat history?')) {
        chatHistory = [];
        saveChatHistory();
        renderChatHistory();
    }
});

sidebarInput.addEventListener('keydown', (e) => {
    // Send on Ctrl+Enter
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }

    // Show commands on /
    if (e.key === '/' && sidebarInput.value === '') {
        e.preventDefault();
        sidebarInput.value = '/';
        showQuickCommands();
    }
});

sidebarInput.addEventListener('input', (e) => {
    if (sidebarInput.value.startsWith('/')) {
        showQuickCommands();
    } else {
        hideQuickCommands();
    }
});

// Quick command selection
quickCommandsEl.addEventListener('click', (e) => {
    const commandItem = e.target.closest('.command-item');
    if (commandItem) {
        const command = commandItem.dataset.command;
        sidebarInput.value = command;
        hideQuickCommands();
        sidebarInput.focus();
    }
});

// Listen for messages from parent
window.addEventListener('message', (event) => {
    if (event.data.type === 'pageContext') {
        currentPageContext = event.data.context;
        updateContextUI();
    } else if (event.data.type === 'aiResponse') {
        addMessage('assistant', event.data.content);
    } else if (event.data.type === 'aiResponseChunk') {
        // Streaming response
        appendToLastMessage(event.data.chunk);
    } else if (event.data.type === 'aiResponseStart') {
        // Start new streaming message
        startStreamingMessage();
    } else if (event.data.type === 'aiResponseEnd') {
        // Finish streaming
        finishStreamingMessage();
    } else if (event.data.type === 'addUserMessage') {
        addMessage('user', event.data.content);
    }
});

// Functions
function updateContextUI() {
    if (isPageAwareMode) {
        contextStatus.textContent = 'ON';
        contextToggle.classList.remove('off');
        if (currentPageContext) {
            contextText.textContent = `Reading: ${currentPageContext.title.substring(0, 40)}...`;
        } else {
            contextText.textContent = 'Loading page...';
        }
    } else {
        contextStatus.textContent = 'OFF';
        contextToggle.classList.add('off');
        contextText.textContent = 'Page-aware mode disabled';
    }
}

function requestPageContext() {
    window.parent.postMessage({ type: 'getPageContext' }, '*');
}

function showQuickCommands() {
    quickCommandsEl.style.display = 'block';
}

function hideQuickCommands() {
    quickCommandsEl.style.display = 'none';
}

function sendMessage() {
    const message = sidebarInput.value.trim();
    if (!message) return;

    // Handle slash commands
    if (message.startsWith('/')) {
        handleCommand(message);
        return;
    }

    // Add user message
    addMessage('user', message);
    sidebarInput.value = '';

    // Show loading
    showLoading();

    // Send to background script
    window.parent.postMessage({
        type: 'sidebarChat',
        message: message,
        pageAware: isPageAwareMode,
        pageContext: currentPageContext
    }, '*');
}

function handleCommand(command) {
    const cmd = command.toLowerCase().trim();

    if (cmd === '/help') {
        const helpText = `**Available Commands:**
/summarize - Summarize current page
/help - Show this help message
/history - View chat history
/clear - Clear chat history`;
        addMessage('system', helpText);
    } else if (cmd === '/summarize') {
        if (currentPageContext) {
            sidebarInput.value = '';
            addMessage('user', 'Summarize this page');
            showLoading();
            window.parent.postMessage({
                type: 'sidebarChat',
                message: 'Summarize the following page content:\n\n' + currentPageContext.content,
                pageAware: false
            }, '*');
        } else {
            addMessage('system', 'Page context not available. Please refresh.');
        }
    } else if (cmd === '/history') {
        addMessage('system', `You have ${chatHistory.length} messages in history.`);
    } else if (cmd === '/clear') {
        clearHistoryBtn.click();
    } else {
        addMessage('system', `Unknown command: ${cmd}. Type /help for available commands.`);
    }

    sidebarInput.value = '';
    hideQuickCommands();
}

function showLoading() {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'chat-message assistant';
    loadingEl.id = 'loading-message';
    loadingEl.innerHTML = `
    <div class="message-content">
      <div class="message-loading">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
    </div>
  `;
    chatHistoryEl.appendChild(loadingEl);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function hideLoading() {
    const loadingEl = document.getElementById('loading-message');
    if (loadingEl) {
        loadingEl.remove();
    }
}

function addMessage(role, content) {
    hideLoading();

    const message = {
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    };

    chatHistory.push(message);
    saveChatHistory();
    renderMessage(message);

    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.role}`;

    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const roleIcon = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : 'ℹ️';
    const roleName = message.role.charAt(0).toUpperCase() + message.role.slice(1);

    messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-role">${roleIcon} ${roleName}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${message.content}</div>
  `;

    chatHistoryEl.appendChild(messageEl);
}

function renderChatHistory() {
    chatHistoryEl.innerHTML = '';

    if (chatHistory.length === 0) {
        chatHistoryEl.innerHTML = `
      <div class="welcome-message">
        <h3>👋 Welcome!</h3>
        <p>Select text on the page and use the toolbar, or type a question below.</p>
        <p class="hint">💡 Page-aware mode is ON - I can see this page's content!</p>
      </div>
    `;
    } else {
        chatHistory.forEach(message => renderMessage(message));
    }

    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function saveChatHistory() {
    chrome.storage.local.set({ sidebarChatHistory: chatHistory });
}

function loadChatHistory() {
    chrome.storage.local.get(['sidebarChatHistory'], (result) => {
        if (result.sidebarChatHistory) {
            chatHistory = result.sidebarChatHistory;
            renderChatHistory();
        }
    });
}

// Streaming message functions
let currentStreamingMessage = null;

function startStreamingMessage() {
    hideLoading();

    currentStreamingMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        streaming: true
    };

    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message assistant';
    messageEl.id = 'streaming-message';

    const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-role">🤖 Assistant</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content" id="streaming-content"></div>
  `;

    chatHistoryEl.appendChild(messageEl);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function appendToLastMessage(chunk) {
    if (currentStreamingMessage) {
        currentStreamingMessage.content += chunk;
        const contentEl = document.getElementById('streaming-content');
        if (contentEl) {
            contentEl.textContent = currentStreamingMessage.content;
            chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
        }
    }
}

function finishStreamingMessage() {
    if (currentStreamingMessage) {
        delete currentStreamingMessage.streaming;
        chatHistory.push(currentStreamingMessage);
        saveChatHistory();

        const streamingEl = document.getElementById('streaming-message');
        if (streamingEl) {
            streamingEl.removeAttribute('id');
        }

        currentStreamingMessage = null;
    }
}

// Export history as Markdown
function exportHistoryAsMarkdown() {
    if (chatHistory.length === 0) {
        alert('No chat history to export');
        return;
    }

    let markdown = '# AI Assistant Chat History\n\n';
    markdown += `Exported: ${new Date().toLocaleString()}\n\n`;
    markdown += '---\n\n';

    chatHistory.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleString();
        const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        const icon = msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : 'ℹ️';

        markdown += `## ${icon} ${role} - ${time}\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += '---\n\n';
    });

    // Create download link
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-history-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);

    addMessage('system', 'Chat history exported as Markdown!');
}

// Voice input initialization
function initializeVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('[Sidebar] Speech recognition not supported');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        updateVoiceButton();
        addMessage('system', '🎤 Listening...');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sidebarInput.value = transcript;
        addMessage('system', `Heard: "${transcript}"`);
    };

    recognition.onerror = (event) => {
        console.error('[Sidebar] Speech recognition error:', event.error);
        addMessage('system', `Voice input error: ${event.error}`);
        isListening = false;
        updateVoiceButton();
    };

    recognition.onend = () => {
        isListening = false;
        updateVoiceButton();
    };
}

function toggleVoiceInput() {
    if (!recognition) {
        addMessage('system', 'Voice input not supported in this browser');
        return;
    }

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function updateVoiceButton() {
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        voiceBtn.textContent = isListening ? '🔴' : '🎤';
        voiceBtn.title = isListening ? 'Stop listening' : 'Voice input';
    }
}

// Add export and voice buttons to UI
document.addEventListener('DOMContentLoaded', () => {
    // Add export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'sidebar-btn sidebar-btn-secondary';
    exportBtn.id = 'export-btn';
    exportBtn.title = 'Export history as Markdown';
    exportBtn.textContent = '📥';
    exportBtn.addEventListener('click', exportHistoryAsMarkdown);

    // Add voice button
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'sidebar-btn sidebar-btn-secondary';
    voiceBtn.id = 'voice-btn';
    voiceBtn.title = 'Voice input';
    voiceBtn.textContent = '🎤';
    voiceBtn.addEventListener('click', toggleVoiceInput);

    // Insert before send button
    const actionsDiv = document.querySelector('.sidebar-actions');
    if (actionsDiv && sendBtn) {
        actionsDiv.insertBefore(voiceBtn, clearHistoryBtn);
        actionsDiv.insertBefore(exportBtn, clearHistoryBtn);
    }
});
