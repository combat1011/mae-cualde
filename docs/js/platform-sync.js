// MAE MegaCorp — Platform Sync Module
// Handles: GitHub live data, LinkedIn, Notion, Google Drive integration
// Version: 2.0.0

'use strict';

/* ═══════════════════════════════════════════════════════════════
   PLATFORM CONFIGURATION
   Update NOTION_URL to your Notion workspace/page URL.
   LinkedIn and GitHub are already wired in.
═══════════════════════════════════════════════════════════════ */

const MAE_PLATFORMS = {
    github:  { user: 'combat1011',                                  api: 'https://api.github.com' },
    linkedin: { url: 'https://www.linkedin.com/in/caquan-palmer/',  label: 'Caquan Palmer' },
    notion:   { url: '',                                             label: 'Notion Workspace' }, // ← add Notion URL here
    gdrive:   { folder: '',                                          label: 'Google Drive' }      // ← add Drive folder URL here
};

/* ═══════════════════════════════════════════════════════════════
   DRONE SHOT CONFIGURATION
   Replace these with your actual Google Drive file IDs.
   Get the file ID from your Drive share URL:
   https://drive.google.com/file/d/FILE_ID/view
═══════════════════════════════════════════════════════════════ */

const DRONE_SHOTS = [
    // { id: 'abc123xyz', title: 'Landscape Overview',  category: 'video landscape',  desc: 'Wide aerial sweep' },
    // { id: 'def456uvw', title: 'Property Flyover',    category: 'video real-estate', desc: 'Real estate walk-around' },
    // { id: 'ghi789rst', title: 'Golden Hour',         category: 'photo landscape',   desc: 'Sunset aerial photography' },
    // Add more entries following the pattern above
];

/* ═══════════════════════════════════════════════════════════════
   GITHUB LIVE DATA
═══════════════════════════════════════════════════════════════ */

const LANG_COLORS = {
    'Java':       '#b07219',
    'JavaScript': '#f1e05a',
    'Python':     '#3572A5',
    'HTML':       '#e34c26',
    'CSS':        '#563d7c',
    'TypeScript': '#3178c6',
    'Shell':      '#89e051',
    'Batchfile':  '#c1f12e',
    default:      '#475569'
};

