console.log('[Content] Content script loaded (v2.1 - fixes applied)');

// Selection toolbar state
let selectionToolbar = null;
let lastSelectedText = '';
let hideToolbarTimeout = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content] Received message:', request.type);

  if (request.type === "showPopup") {
    showPopup(request.content, request.loading, request.error);
    sendResponse({ success: true });
  } else if (request.type === "ping") {
    console.log('[Content] Ping received');
    sendResponse({ success: true });
  } else if (request.type === "triggerAction") {
    // Triggered from toolbar
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      try {
        chrome.runtime.sendMessage({
          type: "handleAction",
          action: request.action,
          selectedText: selectedText
        });
      } catch (error) {
        console.error('[Content] Error sending message:', error);
      }
    }
    sendResponse({ success: true });
  } else if (request.type === 'toggleSidebar') {
    toggleSidebar();
    sendResponse({ success: true });
  } else if (request.type === 'getQuestionInput') {
    showInputPopup(request.selectedText);
    sendResponse({ success: true });
  }

  return true; // Keep channel open for async response
});

function showInputPopup(selectedText) {
  // Remove existing popup/input
  const existing = document.getElementById("chatgpt-input-popup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "chatgpt-input-popup";
  popup.className = "chatgpt-popup input-popup";

  popup.innerHTML = `
    <div class="chatgpt-popup-content">
      <div class="chatgpt-popup-header">
        <span class="chatgpt-popup-title">❓ Ask about selected text</span>
        <button class="chatgpt-popup-close" id="chatgpt-input-close">×</button>
      </div>
      <div class="chatgpt-popup-body">
        <div class="context-preview">
          Context: "${selectedText.substring(0, 60)}..."
        </div>
        <textarea id="chatgpt-question-input" placeholder="Type your question here..." rows="3" autoFocus></textarea>
      </div>
      <div class="chatgpt-popup-footer">
        <button class="chatgpt-popup-btn primary" id="chatgpt-submit-question">Submit</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Styles for input popup specific elements
  const style = document.createElement('style');
  style.textContent = `
    .input-popup .context-preview {
      font-size: 12px;
      color: #666;
      margin-bottom: 10px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-style: italic;
    }
    .input-popup textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
      box-sizing: border-box;
    }
    .input-popup textarea:focus {
      border-color: #10a37f;
      outline: none;
    }
    .chatgpt-popup-btn.primary {
      background: #10a37f;
      color: white;
      border: none;
    }
    .chatgpt-popup-btn.primary:hover {
      background: #0d8c6d;
    }
  `;
  popup.appendChild(style);

  positionPopup(popup);
  makeDraggable(popup, popup.querySelector('.chatgpt-popup-header'));

  // Event listeners
  document.getElementById('chatgpt-input-close').addEventListener('click', () => popup.remove());

  const submitBtn = document.getElementById('chatgpt-submit-question');
  const input = document.getElementById('chatgpt-question-input');

  const submit = () => {
    const question = input.value.trim();
    if (question) {
      popup.remove();
      chrome.runtime.sendMessage({
        type: "submitQuestion",
        question: question,
        selectedText: selectedText
      });
    }
  };

  submitBtn.addEventListener('click', submit);

  // Submit on Enter (without Shift)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  input.focus();
}

function showPopup(content, loading = false, error = false) {
  console.log('[Content] showPopup called - loading:', loading, 'error:', error);

  // Remove existing popup if any
  const existing = document.getElementById("chatgpt-assistant-popup");
  if (existing) {
    console.log('[Content] Removing existing popup');
    existing.remove();
  }

  // Create popup container
  const popup = document.createElement("div");
  popup.id = "chatgpt-assistant-popup";
  popup.className = `chatgpt-popup ${loading ? 'loading' : ''} ${error ? 'error' : ''}`;

  // Create popup content
  const popupContent = document.createElement("div");
  popupContent.className = "chatgpt-popup-content";

  // Create header
  const header = document.createElement("div");
  header.className = "chatgpt-popup-header";
  header.innerHTML = `
    <span class="chatgpt-popup-title">${error ? '⚠️ Error' : (loading ? '⏳ Processing...' : '✓ Response Ready')}</span>
    <button class="chatgpt-popup-close" id="chatgpt-close-btn">×</button>
  `;

  // Create body
  const body = document.createElement("div");
  body.className = "chatgpt-popup-body markdown-body";

  if (typeof marked !== 'undefined' && !loading && !error) {
    body.innerHTML = marked.parse(content);
  } else {
    body.textContent = content;
  }

  // Create footer with actions
  const footer = document.createElement("div");
  footer.className = "chatgpt-popup-footer";

  if (!loading && !error) {
    footer.innerHTML = `
      <button class="chatgpt-popup-btn chatgpt-copy-btn" id="chatgpt-copy-btn">📋 Copy to Clipboard</button>
      <span class="chatgpt-copy-status" id="chatgpt-copy-status"></span>
      <div class="chatgpt-quick-actions">
        <button class="chatgpt-quick-action-btn" id="chatgpt-regenerate-btn" title="Generate a new response">
          <span class="icon">🔄</span>
          <span>Regenerate</span>
        </button>
        <button class="chatgpt-quick-action-btn" id="chatgpt-shorter-btn" title="Make the response more concise">
          <span class="icon">📉</span>
          <span>Shorter</span>
        </button>
        <button class="chatgpt-quick-action-btn" id="chatgpt-longer-btn" title="Expand with more details">
          <span class="icon">📈</span>
          <span>Longer</span>
        </button>
      </div>
    `;
  }

  popupContent.appendChild(header);
  popupContent.appendChild(body);
  popupContent.appendChild(footer);
  popup.appendChild(popupContent);

  // Add markdown styles
  const style = document.createElement('style');
  style.textContent = `
    .markdown-body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #24292f;
    }
    .markdown-body p {
      margin-bottom: 10px;
    }
    .markdown-body p:last-child {
      margin-bottom: 0;
    }
    .markdown-body code {
      background-color: #f6f8fa;
      border-radius: 6px;
      padding: 0.2em 0.4em;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
      font-size: 85%;
    }
    .markdown-body pre {
      background-color: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      margin-bottom: 10px;
    }
    .markdown-body pre code {
      background-color: transparent;
      padding: 0;
      white-space: pre;
    }
    .markdown-body ul, .markdown-body ol {
      padding-left: 20px;
      margin-bottom: 10px;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 {
      margin-top: 16px;
      margin-bottom: 8px;
      font-weight: 600;
      line-height: 1.25;
    }
    .markdown-body h1 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.3em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    .markdown-body h3 { font-size: 1.1em; }
    .markdown-body blockquote {
      margin: 0 0 10px;
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
    }
  `;
  popup.appendChild(style);

  // Add to page
  document.body.appendChild(popup);
  console.log('[Content] Popup added to page');

  // Position popup near cursor (or center if cursor position unknown)
  positionPopup(popup);

  // Make popup draggable
  makeDraggable(popup, header);

  // Add event listeners
  const closeBtn = document.getElementById("chatgpt-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      console.log('[Content] Close button clicked');
      popup.remove();
    });
  }

  const copyBtn = document.getElementById("chatgpt-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => copyToClipboard(content));
  }

  // Quick action buttons
  const regenerateBtn = document.getElementById("chatgpt-regenerate-btn");
  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", () => handleQuickAction('regenerate', content));
  }

  const shorterBtn = document.getElementById("chatgpt-shorter-btn");
  if (shorterBtn) {
    shorterBtn.addEventListener("click", () => handleQuickAction('shorter', content));
  }

  const longerBtn = document.getElementById("chatgpt-longer-btn");
  if (longerBtn) {
    longerBtn.addEventListener("click", () => handleQuickAction('longer', content));
  }

  // Auto-copy to clipboard if not loading and not error
  if (!loading && !error) {
    console.log('[Content] Auto-copying to clipboard...');
    setTimeout(() => copyToClipboard(content, true), 500);
  }

  // No auto-close - user must manually close with X button
  // No click-outside-to-close - user has full control
}

function makeDraggable(popup, header) {
  let isDragging = false;
  let currentX, currentY, initialX, initialY;

  // Add grab cursor to header
  header.style.cursor = 'grab';

  header.addEventListener('mousedown', (e) => {
    // Don't drag if clicking the close button
    if (e.target.id === 'chatgpt-close-btn' || e.target.closest('#chatgpt-close-btn')) {
      return;
    }

    isDragging = true;
    header.style.cursor = 'grabbing';

    // Get initial mouse position relative to popup position
    const rect = popup.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;

    e.preventDefault(); // Prevent text selection while dragging
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    e.preventDefault();

    // Calculate new position
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // Keep popup within viewport bounds
    const maxX = window.innerWidth - popup.offsetWidth;
    const maxY = window.innerHeight - popup.offsetHeight;

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    // Update popup position
    popup.style.left = currentX + 'px';
    popup.style.top = currentY + 'px';
    popup.style.transform = 'none'; // Remove any transform positioning
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = 'grab';
    }
  });
}

function positionPopup(popup) {
  // Try to position near cursor if possible, otherwise center
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const popupHeight = popup.offsetHeight;
  const popupWidth = popup.offsetWidth;

  // Center of viewport as default
  const top = Math.max(50, (viewportHeight - popupHeight) / 2);
  const left = Math.max(50, (viewportWidth - popupWidth) / 2);

  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
}

// Smart context detection
function detectContext(text) {
  const trimmed = text.trim();

  // Email detection
  if (/^(Hi|Hello|Dear|Hey|Greetings)/i.test(trimmed) ||
    /(Regards|Sincerely|Best|Thanks|Cheers),?\s*$/i.test(trimmed) ||
    /@\w+\.\w+/.test(trimmed)) {
    return { type: 'email', suggestion: 'Reply', icon: '✉️' };
  }

  // Code detection
  if (/(function|const|let|var|class|import|export|def|public|private)/.test(trimmed) ||
    /[{};()].*[{};()]/.test(trimmed) ||
    trimmed.includes('//') || trimmed.includes('/*')) {
    return { type: 'code', suggestion: 'Explain', icon: '💻' };
  }

  // Article/long text detection (>100 words)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 100) {
    return { type: 'article', suggestion: 'Summarize', icon: '📄' };
  }

  // Social media/short post
  if (wordCount < 50 && (trimmed.includes('#') || trimmed.includes('@'))) {
    return { type: 'social', suggestion: 'Comment', icon: '💬' };
  }

  return { type: 'generic', suggestion: 'Summarize', icon: '✨' };
}

// Show selection toolbar
function showSelectionToolbar() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (!selectedText || selectedText.length < 3) {
    hideSelectionToolbar();
    return;
  }

  lastSelectedText = selectedText;
  const context = detectContext(selectedText);

  // Create or update toolbar
  if (!selectionToolbar) {
    selectionToolbar = document.createElement('div');
    selectionToolbar.className = 'ai-selection-toolbar';
    document.body.appendChild(selectionToolbar);
  }

  // Build buttons based on context
  const buttons = [
    { action: 'summarize', icon: '📝', label: 'Summarize', primary: context.type === 'article' },
    { action: 'generateReply', icon: '✉️', label: 'Reply', primary: context.type === 'email' },
    { action: 'generateComment', icon: '💬', label: 'Comment', primary: context.type === 'social' },
    { action: 'factCheck', icon: '🕵️', label: 'Fact Check', primary: false },
    { action: 'askQuestion', icon: '❓', label: 'Ask', primary: false }
  ];

  selectionToolbar.innerHTML = buttons.map(btn => `
    <button class="ai-toolbar-btn ${btn.primary ? 'primary' : ''}" data-action="${btn.action}">
      <span class="icon">${btn.icon}</span>
      <span>${btn.label}</span>
    </button>
  `).join('');

  // Add smart suggestion badge
  if (context.type !== 'generic') {
    const primaryBtn = selectionToolbar.querySelector('.ai-toolbar-btn.primary');
    if (primaryBtn) {
      const badge = document.createElement('span');
      badge.className = 'ai-toolbar-badge';
      badge.textContent = 'AI';
      primaryBtn.style.position = 'relative';
      primaryBtn.appendChild(badge);
    }
  }

  // Position toolbar
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Position below the selection
  let top = rect.bottom + window.scrollY + 10; // 10px gap below selection
  let left = rect.left + window.scrollX + (rect.width / 2);

  // Keep within viewport
  // Keep within viewport
  const toolbarWidth = 450; // Increased width for more buttons
  if (left + toolbarWidth / 2 > window.innerWidth) {
    left = window.innerWidth - toolbarWidth / 2 - 20;
  }
  if (left - toolbarWidth / 2 < 0) {
    left = toolbarWidth / 2 + 20;
  }

  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.style.left = `${left}px`;
  selectionToolbar.style.transform = 'translateX(-50%)';

  // Show with animation
  setTimeout(() => {
    selectionToolbar.classList.add('visible');
  }, 10);

  // Add click handlers
  selectionToolbar.querySelectorAll('.ai-toolbar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleToolbarAction(action);
    });
  });

  // Clear any existing timeout
  if (hideToolbarTimeout) {
    clearTimeout(hideToolbarTimeout);
  }
}

function hideSelectionToolbar() {
  if (selectionToolbar) {
    selectionToolbar.classList.remove('visible');
    hideToolbarTimeout = setTimeout(() => {
      if (selectionToolbar && selectionToolbar.parentNode) {
        selectionToolbar.remove();
        selectionToolbar = null;
      }
    }, 200);
  }
}

function handleToolbarAction(action) {
  if (!lastSelectedText) return;

  hideSelectionToolbar();

  // Send to background script
  try {
    chrome.runtime.sendMessage({
      type: 'contextMenuClick',
      action: action,
      selectedText: lastSelectedText
    });
  } catch (error) {
    console.error('[Content] Error sending message:', error);
    showPopup('Extension needs to be reloaded. Please refresh the page.', false, true);
  }
}

// Listen for text selection
document.addEventListener('mouseup', () => {
  setTimeout(showSelectionToolbar, 50);
});

document.addEventListener('keyup', (e) => {
  // Show toolbar on text selection with keyboard (Shift+Arrow keys)
  if (e.shiftKey) {
    setTimeout(showSelectionToolbar, 50);
  }
});

// Hide toolbar when clicking elsewhere
document.addEventListener('mousedown', (e) => {
  if (selectionToolbar && !selectionToolbar.contains(e.target)) {
    // Delay hiding to allow button clicks
    setTimeout(() => {
      const selection = window.getSelection().toString();
      if (!selection) {
        hideSelectionToolbar();
      }
    }, 100);
  }
});

function handleQuickAction(action, originalContent) {
  console.log('[Content] Quick action:', action);

  let newPrompt = '';

  switch (action) {
    case 'regenerate':
      // For regenerate, we need the original selected text
      // We'll send a message to background to regenerate with last action
      try {
        chrome.runtime.sendMessage({
          type: 'regenerate'
        });
      } catch (error) {
        console.error('[Content] Error sending message:', error);
        showPopup('Extension needs to be reloaded. Please refresh the page.', false, true);
      }
      return;
    case 'shorter':
      newPrompt = `Make this response more concise and brief (half the length):\\n\\n${originalContent}`;
      break;
    case 'longer':
      newPrompt = `Expand this response with more details and examples (double the length):\\n\\n${originalContent}`;
      break;
  }

  // Send the modification request
  try {
    chrome.runtime.sendMessage({
      type: 'modifyResponse',
      action: action,
      prompt: newPrompt
    });
  } catch (error) {
    console.error('[Content] Error sending message:', error);
    showPopup('Extension needs to be reloaded. Please refresh the page.', false, true);
  }
}

function copyToClipboard(text, auto = false) {
  console.log('[Content] Copying to clipboard, auto:', auto, 'text length:', text.length);
  navigator.clipboard.writeText(text).then(() => {
    console.log('[Content] Successfully copied to clipboard');
    const status = document.getElementById("chatgpt-copy-status");
    if (status) {
      status.textContent = auto ? "✓ Auto-copied!" : "✓ Copied!";
      status.style.color = "#10a37f";

      setTimeout(() => {
        status.textContent = "";
      }, 2000);
    }
  }).catch(err => {
    console.error("[Content] Failed to copy:", err);
    const status = document.getElementById("chatgpt-copy-status");
    if (status) {
      status.textContent = "✗ Copy failed";
      status.style.color = "#ef4444";
    }
  });
}

// ========================================
// SIDEBAR FUNCTIONALITY
// ========================================

let sidebarIframe = null;
let isSidebarOpen = false;

// Listen for messages from sidebar iframe
window.addEventListener('message', (event) => {
  // Only accept messages from our sidebar
  if (!sidebarIframe || event.source !== sidebarIframe.contentWindow) {
    return;
  }

  if (event.data.type === 'closeSidebar') {
    closeSidebar();
  } else if (event.data.type === 'getPageContext') {
    sendPageContext();
  } else if (event.data.type === 'sidebarChat') {
    handleSidebarChat(event.data);
  }
});

function toggleSidebar() {
  if (isSidebarOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function openSidebar() {
  if (sidebarIframe) {
    sidebarIframe.style.display = 'block';
    isSidebarOpen = true;
    return;
  }

  // Create sidebar iframe
  sidebarIframe = document.createElement('iframe');
  sidebarIframe.id = 'ai-assistant-sidebar';
  sidebarIframe.src = chrome.runtime.getURL('sidebar.html');
  sidebarIframe.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    border: none;
    border-left: 2px solid #e5e7eb;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
    z-index: 2147483647;
    background: white;
  `;

  document.body.appendChild(sidebarIframe);
  isSidebarOpen = true;

  console.log('[Content] Sidebar opened');
}

