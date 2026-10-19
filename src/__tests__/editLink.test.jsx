import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EditLink from '@/app/(public)/site/ui/EditLink'
import { Section } from '@/app/(public)/site/ui/Section'
import { staffRole } from '@/app/(public)/site/siteData'
import { setStaffCookie } from './helpers'

const show = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('staffRole', () => {
  it('is empty for visitors and for a broken cookie', () => {
    expect(staffRole()).toBe('')
    document.cookie = '_LARKON_AUTH_KEY_=not-json; path=/'
    expect(staffRole()).toBe('')
  })

  it('reads the role from the staff profile cookie', () => {
    setStaffCookie({ id: 1, role: 'super_admin' })
    expect(staffRole()).toBe('super_admin')
  })
})

describe('EditLink', () => {
  it('renders nothing for visitors', () => {
    const { container } = show(<EditLink to="/website/pages/about" label="the about page" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('links a signed-in owner straight to the editor', () => {
    setStaffCookie({ id: 1, role: 'super_admin' })
    show(<EditLink to="/website/pages/about" label="the about page" />)
    const a = screen.getByRole('link', { name: 'Edit the about page' })
    expect(a).toHaveAttribute('href', '/website/pages/about')
    expect(a).toHaveAttribute('rel', 'nofollow')
    expect(a).toHaveClass('hc-edit')
  })

  it('shows website edits to an editor but not the journal, which needs an owner role', () => {
    setStaffCookie({ id: 2, role: 'editor' })
    show(
      <>
        <EditLink to="/website/services" label="services" />
        <EditLink to="/content" label="the journal" />
      </>,
    )
    expect(screen.getByRole('link', { name: 'Edit services' })).toHaveAttribute('href', '/website/services')
    expect(screen.queryByRole('link', { name: 'Edit the journal' })).toBeNull()
  })

  it('stays hidden for a staff role that cannot open the Website admin', () => {
    setStaffCookie({ id: 3, role: 'tailor' })
    const { container } = show(<EditLink to="/website/pages/home" label="the home page" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Section edit prop', () => {
  it('adds the edit control only for staff', () => {
    const edit = { to: '/website/faqs', label: 'questions' }
    const { container, unmount } = show(<Section edit={edit}>x</Section>)
    expect(container.querySelector('.hc-edit')).toBeNull()
    expect(container.querySelector('section')).toHaveClass('hc-edit-host')
    unmount()
    setStaffCookie({ id: 1, role: 'admin' })
    show(<Section edit={edit}>x</Section>)
    expect(screen.getByRole('link', { name: 'Edit questions' })).toHaveAttribute('href', '/website/faqs')
  })
})
