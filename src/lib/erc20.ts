import { isAddress, parseUnits, formatUnits, maxUint256 } from 'viem'

export function validateAddress(value: string): boolean {
  return isAddress(value)
}

// Returns base units, or null if the string is not a clean non-negative decimal
// that fits the token's decimals.
export function parseAmount(value: string, decimals: number): bigint | null {
  const v = value.trim()
  if (!/^\d+(\.\d+)?$/.test(v)) return null
  const [, frac = ''] = v.split('.')
  if (frac.length > decimals) return null
  try {
    return parseUnits(v, decimals)
  } catch {
    return null
  }
}

export function formatAmount(value: bigint, decimals: number): string {
  return formatUnits(value, decimals)
}

export function meetsAllowance(allowance: bigint, amount: bigint): boolean {
  return amount > 0n && allowance >= amount
}

// A max-uint256 allowance is the standard "infinite approval" sentinel.
export function isUnlimited(allowance: bigint): boolean {
  return allowance === maxUint256
}