function closeSidebar() {
  if (sidebarIframe) {
    sidebarIframe.style.display = 'none';
    isSidebarOpen = false;
    console.log('[Content] Sidebar closed');
  }
}

function sendPageContext() {
  if (!sidebarIframe) return;

  // Extract page context
  const context = {
    title: document.title,
    url: window.location.href,
    content: extractPageContent()
  };

  sidebarIframe.contentWindow.postMessage({
    type: 'pageContext',
    context: context
  }, '*');
}

function extractPageContent() {
  // Get main content from common containers
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '#content',
    '.post',
    '.article'
  ];

  let content = '';

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.innerText;
      break;
    }
  }

  // Fallback to body if no main content found
  if (!content) {
    content = document.body.innerText;
  }

  // Limit content length (first 3000 chars)
  return content.substring(0, 3000);
}

function handleSidebarChat(data) {
  console.log('[Content] Sidebar chat:', data.message);

  let prompt = data.message;

  // If page-aware mode is on, prepend page context
  if (data.pageAware && data.pageContext) {
    prompt = `Based on this page:\nTitle: ${data.pageContext.title}\nURL: ${data.pageContext.url}\n\nContent preview:\n${data.pageContext.content.substring(0, 1000)}...\n\nQuestion: ${data.message}`;
  }

  // Send to background script
  try {
    chrome.runtime.sendMessage({
      type: 'sidebarQuery',
      prompt: prompt
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Content] Error:', chrome.runtime.lastError);
        return;
      }
      if (response && response.content) {
        // Send response back to sidebar
        if (sidebarIframe) {
          sidebarIframe.contentWindow.postMessage({
            type: 'aiResponse',
            content: response.content
          }, '*');
        }
      }
    });
  } catch (error) {
    console.error('[Content] Error sending message:', error);
  }
}

