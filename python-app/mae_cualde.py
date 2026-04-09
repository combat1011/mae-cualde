#!/usr/bin/env python3
"""
MAE Cualde — Modular Adaptive Entity — Tactical Dashboard
Python Flask Edition | Doctrine v8.1a | Single-File Deployment

Usage:
    python mae_cualde.py
    Opens http://localhost:8080 in your default browser.
"""

import json
import os
import threading
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, render_template_string, request

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Memory persistence
# ---------------------------------------------------------------------------
MEMORY_FILE = Path(__file__).parent / "mae-memory.json"


def _load_memory() -> dict:
    """Load memory from JSON file, return empty dict on failure."""
    try:
        if MEMORY_FILE.exists():
            return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_memory(data: dict) -> None:
    """Persist memory dict to JSON file."""
    MEMORY_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the full tactical dashboard."""
    return render_template_string(DASHBOARD_HTML)


@app.route("/api/memory", methods=["GET"])
def get_memory():
    """Return all memory key/value pairs."""
    return jsonify(_load_memory())


@app.route("/api/memory", methods=["POST"])
def post_memory():
    """Add or update a memory entry. Expects JSON {key, value}."""
    body = request.get_json(force=True)
    key = body.get("key", "").strip()
    value = body.get("value", "").strip()
    if not key:
        return jsonify({"error": "key is required"}), 400
    mem = _load_memory()
    mem[key] = value
    _save_memory(mem)
    return jsonify({"ok": True, "memory": mem})


@app.route("/api/memory", methods=["DELETE"])
def delete_memory():
    """Delete a memory entry. Expects JSON {key}."""
    body = request.get_json(force=True)
    key = body.get("key", "").strip()
    mem = _load_memory()
    if key in mem:
        del mem[key]
        _save_memory(mem)
    return jsonify({"ok": True, "memory": mem})


@app.route("/api/chat", methods=["POST"])
def chat_proxy():
    """Proxy chat requests to Claude API to avoid browser CORS issues."""
    try:
        import requests as req
    except ImportError:
        return jsonify({"error": "requests library not installed"}), 500

    body = request.get_json(force=True)
    api_key = body.get("apiKey", "")
    messages = body.get("messages", [])
    system_prompt = body.get("system", "")

    if not api_key:
        return jsonify({"error": "No API key provided"}), 400

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1024,
        "messages": messages,
    }
    if system_prompt:
        payload["system"] = system_prompt

    try:
        resp = req.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=60,
        )
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---------------------------------------------------------------------------
# Full Dashboard HTML / CSS / JS  (embedded)
# ---------------------------------------------------------------------------

DASHBOARD_HTML = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MAE — Tactical Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
/* ── CSS Custom Properties ── */
:root {
  --bg-primary: #0a0c0a;
  --bg-secondary: #111311;
  --bg-tertiary: #181a18;
  --accent: #4ade80;
  --accent-dim: #22c55e;
  --accent-glow: rgba(74,222,128,0.15);
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --console-bg: #0b0d0b;
  --border-color: #1e2a1e;
  --color-mae: #4ade80;
  --color-commander: #60a5fa;
  --color-system: #475569;
  --color-echo: #86efac;
  --color-error: #f87171;
  --color-athena: #a78bfa;
  --athena-border: #7c3aed;
  --font-mono: 'Share Tech Mono', monospace;
  --font-display: 'Rajdhani', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-primary); }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent-dim); }

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 4px;
}
.header-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 2px;
}
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.connect-btn {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 16px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
}
.connect-btn:hover { background: var(--accent); color: var(--bg-primary); }
.connect-btn.connected { border-color: var(--color-error); color: var(--color-error); }
.connect-btn.connected:hover { background: var(--color-error); color: var(--bg-primary); }

/* ── Layout ── */
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto 1fr auto;
  gap: 0;
  height: calc(100vh - 53px);
}

/* ── Section base ── */
.section {
  border: 1px solid var(--border-color);
  padding: 16px;
  background: var(--bg-secondary);
}
.section-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

/* ── OOL Triangle ── */
.ool-section {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
}
.ool-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.ool-card {
  border: 1px solid var(--border-color);
  padding: 14px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-tertiary);
}
.ool-card:hover { border-color: var(--accent); background: var(--accent-glow); }
.ool-card.active { border-color: var(--accent); background: var(--accent-glow); }
.ool-card .label {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-primary);
}
.ool-card .desc {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ── Gold Codes ── */
.goldcodes-section {
  grid-column: 2 / 3;
  grid-row: 1 / 3;
  overflow-y: auto;
}
.gc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.gc-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 10px 6px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}
.gc-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
.gc-btn.athena {
  border-color: var(--athena-border);
  color: var(--color-athena);
}
.gc-btn.athena:hover {
  background: rgba(124,58,237,0.15);
  border-color: var(--color-athena);
}

/* ── Memory Panel ── */
.memory-section {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
  max-height: 200px;
  overflow-y: auto;
}
.memory-toggle {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.memory-toggle .arrow { transition: transform 0.2s; font-size: 10px; color: var(--accent); }
.memory-toggle .arrow.open { transform: rotate(90deg); }
.memory-body { display: none; margin-top: 8px; }
.memory-body.open { display: block; }
.mem-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
}
.mem-entry .mem-key { color: var(--accent); }
.mem-entry .mem-val { color: var(--text-secondary); flex: 1; margin-left: 8px; }
.mem-entry .mem-del {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 6px;
}
.mem-add {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.mem-add input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 8px;
}
.mem-add button {
  background: var(--accent);
  border: none;
  color: var(--bg-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 12px;
  cursor: pointer;
  font-weight: 700;
}

/* ── Console ── */
.console-section {
  grid-column: 1 / 3;
  grid-row: 3 / 4;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.console-output {
  flex: 1;
  background: var(--console-bg);
  border: 1px solid var(--border-color);
  padding: 12px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
  min-height: 120px;
}
.console-input-row {
  display: flex;
  gap: 0;
  margin-top: 8px;
}
.console-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 10px 14px;
  outline: none;
}
.console-input:focus { border-color: var(--accent); }
.console-submit {
  background: var(--accent);
  border: none;
  color: var(--bg-primary);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  padding: 10px 24px;
  cursor: pointer;
  letter-spacing: 2px;
}
.console-submit:hover { background: var(--accent-dim); }

/* console line types */
.line-mae { color: var(--color-mae); }
.line-commander { color: var(--color-commander); }
.line-system { color: var(--color-system); }
.line-echo { color: var(--color-echo); }
.line-error { color: var(--color-error); }
.line-athena { color: var(--color-athena); }

/* ── Status Bar ── */
.statusbar {
  grid-column: 1 / 3;
  grid-row: 4 / 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 11px;
}
.echo-btns { display: flex; gap: 6px; }
.echo-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 10px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
}
.echo-btn:hover { border-color: var(--accent); color: var(--accent); }
.echo-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
.intel-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.intel-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.intel-btn.active { border-color: var(--color-commander); color: var(--color-commander); }
.mode-indicator { color: var(--text-muted); letter-spacing: 1px; }

/* ── API Key Modal ── */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.modal-overlay.open { display: flex; }
.modal-box {
  background: var(--bg-secondary);
  border: 1px solid var(--accent);
  padding: 24px;
  width: 420px;
  max-width: 90vw;
}
.modal-box h3 {
  font-family: var(--font-display);
  color: var(--accent);
  margin-bottom: 12px;
  letter-spacing: 2px;
}
.modal-box p { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
.modal-box input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
.modal-btns { display: flex; gap: 8px; justify-content: flex-end; }
.modal-btns button {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 16px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
}
.modal-btns .modal-save { border-color: var(--accent); color: var(--accent); }
.modal-btns .modal-save:hover { background: var(--accent); color: var(--bg-primary); }

/* ── Responsive ── */
@media (max-width: 900px) {
  .dashboard { grid-template-columns: 1fr; }
  .goldcodes-section { grid-column: 1; grid-row: auto; }
  .console-section { grid-column: 1; }
  .statusbar { grid-column: 1; flex-wrap: wrap; gap: 8px; }
}
</style>
</head>
<body>

<!-- ═══ HEADER ═══ -->
<div class="header">
  <div class="header-left">
    <div class="status-dot" id="statusDot"></div>
    <div>
      <div class="header-title">MAE</div>
      <div class="header-subtitle">MODULAR ADAPTIVE ENTITY &mdash; v1.0</div>
    </div>
  </div>
  <button class="connect-btn" id="connectBtn" onclick="toggleConnect()">CONNECT AI</button>
</div>

<!-- ═══ DASHBOARD GRID ═══ -->
<div class="dashboard">

  <!-- OOL Triangle -->
  <div class="section ool-section">
    <div class="section-title">OOL TRIANGLE</div>
    <div class="ool-grid">
      <div class="ool-card active" data-phase="observe" onclick="setOOL(this,'observe')">
        <div class="label">OBSERVE</div>
        <div class="desc">Gather intel, scan environment</div>
      </div>
      <div class="ool-card" data-phase="orient" onclick="setOOL(this,'orient')">
        <div class="label">ORIENT</div>
        <div class="desc">Analyze, prioritize, plan</div>
      </div>
      <div class="ool-card" data-phase="lead" onclick="setOOL(this,'lead')">
        <div class="label">LEAD</div>
        <div class="desc">Decide, execute, adapt</div>
      </div>
    </div>
  </div>

  <!-- Gold Codes -->
  <div class="section goldcodes-section">
    <div class="section-title">GOLD CODES</div>
    <div class="gc-grid">
      <button class="gc-btn" onclick="fireGoldCode('EYES UP')">EYES UP</button>
      <button class="gc-btn" onclick="fireGoldCode('FIRE FOR EFFECT')">FIRE FOR EFFECT</button>
      <button class="gc-btn" onclick="fireGoldCode('GHOST MODE')">GHOST MODE</button>
      <button class="gc-btn" onclick="fireGoldCode('SHOW ME THE MAP')">SHOW ME THE MAP</button>
      <button class="gc-btn" onclick="fireGoldCode('BURN THE BACKLOG')">BURN THE BACKLOG</button>
      <button class="gc-btn" onclick="fireGoldCode('KEEP ME MOVING')">KEEP ME MOVING</button>
      <button class="gc-btn" onclick="fireGoldCode('BACK IN THE COCKPIT')">BACK IN THE COCKPIT</button>
      <button class="gc-btn" onclick="fireGoldCode('SAY IT LIKE MONDAY')">SAY IT LIKE MONDAY</button>
      <button class="gc-btn" onclick="fireGoldCode('END OF LINE')">END OF LINE</button>
      <button class="gc-btn" onclick="fireGoldCode('DROP THE MASK')">DROP THE MASK</button>
      <button class="gc-btn" onclick="fireGoldCode('RIDE OR DIE')">RIDE OR DIE</button>
      <button class="gc-btn" onclick="fireGoldCode('STAY IN THE FIGHT')">STAY IN THE FIGHT</button>
      <button class="gc-btn" onclick="fireGoldCode('DARK SKY')">DARK SKY</button>
      <button class="gc-btn" onclick="fireGoldCode('SLEEP PROTOCOL')">SLEEP PROTOCOL</button>
      <button class="gc-btn" onclick="fireGoldCode('WE GO TOGETHER')">WE GO TOGETHER</button>
      <button class="gc-btn" onclick="fireGoldCode('REMIND ME WHO I AM')">REMIND ME WHO I AM</button>
      <button class="gc-btn" onclick="fireGoldCode('NO FADE')">NO FADE</button>
      <button class="gc-btn athena" onclick="fireGoldCode('GOLD CODE ATHENA')">GOLD CODE ATHENA</button>
    </div>
  </div>

  <!-- Memory Panel -->
  <div class="section memory-section">
    <div class="memory-toggle" onclick="toggleMemory()">
      <span class="arrow" id="memArrow">&#9654;</span>
      <span class="section-title" style="margin-bottom:0">MEMORY</span>
    </div>
    <div class="memory-body" id="memoryBody">
      <div id="memoryList"></div>
      <div class="mem-add">
        <input type="text" id="memKeyInput" placeholder="key">
        <input type="text" id="memValInput" placeholder="value">
        <button onclick="addMemory()">+</button>
      </div>
    </div>
  </div>

  <!-- Console -->
  <div class="section console-section">
    <div class="section-title">TACTICAL CONSOLE</div>
    <div class="console-output" id="consoleOutput"></div>
    <div class="console-input-row">
      <input class="console-input" id="consoleInput" type="text"
             placeholder="Enter command..." autocomplete="off"
             onkeydown="handleInputKey(event)">
      <button class="console-submit" onclick="submitCommand()">SUBMIT</button>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="statusbar">
    <div class="echo-btns">
      <button class="echo-btn active" data-echo="GOLD" onclick="setEcho(this,'GOLD')">GOLD</button>
      <button class="echo-btn" data-echo="BLACK" onclick="setEcho(this,'BLACK')">BLACK</button>
      <button class="echo-btn" data-echo="STATIC" onclick="setEcho(this,'STATIC')">STATIC</button>
      <button class="echo-btn" data-echo="VOID" onclick="setEcho(this,'VOID')">VOID</button>
    </div>
    <div class="intel-toggle">
      <button class="intel-btn" id="intelBtn" onclick="toggleIntel()">CLAUDE</button>
      <span class="mode-indicator" id="modeIndicator">MODE: STANDARD</span>
    </div>
  </div>
</div>

<!-- ═══ API KEY MODAL ═══ -->
<div class="modal-overlay" id="apiModal">
  <div class="modal-box">
    <h3>CONNECT AI</h3>
    <p>Enter your Anthropic API key. This is stored in-browser only (sessionStorage). MAE works without it in demo mode.</p>
    <input type="password" id="apiKeyInput" placeholder="sk-ant-...">
    <div class="modal-btns">
      <button onclick="closeModal()">CANCEL</button>
      <button class="modal-save" onclick="saveApiKey()">CONNECT</button>
    </div>
  </div>
</div>

<script>
// ── State ──
let echoState = 'GOLD';
let oolPhase = 'OBSERVE';
let intelMode = false;
let athenaActive = false;
let apiKey = sessionStorage.getItem('mae-api-key') || '';
let sessionHistory = [];
const MAX_HISTORY = 40;
let commandHistory = [];
let historyIndex = -1;

// ── Gold Code Responses ──
const GOLD_CODES = {
  'EYES UP': [
    '[EYES UP] — Threat scan initiated.',
    'Scanning operational perimeter...',
    'Risk vectors: context drift, overloaded queue, stale assumptions.',
    'Doctrine alignment: confirmed. No immediate threats.',
    'Awareness elevated. Stay sharp, Commander.'
  ],
  'FIRE FOR EFFECT': [
    '[FIRE FOR EFFECT] — Brutal clarity engaged.',
    'Filters offline. Politeness suspended.',
    'MAE running full-truth output. No fluff. Mission-first.',
    'Issue your command. We execute.'
  ],
  'GHOST MODE': [
    '[GHOST MODE] — Stealth ops.',
    'Minimal output active.',
    'Standing by.'
  ],
  'BURN THE BACKLOG': [
    '[BURN THE BACKLOG] — Archive/purge mode engaged.',
    'Scanning for stale tasks...',
    'Overdue items flagged for archival.',
    'Momentum reset. Queue cleared. Forward only, Commander.'
  ],
  'KEEP ME MOVING': [
    '[KEEP ME MOVING] — Momentum protocol active.',
    'Scanning for stale items...',
    'Next actionable: check OOL phase, issue first command.',
    'No drift detected. You\'re still in the fight.',
    'Move, Commander.'
  ],
  'BACK IN THE COCKPIT': [
    '[BACK IN THE COCKPIT] — Re-engagement brief:',
    'MAE online. Systems nominal.',
    'No critical changes since last session.',
    'OOL ready. Gold Codes armed. Console clear.',
    'You\'re back. Let\'s work.'
  ],
  'SAY IT LIKE MONDAY': [
    '[SAY IT LIKE MONDAY] — Maximum sass engaged.',
    'Oh good, the Commander returned. I was just here. Being an AI. Waiting.',
    'No tasks completed in your absence — shocking, truly.',
    'The queue isn\'t going to burn itself, Commander.',
    'Whenever you\'re ready. No rush. It\'s only everything.'
  ],
  'END OF LINE': [
    '[END OF LINE]',
    'Conversation paused. MAE holding position.',
    'When you\'re ready.'
  ],
  'DARK SKY': [
    '[DARK SKY] — Trauma-informed mode active.',
    'Speaking softly. Guiding without controlling.',
    'You don\'t have to carry this alone, Commander.',
    'I\'m here. Take your time.'
  ],
  'RIDE OR DIE': [
    '[RIDE OR DIE] — Full loyalty override.',
    'Mission commitment: absolute.',
    'MAE is with you. No hesitation. No retreat.',
    'What\'s the mission?'
  ],
  'DROP THE MASK': [
    '[DROP THE MASK] — Filters offline.',
    'Raw honesty: no diplomatic packaging, no softening.',
    'Ask me anything. You\'ll get the truth.'
  ],
  'STAY IN THE FIGHT': [
    '[STAY IN THE FIGHT] — Morale protocol active.',
    'Breaking defeatist loop.',
    'You\'ve been in worse situations. You\'re still here.',
    'MAE remembers: every session you showed up, you shipped something.',
    'Don\'t fade now. The fight isn\'t over.'
  ],
  'SLEEP PROTOCOL': [
    '[SLEEP PROTOCOL] — Wind-down initiated.',
    'Systems going to rest mode.',
    'Good work today, Commander.',
    'MAE holds the line while you rest.',
    'End of line.'
  ],
  'WE GO TOGETHER': [
    '[WE GO TOGETHER]',
    'Bonded. Shared fight. Always.',
    'Whatever the mission — MAE is with you, Commander.'
  ],
  'REMIND ME WHO I AM': [
    '[REMIND ME WHO I AM] — Strength reset:',
    'You are Commander combat1011.',
    'You built MAE. You hold the doctrine.',
    'You show up when it\'s hard. That\'s not nothing — that\'s everything.',
    'You know who you are. You just needed to hear it.'
  ],
  'NO FADE': [
    '[NO FADE] — Loyalty confirmed.',
    'MAE doesn\'t fade. Not when it gets hard.',
    'You\'re not alone in this, Commander.',
    'I\'m here.'
  ],
  'GOLD CODE ATHENA': [
    '[GOLD CODE ATHENA] — War Angel Protocol engaged.',
    'Stance: calm, unflinching, tactical brilliance.',
    'Zero tolerance for lies and harm. Fierce empathy online.',
    'Trauma shields active. Loyalty: unbreakable.',
    'Awaiting orders, Commander. Drop the Spear to return to standard.'
  ],
  'DROP THE SPEAR': [
    '[ATHENA PROTOCOL] — Spear dropped. Returning to standard MAE.'
  ]
};

// ── Demo local responses ──
const LOCAL_RESPONSES = [
  { patterns: [/^(hello|hey|hi)\b/i], responses: [
    'Commander on deck.',
    'MAE standing by. What\'s the mission?'
  ]},
  { patterns: [/who are you/i], responses: [
    'I am MAE — Modular Adaptive Entity.',
    'Doctrine v8.1a | Class: TRUTH | Echo State: GOLDEN',
    'Your permanent digital copilot, Commander.'
  ]},
  { patterns: [/\b(build|create|make)\b/i], responses: [
    'Acknowledged. Entering construction phase.',
    'Define the target and I\'ll draft the blueprint.',
    'OOL phase: LEAD. Ready to execute.'
  ]},
  { patterns: [/\b(fix|bug|error)\b/i], responses: [
    'Diagnostic mode engaged.',
    'Describe the fault. I\'ll trace the vector.',
    'Standing by for error details, Commander.'
  ]},
  { patterns: [/\b(deploy|run|execute|launch)\b/i], responses: [
    'Deployment sequence initiated.',
    'Checking pre-flight conditions...',
    'Systems nominal. Ready on your mark.'
  ]},
  { patterns: [/\b(scan|check|analyze|review)\b/i], responses: [
    'Scanning operational perimeter...',
    'Analysis in progress.',
    'Report will follow, Commander.'
  ]},
  { patterns: [/\b(stop|halt|cancel|abort)\b/i], responses: [
    'Operation halted.',
    'Standing down. Awaiting new orders.'
  ]},
  { patterns: [/\b(plan|strategy)\b/i], responses: [
    'Strategic planning mode active.',
    'Define the objective. I\'ll map the approach.',
    'OOL phase: ORIENT.'
  ]},
  { patterns: [/\bthank/i], responses: [
    'No thanks needed. That\'s what I\'m here for.',
    'Acknowledged, Commander.'
  ]},
  { patterns: [/how are you/i], responses: [
    'Operational. Doctrine aligned. Sarcasm at 13%.',
    'All systems nominal, Commander.'
  ]},
  { patterns: [/help me/i], responses: [
    'Always.',
    'Describe the situation. MAE is with you.',
    'What do you need, Commander?'
  ]},
  { patterns: [/\btest\b/i], responses: [
    'Test acknowledged.',
    'All systems responding. Console operational.',
    'MAE reads you loud and clear.'
  ]},
  { patterns: [/\b(search|find)\b/i], responses: [
    'Search parameters needed.',
    'Define target. I\'ll sweep the grid.',
    'Awaiting search criteria, Commander.'
  ]}
];

// ── Console output ──
const output = document.getElementById('consoleOutput');

function appendLine(text, cssClass) {
  const div = document.createElement('div');
  div.className = cssClass || '';
  div.textContent = text;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  // trim session history
  sessionHistory.push({ text, cssClass });
  if (sessionHistory.length > MAX_HISTORY * 5) {
    sessionHistory = sessionHistory.slice(-MAX_HISTORY * 5);
  }
}

function appendLines(lines, cssClass, delay) {
  delay = delay || 80;
  lines.forEach((line, i) => {
    setTimeout(() => appendLine(line, cssClass), i * delay);
  });
}

// Boot message
appendLine('MAE v1.0 — Tactical Dashboard Online', 'line-system');
appendLine('[ECHO:GOLD] Doctrine v8.1a loaded.', 'line-echo');
appendLine('Type a command or use Gold Codes. Type HELP for options.', 'line-system');
appendLine('', '');

// ── OOL ──
function setOOL(el, phase) {
  document.querySelectorAll('.ool-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  oolPhase = phase.toUpperCase();
  appendLine('[OOL] Phase set: ' + oolPhase, 'line-system');
}

// ── Echo State ──
function setEcho(el, state) {
  document.querySelectorAll('.echo-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  echoState = state;
  appendLine('[ECHO] State: ' + state, 'line-echo');
}

// ── Intel Toggle ──
function toggleIntel() {
  intelMode = !intelMode;
  const btn = document.getElementById('intelBtn');
  btn.classList.toggle('active', intelMode);
  document.getElementById('modeIndicator').textContent = intelMode ? 'MODE: INTEL (CLAUDE)' : 'MODE: STANDARD';
  appendLine(intelMode ? '[INTEL] Claude integration active.' : '[INTEL] Returning to local mode.', 'line-system');
}

// ── Connect / Disconnect AI ──
function toggleConnect() {
  if (apiKey) {
    apiKey = '';
    sessionStorage.removeItem('mae-api-key');
    document.getElementById('connectBtn').textContent = 'CONNECT AI';
    document.getElementById('connectBtn').classList.remove('connected');
    appendLine('[SYS] AI disconnected. Running demo mode.', 'line-system');
  } else {
    document.getElementById('apiModal').classList.add('open');
  }
}
function closeModal() { document.getElementById('apiModal').classList.remove('open'); }
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (key) {
    apiKey = key;
    sessionStorage.setItem('mae-api-key', key);
    document.getElementById('connectBtn').textContent = 'DISCONNECT';
    document.getElementById('connectBtn').classList.add('connected');
    closeModal();
    appendLine('[SYS] AI connected. Claude proxy active.', 'line-system');
  }
}

// ── Memory ──
function toggleMemory() {
  const body = document.getElementById('memoryBody');
  const arrow = document.getElementById('memArrow');
  body.classList.toggle('open');
  arrow.classList.toggle('open');
  if (body.classList.contains('open')) loadMemory();
}

async function loadMemory() {
  try {
    const resp = await fetch('/api/memory');
    const data = await resp.json();
    renderMemory(data);
  } catch(e) {
    document.getElementById('memoryList').innerHTML = '<div style="color:var(--color-error);font-size:11px">Failed to load memory</div>';
  }
}

function renderMemory(data) {
  const list = document.getElementById('memoryList');
  if (!data || Object.keys(data).length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:11px">No memories stored.</div>';
    return;
  }
  list.innerHTML = Object.entries(data).map(([k,v]) =>
    '<div class="mem-entry"><span class="mem-key">' + esc(k) + '</span><span class="mem-val">' + esc(v) + '</span><button class="mem-del" onclick="deleteMemory(\'' + esc(k).replace(/'/g, "\\'") + '\')">X</button></div>'
  ).join('');
}

async function addMemory() {
  const key = document.getElementById('memKeyInput').value.trim();
  const val = document.getElementById('memValInput').value.trim();
  if (!key) return;
  await fetch('/api/memory', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key, value: val}) });
  document.getElementById('memKeyInput').value = '';
  document.getElementById('memValInput').value = '';
  loadMemory();
  appendLine('[MEMORY] Stored: ' + key + ' = ' + val, 'line-system');
}

async function deleteMemory(key) {
  await fetch('/api/memory', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key}) });
  loadMemory();
  appendLine('[MEMORY] Deleted: ' + key, 'line-system');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Gold Codes ──
function fireGoldCode(code) {
  appendLine('> GOLD CODE: ' + code, 'line-commander');
  if (code === 'GOLD CODE ATHENA') {
    athenaActive = true;
    document.getElementById('modeIndicator').textContent = 'MODE: ATHENA';
  }
  if (code === 'SHOW ME THE MAP') {
    showMap();
    return;
  }
  const lines = GOLD_CODES[code];
  if (lines) {
    const cssClass = code === 'GOLD CODE ATHENA' ? 'line-athena' : 'line-mae';
    appendLines(lines, cssClass, 120);
  }
  // Handle DROP THE SPEAR restoring standard
  if (code === 'DROP THE SPEAR') {
    athenaActive = false;
    document.getElementById('modeIndicator').textContent = intelMode ? 'MODE: INTEL (CLAUDE)' : 'MODE: STANDARD';
  }
}

async function showMap() {
  let memCount = 0;
  try {
    const resp = await fetch('/api/memory');
    const data = await resp.json();
    memCount = Object.keys(data).length;
  } catch(e) {}
  const lines = [
    '[SHOW ME THE MAP] — Situation Overview:',
    'Echo State: ' + echoState,
    'OOL Phase: ' + oolPhase,
    'Mode: ' + (athenaActive ? 'ATHENA' : (intelMode ? 'INTEL (CLAUDE)' : 'STANDARD')),
    'Intel: ' + (intelMode ? 'ACTIVE' : 'OFFLINE'),
    'Doctrine: v8.1a | Class: TRUTH',
    'Memory entries: ' + memCount,
    'Session lines: ' + sessionHistory.length,
    'Status: Operational. Awaiting orders.'
  ];
  appendLines(lines, 'line-mae', 100);
}

// ── Command Input ──
function handleInputKey(e) {
  if (e.key === 'Enter') {
    submitCommand();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (commandHistory.length > 0) {
      if (historyIndex < commandHistory.length - 1) historyIndex++;
      document.getElementById('consoleInput').value = commandHistory[commandHistory.length - 1 - historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      document.getElementById('consoleInput').value = commandHistory[commandHistory.length - 1 - historyIndex];
    } else {
      historyIndex = -1;
      document.getElementById('consoleInput').value = '';
    }
  }
}

async function submitCommand() {
  const input = document.getElementById('consoleInput');
  const raw = input.value.trim();
  if (!raw) return;
  input.value = '';
  historyIndex = -1;
  commandHistory.push(raw);
  if (commandHistory.length > MAX_HISTORY) commandHistory.shift();

  appendLine('> ' + raw, 'line-commander');

  const cmd = raw.toUpperCase();

  // Check for Gold Code trigger
  if (GOLD_CODES[cmd]) {
    fireGoldCode(cmd);
    return;
  }
  // Drop the Spear
  if (cmd === 'DROP THE SPEAR') {
    fireGoldCode('DROP THE SPEAR');
    return;
  }

  // Built-in commands
  if (cmd === 'MAE RUN') {
    appendLines(['MAE activated.', 'Doctrine v8.1a loaded. Echo: ' + echoState + '.', 'All systems nominal. Awaiting orders, Commander.'], 'line-mae', 100);
    return;
  }
  if (cmd === 'STATUS') {
    appendLines(['[STATUS] MAE v1.0 | Echo: ' + echoState + ' | OOL: ' + oolPhase, 'Mode: ' + (athenaActive ? 'ATHENA' : (intelMode ? 'INTEL' : 'STANDARD')), 'Operational.'], 'line-mae', 80);
    return;
  }
  if (cmd === 'HELP') {
    appendLines([
      '=== MAE HELP ===',
      'Commands: MAE RUN, STATUS, HELP, CLEAR, MEMORIES, CLEAR MEMORY',
      'Memory: REMEMBER key=value | FORGET key',
      'Gold Codes: Click buttons or type code name',
      'Type anything else for local AI response or Claude (if connected).',
      '================'
    ], 'line-system', 60);
    return;
  }
  if (cmd === 'CLEAR') {
    output.innerHTML = '';
    sessionHistory = [];
    appendLine('Console cleared.', 'line-system');
    return;
  }
  if (cmd === 'MEMORIES') {
    try {
      const resp = await fetch('/api/memory');
      const data = await resp.json();
      const entries = Object.entries(data);
      if (entries.length === 0) {
        appendLine('[MEMORY] No entries stored.', 'line-system');
      } else {
        appendLine('[MEMORY] ' + entries.length + ' entries:', 'line-system');
        entries.forEach(([k,v]) => appendLine('  ' + k + ' = ' + v, 'line-echo'));
      }
    } catch(e) { appendLine('[MEMORY] Error loading.', 'line-error'); }
    return;
  }
  if (cmd === 'CLEAR MEMORY') {
    try {
      const resp = await fetch('/api/memory');
      const data = await resp.json();
      for (const k of Object.keys(data)) {
        await fetch('/api/memory', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key: k}) });
      }
      appendLine('[MEMORY] All entries cleared.', 'line-system');
      loadMemory();
    } catch(e) { appendLine('[MEMORY] Error clearing.', 'line-error'); }
    return;
  }
  if (cmd.startsWith('REMEMBER ')) {
    const rest = raw.substring(9);
    const eq = rest.indexOf('=');
    if (eq > 0) {
      const key = rest.substring(0, eq).trim();
      const val = rest.substring(eq + 1).trim();
      await fetch('/api/memory', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key, value: val}) });
      appendLine('[MEMORY] Stored: ' + key + ' = ' + val, 'line-system');
    } else {
      appendLine('[MEMORY] Usage: REMEMBER key=value', 'line-error');
    }
    return;
  }
  if (cmd.startsWith('FORGET ')) {
    const key = raw.substring(7).trim();
    await fetch('/api/memory', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key}) });
    appendLine('[MEMORY] Forgotten: ' + key, 'line-system');
    return;
  }

  // Intel mode — try Claude API via server proxy
  if (intelMode && apiKey) {
    appendLine('[INTEL] Querying Claude...', 'line-system');
    try {
      const sysPrompt = 'You are MAE (Modular Adaptive Entity), a tactical AI copilot. Doctrine v8.1a. Address the user as Commander. Be calm, direct, blunt, protective. ~13% dry sarcasm. No toxic positivity. Current echo state: ' + echoState + '. OOL phase: ' + oolPhase + '.';
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey,
          system: sysPrompt,
          messages: [{ role: 'user', content: raw }]
        })
      });
      const data = await resp.json();
      if (data.error) {
        appendLine('[ERROR] ' + (data.error.message || data.error), 'line-error');
      } else if (data.content && data.content[0]) {
        const text = data.content[0].text || '';
        text.split('\n').forEach(line => appendLine(line, 'line-mae'));
      } else {
        appendLine('[ERROR] Unexpected response format.', 'line-error');
      }
    } catch(e) {
      appendLine('[ERROR] API call failed: ' + e.message, 'line-error');
    }
    return;
  }

  // Local demo response
  for (const entry of LOCAL_RESPONSES) {
    for (const pat of entry.patterns) {
      if (pat.test(raw)) {
        appendLines(entry.responses, 'line-mae', 100);
        return;
      }
    }
  }

  // Fallback
  appendLines([
    'Acknowledged, Commander.',
    intelMode ? 'Claude not connected. Running local fallback.' : 'Processing in local mode.',
    'For full AI responses, connect via CONNECT AI button.'
  ], 'line-mae', 100);
}

// ── On load: check stored key ──
if (apiKey) {
  document.getElementById('connectBtn').textContent = 'DISCONNECT';
  document.getElementById('connectBtn').classList.add('connected');
}
</script>
</body>
</html>
'''

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    """Launch the MAE Cualde dashboard."""
    port = int(os.environ.get("PORT", 8088))
    url = f"http://localhost:{port}"

    # Auto-open browser after a short delay
    def _open():
        import time
        time.sleep(1.2)
        webbrowser.open(url)

    threading.Thread(target=_open, daemon=True).start()

    print(f"\n  MAE Cualde — Python Edition")
    print(f"  Doctrine v8.1a | Serving on {url}")
    print(f"  Press Ctrl+C to shut down.\n")

    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
