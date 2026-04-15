#!/usr/bin/env node
/**
 * MAE MegaCorp — Notion Sync Script
 * Runs locally on your machine. No GitHub settings required.
 *
 * SETUP (one time):
 *   1. Copy .notion.example.json → .notion.json
 *   2. Fill in your API key and database IDs
 *   3. node scripts/notion-sync.js
 *   4. git add docs/data && git push
 *
 * USAGE:
 *   node scripts/notion-sync.js           # full sync
 *   node scripts/notion-sync.js --tasks   # tasks only
 *   node scripts/notion-sync.js --drone   # drone shots only
 *   node scripts/notion-sync.js --watch   # sync every 10 min
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Load config ────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', '.notion.json');
const DATA_DIR    = path.join(__dirname, '..', 'docs', 'data');

if (!fs.existsSync(CONFIG_PATH)) {
    console.error('[ERROR] .notion.json not found.');
    console.error('        Copy .notion.example.json → .notion.json and fill in your details.');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const API_KEY = config.api_key || process.env.NOTION_API_KEY || '';

if (!API_KEY) {
    console.error('[ERROR] No api_key in .notion.json and NOTION_API_KEY env var not set.');
    process.exit(1);
}

const DB = {
    profile: config.databases?.profile || '',
    drone:   config.databases?.drone   || '',
    tasks:   config.databases?.tasks   || '',
    mems:    config.databases?.mems    || ''
};

const HEADERS = {
    'Authorization':  `Bearer ${API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type':   'application/json'
};

// ── HTTP helper (no dependencies needed) ──────────────────────
function request(method, url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const opts   = {
            hostname: urlObj.hostname,
            path:     urlObj.pathname + urlObj.search,
            method,
            headers:  { ...HEADERS, 'Content-Length': body ? Buffer.byteLength(body) : 0 }
        };
        const req = https.request(opts, res => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch (e) { reject(new Error(`JSON parse error: ${e.message}\nBody: ${raw.slice(0, 200)}`)); }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// ── Notion API helpers ─────────────────────────────────────────
async function queryDatabase(dbId, pageSize = 100) {
    if (!dbId) return [];
    const rows = [];
    let cursor = null;
    do {
        const body = JSON.stringify(pageSize ? { page_size: pageSize, ...(cursor ? { start_cursor: cursor } : {}) } : {});
        const data = await request('POST', `https://api.notion.com/v1/databases/${dbId}/query`, body);
        if (data.object === 'error') throw new Error(`Notion error: ${data.message}`);
        rows.push(...(data.results || []));
        cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);
    return rows;
}

function getTitle(props) {
    for (const prop of Object.values(props)) {
        if (prop.type === 'title') {
            return (prop.title || []).map(t => t.plain_text || '').join('');
        }
    }
    return 'Untitled';
}

function getProp(props, type, fallback = '') {
    for (const prop of Object.values(props)) {
        if (prop.type !== type) continue;
        const v = prop[type];
        if (type === 'rich_text')   return (v || []).map(t => t.plain_text || '').join('');
        if (type === 'select')      return (v || {}).name || fallback;
        if (type === 'status')      return (v || {}).name || fallback;
        if (type === 'multi_select') return (v || []).map(x => x.name || '');
        if (type === 'url')         return v || fallback;
        if (type === 'checkbox')    return Boolean(v);
        if (type === 'date')        return (v || {}).start || fallback;
        if (type === 'number')      return v != null ? v : fallback;
    }
    return fallback;
}

// ── Write helper ───────────────────────────────────────────────
function writeJSON(filename, data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const outPath = path.join(DATA_DIR, filename);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    const size = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`  ✓ ${filename} (${size} KB)`);
}

const NOW = new Date().toISOString();

// ═══════════════════════════════════════════════════════════════
// SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function syncProfile() {
    console.log('[PROFILE]  Fetching...');
    const rows = await queryDatabase(DB.profile);
    const out  = {
        synced_at: NOW, source: 'notion', database: 'profile',
        name: '', headline: '', bio: '', location: '',
        linkedin_url: '', github_url: 'https://github.com/combat1011',
        available: true, skills: [], raw: []
    };
    for (const row of rows) {
        const props = row.properties || {};
        out.raw.push({
            id:      row.id,
            title:   getTitle(props),
            bio:     getProp(props, 'rich_text'),
            url:     row.url || '',
            updated: row.last_edited_time || ''
        });
        if (!out.name && getTitle(props)) out.name = getTitle(props);
    }
    writeJSON('notion-profile.json', out);
    console.log(`           ${rows.length} rows`);
}

async function syncDrone() {
    console.log('[DRONE]    Fetching...');
    const rows = await queryDatabase(DB.drone);
    const shots = [];
    for (const row of rows) {
        const props = row.properties || {};
        const driveId = getProp(props, 'rich_text') || getProp(props, 'url');
        const published = getProp(props, 'checkbox', false);
        if (!published && DB.drone) continue; // skip unpublished if DB is configured
        shots.push({
            id:          row.id,
            title:       getTitle(props),
            drive_id:    driveId,
            type:        getProp(props, 'select', 'video'),
            categories:  getProp(props, 'multi_select', []),
            description: getProp(props, 'rich_text', ''),
            order:       getProp(props, 'number', 99),
            published:   getProp(props, 'checkbox', false),
            url:         row.url || ''
        });
    }
    shots.sort((a, b) => (a.order || 99) - (b.order || 99));
    writeJSON('notion-drone.json', { synced_at: NOW, source: 'notion', database: 'drone', shots });
    console.log(`           ${shots.length} shots`);
}

async function syncTasks() {
    console.log('[TASKS]    Fetching...');
    const rows  = await queryDatabase(DB.tasks);
    const tasks = rows.map(row => {
        const props = row.properties || {};
        const task  = {
            id:       row.id,
            title:    getTitle(props),
            status:   getProp(props, 'status') || getProp(props, 'select'),
            project:  '',
            priority: '',
            due:      getProp(props, 'date', ''),
            url:      row.url || '',
            updated:  row.last_edited_time || ''
        };
        for (const [name, prop] of Object.entries(props)) {
            if (name.toLowerCase().includes('project') && ['select','multi_select'].includes(prop.type)) {
                task.project = prop.type === 'select'
                    ? (prop.select || {}).name || ''
                    : (prop.multi_select || []).map(x => x.name).join(', ');
            }
            if (name.toLowerCase().includes('priority') && ['select','status'].includes(prop.type)) {
                task.priority = (prop[prop.type] || {}).name || '';
            }
        }
        return task;
    });
    writeJSON('notion-tasks.json', { synced_at: NOW, source: 'notion', database: 'tasks', tasks });
    console.log(`           ${tasks.length} tasks`);
}

async function syncMems() {
    console.log('[MEMS]     Fetching...');
    const rows    = await queryDatabase(DB.mems);
    const entries = rows.map(row => {
        const props = row.properties || {};
        const mem   = {
            id:       row.id,
            key:      getTitle(props),
            value:    getProp(props, 'rich_text', ''),
            category: getProp(props, 'select', 'general'),
            platform: '',
            url:      row.url || '',
            updated:  row.last_edited_time || ''
        };
        for (const [name, prop] of Object.entries(props)) {
            if (name.toLowerCase().includes('platform') && prop.type === 'select') {
                mem.platform = (prop.select || {}).name || '';
            }
        }
        return mem;
    });
    writeJSON('notion-mems.json', { synced_at: NOW, source: 'notion', database: 'mems', entries });
    console.log(`           ${entries.length} entries`);
}

async function writeMasterSummary(counts) {
    const summary = {
        synced_at: NOW, source: 'notion',
        databases: {
            profile: Boolean(DB.profile),
            drone:   Boolean(DB.drone),
            tasks:   Boolean(DB.tasks),
            mems:    Boolean(DB.mems)
        },
        counts,
        tasks: counts._tasks || [],
        pages: []
    };
    writeJSON('notion-sync.json', summary);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    const args = process.argv.slice(2);
    const only = {
        profile: args.includes('--profile'),
        drone:   args.includes('--drone'),
        tasks:   args.includes('--tasks'),
        mems:    args.includes('--mems')
    };
    const all  = !Object.values(only).some(Boolean);
    const watch = args.includes('--watch');

    console.log('');
    console.log('MAE MEGACORP — Notion Sync');
    console.log('─────────────────────────────────────────');

    const run = async () => {
        const counts = { profile_rows: 0, drone_shots: 0, tasks: 0, mems: 0 };
        const errors = [];

        if ((all || only.profile) && DB.profile) {
            try { await syncProfile(); counts.profile_rows++; } catch (e) { errors.push(`Profile: ${e.message}`); }
        } else if (all || only.profile) {
            console.log('[PROFILE]  Skipped — no database ID configured');
        }

        if ((all || only.drone) && DB.drone) {
            try { await syncDrone(); } catch (e) { errors.push(`Drone: ${e.message}`); }
        } else if (all || only.drone) {
            console.log('[DRONE]    Skipped — no database ID configured');
        }

        let taskData = [];
        if ((all || only.tasks) && DB.tasks) {
            try {
                await syncTasks();
                const tf = path.join(DATA_DIR, 'notion-tasks.json');
                if (fs.existsSync(tf)) taskData = JSON.parse(fs.readFileSync(tf)).tasks || [];
                counts.tasks = taskData.length;
            } catch (e) { errors.push(`Tasks: ${e.message}`); }
        } else if (all || only.tasks) {
            console.log('[TASKS]    Skipped — no database ID configured');
        }

        if ((all || only.mems) && DB.mems) {
            try {
                await syncMems();
                const mf = path.join(DATA_DIR, 'notion-mems.json');
                if (fs.existsSync(mf)) counts.mems = (JSON.parse(fs.readFileSync(mf)).entries || []).length;
            } catch (e) { errors.push(`MEMs: ${e.message}`); }
        } else if (all || only.mems) {
            console.log('[MEMS]     Skipped — no database ID configured');
        }

        counts._tasks = taskData;
        await writeMasterSummary(counts);

        console.log('─────────────────────────────────────────');
        if (errors.length) {
            errors.forEach(e => console.error(`[ERROR] ${e}`));
        } else {
            console.log(`Sync complete — ${new Date().toLocaleString()}`);
            console.log('');
            console.log('Next steps:');
            console.log('  git add docs/data && git commit -m "notion sync" && git push');
        }
        console.log('');
    };

    await run();

    if (watch) {
        const interval = (config.watch_interval_min || 10) * 60 * 1000;
        console.log(`[WATCH] Auto-syncing every ${config.watch_interval_min || 10} min. Ctrl+C to stop.`);
        setInterval(run, interval);
    }
}

main().catch(e => {
    console.error('\n[FATAL]', e.message);
    process.exit(1);
});
