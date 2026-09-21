# USDT Allowance-Checker & Pull-Transfer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page React dapp where a user connects a wallet via WalletConnect, checks whether their wallet is approved to spend a FROM address's USDT (green TRUE / red FALSE), and pulls tokens via `transferFrom` on Ethereum mainnet.

**Architecture:** Vite + React + TypeScript SPA. Reown AppKit provides the WalletConnect modal on top of wagmi v2 + viem v2. The connected wallet is the ERC-20 *spender*; the app reads `allowance(FROM, connectedWallet)` and executes `transferFrom(FROM, TO, amount)`. Pure token math lives in a framework-free helper module that is unit-tested with Vitest; React components are verified by typecheck + build + manual run.

**Tech Stack:** React 18, TypeScript, Vite, wagmi v2, viem v2, @tanstack/react-query, @reown/appkit, @reown/appkit-adapter-wagmi, Vitest.

---

## Notes for the implementer

- **No commits.** Per the repo owner's global rule, never run `git add`/`git commit`/`git push`. Each task ends with a **Checkpoint** (verify state) instead. The repo is not initialized; leave it that way unless the owner asks.
- **Windows / PowerShell** is the shell. Commands are given in PowerShell form.
- **Project ID:** The owner supplies `VITE_WC_PROJECT_ID` in `.env.local`. Never paste it into chat or commit it.
- **Spec:** `docs/superpowers/specs/2026-09-21-usdt-allowance-transfer-design.md`.
- The `docs/` folder already exists in the project root and must be preserved by the scaffold step.

---

## File structure (target)

```
index.html                    Vite entry (from scaffold, title edited)
package.json                  scripts + deps
vite.config.ts                Vite + Vitest config
tsconfig*.json                from scaffold
.env.example                  VITE_WC_PROJECT_ID=      (committed)
.env.local                    real project id          (gitignored, owner-created)
.gitignore                    includes .env.local
README.md                     setup + demo steps
src/
  main.tsx                    providers: WagmiProvider, QueryClientProvider
  App.tsx                     layout + header + panel
  index.css                   app styles
  vite-env.d.ts               env var typing (extended)
  config/
    wagmi.ts                  WagmiAdapter + createAppKit + wagmiConfig
    token.ts                  TOKEN {address, symbol, decimals, abi}
  lib/
    erc20.ts                  pure helpers (unit-tested)
    erc20.test.ts             Vitest tests
  hooks/
    useAllowance.ts           useReadContract(allowance) wrapper
  components/
    ConnectWallet.tsx         connect / account button
    NetworkGuard.tsx          wrong-chain banner
    AllowanceBadge.tsx        TRUE/FALSE pill
    TransferPanel.tsx         main flow: FROM, TO, check, amount, transfer
```

---

## Task 1: Scaffold the Vite React-TS project and install dependencies

**Files:**
- Create: whole project scaffold in repo root (preserving `docs/`)
- Modify: `package.json` (add deps + test script)

- [ ] **Step 1: Scaffold into a temp dir (avoids the non-empty-directory prompt)**

The project root already contains `docs/`, so scaffolding in place would trigger an interactive prompt. Scaffold into the session scratchpad, then copy files in.

Run:
```powershell
$scratch = "C:\Users\ASUS\AppData\Local\Temp\claude\c--Users-ASUS-Desktop-QUAGNITIA-crypto-last\c66473c1-4f3b-4890-9529-8831422ee11c\scratchpad"
npm create vite@latest "$scratch\vite-scaffold" -- --template react-ts
```
Expected: creates `$scratch\vite-scaffold` with a React-TS template. No prompt (empty target dir).

- [ ] **Step 2: Copy scaffold contents into the project root (merge, keep docs/)**