async function fetchGitHubProfile(user) {
    const cached = sessionStorage.getItem(`gh_profile_${user}`);
    if (cached) return JSON.parse(cached);
    try {
        const res = await fetch(`${MAE_PLATFORMS.github.api}/users/${user}`);
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        const data = await res.json();
        sessionStorage.setItem(`gh_profile_${user}`, JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn('[MAE SYNC] GitHub profile fetch failed:', e.message);
        return null;
    }
}

async function fetchGitHubRepos(user, limit = 6) {
    const cached = sessionStorage.getItem(`gh_repos_${user}`);
    if (cached) return JSON.parse(cached);
    try {
        const res = await fetch(
            `${MAE_PLATFORMS.github.api}/users/${user}/repos?sort=updated&per_page=${limit}&type=public`
        );
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        const data = await res.json();
        sessionStorage.setItem(`gh_repos_${user}`, JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn('[MAE SYNC] GitHub repos fetch failed:', e.message);
        return [];
    }
}

function renderGitHubRepos(repos, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (repos.length === 0) {
        target.innerHTML = `
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);padding:20px;text-align:center;">
                [GITHUB] — Unable to fetch live data. Check connection.
            </div>`;
        return;
    }

    const rows = repos.map(repo => {
        const langColor = LANG_COLORS[repo.language] || LANG_COLORS.default;
        const updated   = repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        const stars     = repo.stargazers_count || 0;
        const forks     = repo.forks_count || 0;
        const desc      = repo.description ? repo.description.substring(0, 80) + (repo.description.length > 80 ? '…' : '') : 'No description';

        return `
        <div class="repo-row">
            <div style="flex:1;min-width:0;">
                <a class="repo-name" href="${repo.html_url}" target="_blank" rel="noopener">
                    ${escapeHtml(repo.name)}
                </a>
                <div class="repo-desc">${escapeHtml(desc)}</div>
            </div>
            <div class="repo-meta">
                ${repo.language ? `
                <span class="repo-lang">
                    <span class="lang-dot" style="background:${langColor};"></span>
                    ${escapeHtml(repo.language)}
                </span>` : ''}
                ${stars > 0 ? `<span>★ ${stars}</span>` : ''}
                ${forks > 0 ? `<span>⑂ ${forks}</span>` : ''}
                <span title="Last push">${updated}</span>
            </div>
        </div>`;
    }).join('');

    target.innerHTML = rows;
}

function updateGitHubStats(profile, opts) {
    if (!profile) return;

    const { statsRepos, statsFollowers } = opts;

    const reposEl     = document.getElementById(statsRepos);
    const followersEl = document.getElementById(statsFollowers);

    if (reposEl)     reposEl.textContent     = profile.public_repos || '—';
    if (followersEl) followersEl.textContent = profile.followers    || '—';

    // Update profile avatar with GitHub avatar if available
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl && profile.avatar_url) {
        avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="${escapeHtml(profile.login)}" loading="lazy">`;
    }
}

/* ═══════════════════════════════════════════════════════════════
   LINKEDIN INTEGRATION
   Opens the LinkedIn profile. Marks badge as connected.
═══════════════════════════════════════════════════════════════ */

function initLinkedIn() {
    const url   = MAE_PLATFORMS.linkedin.url || localStorage.getItem('mae_linkedin_url');
    const badge = document.getElementById('linkedinBadge');

    if (badge && url) {
        badge.classList.add('connected');
        badge.onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
        badge.title   = `LinkedIn: ${MAE_PLATFORMS.linkedin.label}`;
    }

    // Also update footer/other LinkedIn links
    document.querySelectorAll('[data-platform="linkedin"]').forEach(el => {
        if (url) {
            el.href    = url;
            el.target  = '_blank';
            el.rel     = 'noopener noreferrer';
            el.classList.add('connected');
        }
    });
}

/* ═══════════════════════════════════════════════════════════════
   NOTION INTEGRATION
   Opens Notion workspace page. Marks badge as connected.
   Set MAE_PLATFORMS.notion.url or pass via initPlatformSync.
═══════════════════════════════════════════════════════════════ */

function initNotion(notionUrl) {
    const url   = notionUrl || MAE_PLATFORMS.notion.url || localStorage.getItem('mae_notion_url');
    const badge = document.getElementById('notionBadge');

    if (badge) {
        if (url) {
            badge.classList.add('connected');
            badge.onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
            badge.title   = 'Open Notion Workspace';
        } else {
            badge.onclick = () => {
                const input = prompt('Enter your Notion workspace URL to connect it:');
                if (input && input.includes('notion.')) {
                    localStorage.setItem('mae_notion_url', input.trim());
                    MAE_PLATFORMS.notion.url = input.trim();
                    badge.classList.add('connected');
                    badge.onclick = () => window.open(input.trim(), '_blank', 'noopener,noreferrer');
                    window.open(input.trim(), '_blank', 'noopener,noreferrer');
                }
            };
        }
    }

    // Update all Notion platform data attributes
    document.querySelectorAll('[data-platform="notion"]').forEach(el => {
        if (url) {
            el.href   = url;
            el.target = '_blank';
            el.rel    = 'noopener noreferrer';
            el.classList.add('connected');
        }
    });
}

/* ═══════════════════════════════════════════════════════════════
   GOOGLE DRIVE INTEGRATION
   Marks Drive badge as connected if folder URL is saved.
═══════════════════════════════════════════════════════════════ */

function initGoogleDrive(driveUrl) {
    const url   = driveUrl || MAE_PLATFORMS.gdrive.folder || localStorage.getItem('mae_gdrive_folder');
    const badge = document.getElementById('driveBadge');

    if (badge) {
        if (url) {
            badge.classList.add('connected');
            badge.onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
            badge.title   = 'Open Google Drive Folder';
        } else {
            badge.onclick = () => {
                const input = prompt('Enter your Google Drive folder URL to connect it:');
                if (input && input.includes('drive.google.com')) {
                    localStorage.setItem('mae_gdrive_folder', input.trim());
                    MAE_PLATFORMS.gdrive.folder = input.trim();
                    badge.classList.add('connected');
                    badge.onclick = () => window.open(input.trim(), '_blank', 'noopener,noreferrer');
                    window.open(input.trim(), '_blank', 'noopener,noreferrer');
                }
            };
        }
    }
}

/* ═══════════════════════════════════════════════════════════════
   DRONE GALLERY INIT
   If DRONE_SHOTS contains real file IDs, auto-loads embeds.
═══════════════════════════════════════════════════════════════ */

function initDroneGallery(config) {
    const shots = (config && config.shots) ? config.shots : DRONE_SHOTS;
    if (shots.length === 0) return; // Use manual placeholders

    shots.forEach(shot => {
        if (!shot.id || shot.id.startsWith('YOUR_')) return;

        const slot = document.getElementById(shot.slot);
        if (!slot) return;

        // Auto-load iframe embed
        const parent = slot.parentElement;
        parent.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src     = `https://drive.google.com/file/d/${shot.id}/preview`;
        iframe.allow   = 'autoplay';
        iframe.loading = 'lazy';
        iframe.title   = shot.title || 'Drone Shot';
        parent.appendChild(iframe);
    });
}

