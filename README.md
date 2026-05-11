# MarketPulse

MarketPulse is a Taiwan-market-focused financial dashboard MVP. The current
architecture keeps market data behind a server-side provider boundary so the
frontend can run in demo mode today and later read Shioaji-backed realtime
quotes without exposing credentials in browser code.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Server-side market data provider boundary

## Market Data Modes

MarketPulse currently supports a safe demo provider and a local Shioaji bridge.

- `demo`: returns Taiwan stock demo data for local UI development.
- `shioaji`: reads a local snapshot file written by the Python Shioaji quote
  bridge and falls back to an explicit Offline state when the bridge is not
  running.

The frontend reads market data from `/api/market`; it does not import Shioaji
or read secrets directly.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy the example file when you need local configuration:

```bash
cp .env.example .env.local
```

Default demo mode:

```bash
MARKET_DATA_PROVIDER=demo
```

Shioaji-backed mode is reserved for server-side integration:

```bash
MARKET_DATA_PROVIDER=shioaji
SHIOAJI_API_KEY=your_server_side_key
SHIOAJI_SECRET_KEY=your_server_side_secret
SHIOAJI_SYMBOLS=2330,2317,2454,2412
SHIOAJI_SNAPSHOT_FILE=shioaji-snapshot.json
SHIOAJI_FORCE_SIMULATION=true
```

Never prefix Shioaji credentials with `NEXT_PUBLIC_`; that would expose them to
the browser bundle.

### Shioaji Quote Bridge

Install the Python bridge dependency in your Python environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/shioaji-bridge/requirements.txt
```

Run the bridge from the repository root:

```bash
npm run shioaji:bridge
```

The bridge uses `sj.Shioaji(simulation=True)`, subscribes to stock tick and
bid/ask quotes, and writes the latest snapshot to
`.marketpulse/shioaji-snapshot.json` by default. It does not activate CA,
access account data, or call order APIs.

Run the Next.js app in a separate terminal:

```bash
npm run dev
```

## Build

Create a production build:

```bash
npm run build
```

Run the production server locally:

```bash
npm run start
```

## Deploy to Vercel

Demo mode can be deployed to Vercel as a standard Next.js app. It does not
require API keys, private environment variables, a Python runtime, or a custom
backend server.

1. Import the repository in Vercel.
2. Keep the default Next.js framework settings.
3. Use `npm run build` as the build command.
4. Set `MARKET_DATA_PROVIDER=demo` or leave environment variables unset.
5. Deploy.

### Shioaji Deployment Topology

Shioaji-backed realtime quotes require a long-running Python process. Vercel
serverless functions are not the right place to run the Shioaji bridge because
they are request-scoped and cannot maintain quote subscriptions.

Use this topology for Shioaji-backed mode:

- Vercel: hosts the Next.js dashboard.
- Long-running host: runs `npm run shioaji:bridge` on a machine that can keep a
  Python process alive, such as a local machine, VPS, NAS, or internal server.
- Shared data boundary: the Next.js app reads the bridge snapshot from
  `.marketpulse/shioaji-snapshot.json` in local/dev mode. For production
  Shioaji-backed deployment, replace this local file boundary with a durable
  store or private internal API reachable by the dashboard.

Do not put Shioaji credentials in Vercel unless the deployment also includes a
secure server-side bridge design. Never expose Shioaji credentials through
`NEXT_PUBLIC_*`.

### Deployment Checklist

- `npm run build` passes.
- `.env.local` is not committed.
- `.marketpulse/` runtime snapshots are not committed.
- `.venv/` and Python bytecode are not committed.
- No API keys, private tokens, CA certificate paths/passwords, or account data
  are committed.
- Demo deployment works without environment variables.
- Shioaji bridge remains quote-only and `simulation=True`.

## Future Roadmap

- Add provider tests for demo, Shioaji, stale snapshot, and off-hours fallback
- Replace local snapshot files with a production-safe bridge data boundary
- Add deployment automation for the long-running Shioaji bridge host
- Add observability for bridge heartbeat, stale snapshots, and Shioaji reconnects

## Safety Notes

The app intentionally excludes order placement, order modification, order
cancelation, account balance, positions, P&L, CA certificate activation, and any
feature that could trigger live trades.

Shioaji integration must stay quote-only and simulation-only until a separate
trading safety review explicitly changes that boundary. Credentials belong in
server-side environment variables only and must not be committed.
