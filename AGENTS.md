# SmartWakacje

SmartWakacje is a Bun monorepo for scraping wakacje.pl offers, enriching hotel ratings, and reviewing results in a web UI with AI chat.

## Essentials

- Package manager/runtime: `bun` (not npm)
- Core setup command: `bun run dev` (starts server + frontend from root workspace)
- Non-standard build command: `bun run build` (builds frontend only)
- Typecheck: no root script; run `cd packages/frontend && bun x tsc --noEmit` when needed
- Single source for user-tunable scraper/fetch/report settings: `config.ts`

## Read Next (Progressive Disclosure)

- Functional map (who owns what): [`docs/agent/functional-map.md`](docs/agent/functional-map.md)
- Workflows and commands: [`docs/agent/workflows.md`](docs/agent/workflows.md)
- Configuration and secrets: [`docs/agent/configuration.md`](docs/agent/configuration.md)
- Data model and API surface: [`docs/agent/data-and-api.md`](docs/agent/data-and-api.md)
- wakacje.pl protocol deep dive: [`docs/WakacjeAPI.md`](docs/WakacjeAPI.md)
