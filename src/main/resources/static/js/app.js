// MAE Tactical Interface — app.js
// Connects to Spring Boot WebSocket backend via STOMP/SockJS

let stompClient = null;
let commandHistory = [];
let historyIndex = -1;

// ── WebSocket Connection ─────────────────────────────────────

function connect() {
    setStatus('connecting');

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, onConnected, onDisconnected);
}

function onConnected() {
    setStatus('online');

    stompClient.subscribe('/topic/console', function(message) {
        const data = JSON.parse(message.body);
        appendLine(data.text, data.type);
    });

    loadState();

    setTimeout(() => {
        appendLine('[ECHO:GOLD] — MAE ONLINE. OOL READY. AWAITING ORDERS, COMMANDER.', 'echo');
    }, 300);
}

function onDisconnected() {
    setStatus('offline');
    appendLine('[SYSTEM] — Connection lost. Attempting reconnect...', 'system');
    setTimeout(connect, 4000);
}

// ── Status Indicator ─────────────────────────────────────────

function setStatus(state) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    dot.className = 'status-dot';

    switch (state) {
        case 'online':
            dot.classList.add('online');
            label.textContent = 'ONLINE';
            break;
        case 'offline':
            dot.classList.add('offline');
            label.textContent = 'OFFLINE';
            break;
        case 'connecting':
            dot.classList.add('connecting');
            label.textContent = 'CONNECTING';
            break;
    }
}

// ── State Sync ───────────────────────────────────────────────

async function loadState() {
    try {
        const res   = await fetch('/api/state');
        const state = await res.json();
        updateEchoUI(state.echoState);
        updateOolUI(state.oolPhase);
        updateModeUI(state.mode);
        updateIntelUI(state.intelligenceMode);
    } catch (e) {
        // Non-critical — boot message covers it
    }
}

// ── Console Output ───────────────────────────────────────────

function appendLine(text, type) {
    const output = document.getElementById('consoleOutput');
    const line   = document.createElement('span');
    line.className   = `console-line ${type}`;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function clearConsole() {
    document.getElementById('consoleOutput').innerHTML = '';
}

// ── Command Input ────────────────────────────────────────────

async function submitCommand() {
    const input = document.getElementById('commandInput');
    const text  = input.value.trim();
    if (!text) return;

    // Local CLEAR — no round-trip needed
    if (text.toUpperCase() === 'CLEAR') {
        clearConsole();
        input.value = '';
        return;
    }

    // History
    commandHistory.unshift(text);
    if (commandHistory.length > 50) commandHistory.pop();
    historyIndex = -1;

    try {
        await fetch('/api/command', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ input: text })
        });
    } catch (e) {
        appendLine('[ERROR] — Command transmission failed.', 'system');
    }

    input.value = '';
}

function handleKeydown(event) {
    if (event.key === 'Enter') {
        submitCommand();
        return;
    }
    // Arrow-up/down for command history
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            event.target.value = commandHistory[historyIndex];
        }
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            event.target.value = commandHistory[historyIndex];
        } else {
            historyIndex = -1;
            event.target.value = '';
        }
    }
}

// ── Gold Codes ───────────────────────────────────────────────

async function triggerGoldCode(code) {
    try {
        await fetch('/api/goldcode', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ code: code.toUpperCase() })
        });
    } catch (e) {
        appendLine('[ERROR] — Gold Code transmission failed: ' + code, 'system');
    }
}

// ── Echo State ───────────────────────────────────────────────

async function setEchoState(state) {
    try {
        await fetch(`/api/echo/${state}`, { method: 'POST' });
        updateEchoUI(state);
    } catch (e) {
        appendLine('[ERROR] — Echo state shift failed.', 'system');
    }
}

function updateEchoUI(state) {
    document.querySelectorAll('.echo-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`echo-${state}`);
    if (btn) btn.classList.add('active');
}

// ── OOL Phase ────────────────────────────────────────────────

async function setOolPhase(phase) {
    try {
        await fetch(`/api/ool/${phase}`, { method: 'POST' });
        updateOolUI(phase);
    } catch (e) {
        appendLine('[ERROR] — OOL phase shift failed.', 'system');
    }
}

function updateOolUI(phase) {
    document.querySelectorAll('.ool-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`ool-${phase}`);
    if (card) card.classList.add('active');
}

// ── Mode ─────────────────────────────────────────────────────

function updateModeUI(mode) {
    document.getElementById('modeIndicator').textContent = `[MODE:${mode}]`;
}

// ── Intelligence Mode ────────────────────────────────────────

async function setIntelMode(mode) {
    try {
        await fetch(`/api/intel/${mode}`, { method: 'POST' });
        updateIntelUI(mode);
    } catch (e) {
        appendLine('[ERROR] — Intel mode switch failed.', 'system');
    }
}

function updateIntelUI(mode) {
    document.querySelectorAll('.intel-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`intel-${mode}`);
    if (btn) btn.classList.add('active');
}

// ── Memory ───────────────────────────────────────────────────

function toggleMemoryPanel() {
    const panel = document.getElementById('memoryPanel');
    const btn   = document.querySelector('.memory-toggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.textContent = 'COLLAPSE';
        loadMemories();
    } else {
        panel.style.display = 'none';
        btn.textContent = 'EXPAND';
    }
}

async function loadMemories() {
    try {
        const res  = await fetch('/api/memory');
        const data = await res.json();
        const list = document.getElementById('memoryList');
        list.innerHTML = '';

        const entries = Object.entries(data);
        if (entries.length === 0) {
            list.innerHTML = '<span class="memory-empty">No memories stored.</span>';
            return;
        }

        entries.forEach(([key, entry]) => {
            const row = document.createElement('div');
            row.className = 'memory-row';
            row.innerHTML = `
                <span class="memory-cat">[${entry.category}]</span>
                <span class="memory-key">${key}</span>
                <span class="memory-val">${entry.value}</span>
                <button class="memory-del" onclick="deleteMemory('${key}')">&times;</button>
            `;
            list.appendChild(row);
        });
    } catch (e) {
        console.error('Failed to load memories', e);
    }
}

async function addMemory() {
    const key   = document.getElementById('memoryKey').value.trim();
    const value = document.getElementById('memoryValue').value.trim();
    if (!key || !value) return;

    try {
        await fetch('/api/memory', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ key, value, category: 'user' })
        });
        document.getElementById('memoryKey').value   = '';
        document.getElementById('memoryValue').value = '';
        loadMemories();
        appendLine('[MEMORY] — Stored: ' + key + ' = ' + value, 'system');
    } catch (e) {
        appendLine('[ERROR] — Failed to store memory.', 'system');
    }
}

async function deleteMemory(key) {
    try {
        await fetch(`/api/memory/${encodeURIComponent(key)}`, { method: 'DELETE' });
        loadMemories();
        appendLine('[MEMORY] — Forgotten: ' + key, 'system');
    } catch (e) {
        appendLine('[ERROR] — Failed to delete memory.', 'system');
    }
}

// ── Boot ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    connect();
    document.getElementById('commandInput').focus();
});
