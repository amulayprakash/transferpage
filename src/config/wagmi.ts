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
    // Match whatever origin the app is served from (localhost in dev, the
    // Netlify URL in production) so the WalletConnect metadata is correct.
    url:
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:5173',
    icons: [],
  },
  features: { analytics: false },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
