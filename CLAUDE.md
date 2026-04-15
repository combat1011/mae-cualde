# MAE MegaCorp — Project Memory

## Owner
- **Commander:** Caquan "Cue" Palmer
- **GitHub:** @combat1011
- **LinkedIn:** https://www.linkedin.com/in/caquan-palmer/

## Project
MAE Cualde — Modular Adaptive Entity. Multi-platform AI tactical interface + personal website hub.
Live at: `combat1011.github.io/mae-cualde/`
Dev branch: `claude/personal-website-consolidation-H1gc3`

## Site Pages
| Page | File | Purpose |
|---|---|---|
| Console | `docs/index.html` | MAE tactical interface |
| Profile | `docs/profile.html` | LinkedIn-style professional profile |
| Drone | `docs/drone.html` | Aerial photography portfolio |
| MegaCorp | `docs/megacorp.html` | MAE MegaCorp corporate page |

## Connected Platforms (MCP)
All connectors are configured in `.mcp.json` and `~/.claude/settings.json`.

### Notion
- MCP server: `@notionhq/notion-mcp-server`
- Env: `NOTION_API_KEY` must be set
- 4 databases: Profile, Drone Shots, Tasks, Platform MEMs
- Sync script: `node scripts/notion-sync.js`
- Output: `docs/data/notion-*.json`

### Google Drive
- MCP server: `@modelcontextprotocol/server-gdrive`
- Credentials: `~/.gdrive-credentials.json`
- Used for: drone aerial footage embeds
- File IDs go in `docs/js/platform-sync.js` → `DRONE_SHOTS` array

### GitHub
- MCP server: `@modelcontextprotocol/server-github`
- Env: `GITHUB_TOKEN`
- Repo: `combat1011/mae-cualde`

### LinkedIn
- No MCP server available (LinkedIn has no public API)
- URL stored in `docs/js/platform-sync.js` → `MAE_PLATFORMS.linkedin.url`
- Currently set to: `https://www.linkedin.com/in/caquan-palmer/`

## Commit Rules
- **No Claude attribution** — `attribution.commit` and `attribution.pr` are both `""` in `~/.claude/settings.json`
- **No Claude session URLs** in commit messages
- Dev branch: `claude/personal-website-consolidation-H1gc3`
- Never push to `main` without explicit instruction

## Notion Sync (local, no GitHub secrets needed)
```bash
cp .notion.example.json .notion.json   # once
# fill in api_key + db IDs
node scripts/notion-sync.js            # sync all 4 databases
git add docs/data && git push
```

## Drone Shots (Google Drive)
Add file IDs to `docs/js/platform-sync.js`:
```js
const DRONE_SHOTS = [
  { id: 'GDRIVE_FILE_ID', title: 'Shot Title', category: 'video landscape', desc: '...' }
];
```
Or manage via the Notion Drone Shots database — syncs automatically on next `notion-sync.js` run.

## Stack
- Java 21 / Spring Boot 3.x (Railway deployment)
- Python Flask (local dev)
- Vanilla JS / HTML / CSS (GitHub Pages)
- Anthropic Claude API (`claude-haiku-4-5-20251001`)
- Perplexity Sonar Pro
- Railway + Heroku + GitHub Pages

## Environment Variables Needed
```
NOTION_API_KEY        — Notion integration token (secret_...)
GITHUB_TOKEN          — GitHub personal access token
ANTHROPIC_API_KEY     — Claude API key
PERPLEXITY_API_KEY    — Perplexity API key
```
Set `NOTION_API_KEY` in shell profile (`~/.bashrc` or `~/.zshrc`) for MCP to pick it up automatically.
