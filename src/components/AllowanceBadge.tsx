import { TOKEN } from '../config/token'
import { formatAmount, isUnlimited } from '../lib/erc20'

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
  const display = isUnlimited(allowance)
    ? 'Unlimited (infinite approval)'
    : `${formatAmount(allowance, TOKEN.decimals)} ${TOKEN.symbol}`

  return (
    <div className={approved ? 'badge badge-true' : 'badge badge-false'}>
      <strong>{approved ? 'TRUE' : 'FALSE'}</strong>
      <span className="badge-detail">Allowance: {display}</span>
    </div>
  )
}
