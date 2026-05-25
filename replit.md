relance # Workspace

## Overview

pnpm workspace monorepo using TypeScript + Python Discord bot ("Brams Score").

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Discord Bot (bot.py)

One Piece-themed Discord activity tracking bot.

### Configuration
- **Server**: 924346730194014220 (Brams Community) — guild-only sync, no global commands
- **Client ID**: 1493803072919437312
- **Token**: `DISCORD_TOKEN` env secret
- **Keep-alive**: Flask on port 5000 (top of bot.py), monitored by UptimeRobot
- **Data file**: `data.json` (user stats, vocal sessions, messages)

### Features
- Voice channel time tracking (join/leave events)
- Message counting
- 7-day rolling rank system: Pirate (10h), Shichibukai (25h), Amiral (40h), Yonkou (70h)
- Rank announcements in "rappel-rank" channel
- Alert DM when close to losing rank (5h threshold)
- One Piece citations with Jikan API character images
- Activity graphs (matplotlib) with custom fonts

### Slash Commands (8)
- `/stats` — Personal stats with graph (public)
- `/top` — Top 5 vocal and messages
- `/serveur` — Server-wide stats
- `/tout` — Combined view: stats + server + leaderboard
- `/chercher` — Look up another member's stats
- `/citation` — Random One Piece quote with character image
- `/addheures` — [ADMIN] Add vocal hours to a member
- `/forcerank` — [ADMIN] Recalculate a member's rank

### Assets
- `template.png` — One Piece wanted poster template
- `PirataOne-Regular.ttf` — Font for wanted posters
- `Righteous-Regular.ttf` — Font for graphs
- `background.jpeg` — Background image

### Important Notes
- Always keep Flask keep-alive block at the very top of bot.py
- Commands sync per-guild only (not global) to avoid duplicates
- `data.json` can get corrupted if bot crashes during write — load_data has error handling
- check_ranks_loop has asyncio.sleep(1) between members to prevent heartbeat blocking
- @everyone role on server needs "Use Application Commands" permission enabled for slash commands to be visible

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
