import { describe, it, expect } from 'vitest'
import { maxUint256 } from 'viem'
import {
  validateAddress,
  parseAmount,
  formatAmount,
  meetsAllowance,
  isUnlimited,
} from './erc20'

describe('validateAddress', () => {
  it('accepts a valid address', () => {
    expect(validateAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toBe(true)
  })
  it('rejects malformed input', () => {
    expect(validateAddress('0x123')).toBe(false)
    expect(validateAddress('nope')).toBe(false)
    expect(validateAddress('')).toBe(false)
  })
})

describe('parseAmount (6 decimals)', () => {
  it('parses a human amount to base units', () => {
    expect(parseAmount('25.5', 6)).toBe(25500000n)
  })
  it('parses a whole number', () => {
    expect(parseAmount('100', 6)).toBe(100000000n)
  })
  it('returns null on empty, dot-only, or non-numeric input', () => {
    expect(parseAmount('', 6)).toBeNull()
    expect(parseAmount('.', 6)).toBeNull()
    expect(parseAmount('abc', 6)).toBeNull()
    expect(parseAmount('1.2.3', 6)).toBeNull()
  })
  it('returns null when more decimals than supported', () => {
    expect(parseAmount('1.1234567', 6)).toBeNull()
  })
})

describe('formatAmount', () => {
  it('formats base units back to a human string', () => {
    expect(formatAmount(25500000n, 6)).toBe('25.5')
  })
  it('round-trips with parseAmount', () => {
    const v = parseAmount('1234.567891', 6)!
    expect(formatAmount(v, 6)).toBe('1234.567891')
  })
})

describe('meetsAllowance', () => {
  it('is true when allowance >= amount and amount > 0', () => {
    expect(meetsAllowance(100n, 100n)).toBe(true)
    expect(meetsAllowance(101n, 100n)).toBe(true)
  })
  it('is false when allowance < amount', () => {
    expect(meetsAllowance(99n, 100n)).toBe(false)
  })
  it('is false when amount is 0', () => {
    expect(meetsAllowance(100n, 0n)).toBe(false)
  })
})

describe('isUnlimited', () => {
  it('is true for max uint256 (infinite approval)', () => {
    expect(isUnlimited(maxUint256)).toBe(true)
  })
  it('is false for normal values', () => {
    expect(isUnlimited(0n)).toBe(false)
    expect(isUnlimited(1_000_000n)).toBe(false)
  })
})
