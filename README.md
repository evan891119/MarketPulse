# MarketPulse

MarketPulse is a real-time financial market dashboard MVP. The current phase is
focused on a clean, maintainable, Vercel-ready foundation before adding market
data, dashboard modules, or simulated realtime updates.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Vercel-ready project structure

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

This MVP does not require API keys, private environment variables, or a custom
backend server.

1. Import the repository in Vercel.
2. Keep the default Next.js framework settings.
3. Use `npm run build` as the build command.
4. Deploy.

## Future Roadmap

- Dashboard layout with header, watchlist, chart, market info, and trades/order
  book panels
- Mock market data provider with typed interfaces
- Simulated realtime updates and connection states
- Provider adapters for Binance WebSocket, Bybit WebSocket, stock quote APIs,
  and strategy signal APIs
- Deployment readiness checks before adding live integrations

## Safety Notes

This phase intentionally excludes API keys, order placement, real trading,
login secrets, private tokens, and any feature that could trigger live trades.
