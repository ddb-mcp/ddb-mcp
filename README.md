# D&D Beyond MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives Claude direct access to your D&D Beyond account — characters, campaigns, sourcebooks, spells, monsters, and more.

## Features

| Tool | Description |
|------|-------------|
| `ddb_login` | Authenticate with D&D Beyond (Wizards ID). Run once to save your session to disk. |
| `ddb_list_characters` | List all characters in your account with ID, level, race, and class. |
| `ddb_get_character` | Fetch full character JSON from the D&D Beyond character API. |
| `ddb_download_character` | Save a character's full JSON data to a local file. |
| `ddb_list_campaigns` | List all campaigns you're part of (as DM or player). |
| `ddb_get_campaign` | Fetch campaign details — DM, description, and active characters. |
| `ddb_list_library` | List all sourcebooks you own, purchased, or have shared with you. |
| `ddb_read_book` | Read content from an owned sourcebook, optionally by chapter slug. |
| `ddb_search` | Search for spells, monsters, magic items, races, classes, or feats. |
| `ddb_navigate` | Navigate to any D&D Beyond URL and return its text content. |
| `ddb_interact` | Click, fill, select dropdown, run JavaScript, or screenshot the current page. |
| `ddb_current_page` | Return the text content of whatever page is currently loaded. |
| **Homebrew Creation** | |
| `ddb_create_homebrew_item` | Create a homebrew magic item (name, rarity, type, attunement, description). |
| `ddb_create_homebrew_spell` | Create a homebrew spell (level, school, components, range, duration, etc.). |
| **Homebrew Editing** | |
| `ddb_set_item_charges` | Set charges on an existing homebrew item (count, reset condition). |
| `ddb_add_item_modifier` | Add a modifier to an item (bonus to spell attacks, save DC, AC, etc.). |
| `ddb_add_item_spell` | Attach a spell to an item with optional charge cost and cast level. |
| `ddb_list_homebrew` | List all your homebrew creations (items, spells, monsters, etc.). |

## Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- [Claude Code](https://claude.ai/claude-code) CLI

## Installation

### Option A — Install directly from GitHub (recommended)

```bash
npm install -g "https://github.com/ddb-mcp/ddb-mcp/archive/refs/heads/main.tar.gz"
```

Then install the browser:

```bash
npx playwright install chromium
```

Find the install path and register with Claude Code:

```bash
npm root -g
# outputs something like /usr/local/lib/node_modules
```

```bash
claude mcp add dndbeyond node /usr/local/lib/node_modules/ddb-mcp/dist/index.js
```

---

### Option B — Clone and build manually

```bash
git clone https://github.com/ddb-mcp/ddb-mcp.git
cd ddb-mcp
npm install
npx playwright install chromium
```

Register with Claude Code:

```bash
claude mcp add dndbeyond node /absolute/path/to/ddb-mcp/dist/index.js
```

Or edit `~/.claude/settings.json` manually:

```json
{
  "mcpServers": {
    "dndbeyond": {
      "command": "node",
      "args": ["/absolute/path/to/ddb-mcp/dist/index.js"]
    }
  }
}
```

## Usage

### First-time login

The first time you use the server, you need to authenticate:

```
ddb_login
```

A browser window (Chrome for Testing) will open and navigate to the D&D Beyond login page. Complete the login using your Wizards ID account. Once you're redirected back to D&D Beyond, your session is automatically saved to `~/.config/ddb-mcp/session.json` and reused on all future calls.

You only need to log in once. If your session expires, just run `ddb_login` again.

### Example prompts

**List your characters:**
```
List all my D&D Beyond characters
```

**Get full character data:**
```
Get the full character sheet for character ID 140476673
```

**List your campaigns:**
```
What campaigns am I part of on D&D Beyond?
```

**Get campaign details:**
```
Show me the details for campaign 6709239, including all the player characters
```

**Search for spells:**
```
Search D&D Beyond for spells named "Fireball"
```

**Search for monsters:**
```
Find the Beholder stat block on D&D Beyond
```

**Read a sourcebook:**
```
Show me the table of contents for the Player's Handbook
```

```
Read the Barbarian class section from the Player's Handbook
```

