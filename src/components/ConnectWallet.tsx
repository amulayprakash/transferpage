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
