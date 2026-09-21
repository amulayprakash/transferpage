import { useReadContract } from 'wagmi'
import type { Address } from 'viem'
import { TOKEN } from '../config/token'

// Reads balanceOf(account). Disabled until an account is present.
export function useUsdtBalance(account?: Address) {
  return useReadContract({
    address: TOKEN.address,
    abi: TOKEN.abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: Boolean(account) },
  })
}