**Download a character:**
```
Download the character data for Roland Stonehelm to my Downloads folder
```

### Homebrew

**Create a magic item:**
```
Create a homebrew magic item called "Frostbound Shackles" — Rare, Wondrous Item, requires attunement.
It shoots ice chains that restrain creatures within 60 feet.
```

**Create a spell:**
```
Create a homebrew divination spell called "Bounty Hunter's Eye" — 1st level, Action,
Self range, Concentration 1 minute. Reveals colored auras showing creature intent.
```

**Add charges to an item:**
```
Set 3 charges on the Frostbound Shackles that reset on a long rest
```

**Add modifiers to an item:**
```
Add a +2 bonus to Sorcerer Spell Attacks on the Bloodwell Vial
```

**Attach a spell to an item:**
```
Attach Disguise Self to the Bounty Hunter's Glasses as a permanent effect (no charges)
```

#### Description annotations

Homebrew descriptions support D&D Beyond's annotation system for interactive content. Both `ddb_create_homebrew_item` and `ddb_create_homebrew_spell` include the full annotation reference in their tool descriptions. Here's a summary:

**Rollable dice** — clickable dice rolls in the description:
```
[rollable]1d8 + 3 piercing;{"diceNotation":"1d8+3","rollType":"damage","rollAction":"Bite","rollDamageType":"Piercing"}[/rollable]
```

**Snippet codes** — dynamic character values that update automatically:
```
{{modifier:cha}}         — ability modifier
{{savedc:wis}}           — 8 + proficiency + ability modifier
{{spellattack:int}}      — spell attack bonus
{{proficiency}}          — proficiency bonus
{{characterlevel}}       — total character level
{{maxhp}}                — maximum hit points
{{8+proficiency+modifier:wis}}  — calculated spell save DC
{{(classlevel/3)@rounddown}}    — with rounding
{{proficiency#unsigned}}x per day  — display without +/- sign
```

**Tooltip tags** — hover references to D&D Beyond entries:
```
[spell]Fireball[/spell]
[condition]restrained[/condition]
[skill]Stealth[/skill]
[monster]Banshee[/monster]
[magicitem]Bag of Holding[/magicitem]
[spell]Shield;cast Shield[/spell]    — custom display text
```

See the full reference in the tool descriptions for all rollType values, damage types, calculation modifiers, and 2024 (5.5e) tooltip syntax.

### Finding character and campaign IDs

- **Character ID**: The number in the character URL — `dndbeyond.com/characters/140476673`
- **Campaign ID**: The number in the campaign URL — `dndbeyond.com/campaigns/6709239`

You can also use `ddb_list_characters` and `ddb_list_campaigns` to get IDs without leaving Claude.

### Book slugs for `ddb_read_book`

Use `ddb_list_library` to get the slug for any book you own. Examples:

| Book | Slug |
|------|------|
| Player's Handbook (2024) | `dnd/phb-2024` |
| Dungeon Master's Guide (2024) | `dnd/dmg-2024` |
| Monster Manual (2024) | `dnd/mm-2024` |
| Player's Handbook (2014) | `dnd/phb-2014` |

To read a specific chapter, pass the chapter path after the book slug:

```
ddb_read_book("dnd/phb-2024", "character-classes/barbarian")
```

## Upgrading

To upgrade to the latest release, run the install command again — npm will overwrite the existing installation:

```bash
npm install -g "https://github.com/ddb-mcp/ddb-mcp/archive/refs/heads/main.tar.gz"
```

To install a specific tagged version:

```bash
npm install -g "https://github.com/ddb-mcp/ddb-mcp/archive/refs/tags/v1.0.2.tar.gz"
```

Then restart Claude Code and run `/mcp` to reconnect the server.

## Session storage

Your session is saved to `~/.config/ddb-mcp/session.json`. This file contains browser cookies and local storage from your D&D Beyond login. Keep this file private — it grants access to your account.

To log out or reset your session, delete the file:

```bash
rm ~/.config/ddb-mcp/session.json
```

## Development

```bash
# Run in development mode (no build step needed)
npm run dev

# Build
npm run build

# Watch mode
npm run build:watch
```

## License

MIT
