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
