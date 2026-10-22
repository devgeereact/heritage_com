import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/useAuthContext'
import SiteFooter from '@/app/(public)/site/SiteFooter'

vi.mock('@/app/(public)/site/storeConfig', () => ({ useShopEnabled: () => false, useStoreConfig: () => null }))
vi.mock('@/app/(public)/site/business', () => ({ useBusiness: () => ({}) }))
vi.mock('@/app/(public)/site/siteData', async (orig) => ({ ...(await orig()), useSiteNav: () => ({ services: true, about: true }) }))
vi.mock('@/app/(public)/site/ui/useActions', () => ({
  default: () => ({ primary: { to: '/contact?type=fitting', label: 'Request a measurement appointment', short: 'Request an appointment' } }),
}))

// Synthetic details: the WhatsApp number is an example, not the business's number.
const business = {
  name: 'Herit Clothing',
  area: 'Lagos, Nigeria',
  address: 'Ajuwon Market, Lagos State, Nigeria',
  email: 'hello@heritclothing.com',
  whatsapp: 'https://wa.me/2348031234567',
  socials: [
    { key: 'instagram', url: 'https://www.instagram.com/heritclothing', icon: 'instagram', label: 'Instagram' },
    { key: 'facebook', url: 'https://www.facebook.com/heritclothing', icon: 'facebook', label: 'Facebook' },
  ],
}

const show = (b) =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <SiteFooter business={b} />
      </AuthProvider>
    </MemoryRouter>,
  )

describe('SiteFooter Visit column', () => {
  it('lists the address one part per line, then email only', () => {
    show({ ...business, phone: '+234 803 123 4567' })
    const visit = screen.getByRole('heading', { name: 'Visit' }).parentElement
    const address = visit.querySelector('address')
    expect([...address.querySelectorAll('span')].map((s) => s.textContent)).toEqual(['Ajuwon Market', 'Lagos State', 'Nigeria'])
    expect(within(visit).getByRole('link', { name: 'hello@heritclothing.com' })).toHaveAttribute('href', 'mailto:hello@heritclothing.com')
    expect(within(visit).getAllByRole('link')).toHaveLength(1)
  })

  it('puts Instagram, WhatsApp and the phone number in the bottom bar as icon-only links', () => {
    show({ ...business, phone: '+234 803 123 4567' })
    const row = screen.getByRole('list', { name: 'Herit Clothing contact and social links' })
    expect(within(row).getByRole('link', { name: /Instagram @heritclothing/ })).toHaveAttribute('href', 'https://www.instagram.com/heritclothing')
    expect(within(row).getByRole('link', { name: /WhatsApp \+234 803 123 4567/ })).toHaveAttribute('href', 'https://wa.me/2348031234567')
    expect(within(row).getByRole('link', { name: 'Call +234 803 123 4567' })).toHaveAttribute('href', 'tel:+2348031234567')
    expect(within(row).getByRole('link', { name: /Facebook/ })).toBeTruthy()
    expect(within(row).getAllByRole('link')).toHaveLength(4)
    expect(row.textContent).toBe('')
  })

  it('leaves out WhatsApp and the phone icon until a number is set', () => {
    show({ ...business, whatsapp: '', phone: '' })
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /^Call/ })).toBeNull()
  })
})
