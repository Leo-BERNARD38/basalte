import { describe, expect, it } from 'vitest'

import { describeAgent } from './agent.js'

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/128.0.0.0`
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const FIREFOX_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0'

describe('describeAgent', () => {
  it('nomme le navigateur et le système', () => {
    expect(describeAgent(CHROME_WINDOWS)).toBe('Chrome sur Windows')
    expect(describeAgent(SAFARI_IPHONE)).toBe('Safari sur iOS')
    expect(describeAgent(FIREFOX_MAC)).toBe('Firefox sur macOS')
  })

  it('reconnaît Edge avant Chrome, dont il porte aussi le nom', () => {
    expect(describeAgent(EDGE_WINDOWS)).toBe('Edge sur Windows')
  })

  it('dit ce qu’il sait, et rien de plus', () => {
    expect(describeAgent('curl/8.0')).toBe('Navigateur inconnu')
    expect(describeAgent('Something/1.0 (Windows)')).toBe('Windows')
    expect(describeAgent('')).toBe('Navigateur inconnu')
  })
})