/* ═══════════════════════════════════════════════════════════════
   PLATFORM SYNC STATUS DISPLAY
   Shows connected/disconnected state for all platforms.
═══════════════════════════════════════════════════════════════ */

function renderPlatformStatus() {
    const platforms = [
        { id: 'github',   name: 'GitHub',       connected: true,                                       url: `https://github.com/${MAE_PLATFORMS.github.user}` },
        { id: 'linkedin', name: 'LinkedIn',      connected: !!MAE_PLATFORMS.linkedin.url,              url: MAE_PLATFORMS.linkedin.url },
        { id: 'notion',   name: 'Notion',        connected: !!(MAE_PLATFORMS.notion.url   || localStorage.getItem('mae_notion_url')),  url: MAE_PLATFORMS.notion.url   || localStorage.getItem('mae_notion_url') },
        { id: 'gdrive',   name: 'Google Drive',  connected: !!(MAE_PLATFORMS.gdrive.folder || localStorage.getItem('mae_gdrive_folder')), url: MAE_PLATFORMS.gdrive.folder || localStorage.getItem('mae_gdrive_folder') }
    ];

    const target = document.getElementById('platformStatus');
    if (!target) return;

    target.innerHTML = platforms.map(p => `
        <div class="platform-status-row" style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="font-family:var(--font-mono);font-size:0.6rem;color:${p.connected ? 'var(--accent)' : '#ef4444'};">
                ${p.connected ? '●' : '○'}
            </span>
            <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-secondary);flex:1;">
                ${escapeHtml(p.name)}
            </span>
            <span style="font-family:var(--font-mono);font-size:0.58rem;color:${p.connected ? 'var(--accent)' : 'var(--text-muted)'};">
                ${p.connected ? 'CONNECTED' : 'NOT CONFIGURED'}
            </span>
        </div>
    `).join('');
}

/* ═══════════════════════════════════════════════════════════════
   MAE MEMORY EXPORT / IMPORT
   Exports localStorage memories for cross-platform sync.
═══════════════════════════════════════════════════════════════ */

function exportMaeMems() {
    const data = {
        memories:  JSON.parse(localStorage.getItem('mae_memories') || '{}'),
        platforms: {
            linkedin: localStorage.getItem('mae_linkedin_url'),
            notion:   localStorage.getItem('mae_notion_url'),
            gdrive:   localStorage.getItem('mae_gdrive_folder')
        },
        exported:  new Date().toISOString(),
        version:   '2.0.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `mae-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return data;
}

function importMaeMems(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.memories) localStorage.setItem('mae_memories', JSON.stringify(data.memories));
        if (data.platforms) {
            if (data.platforms.linkedin) localStorage.setItem('mae_linkedin_url', data.platforms.linkedin);
            if (data.platforms.notion)   localStorage.setItem('mae_notion_url',   data.platforms.notion);
            if (data.platforms.gdrive)   localStorage.setItem('mae_gdrive_folder', data.platforms.gdrive);
        }
        return true;
    } catch (e) {
        console.error('[MAE SYNC] Import failed:', e.message);
        return false;
    }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN INIT
═══════════════════════════════════════════════════════════════ */

