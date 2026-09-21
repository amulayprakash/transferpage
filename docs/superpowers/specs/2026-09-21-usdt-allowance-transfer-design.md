# USDT Allowance-Checker & Pull-Transfer Demo — Design

**Date:** 2026-09-21
**Status:** Approved
**Type:** Client demo / proof of concept

## Purpose

A single-page React dapp demonstrating the ERC-20 pull-payment flow on Ethereum
mainnet against USDT:

1. User connects a wallet via WalletConnect (Reown AppKit).
2. User enters a **FROM** (owner) address and a **TO** (recipient) address.
3. User checks whether the connected wallet is approved to spend the owner's
   USDT — a green **TRUE** / red **FALSE** badge plus the numeric allowance.
4. If approved, the user pulls tokens with `transferFrom(FROM, TO, amount)`.

This is a proof of concept to show a client the connect → check approval →
transfer flow working end to end. Clean UI is prioritized over production
hardening.

## Core Semantics (drives the whole design)

The connected wallet is the **spender** (`msg.sender`). This is a standard
ERC-20 pull-payment:

- **FROM** = token owner who previously called `approve(connectedWallet, X)`.
- **TO** = recipient of the pulled tokens.
- **Check approval** reads `allowance(FROM, connectedWallet)`.
  - `> 0` → green **TRUE**, show numeric allowance.
  - `= 0` → red **FALSE**.
- **Transfer** calls `transferFrom(FROM, TO, amount)` with the connected wallet
  as `msg.sender`. Enabled only when `allowance >= amount`.

### Demo prerequisite

Because there is **no approve-side panel** in scope, some FROM address must have
already approved the connected wallet on-chain (via Etherscan or a script)
before a demo, or the badge will always read FALSE. This is an accepted
constraint of the "check + transfer only" scope.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Framework | React + Vite + TypeScript |
| Web3 stack | wagmi v2 + viem v2 + @tanstack/react-query |
| Wallet connect | Reown AppKit (`@reown/appkit` + `@reown/appkit-adapter-wagmi`) |
| Network | Ethereum mainnet only |
| Token | USDT hardcoded: `0xdAC17F958D2ee523a2206206994597C13D831ec7`, 6 decimals |
| Scope | Check allowance + `transferFrom` only (no approve panel) |
| Amount input | Human-readable (e.g. `25.5`), converted with `parseUnits(amount, 6)` |
| Project ID | Supplied by user in `.env.local` as `VITE_WC_PROJECT_ID` |

## Architecture

### File structure

```
src/
  main.tsx                    providers: WagmiProvider, QueryClientProvider
  App.tsx                     layout + header
  config/
    wagmi.ts                  wagmiAdapter + createAppKit({projectId, [mainnet]})
    token.ts                  TOKEN {address, symbol, decimals} + USDT_ABI
  lib/
    erc20.ts                  PURE helpers: validateAddress, parseAmount,
                              formatAmount, meetsAllowance   (unit-tested)
    erc20.test.ts             Vitest unit tests
  hooks/
    useAllowance.ts           wraps useReadContract(allowance)
  components/
    ConnectWallet.tsx         AppKit connect button
    NetworkGuard.tsx          wrong-chain banner + switch prompt
    TransferPanel.tsx         FROM, TO, Check+badge, amount, Transfer
    AllowanceBadge.tsx        TRUE/FALSE pill
.env.example                  VITE_WC_PROJECT_ID=
README.md                     setup + demo steps
```

`.env.local` is gitignored; `.env.example` is committed.

### USDT ABI note

USDT is a non-standard ERC-20: its `transferFrom` returns no boolean. This does
not affect write calls (wagmi/viem `writeContract` does not decode write return
values), but the ABI must reflect the real function signatures. The ABI includes
`allowance` (view, returns uint256), `transferFrom`, `balanceOf`, `symbol`,
`decimals`.

## Components & responsibilities

- **`config/wagmi.ts`** — Creates the `WagmiAdapter` with `[mainnet]` and the
  project ID from `import.meta.env.VITE_WC_PROJECT_ID`, calls `createAppKit(...)`
  once at module load, and exports the wagmi config for the provider.
- **`config/token.ts`** — Single source of truth for the token: address, symbol
  (`USDT`), decimals (`6`), and the ABI.
- **`lib/erc20.ts`** — Pure, framework-free helpers:
  - `validateAddress(s): boolean` — viem `isAddress`.
  - `parseAmount(s, decimals): bigint` — throws / returns null on bad input.
  - `formatAmount(v: bigint, decimals): string` — for display.
  - `meetsAllowance(allowance: bigint, amount: bigint): boolean`.
- **`hooks/useAllowance.ts`** — Wraps `useReadContract` for
  `allowance(FROM, connected)`; exposes `data`, `isFetching`, `refetch`,
  enabled only when FROM is valid and wallet connected.
- **`components/ConnectWallet.tsx`** — Renders the AppKit connect/account
  button.
- **`components/NetworkGuard.tsx`** — If connected but `chainId !== mainnet`,
  shows a banner with a switch-network button; otherwise renders children.
- **`components/AllowanceBadge.tsx`** — Green TRUE / red FALSE pill + numeric
  allowance.
- **`components/TransferPanel.tsx`** — The main card: FROM input, TO input,
  Check Approval button, badge, amount input, Transfer button, status area.

## Data flow

1. Connect → wagmi exposes `address` (spender) and `chainId`.
2. User enters FROM and TO.
3. **Check Approval** → `useReadContract` for `allowance(FROM, address)` →
   badge + numeric value.
4. User enters amount → `parseUnits(amount, 6)`.
5. **Transfer** enabled only when ALL hold: connected; on mainnet; FROM valid;
   TO valid; amount > 0; `allowance >= amount`.
6. Click Transfer → `useWriteContract(transferFrom)` →
   `useWaitForTransactionReceipt` → success/fail message + Etherscan tx link.
7. On success, refetch allowance (it decreases after a pull).

## Error handling

| Condition | Behavior |
|---|---|
| Not connected | Controls disabled; connect prompt shown |
| Wrong network | Banner + switch-network button; actions disabled |
| Invalid FROM/TO | Inline error via viem `isAddress`; check/transfer disabled |
| Allowance = 0 | Red FALSE badge; transfer disabled |
| Amount > allowance | Inline warning; transfer disabled (contract would revert) |
| Amount ≤ 0 / unparseable | Transfer disabled |
| User-rejected tx | Info message ("transaction rejected") |
| Reverted tx | Error message from receipt status |

## Testing

- **Vitest** unit tests on the pure `lib/erc20.ts` helpers:
  - `parseAmount` / `formatAmount` round-trip at 6 decimals.
  - `validateAddress` accepts checksummed valid, rejects malformed.
  - `meetsAllowance` boundary cases (equal, under, over).
- **Not in scope:** E2E wallet mocking / Playwright. High effort, low value for
  a POC. Can be added later if the tool graduates beyond a demo.

## Non-goals (YAGNI)

- No approve-side panel (user arranges allowance externally).
- No multi-token support (USDT hardcoded).
- No Tron or other chains (Ethereum mainnet only).
- No testnet switcher.
- No backend / persistence.

## Setup prerequisites

1. Node 22.x (verified: v22.20.0), npm 10.x.
2. A Reown project ID from dashboard.reown.com, placed in `.env.local` as
   `VITE_WC_PROJECT_ID`.
3. For a live demo: an on-chain USDT allowance from a FROM address to the
   wallet that will be connected.