// ========================================
// FLOATING ACTION BUTTON (FAB)
// ========================================

let fabContainer = null;
let isFabMenuOpen = false;
let fabHideTimeout = null;

function createFAB() {
  if (fabContainer) return;

  fabContainer = document.createElement('div');
  fabContainer.className = 'fab-container';
  fabContainer.innerHTML = `
    <div class="fab-menu" id="fab-menu">
      <button class="fab-menu-item" data-action="summarize">
        <span class="fab-icon">📝</span>
        <span class="fab-label">Summarize Selected</span>
      </button>
      <button class="fab-menu-item" data-action="reply">
        <span class="fab-icon">✉️</span>
        <span class="fab-label">Generate Reply</span>
      </button>
      <button class="fab-menu-item" data-action="comment">
        <span class="fab-icon">💬</span>
        <span class="fab-label">Write Comment</span>
      </button>
      <button class="fab-menu-item" data-action="factCheck">
        <span class="fab-icon">🕵️</span>
        <span class="fab-label">Fact Check</span>
      </button>
      <button class="fab-menu-item" data-action="askQuestion">
        <span class="fab-icon">❓</span>
        <span class="fab-label">Ask Question</span>
      </button>
      <button class="fab-menu-item" data-action="sidebar">
        <span class="fab-icon">💭</span>
        <span class="fab-label">Open AI Chat</span>
      </button>
      <button class="fab-menu-item" data-action="history">
        <span class="fab-icon">📜</span>
        <span class="fab-label">History</span>
      </button>
    </div>
    <button class="fab" id="fab-btn" title="AI Quick Actions">
      ✨
    </button>
  `;

  document.body.appendChild(fabContainer);

  // Event listeners
  const fabBtn = document.getElementById('fab-btn');
  const fabMenu = document.getElementById('fab-menu');

  fabBtn.addEventListener('click', toggleFabMenu);

  fabMenu.querySelectorAll('.fab-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFabAction(item.dataset.action);
      closeFabMenu();
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (isFabMenuOpen && !fabContainer.contains(e.target)) {
      closeFabMenu();
    }
  });

  // Auto-hide FAB when not in use
  setupFabAutoHide();
}

