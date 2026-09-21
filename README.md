# USDT Allowance & Transfer (demo)

A single-page React dapp: connect a wallet via WalletConnect, check whether your
wallet is approved to spend a FROM address's USDT, and pull tokens via
`transferFrom` on Ethereum mainnet.

## How it works

Your connected wallet is the ERC-20 **spender**.

- **Check Approval** reads `allowance(FROM, yourWallet)` → green **TRUE** (> 0) or
  red **FALSE** (= 0), with the numeric allowance.
- **Transfer** calls `transferFrom(FROM, TO, amount)`, enabled only when the
  allowance covers the amount.

Token is hardcoded to USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`, 6 decimals).

## Setup

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Get a project ID from https://dashboard.reown.com, then:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   Edit `.env.local` and set `VITE_WC_PROJECT_ID`.
3. Run:
   ```powershell
   npm run dev
   ```

## Demo prerequisite

The badge only shows TRUE if some FROM address has already approved your
connected wallet on-chain (there is no approve panel in this build). Arrange that
allowance via Etherscan or a script before demoing.

## Scripts

- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm run test` — unit tests (Vitest)

## Deploy (Netlify)

Build settings are already in `netlify.toml` (build command `npm run build`,
publish directory `dist`, Node 22, SPA redirect). You do **not** need to enter
them manually.

Two required steps outside the code:

1. **Set the project ID as a Netlify environment variable.** `.env.local` is
   gitignored and never deployed, so the build gets the ID from Netlify:
   - Site configuration → Environment variables → add
     `VITE_WC_PROJECT_ID = <your Reown project id>`.
   - Vite inlines `VITE_`-prefixed variables at build time. Without it the app
     throws on load. (Do not rely on `.env.example` — Vite does not read it.)

2. **Allow the Netlify domain in Reown.** In https://dashboard.reown.com, open
   your project and add your Netlify URL (e.g. `https://your-site.netlify.app`,
   plus any custom domain) to the allowed domains, or WalletConnect may reject
   the origin.

### Deploy options

- **Git-connected:** push this project to a Git repo and "Add new site → Import
  an existing project" in Netlify. It reads `netlify.toml` automatically.
- **CLI (no Git):**
  ```powershell
  npx netlify deploy --build --prod
  ```
  Set `VITE_WC_PROJECT_ID` in the site's environment first (step 1), or export it
  in the shell before running.

Note: the WalletConnect metadata URL is derived from `window.location.origin` at
runtime, so it matches the deployed site with no code change needed.

## Tech

React 19 · TypeScript · Vite · wagmi v3 · viem · @tanstack/react-query ·
Reown AppKit (WalletConnect).
