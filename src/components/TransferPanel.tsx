import { useEffect, useState } from 'react'
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { mainnet } from 'viem/chains'
import type { Address } from 'viem'
import { TOKEN, ETHERSCAN_TX } from '../config/token'
import { validateAddress, parseAmount, formatAmount, meetsAllowance } from '../lib/erc20'
import { useAllowance } from '../hooks/useAllowance'
import { useUsdtBalance } from '../hooks/useUsdtBalance'
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

  const fromBalanceQuery = useUsdtBalance(fromValid ? (from as Address) : undefined)
  const fromBalance = fromBalanceQuery.data as bigint | undefined
  const fromBalanceDisplay = fromBalanceQuery.isError
    ? 'unavailable'
    : fromBalanceQuery.isLoading || fromBalance === undefined
      ? '…'
      : `${formatAmount(fromBalance, TOKEN.decimals)} ${TOKEN.symbol}`

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

  // Refresh allowance and FROM balance after a confirmed transfer (both drop).
  useEffect(() => {
    if (receipt.isSuccess) {
      allowanceQuery.refetch()
      fromBalanceQuery.refetch()
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
        {fromValid && (
          <span className="field-note">
            FROM balance: {fromBalanceDisplay}
          </span>
        )}
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
