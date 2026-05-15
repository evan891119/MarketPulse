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

MarketPulse currently supports a safe demo provider, a local Shioaji bridge,
and an Upstash Redis boundary for NAS-to-Vercel deployments.

- `demo`: returns Taiwan stock demo data for local UI development.
- `shioaji`: reads a local snapshot file written by the Python Shioaji quote
  bridge and falls back to an explicit Offline state when the bridge is not
  running.
- `upstash`: reads the latest snapshot from Upstash Redis REST. This is the
  intended production boundary when a QNAP NAS runs the bridge outbound-only.

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

Upstash-backed mode is for Vercel reading snapshots pushed by the NAS bridge:

```bash
MARKET_DATA_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_READ_TOKEN=your_upstash_read_only_token
MARKETPULSE_SNAPSHOT_KEY=marketpulse:snapshot
MARKETPULSE_SNAPSHOT_MAX_AGE_MS=20000
```

Never prefix Shioaji credentials with `NEXT_PUBLIC_`; that would expose them to
the browser bundle. Upstash tokens are also server-side only in this app; do
not use `NEXT_PUBLIC_` for them.

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

### QNAP NAS Deployment Topology

Shioaji-backed realtime quotes require a long-running Python process. Vercel
serverless functions are not the right place to run the Shioaji bridge because
they are request-scoped and cannot maintain quote subscriptions.

Use this outbound-only topology for QNAP NAS deployments:

- Vercel: hosts the Next.js dashboard.
- QNAP Container Manager: runs the Shioaji bridge container.
- Upstash Redis: stores the latest `marketpulse:snapshot` value.
- NAS bridge: connects outbound to Shioaji and Upstash over HTTPS.
- Vercel app: reads Upstash from `/api/market` with `MARKET_DATA_PROVIDER=upstash`.

Do not expose NAS ports, DDNS, public NAS APIs, or inbound Vercel-to-NAS
traffic. The NAS should push data out; Vercel should never call into the NAS.

### QNAP Container Manager

Copy the bridge env example and fill it on the NAS:

```bash
cp services/shioaji-bridge/.env.example services/shioaji-bridge/.env
```

Required NAS bridge values:

```bash
SHIOAJI_API_KEY=your_server_side_key
SHIOAJI_SECRET_KEY=your_server_side_secret
SHIOAJI_FORCE_SIMULATION=true
SHIOAJI_SYMBOLS=2330,2317,2454,2412
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_standard_token
MARKETPULSE_SNAPSHOT_KEY=marketpulse:snapshot
```

Run the QNAP compose file from the repository root or import it in Container
Manager:

```bash
docker compose -f services/shioaji-bridge/docker-compose.qnap.yml up -d --build
```

The compose file does not define `ports:`. It only needs outbound access to
Shioaji and Upstash.

Set these Vercel environment variables for the dashboard:

```bash
MARKET_DATA_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_READ_TOKEN=your_upstash_read_only_token
MARKETPULSE_SNAPSHOT_KEY=marketpulse:snapshot
MARKETPULSE_SNAPSHOT_MAX_AGE_MS=20000
```

Do not put Shioaji credentials in Vercel for this topology. Vercel only needs
the Upstash read token.

### Deployment Checklist

- `npm run build` passes.
- `.env.local` is not committed.
- `.marketpulse/` runtime snapshots are not committed.
- `.venv/` and Python bytecode are not committed.
- No API keys, private tokens, CA certificate paths/passwords, or account data
  are committed.
- Demo deployment works without environment variables.
- Shioaji bridge remains quote-only and `simulation=True`.
- QNAP compose file has no inbound `ports:` mapping.
- Vercel uses an Upstash read-only token when possible.

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
