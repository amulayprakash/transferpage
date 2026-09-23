import { ConnectWallet } from './components/ConnectWallet'
import { NetworkGuard } from './components/NetworkGuard'
import { TransferPanel } from './components/TransferPanel'
import { TOKEN } from './config/token'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>{TOKEN.symbol} Allowance &amp; Transfer</h1>
        <ConnectWallet />
      </header>
      <main className="main">
        <NetworkGuard>
          <TransferPanel />
        </NetworkGuard>
      </main>
    </div>
  )
}
