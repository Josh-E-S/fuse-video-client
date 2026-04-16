import { describe, it, expect } from 'vitest'
import { getStateTheme, getSemanticState } from '@/utils/stateTheme'

describe('getSemanticState', () => {
  it('returns late when isLate is true regardless of mute state', () => {
    expect(getSemanticState(true, true, true)).toBe('late')
    expect(getSemanticState(false, false, true)).toBe('late')
  })

  it('returns broadcasting when mic on and video on', () => {
    expect(getSemanticState(false, false, false)).toBe('broadcasting')
  })

  it('returns audioOnly when mic on and video off', () => {
    expect(getSemanticState(false, true, false)).toBe('audioOnly')
  })

  it('returns muted when mic off', () => {
    expect(getSemanticState(true, true, false)).toBe('muted')
    expect(getSemanticState(true, false, false)).toBe('muted')
  })
})

describe('getStateTheme', () => {
  it('returns theme with correct state for each semantic state', () => {
    expect(getStateTheme(true, true, false).state).toBe('muted')
    expect(getStateTheme(false, true, false).state).toBe('audioOnly')
    expect(getStateTheme(false, false, false).state).toBe('broadcasting')
    expect(getStateTheme(true, true, true).state).toBe('late')
  })

  it('muted theme uses rose colors', () => {
    const theme = getStateTheme(true, true, false)
    expect(theme.orbBorder).toContain('rose')
    expect(theme.micIcon).toContain('rose')
  })

  it('broadcasting theme uses blue orb border', () => {
    const theme = getStateTheme(false, false, false)
    expect(theme.orbBorder).toContain('blue')
  })
})
