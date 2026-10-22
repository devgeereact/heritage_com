import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RollNumber from '@/components/herit/RollNumber'

describe('RollNumber', () => {
  it('gives screen readers the plain value and draws one column per digit', () => {
    const { container } = render(<RollNumber value="₦70,000" />)
    expect(screen.getByLabelText('₦70,000')).toBeTruthy()
    expect(container.querySelectorAll('.hd-roll-col')).toHaveLength(5)
  })

  it('marks each column with the digit it lands on', () => {
    const { container } = render(<RollNumber value={3} />)
    expect(container.querySelector('.hd-roll-col').dataset.d).toBe('3')
  })
})
