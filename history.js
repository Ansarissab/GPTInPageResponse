console.log('[History] Script loaded');

let historyData = [];

// Load history on page load
loadHistory();

// Event listeners
document.getElementById('refresh-btn').addEventListener('click', loadHistory);
document.getElementById('export-txt-btn').addEventListener('click', exportHistoryText);
document.getElementById('export-json-btn').addEventListener('click', exportHistoryJson);
document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', handleFileImport);
document.getElementById('clear-btn').addEventListener('click', clearHistory);

async function loadHistory() {
    try {
        console.log('[History] Requesting history from background...');
        const response = await chrome.runtime.sendMessage({ type: 'getHistory' });
        console.log('[History] Received response:', response);

        if (response && response.success) {
            historyData = response.history;
            if (!Array.isArray(historyData)) {
                console.error('[History] Received history is not an array:', historyData);
                historyData = [];
            }
            console.log('[History] Loaded entries:', historyData.length);
            renderHistory();
            updateStats();
        } else {
            console.error('[History] Failed response:', response);
        }
    } catch (error) {
        console.error('[History] Error loading history:', error);
    }
}

function renderHistory() {
    const listEl = document.getElementById('history-list');

    if (historyData.length === 0) {
        listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No history yet</h3>
        <p>Your AI responses will appear here</p>
      </div>
    `;
        return;
    }

    listEl.innerHTML = '';

    historyData.forEach((entry, index) => {
        const item = createHistoryItem(entry, index);
        listEl.appendChild(item);
    });
}

function createHistoryItem(entry, index) {
    const div = document.createElement('div');
    div.className = 'history-item';

    const timestamp = entry.timestamp || new Date().toISOString();
    const date = new Date(timestamp).toLocaleString();
    const action = entry.action || 'unknown';
    const actionClass = `action-${action}`;
    const actionName = getActionName(action);
    const model = entry.model || 'Unknown Model';
    const provider = entry.provider || 'Unknown Provider';
    const inputText = entry.inputText || '';
    const responseText = entry.response || '';

    div.innerHTML = `
    <div class="history-header">
      <div class="history-meta">
        <span class="action-badge ${actionClass}">${actionName}${entry.isModification ? ' 🔄' : ''}</span>
        <span class="history-time">⏰ ${date}</span>
        <span class="history-model">🤖 ${model} (${provider})</span>
        ${entry.pageTitle ? `<a href="${entry.pageUrl || '#'}" class="page-link" target="_blank" title="${entry.pageUrl || ''}">📄 ${entry.pageTitle}</a>` : ''}
      </div>
    </div>
    
    <div class="history-content">
      ${!entry.isModification && inputText ? `
        <div class="content-section">
          <div class="content-label">Input Text</div>
          <div class="content-text collapsed" id="input-${index}">
            ${escapeHtml(inputText)}
          </div>
          ${inputText.length > 200 ? `<button class="expand-btn" data-target="input-${index}">Show more ▼</button>` : ''}
        </div>
      ` : ''}
      
      <div class="content-section">
        <div class="content-label">AI Response</div>
        <div class="content-text collapsed markdown-body" id="response-${index}">
          ${(typeof marked !== 'undefined') ? marked.parse(responseText) : (console.error('Marked library not found'), escapeHtml(responseText))}
        </div>
        ${responseText.length > 200 ? `<button class="expand-btn" data-target="response-${index}">Show more ▼</button>` : ''}
      </div>
    </div>
  `;

    // Add expand/collapse handlers
    div.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.dataset.target;
            const contentEl = document.getElementById(targetId);

            if (contentEl.classList.contains('collapsed')) {
                contentEl.classList.remove('collapsed');
                btn.textContent = 'Show less ▲';
            } else {
                contentEl.classList.add('collapsed');
                btn.textContent = 'Show more ▼';
            }
        });
    });

    return div;
}

function getActionName(action) {
    const names = {
        'summarize': '📝 Summarize',
        'generateReply': '✉️ Reply',
        'generateComment': '💬 Comment',
        'shorter': '📉 Shorter',
        'longer': '📈 Longer',
        'regenerate': '🔄 Regenerate',
        'sidebar_chat': '💭 Chat'
    };
    return names[action] || action;
}

function updateStats() {
    const total = historyData.length;

    // Count today's entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = historyData.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
    }).length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('today-count').textContent = todayCount;
}

async function exportHistoryText() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'exportHistory' });
        if (response.success) {
            downloadFile(response.content, `ai-assistant-history.txt`, 'text/plain');
        }
    } catch (error) {
        console.error('[History] Export text error:', error);
    }
}

async function exportHistoryJson() {
    try {
        // We use exportHistoryJson to get the raw array
        const response = await chrome.runtime.sendMessage({ type: 'exportHistoryJson' });
        if (response.success) {
            const jsonStr = JSON.stringify(response.history, null, 2);
            downloadFile(jsonStr, `ai-assistant-history.json`, 'application/json');
        }
    } catch (error) {
        console.error('[History] Export JSON error:', error);
    }
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (!Array.isArray(json)) {
                alert('Invalid JSON file. History must be an array.');
                return;
            }

            const response = await chrome.runtime.sendMessage({
                type: 'importHistory',
                history: json
            });

            if (response.success) {
                alert(`Successfully imported ${response.addedCount} items.`);
                loadHistory(); // Reload UI
            } else {
                alert('Import failed: ' + response.error);
            }
        } catch (error) {
            console.error('Import Error:', error);
            alert('Error parsing JSON file.');
        }
        event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
}

async function clearHistory() {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({ type: 'clearHistory' });

        if (response.success) {
            historyData = [];
            renderHistory();
            updateStats();
        }
    } catch (error) {
        console.error('[History] Clear error:', error);
        alert('Failed to clear history');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