Run:
```powershell
$scratch = "C:\Users\ASUS\AppData\Local\Temp\claude\c--Users-ASUS-Desktop-QUAGNITIA-crypto-last\c66473c1-4f3b-4890-9529-8831422ee11c\scratchpad"
$root = "c:\Users\ASUS\Desktop\QUAGNITIA\crypto-last"
Copy-Item -Path "$scratch\vite-scaffold\*" -Destination $root -Recurse -Force
Get-ChildItem -Force $root | Select-Object Name
```
Expected: root now has `index.html`, `package.json`, `src/`, `public/`, `tsconfig*.json`, `vite.config.ts`, `.gitignore`, plus the pre-existing `docs/`.

- [ ] **Step 3: Install base deps, then web3 deps**

Run:
```powershell
npm install
npm install wagmi viem @tanstack/react-query @reown/appkit @reown/appkit-adapter-wagmi
npm install -D vitest
```
Expected: installs succeed; `wagmi`, `viem`, `@reown/appkit`, `@reown/appkit-adapter-wagmi`, `@tanstack/react-query` appear under `dependencies` and `vitest` under `devDependencies` in `package.json`.

- [ ] **Step 4: Add the test script**

In `package.json`, add to the `"scripts"` object:
```json
"test": "vitest run"
```
Keep the existing `dev`, `build`, `preview`, `lint` scripts from the scaffold.

- [ ] **Step 5: Verify the scaffold builds**

Run:
```powershell
npm run build
```
Expected: `tsc` + `vite build` succeed, producing `dist/`. (The default template compiles cleanly.)

- [ ] **Step 6: Checkpoint**

Confirm `npm run build` passed and `docs/` still exists. Do not commit.

---

## Task 2: Token configuration

**Files:**
- Create: `src/config/token.ts`

- [ ] **Step 1: Write the token config with a minimal, correct USDT ABI**

Create `src/config/token.ts`:
```ts
import type { Address } from 'viem'

// USDT on Ethereum mainnet. Decimals and symbol are hardcoded (this app is
// single-token), so decimals()/symbol() are intentionally omitted from the ABI.
export const TOKEN = {
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
  symbol: 'USDT',
  decimals: 6,
  abi: [
    {
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      // USDT's transferFrom returns no value (non-standard). Declaring empty
      // outputs matches the real contract; writes do not decode return values.
      name: 'transferFrom',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
      outputs: [],
    },
  ],
} as const

export const ETHERSCAN_TX = (hash: string) => `https://etherscan.io/tx/${hash}`
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Checkpoint**

Token config compiles. Do not commit.

---

## Task 3: Pure ERC-20 helpers (TDD)

**Files:**
- Create: `src/lib/erc20.ts`
- Test: `src/lib/erc20.test.ts`
- Modify: `vite.config.ts` (add Vitest config)

- [ ] **Step 1: Configure Vitest in `vite.config.ts`**

Replace the contents of `vite.config.ts` with:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/erc20.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateAddress, parseAmount, formatAmount, meetsAllowance } from './erc20'

