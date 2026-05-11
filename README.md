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

Demo mode does not require API keys, private environment variables, or a custom
backend server. Shioaji-backed realtime quotes require server-side credentials
and a backend bridge that can run the Python Shioaji client.

1. Import the repository in Vercel.
2. Keep the default Next.js framework settings.
3. Use `npm run build` as the build command.
4. Deploy.

## Future Roadmap

- Add polling or streaming updates from the Next.js frontend
- Add provider tests and disconnected/reconnecting UI states
- Prepare deployment topology for Vercel frontend plus a Shioaji-capable backend
- Deployment readiness checks before adding live integrations

## Safety Notes

The app intentionally excludes order placement, order modification, order
cancelation, account balance, positions, P&L, CA certificate activation, and any
feature that could trigger live trades.

Shioaji integration must stay quote-only and simulation-only until a separate
trading safety review explicitly changes that boundary. Credentials belong in
server-side environment variables only and must not be committed.
