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
