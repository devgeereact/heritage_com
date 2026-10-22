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
  it('lists the address one part per line, then email, Instagram and WhatsApp', () => {
    show(business)
    const visit = screen.getByRole('heading', { name: 'Visit' }).parentElement
    const address = visit.querySelector('address')
    expect([...address.querySelectorAll('span')].map((s) => s.textContent)).toEqual(['Ajuwon Market', 'Lagos State', 'Nigeria'])
    expect(within(visit).getByRole('link', { name: 'hello@heritclothing.com' })).toHaveAttribute('href', 'mailto:hello@heritclothing.com')
    expect(within(visit).getByRole('link', { name: /Instagram @heritclothing/ })).toHaveAttribute('href', 'https://www.instagram.com/heritclothing')
    expect(within(visit).getByRole('link', { name: /WhatsApp \+234 803 123 4567/ })).toHaveAttribute('href', 'https://wa.me/2348031234567')
  })

  it('keeps Instagram out of the bottom icon row and still shows other platforms there', () => {
    show(business)
    const row = screen.getByRole('list', { name: 'Herit Clothing on social media' })
    expect(within(row).queryByRole('link', { name: /Instagram/ })).toBeNull()
    expect(within(row).getAllByRole('link')).toHaveLength(1)
  })

  it('leaves out WhatsApp until a number is set', () => {
    show({ ...business, whatsapp: '' })
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
  })
})