async function initPlatformSync(opts = {}) {
    const options = {
        githubUser:   opts.githubUser   || MAE_PLATFORMS.github.user,
        reposTarget:  opts.reposTarget  || 'githubRepos',
        statsRepos:   opts.statsRepos   || 'statRepos',
        statsFollowers: opts.statsFollowers || 'statFollowers',
        notionUrl:    opts.notionUrl    || '',
        driveUrl:     opts.driveUrl     || '',
        ...opts
    };

    // 1. LinkedIn — always connected (URL is hardcoded)
    initLinkedIn();

    // 2. Notion
    initNotion(options.notionUrl);

    // 3. Google Drive
    initGoogleDrive(options.driveUrl);

    // 4. Platform status panel
    renderPlatformStatus();

    // 5. GitHub live data (async)
    const [profile, repos] = await Promise.all([
        fetchGitHubProfile(options.githubUser),
        fetchGitHubRepos(options.githubUser)
    ]);

    if (profile) {
        updateGitHubStats(profile, options);
    }

    if (repos && repos.length > 0) {
        renderGitHubRepos(repos, options.reposTarget);
    }

    // 6. MAE Console memory sync ping
    syncMaeConsoleMemory();
}

/* ═══════════════════════════════════════════════════════════════
   MAE CONSOLE MEMORY SYNC
   Reads from localStorage (same origin as MAE console).
═══════════════════════════════════════════════════════════════ */

function syncMaeConsoleMemory() {
    const memories = localStorage.getItem('mae_memories');
    if (!memories) return;

    try {
        const parsed  = JSON.parse(memories);
        const entries = Object.entries(parsed);
        const target  = document.getElementById('maeMemorySync');

        if (!target || entries.length === 0) return;

        target.innerHTML = entries.slice(0, 8).map(([k, v]) => `
            <div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(26,36,26,0.5);font-family:var(--font-mono);font-size:0.68rem;">
                <span style="color:var(--accent-dim);flex-shrink:0;">[${escapeHtml(v.category || 'user')}]</span>
                <span style="color:var(--text-primary);flex-shrink:0;">${escapeHtml(k)}</span>
                <span style="color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(v.value || '')}</span>
            </div>`
        ).join('');

    } catch (_) { /* silent */ }
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════════════════════════ */

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ═══════════════════════════════════════════════════════════════
   NOTION SYNC STATUS CHECK
   Reads synced data from /data/notion-sync.json if it exists
   (populated by the GitHub Action: .github/workflows/notion-sync.yml)
═══════════════════════════════════════════════════════════════ */

async function checkNotionSyncData() {
    try {
        const res = await fetch('./data/notion-sync.json');
        if (!res.ok) return null;
        const data = await res.json();

        const target = document.getElementById('notionSyncData');
        if (!target || !data) return data;

        // Render synced Notion tasks/pages
        const items = data.tasks || data.pages || [];
        if (items.length === 0) return data;

        target.innerHTML = `
            <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted);letter-spacing:0.16em;margin-bottom:12px;">
                SYNCED FROM NOTION — ${new Date(data.synced_at || Date.now()).toLocaleString()}
            </div>
            ${items.slice(0, 10).map(item => `
            <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(26,36,26,0.5);">
                <span style="color:var(--accent);font-family:var(--font-mono);font-size:0.6rem;flex-shrink:0;">◈</span>
                <div>
                    <div style="font-family:var(--font-sans);font-size:0.85rem;color:var(--text-primary);">${escapeHtml(item.title || item.name || 'Untitled')}</div>
                    ${item.status ? `<div style="font-family:var(--font-mono);font-size:0.58rem;color:var(--text-muted);margin-top:2px;">${escapeHtml(item.status)}</div>` : ''}
                </div>
            </div>`).join('')}`;

        return data;
    } catch (_) {
        return null; // Notion sync file doesn't exist yet — that's OK
    }
}

/* Auto-init when DOM is ready (if not called manually) */
document.addEventListener('DOMContentLoaded', function () {
    // Only auto-init on pages that haven't manually called initPlatformSync
    if (!window._maeSyncInitialized) {
        window._maeSyncInitialized = true;
        // Lightweight init for pages that just need LinkedIn/Notion badges
        initLinkedIn();
        initNotion();
        initGoogleDrive();
        checkNotionSyncData();
    }
});

/* Export public API for use in page scripts */
window.MAESync = {
    init:            initPlatformSync,
    exportMems:      exportMaeMems,
    importMems:      importMaeMems,
    checkNotion:     checkNotionSyncData,
    platforms:       MAE_PLATFORMS,
    DRONE_SHOTS,
    initDroneGallery
};
