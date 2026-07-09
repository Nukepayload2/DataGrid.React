import { describe, expect, it } from 'vitest'
import { stripComments } from '../../src/live/stripComments'

describe('stripComments', () => {
  it('removes comment-only blank gaps and trims outer blank lines', () => {
    expect(stripComments(`
// title
const a = 1

// separator

const b = 2
// footer
`)).toBe('const a = 1\n\nconst b = 2')
  })

  it('preserves blank lines inside string literals', () => {
    const source = "const value = `a\n\nb`\n\n// comment\n\nconst next = 'ok'"

    expect(stripComments(source)).toBe("const value = `a\n\nb`\n\nconst next = 'ok'")
  })
})