describe('validateAddress', () => {
  it('accepts a valid address', () => {
    expect(validateAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toBe(true)
  })
  it('rejects malformed input', () => {
    expect(validateAddress('0x123')).toBe(false)
    expect(validateAddress('nope')).toBe(false)
    expect(validateAddress('')).toBe(false)
  })
})

describe('parseAmount (6 decimals)', () => {
  it('parses a human amount to base units', () => {
    expect(parseAmount('25.5', 6)).toBe(25500000n)
  })
  it('parses a whole number', () => {
    expect(parseAmount('100', 6)).toBe(100000000n)
  })
  it('returns null on empty, dot-only, or non-numeric input', () => {
    expect(parseAmount('', 6)).toBeNull()
    expect(parseAmount('.', 6)).toBeNull()
    expect(parseAmount('abc', 6)).toBeNull()
    expect(parseAmount('1.2.3', 6)).toBeNull()
  })
  it('returns null when more decimals than supported', () => {
    expect(parseAmount('1.1234567', 6)).toBeNull()
  })
})

describe('formatAmount', () => {
  it('formats base units back to a human string', () => {
    expect(formatAmount(25500000n, 6)).toBe('25.5')
  })
  it('round-trips with parseAmount', () => {
    const v = parseAmount('1234.567891', 6)!
    expect(formatAmount(v, 6)).toBe('1234.567891')
  })
})

describe('meetsAllowance', () => {
  it('is true when allowance >= amount and amount > 0', () => {
    expect(meetsAllowance(100n, 100n)).toBe(true)
    expect(meetsAllowance(101n, 100n)).toBe(true)
  })
  it('is false when allowance < amount', () => {
    expect(meetsAllowance(99n, 100n)).toBe(false)
  })
  it('is false when amount is 0', () => {
    expect(meetsAllowance(100n, 0n)).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```powershell
npm run test
```
Expected: FAIL — cannot resolve `./erc20` (module not found).

- [ ] **Step 4: Write the minimal implementation**

Create `src/lib/erc20.ts`:
```ts
import { isAddress, parseUnits, formatUnits } from 'viem'

export function validateAddress(value: string): boolean {
  return isAddress(value)
}

// Returns base units, or null if the string is not a clean non-negative decimal
// that fits the token's decimals.
export function parseAmount(value: string, decimals: number): bigint | null {
  const v = value.trim()
  if (!/^\d+(\.\d+)?$/.test(v)) return null
  const [, frac = ''] = v.split('.')
  if (frac.length > decimals) return null
  try {
    return parseUnits(v, decimals)
  } catch {
    return null
  }
}

export function formatAmount(value: bigint, decimals: number): string {
  return formatUnits(value, decimals)
}

export function meetsAllowance(allowance: bigint, amount: bigint): boolean {
  return amount > 0n && allowance >= amount
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```powershell
npm run test
```
Expected: PASS — all tests in `src/lib/erc20.test.ts` green.

- [ ] **Step 6: Checkpoint**

Pure helpers implemented and tested. Do not commit.

---

## Task 4: wagmi + Reown AppKit configuration

**Files:**
- Create: `src/config/wagmi.ts`
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: Type the env variable**

Replace the contents of `src/vite-env.d.ts` with:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WC_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 2: Create the wagmi/AppKit config**

Create `src/config/wagmi.ts`:
```ts
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

const projectId = import.meta.env.VITE_WC_PROJECT_ID
if (!projectId) {
  throw new Error(
    'VITE_WC_PROJECT_ID is not set. Copy .env.example to .env.local and add your Reown project ID.',
  )
}

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
})

// Initialize the modal once at module load.
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'USDT Allowance Demo',
    description: 'Check ERC-20 allowance and pull USDT via transferFrom',
    url: 'http://localhost:5173',
    icons: [],
  },
  features: { analytics: false },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
```

- [ ] **Step 3: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors. (A missing `.env.local` does NOT fail typecheck; it only throws at runtime.)

- [ ] **Step 4: Checkpoint**

wagmi/AppKit config compiles. Do not commit.

---

## Task 5: Providers in main.tsx

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Wire the providers**

Replace the contents of `src/main.tsx` with:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './config/wagmi'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors. (`App` still has its default template body — that is replaced in Task 11.)

- [ ] **Step 3: Checkpoint**

Providers wired. Do not commit.

---

## Task 6: ConnectWallet component

**Files:**
- Create: `src/components/ConnectWallet.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ConnectWallet.tsx`:
```tsx
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function ConnectWallet() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="wallet">
        <span className="wallet-addr" title={address}>{shorten(address)}</span>
        <button className="btn btn-secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button className="btn btn-primary" onClick={() => open()}>
      Connect Wallet
    </button>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Checkpoint**

ConnectWallet compiles. Do not commit.

---

## Task 7: NetworkGuard component

**Files:**
- Create: `src/components/NetworkGuard.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/NetworkGuard.tsx`:
```tsx
import type { ReactNode } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { mainnet } from 'wagmi/chains'

export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  if (isConnected && chainId !== mainnet.id) {
    return (
      <div className="banner banner-warn">
        <span>Wrong network. This app runs on Ethereum mainnet.</span>
        <button
          className="btn btn-secondary"
          disabled={isPending}
          onClick={() => switchChain({ chainId: mainnet.id })}
        >
          {isPending ? 'Switching…' : 'Switch to Mainnet'}
        </button>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Checkpoint**

NetworkGuard compiles. Do not commit.

---

## Task 8: useAllowance hook

**Files:**
- Create: `src/hooks/useAllowance.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useAllowance.ts`:
```ts
import { useReadContract } from 'wagmi'
import type { Address } from 'viem'
import { TOKEN } from '../config/token'

// Reads allowance(owner, spender). Disabled until both addresses are present.
export function useAllowance(owner?: Address, spender?: Address) {
  return useReadContract({
    address: TOKEN.address,
    abi: TOKEN.abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: Boolean(owner && spender) },
  })
}
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Checkpoint**

useAllowance compiles. Do not commit.

---

## Task 9: AllowanceBadge component

**Files:**
- Create: `src/components/AllowanceBadge.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/AllowanceBadge.tsx`:
```tsx
import { TOKEN } from '../config/token'
import { formatAmount } from '../lib/erc20'

type Props = {
  allowance: bigint | undefined
  isLoading: boolean
  checked: boolean
}

export function AllowanceBadge({ allowance, isLoading, checked }: Props) {
  if (!checked) return null
  if (isLoading || allowance === undefined) {
    return <div className="badge badge-neutral">Checking…</div>
  }

  const approved = allowance > 0n
  return (
    <div className={approved ? 'badge badge-true' : 'badge badge-false'}>
      <strong>{approved ? 'TRUE' : 'FALSE'}</strong>
      <span className="badge-detail">
        Allowance: {formatAmount(allowance, TOKEN.decimals)} {TOKEN.symbol}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Checkpoint**

AllowanceBadge compiles. Do not commit.

---

## Task 10: TransferPanel component (main flow)

**Files:**
- Create: `src/components/TransferPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/TransferPanel.tsx`:
```tsx
import { useEffect, useState } from 'react'
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { mainnet } from 'wagmi/chains'
import type { Address } from 'viem'
import { TOKEN, ETHERSCAN_TX } from '../config/token'
import { validateAddress, parseAmount, meetsAllowance } from '../lib/erc20'
import { useAllowance } from '../hooks/useAllowance'
import { AllowanceBadge } from './AllowanceBadge'

export function TransferPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const onMainnet = chainId === mainnet.id

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [checked, setChecked] = useState(false)

  const fromValid = validateAddress(from)
  const toValid = validateAddress(to)

  const allowanceQuery = useAllowance(
    fromValid ? (from as Address) : undefined,
    address,
  )
  const allowance = allowanceQuery.data as bigint | undefined

  const parsed = parseAmount(amount, TOKEN.decimals)
  const amountValid = parsed !== null && parsed > 0n

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract()

  const receipt = useWaitForTransactionReceipt({ hash: txHash })

  // Refresh allowance after a confirmed transfer (it decreases).
  useEffect(() => {
    if (receipt.isSuccess) {
      allowanceQuery.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess])

  const canTransfer =
    isConnected &&
    onMainnet &&
    fromValid &&
    toValid &&
    amountValid &&
    allowance !== undefined &&
    meetsAllowance(allowance, parsed!)

  const onCheck = () => {
    setChecked(true)
    allowanceQuery.refetch()
  }

  const onTransfer = () => {
    if (!canTransfer || parsed === null) return
    reset()
    writeContract({
      address: TOKEN.address,
      abi: TOKEN.abi,
      functionName: 'transferFrom',
      args: [from as Address, to as Address, parsed],
    })
  }

  const amountExceedsAllowance =
    checked &&
    amountValid &&
    allowance !== undefined &&
    !meetsAllowance(allowance, parsed!)

  return (
    <div className="panel">
      <h2>Pull {TOKEN.symbol}</h2>
      <p className="hint">
        Your connected wallet is the spender. It can move {TOKEN.symbol} out of
        the FROM address only if FROM has approved it.
      </p>

      <label className="field">
        <span>FROM (owner that approved your wallet)</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
        />
        {from && !fromValid && <em className="err">Invalid address</em>}
      </label>

      <label className="field">
        <span>TO (recipient)</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
        />
        {to && !toValid && <em className="err">Invalid address</em>}
      </label>

      <button
        className="btn btn-primary"
        onClick={onCheck}
        disabled={!isConnected || !onMainnet || !fromValid}
      >
        Check Approval
      </button>

      <AllowanceBadge
        allowance={allowance}
        isLoading={allowanceQuery.isFetching}
        checked={checked}
      />

      <label className="field">
        <span>Amount ({TOKEN.symbol})</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          inputMode="decimal"
        />
        {amount && !amountValid && <em className="err">Invalid amount</em>}
        {amountExceedsAllowance && (
          <em className="err">Amount exceeds current allowance</em>
        )}
      </label>

      <button
        className="btn btn-primary"
        onClick={onTransfer}
        disabled={!canTransfer || isPending || receipt.isLoading}
      >
        {isPending
          ? 'Confirm in wallet…'
          : receipt.isLoading
            ? 'Transferring…'
            : `Transfer ${TOKEN.symbol}`}
      </button>

      {!isConnected && <p className="status">Connect a wallet to begin.</p>}

      {writeError && (
        <p className="status status-err">
          {writeError.message.toLowerCase().includes('rejected')
            ? 'Transaction rejected in wallet.'
            : `Transaction failed: ${writeError.message}`}
        </p>
      )}

      {txHash && receipt.isLoading && (
        <p className="status">Waiting for confirmation…</p>
      )}

      {receipt.isSuccess && txHash && (
        <p className="status status-ok">
          Transfer confirmed.{' '}
          <a href={ETHERSCAN_TX(txHash)} target="_blank" rel="noreferrer">
            View on Etherscan
          </a>
        </p>
      )}

      {receipt.isError && txHash && (
        <p className="status status-err">
          Transaction reverted.{' '}
          <a href={ETHERSCAN_TX(txHash)} target="_blank" rel="noreferrer">
            View on Etherscan
          </a>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Checkpoint**

TransferPanel compiles. Do not commit.

---

## Task 11: App shell and styles

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `index.html` (title)

- [ ] **Step 1: Write the App shell**

Replace the contents of `src/App.tsx` with:
```tsx
import { ConnectWallet } from './components/ConnectWallet'
import { NetworkGuard } from './components/NetworkGuard'
import { TransferPanel } from './components/TransferPanel'
import { TOKEN } from './config/token'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>{TOKEN.symbol} Allowance & Transfer</h1>
        <ConnectWallet />
      </header>
      <main className="main">
        <NetworkGuard>
          <TransferPanel />
        </NetworkGuard>
      </main>
      <footer className="footer">
        Ethereum mainnet · {TOKEN.symbol} · demo
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Replace styles**

Replace the contents of `src/index.css` with:
```css
:root {
  color-scheme: dark;
  --bg: #0b0e14;
  --card: #151a23;
  --border: #262d3a;
  --text: #e6e9ef;
  --muted: #8b93a7;
  --primary: #3b82f6;
  --primary-hover: #2f6fe0;
  --green: #22c55e;
  --red: #ef4444;
  --warn: #f59e0b;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}

.app {
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.header h1 { font-size: 20px; margin: 0; }

.main { flex: 1; }

.panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel h2 { margin: 0; font-size: 18px; }

.hint { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field > span { font-size: 13px; color: var(--muted); }

.field input {
  background: #0f131b;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.field input:focus { outline: none; border-color: var(--primary); }

.err { color: var(--red); font-size: 12px; font-style: normal; }

.btn {
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:not(:disabled):hover { background: var(--primary-hover); }
.btn-secondary { background: #232a36; color: var(--text); }

.wallet { display: flex; align-items: center; gap: 10px; }
.wallet-addr {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: var(--muted);
}

.badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
}
.badge-true { background: rgba(34, 197, 94, 0.12); color: var(--green); }
.badge-false { background: rgba(239, 68, 68, 0.12); color: var(--red); }
.badge-neutral { background: #232a36; color: var(--muted); }
.badge-detail { color: var(--text); font-size: 13px; }

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
}
.banner-warn {
  background: rgba(245, 158, 11, 0.12);
  color: var(--warn);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status { font-size: 13px; color: var(--muted); margin: 0; }
.status-ok { color: var(--green); }
.status-err { color: var(--red); }
.status a { color: var(--primary); }

.footer { text-align: center; color: var(--muted); font-size: 12px; }
```

- [ ] **Step 3: Set the page title**

In `index.html`, change the `<title>` element to:
```html
<title>USDT Allowance & Transfer</title>
```

- [ ] **Step 4: Remove the unused template asset import (if present)**

The default template's `App.tsx` imported `./App.css` and logos; those imports are gone after Step 1. If `src/App.css` still exists it is now unused — leave it or delete it; it does not affect the build. Verify no dangling imports remain:

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors (no references to removed logo/App.css imports).

- [ ] **Step 5: Checkpoint**

App shell + styles in place. Do not commit.

---

## Task 12: Environment, gitignore, and README

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `.env.example`**

Create `.env.example`:
```
# Reown (WalletConnect) project ID from https://dashboard.reown.com
VITE_WC_PROJECT_ID=
```

- [ ] **Step 2: Ensure `.env.local` is gitignored**

Confirm `.gitignore` (from the scaffold) contains a line covering local env files. It normally has `*.local`, which covers `.env.local`. If it does not, add:
```
.env.local
```

- [ ] **Step 3: Write the README**

Create `README.md`:
```markdown
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
```

- [ ] **Step 4: Checkpoint**

Env, gitignore, README in place. Do not commit.

---

## Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Unit tests**

Run:
```powershell
npm run test
```
Expected: all `erc20` tests pass.

- [ ] **Step 3: Production build**

Run:
```powershell
npm run build
```
Expected: build succeeds, `dist/` produced.

- [ ] **Step 4: Manual run check (requires `.env.local`)**

Run:
```powershell
npm run dev
```
Expected: dev server starts at `http://localhost:5173`. In a browser:
- App loads with header, Connect Wallet button, and the panel.
- Clicking **Connect Wallet** opens the Reown/WalletConnect modal.
- With no `.env.local`, the app throws a clear error about `VITE_WC_PROJECT_ID` — this confirms the guard works.

Note: a full TRUE badge + successful transfer requires a real on-chain allowance
and mainnet gas; that is validated manually by the owner, not in CI.

- [ ] **Step 5: Checkpoint**

All automated checks green. App is ready to run. Do not commit — the working tree is left for the owner.

---

## Self-review notes (author)

- **Spec coverage:** WalletConnect (Task 4, 6), Ethereum mainnet only (Task 4, 7), fixed USDT (Task 2), FROM/TO inputs + allowance check with TRUE/FALSE badge (Tasks 9, 10), `transferFrom` gated on allowance (Task 10), human-readable amounts (Task 3, 10), error handling matrix (Task 10 covers not-connected, wrong-network via Task 7, invalid address, allowance 0, amount > allowance, rejected/reverted tx), Vitest on pure helpers (Task 3), env/README (Task 12). All spec sections map to a task.
- **No approve panel, single token, mainnet only, no testnet switcher** — honored as non-goals.
- **Placeholders:** none — every code step contains full file contents.
- **Type consistency:** `TOKEN`, `parseAmount`, `formatAmount`, `meetsAllowance`, `validateAddress`, `useAllowance` signatures are consistent across Tasks 2, 3, 8, 9, 10.
```
