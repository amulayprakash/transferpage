import type { ReactNode } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { mainnet } from 'viem/chains'

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
