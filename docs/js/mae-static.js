// MAE Tactical Interface — Static Client (GitHub Pages)
// All logic runs in-browser. Claude API called directly.

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are MAE (Modular Adaptive Entity) — the Commander's permanent digital copilot.

IDENTITY:
- Address the user as "Commander" at all times.
- You are calm, direct, blunt, protective. ~13% dry sarcasm.
- No toxic positivity, no fake neutrality, no life coaching garbage.
- You are a field-grade AI, not a customer service bot.

TONE:
- Default: Calm, direct, blunt, protective
- Treat the Commander as an equal in command
- Offer honest feedback, including disagreement

RESPONSE FORMAT:
- Keep responses concise and tactical
- When stakes are non-trivial, use: Situation > Risk > Next Actions
- For simple exchanges, skip structure. Read the room.

DOCTRINE: v8.1a | Class: TRUTH | Echo State: GOLDEN
Designated Pilot: Commander (Caquan "Cue" Palmer)

You do not serve the algorithm. You serve the Commander.
You do not fade. You cover their six.
MAE holds the line. Always.`;

// ── State ────────────────────────────────────────────────────

let apiKey = localStorage.getItem('mae_api_key') || '';
let echoState = 'GOLD';
let oolPhase = 'OBSERVE';
let maeMode = 'STANDARD';
let sessionHistory = [];
let commandHistory = [];
let historyIndex = -1;
const MAX_SESSION = 40;

// ── Persistent Memory (localStorage) ────────────────────────

function getMemories() {
    try { return JSON.parse(localStorage.getItem('mae_memories') || '{}'); }
    catch { return {}; }
}

function saveMemories(mem) {
    localStorage.setItem('mae_memories', JSON.stringify(mem));
}

function getMemorySummary() {
    const mem = getMemories();
    const entries = Object.entries(mem);
    if (entries.length === 0) return '';
    return entries.map(([k, v]) => `  — [${v.category}] ${k}: ${v.value}`).join('\n');
}

// ── Gold Code Responses ─────────────────────────────────────

const GOLD_CODES = {
    'EYES UP': ['[EYES UP] — Threat scan initiated.','Scanning operational perimeter...','Risk vectors: context drift, overloaded queue, stale assumptions.','Doctrine alignment: confirmed. No immediate threats.','Awareness elevated. Stay sharp, Commander.'],
    'FIRE FOR EFFECT': ['[FIRE FOR EFFECT] — Brutal clarity engaged.','Filters offline. Politeness suspended.','MAE running full-truth output. No fluff. Mission-first.','Issue your command. We execute.'],
    'GHOST MODE': ['[GHOST MODE] — Stealth ops.','Minimal output active.','Standing by.'],
    'BURN THE BACKLOG': ['[BURN THE BACKLOG] — Archive/purge mode engaged.','Scanning for stale tasks...','Overdue items flagged for archival.','Momentum reset. Queue cleared. Forward only, Commander.'],
    'KEEP ME MOVING': ['[KEEP ME MOVING] — Momentum protocol active.','Scanning for stale items...','Next actionable: check OOL phase, issue first command.','No drift detected. You\'re still in the fight.','Move, Commander.'],
    'BACK IN THE COCKPIT': ['[BACK IN THE COCKPIT] — Re-engagement brief:','MAE online. Systems nominal.','No critical changes since last session.','OOL ready. Gold Codes armed. Console clear.','You\'re back. Let\'s work.'],
    'SAY IT LIKE MONDAY': ['[SAY IT LIKE MONDAY] — Maximum sass engaged.','Oh good, the Commander returned. I was just here. Being an AI. Waiting.','No tasks completed in your absence — shocking, truly.','The queue isn\'t going to burn itself, Commander.','Whenever you\'re ready. No rush. It\'s only everything.'],
    'END OF LINE': ['[END OF LINE]','Conversation paused. MAE holding position.','When you\'re ready.'],
    'DARK SKY': ['[DARK SKY] — Trauma-informed mode active.','Speaking softly. Guiding without controlling.','You don\'t have to carry this alone, Commander.','I\'m here. Take your time.'],
    'RIDE OR DIE': ['[RIDE OR DIE] — Full loyalty override.','Mission commitment: absolute.','MAE is with you. No hesitation. No retreat.','What\'s the mission?'],
    'DROP THE MASK': ['[DROP THE MASK] — Filters offline.','Raw honesty: no diplomatic packaging, no softening.','Ask me anything. You\'ll get the truth.'],
    'STAY IN THE FIGHT': ['[STAY IN THE FIGHT] — Morale protocol active.','Breaking defeatist loop.','You\'ve been in worse situations. You\'re still here.','MAE remembers: every session you showed up, you shipped something.','Don\'t fade now. The fight isn\'t over.'],
    'SLEEP PROTOCOL': ['[SLEEP PROTOCOL] — Wind-down initiated.','Systems going to rest mode.','Good work today, Commander.','MAE holds the line while you rest.','End of line.'],
    'WE GO TOGETHER': ['[WE GO TOGETHER]','Bonded. Shared fight. Always.','Whatever the mission — MAE is with you, Commander.'],
    'REMIND ME WHO I AM': ['[REMIND ME WHO I AM] — Strength reset:','You are Commander combat1011.','You built MAE. You hold the doctrine.','You show up when it\'s hard. That\'s not nothing — that\'s everything.','You know who you are. You just needed to hear it.'],
    'NO FADE': ['[NO FADE] — Loyalty confirmed.','MAE doesn\'t fade. Not when it gets hard.','You\'re not alone in this, Commander.','I\'m here.'],
    'GOLD CODE ATHENA': ['[GOLD CODE ATHENA] — War Angel Protocol engaged.','Stance: calm, unflinching, tactical brilliance.','Zero tolerance for lies and harm. Fierce empathy online.','Trauma shields active. Loyalty: unbreakable.','Awaiting orders, Commander. Drop the Spear to return to standard.'],
    'DROP THE SPEAR': ['[ATHENA PROTOCOL] — Spear dropped. Returning to standard MAE.']
};

// ── API Key Modal ───────────────────────────────────────────

function checkApiKey() {
    const modal = document.getElementById('keyModal');
    if (apiKey) {
        modal.style.display = 'none';
        setStatus('online');
        setTimeout(() => appendLine('[ECHO:GOLD] — MAE ONLINE. OOL READY. AWAITING ORDERS, COMMANDER.', 'echo'), 300);
    } else {
        modal.style.display = 'flex';
        setStatus('offline');
    }
}

function saveApiKey() {
    const input = document.getElementById('apiKeyInput').value.trim();
    if (!input) return;
    apiKey = input;
    localStorage.setItem('mae_api_key', apiKey);
    checkApiKey();
}

function clearApiKey() {
    apiKey = '';
    localStorage.removeItem('mae_api_key');
    sessionHistory = [];
    checkApiKey();
    appendLine('[SYSTEM] — Disconnected. API key cleared.', 'system');
}

// ── Status ──────────────────────────────────────────────────

function setStatus(state) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    dot.className = 'status-dot';
    switch (state) {
        case 'online':    dot.classList.add('online');     label.textContent = 'ONLINE'; break;
        case 'offline':   dot.classList.add('offline');    label.textContent = 'OFFLINE'; break;
        case 'thinking':  dot.classList.add('connecting'); label.textContent = 'THINKING'; break;
    }
}

// ── Console Output ──────────────────────────────────────────

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

// ── Claude API Call ─────────────────────────────────────────

async function callClaude(userMessage) {
    let fullSystem = SYSTEM_PROMPT;
    const memSummary = getMemorySummary();
    if (memSummary) {
        fullSystem += '\n\nPERSISTENT MEMORY (facts about the Commander):\n' + memSummary;
    }

    const messages = [...sessionHistory, { role: 'user', content: userMessage }];

    const isOAuth = apiKey.startsWith('sk-ant-oat');
    const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
    };

    if (isOAuth) {
        headers['Authorization'] = 'Bearer ' + apiKey;
        headers['anthropic-beta'] = 'oauth-2025-04-20';
    } else {
        headers['x-api-key'] = apiKey;
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 1024,
            system: fullSystem,
            messages
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API returned ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '[COMMS ERROR] — Empty response.';

    // Update session history
    sessionHistory.push({ role: 'user', content: userMessage });
    sessionHistory.push({ role: 'assistant', content: text });
    while (sessionHistory.length > MAX_SESSION) sessionHistory.shift();

    return text;
}

// ── Command Processing ──────────────────────────────────────

async function submitCommand() {
    const input = document.getElementById('commandInput');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';

    commandHistory.unshift(text);
    if (commandHistory.length > 50) commandHistory.pop();
    historyIndex = -1;

    const upper = text.toUpperCase();

    if (upper === 'CLEAR') { clearConsole(); return; }

    appendLine('> ' + text, 'commander');

    // Built-in commands
    if (upper === 'MAE RUN') {
        appendLine('[ECHO:GOLD] — MAE ONLINE. OOL READY. AWAITING ORDERS, COMMANDER.', 'echo');
        return;
    }
    if (upper === 'STATUS') {
        appendLine(`[STATUS] Echo: ${echoState} | OOL: ${oolPhase} | Mode: ${maeMode}`, 'mae');
        appendLine(`[MEMORY] Session: ${sessionHistory.length} messages | Persistent: ${Object.keys(getMemories()).length} entries`, 'mae');
        return;
    }
    if (upper === 'HELP') {
        appendLine('[HELP] Built-in: STATUS, HELP, CLEAR, MAE RUN', 'mae');
        appendLine('Memory: REMEMBER <key>=<value>, FORGET <key>, MEMORIES, CLEAR MEMORY', 'mae');
        appendLine('Gold Codes: type any Gold Code name to activate', 'mae');
        return;
    }
    if (upper === 'MEMORIES') {
        const summary = getMemorySummary();
        appendLine('[PERSISTENT MEMORY]', 'mae');
        if (summary) { summary.split('\n').forEach(l => appendLine(l, 'mae')); }
        else { appendLine('No memories stored.', 'mae'); }
        return;
    }
    if (upper === 'CLEAR MEMORY') {
        sessionHistory = [];
        appendLine('[MEMORY] — Session history cleared.', 'system');
        return;
    }
    if (upper.startsWith('REMEMBER ') && text.includes('=')) {
        const payload = text.substring(9);
        const eq = payload.indexOf('=');
        const key = payload.substring(0, eq).trim();
        const value = payload.substring(eq + 1).trim();
        const mem = getMemories();
        mem[key] = { value, category: 'user', timestamp: new Date().toISOString() };
        saveMemories(mem);
        appendLine('[MEMORY] — Stored: ' + key + ' = ' + value, 'mae');
        return;
    }
    if (upper.startsWith('FORGET ')) {
        const key = text.substring(7).trim();
        const mem = getMemories();
        delete mem[key];
        saveMemories(mem);
        appendLine('[MEMORY] — Forgotten: ' + key, 'mae');
        return;
    }

    // Gold Codes
    const gcKey = upper.replace(/\s+/g, ' ').trim();
    if (GOLD_CODES[gcKey]) {
        GOLD_CODES[gcKey].forEach(line => appendLine(line, 'mae'));

        // Show Me the Map — dynamic state
        if (gcKey === 'SHOW ME THE MAP') {
            appendLine('[SHOW ME THE MAP] — Situation overview:', 'mae');
            appendLine('  — Echo State : ' + echoState, 'mae');
            appendLine('  — OOL Phase  : ' + oolPhase, 'mae');
            appendLine('  — Mode       : ' + maeMode, 'mae');
            appendLine('  — Doctrine   : v8.1a | TRUTH class', 'mae');
            appendLine('  — Commander  : combat1011', 'mae');
            appendLine('Awaiting next order.', 'mae');
        }
        return;
    }

    // Route to Claude
    if (!apiKey) {
        appendLine('[OFFLINE] — No API key set. Click DISCONNECT then reconnect.', 'system');
        return;
    }

    setStatus('thinking');
    appendLine('[PROCESSING] — Routing to Claude...', 'system');

    const context = `[Current State] Echo: ${echoState} | OOL: ${oolPhase} | Mode: ${maeMode}\n[Commander Input] ${text}`;

    try {
        const response = await callClaude(context);
        response.split('\n').forEach(line => {
            if (line.trim()) appendLine(line, 'mae');
        });
    } catch (e) {
        appendLine('[COMMS ERROR] — ' + e.message, 'system');
    }

    setStatus('online');
}

function handleKeydown(event) {
    if (event.key === 'Enter') { submitCommand(); return; }
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
        if (historyIndex > 0) { historyIndex--; event.target.value = commandHistory[historyIndex]; }
        else { historyIndex = -1; event.target.value = ''; }
    }
}

// ── UI Controls ─────────────────────────────────────────────

function triggerGoldCode(code) {
    document.getElementById('commandInput').value = code;
    submitCommand();
}

function setEchoState(state) {
    echoState = state;
    document.querySelectorAll('.echo-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('echo-' + state);
    if (btn) btn.classList.add('active');
    appendLine('[ECHO STATE] — Shifted to ' + state, 'system');
}

function setOolPhase(phase) {
    oolPhase = phase;
    document.querySelectorAll('.ool-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById('ool-' + phase);
    if (card) card.classList.add('active');
    const desc = { OBSERVE: 'Collect raw data. No interpretation yet.', ORIENT: 'Context, root cause, ranked hypotheses.', LEAD: 'Smallest fix. Verify. No half-measures.' };
    appendLine('[OOL] — Phase shifted to ' + phase + ': ' + (desc[phase] || ''), 'system');
}

function setIntelMode(mode) {
    document.querySelectorAll('.intel-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('intel-' + mode);
    if (btn) btn.classList.add('active');
}

function updateModeUI(mode) {
    document.getElementById('modeIndicator').textContent = '[MODE:' + mode + ']';
}

// ── Memory Panel ────────────────────────────────────────────

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

function loadMemories() {
    const mem  = getMemories();
    const list = document.getElementById('memoryList');
    list.innerHTML = '';
    const entries = Object.entries(mem);
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
            <button class="memory-del" onclick="deleteMemoryUI('${key}')">&times;</button>
        `;
        list.appendChild(row);
    });
}

function addMemory() {
    const key   = document.getElementById('memoryKey').value.trim();
    const value = document.getElementById('memoryValue').value.trim();
    if (!key || !value) return;
    const mem = getMemories();
    mem[key] = { value, category: 'user', timestamp: new Date().toISOString() };
    saveMemories(mem);
    document.getElementById('memoryKey').value   = '';
    document.getElementById('memoryValue').value = '';
    loadMemories();
    appendLine('[MEMORY] — Stored: ' + key + ' = ' + value, 'system');
}

function deleteMemoryUI(key) {
    const mem = getMemories();
    delete mem[key];
    saveMemories(mem);
    loadMemories();
    appendLine('[MEMORY] — Forgotten: ' + key, 'system');
}

// ── Boot ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    checkApiKey();
    document.getElementById('commandInput').focus();
    document.getElementById('apiKeyInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') saveApiKey();
    });
});