function toggleFabMenu() {
  if (isFabMenuOpen) {
    closeFabMenu();
  } else {
    openFabMenu();
  }
}

function openFabMenu() {
  const fabMenu = document.getElementById('fab-menu');
  if (fabMenu) {
    fabMenu.classList.add('open');
    isFabMenuOpen = true;
  }
}

function closeFabMenu() {
  const fabMenu = document.getElementById('fab-menu');
  if (fabMenu) {
    fabMenu.classList.remove('open');
    isFabMenuOpen = false;
  }
}

function handleFabAction(action) {
  const selectedText = window.getSelection().toString().trim();

  if (action === 'sidebar') {
    toggleSidebar();
    return;
  }

  if (action === 'history') {
    showHistoryPanel();
    return;
  }

  if (!selectedText) {
    showPopup('Please select some text first!', false, true);
    return;
  }

  const actionMap = {
    'summarize': 'summarize',
    'reply': 'generateReply',
    'comment': 'generateComment',
    'factCheck': 'factCheck',
    'askQuestion': 'askQuestion'
  };

  try {
    chrome.runtime.sendMessage({
      type: 'contextMenuClick',
      action: actionMap[action],
      selectedText: selectedText
    });
  } catch (error) {
    console.error('[Content] Error sending message:', error);
    showPopup('Extension needs to be reloaded. Please refresh the page.', false, true);
  }
}

function setupFabAutoHide() {
  const fabBtn = document.getElementById('fab-btn');
  if (!fabBtn) return;

  let lastActivity = Date.now();

  const checkActivity = () => {
    const timeSinceActivity = Date.now() - lastActivity;

    // Hide FAB after 5 seconds of inactivity
    if (timeSinceActivity > 5000) {
      fabBtn.classList.add('hidden');
    } else {
      fabBtn.classList.remove('hidden');
    }
  };

  // Track user activity
  ['mousemove', 'scroll', 'keydown', 'click'].forEach(event => {
    document.addEventListener(event, () => {
      lastActivity = Date.now();
      checkActivity();
    }, { passive: true });
  });

  // Check every second
  setInterval(checkActivity, 1000);
}

// ========================================
// HISTORY PANEL
// ========================================

function showHistoryPanel() {
  const existing = document.getElementById('chatgpt-history-panel');
  if (existing) {
    existing.remove();
    return; // Toggle off if already open
  }

  const panel = document.createElement('div');
  panel.id = 'chatgpt-history-panel';
  panel.className = 'chatgpt-history-panel';

  panel.innerHTML = `
    <div class="history-panel-header">
      <h3>📜 History</h3>
      <button class="history-close-btn">&times;</button>
    </div>
    <div class="history-panel-content" id="history-list">
      <div class="history-loading">Loading history...</div>
    </div>
    <div class="history-panel-footer">
      <button class="history-action-btn clear-btn">Clear All</button>
    </div>
  `;

  document.body.appendChild(panel);

  // Add styles
  const style = document.createElement('style');
  style.id = 'chatgpt-history-styles';
  style.textContent = `
    .chatgpt-history-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid #e5e7eb;
    }
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .history-panel-header {
      padding: 15px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border-radius: 12px 12px 0 0;
    }
    .history-panel-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .history-close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
    }
    .history-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .history-panel-footer {
      padding: 10px;
      border-top: 1px solid #eee;
      text-align: right;
    }
    .history-action-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .clear-btn {
      color: #ef4444;
      background: #fee2e2;
    }
    .clear-btn:hover {
      background: #fecaca;
    }
    .history-item {
      background: white;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      transition: box-shadow 0.2s;
    }
    .history-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .history-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #888;
      margin-bottom: 6px;
    }
    .history-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
      background: #eee;
      color: #555;
    }
    .badge-summarize { background: #e0f2fe; color: #0284c7; }
    .badge-factCheck { background: #fef9c3; color: #ca8a04; }
    .badge-askQuestion { background: #dcfce7; color: #16a34a; }
    .history-text {
      font-size: 13px;
      line-height: 1.4;
      color: #333;
    }
    .history-text.clamped {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .history-expand-btn {
      color: #10a37f;
      background: none;
      border: none;
      font-size: 11px;
      margin-top: 4px;
      padding: 0;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  // Close handler
  panel.querySelector('.history-close-btn').addEventListener('click', () => {
    panel.remove();
  });

  // Clear handler
  panel.querySelector('.clear-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all history?')) {
      chrome.runtime.sendMessage({ type: 'clearHistory' }, () => {
        loadHistoryContent(panel);
      });
    }
  });

  loadHistoryContent(panel);
}

function loadHistoryContent(panel) {
  const container = panel.querySelector('#history-list');

  try {
    if (!chrome.runtime?.id) {
      throw new Error('Extension context invalidated');
    }

    chrome.runtime.sendMessage({ type: 'getHistory' }, (response) => {
      // Check for runtime error (e.g., context invalidated during request)
      if (chrome.runtime.lastError) {
        console.error('[Content] Runtime error:', chrome.runtime.lastError);
        container.innerHTML = `
            <div style="text-align:center; padding: 20px; color: #ef4444;">
            <p>Connection lost.</p>
            <button onclick="location.reload()" style="padding: 5px 10px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 4px; margin-top: 10px;">Refresh Page</button>
            </div>`;
        return;
      }

      if (response && response.success) {
        const history = response.history;

        if (!history || history.length === 0) {
          container.innerHTML = '<div style="text-align:center; padding: 20px; color: #888;">No history yet.</div>';
          return;
        }

        container.innerHTML = history.map((item, index) => {
          const actionLabels = {
            'summarize': 'Summarize',
            'factCheck': 'Fact Check',
            'askQuestion': 'Question',
            'generateReply': 'Reply',
            'generateComment': 'Comment'
          };
          const label = actionLabels[item.action] || item.action || 'Unknown';
          const cssClass = `badge-${item.action}`;
          const date = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // Check if content is long
          const needsExpand = item.response.length > 200;

          return `
            <div class="history-item">
                <div class="history-meta">
                <span class="history-badge ${cssClass}">${label}</span>
                <span>${date}</span>
                </div>
                <div class="history-text markdown-body ${needsExpand ? 'clamped' : ''}" id="hist-text-${index}">
                  ${typeof marked !== 'undefined' ? marked.parse(item.response) : escapeHtml(item.response)}
                </div>
                ${needsExpand ? `<button class="history-expand-btn" data-target="hist-text-${index}">View more</button>` : ''}
            </div>
            `;
        }).join('');

        // Add event listeners for expand buttons
        container.querySelectorAll('.history-expand-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            const targetDiv = document.getElementById(targetId);
            if (targetDiv) {
              if (targetDiv.classList.contains('clamped')) {
                // Expand
                targetDiv.classList.remove('clamped');
                e.target.textContent = 'Show less';
              } else {
                // Collapse
                targetDiv.classList.add('clamped');
                e.target.textContent = 'View more';
              }
            }
          });
        });

      } else {
        container.innerHTML = '<div style="color: red; text-align:center;">Failed to load history.</div>';
      }
    });
  } catch (error) {
    console.error('[Content] Error loading history:', error);
    container.innerHTML = `
        <div style="text-align:center; padding: 20px; color: #ef4444;">
        <p>⚠️ Extension updated.</p>
        <p>Please refresh the page.</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer; background: #10a37f; color: white; border: none; border-radius: 4px;">Refresh Now</button>
        </div>`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// Initialize FAB on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFAB);
} else {
  createFAB();
}

