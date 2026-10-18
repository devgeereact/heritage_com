import { describe, it, expect } from 'vitest'
import {
  STAFF_ROLES, ACCESS_MATRIX, canAccessSection, canAccessPath, pathSection, roleHome, filterMenuByRole,
} from '@/helpers/roles'
import { MENU_ITEMS } from '@/assets/data/menu-items'

// The server is the source of truth for who may do what (docs/API-SPEC.md, the
// "Server gate (file level)" column). The client only hides what a role cannot
// use, and a page must never open for a role the server would refuse (K-01).
// These role lists are written out here from that table, independently of
// roles.js, so a change on either side has to be made on purpose.
const ALL_STAFF = ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee']
const OWNER = ['super_admin', 'admin', 'manager']
const WORKSHOP = [...OWNER, 'tailor']
const CLIENTS = [...OWNER, 'tailor', 'employee']
const ENQUIRY = [...OWNER, 'employee']

const GATES = {
  'today.php': OWNER,
  'enquiries.php': ENQUIRY,
  'appointments.php': WORKSHOP, // reads; writes are owner-only inside the file
  'messages.php': OWNER,
  'customers.php': CLIENTS,
  'tailoring.php': WORKSHOP,
  'measurements.php': WORKSHOP,
  'tailoring.php?action=document': OWNER, // API-SPEC: document (owner)
  'measurements.php?action=template_save': OWNER, // API-SPEC: template_save (owner)
  'ledger.php': OWNER,
  'settings.php': OWNER,
  'stats.php': ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'employee'],
  'analytics.php': OWNER,
  'products.php': [...OWNER, 'editor', 'employee'],
  'stock.php': [...OWNER, 'employee'],
  'orders.php': [...OWNER, 'seller', 'employee'],
  'suppliers.php': OWNER,
  'payments.php': OWNER,
  'export.php': OWNER,
  'marketing.php': [...OWNER, 'editor'],
  'ai.php': ALL_STAFF,
  'ai_image.php': ALL_STAFF,
  'cms.php': [...OWNER, 'editor'],
  'content.php': OWNER,
  'weather.php': [...OWNER, 'seller', 'employee'],
  'inbox.php': [...OWNER, 'editor', 'employee'],
  'mail.php': [...OWNER, 'editor', 'employee'],
  'whatsapp.php': [...OWNER, 'seller', 'editor', 'employee'],
  'loyalty.php': OWNER,
  'referrals.php': OWNER,
  'engage.php': [...OWNER, 'editor'],
  'reviews.php': [...OWNER, 'editor'],
  'coupons.php': [...OWNER, 'editor'],
  'users.php': ['super_admin', 'admin'], // management; self actions are open to any staff
}

// Section -> the endpoint files that page calls. Where a page needs several,
// the role must pass every gate, so the allowed set is the intersection.
const SECTION_ENDPOINTS = {
  today: ['today.php'],
  enquiries: ['enquiries.php'],
  appointments: ['appointments.php'],
  messages: ['messages.php'],
  clients: ['customers.php'],
  jobs: ['tailoring.php', 'measurements.php'],
  payments: ['ledger.php'],
  print: ['tailoring.php?action=document', 'measurements.php'],
  settings: ['settings.php', 'measurements.php?action=template_save'],
  reports: ['stats.php', 'analytics.php'],
  catalogue: ['products.php'],
  stock: ['stock.php'],
  pos: ['orders.php', 'stock.php'],
  sales: ['orders.php', 'products.php'],
  suppliers: ['suppliers.php', 'stock.php'],
  finance: ['payments.php', 'export.php'],
  analytics: ['analytics.php'],
  marketing: ['marketing.php'],
  studio: ['ai.php', 'ai_image.php'],
  website: ['cms.php'],
  content: ['content.php'],
  channels: ['settings.php'],
  weather: ['weather.php'],
  inbox: ['inbox.php', 'mail.php'],
  whatsapp: ['whatsapp.php'],
  loyalty: ['loyalty.php', 'referrals.php'],
  engage: ['engage.php', 'customers.php'], // the page also lists upcoming birthdays (customers.php)
  reviews: ['reviews.php'],
  coupons: ['coupons.php'],
  team: ['users.php'],
}

const documentedRoles = (section) =>
  SECTION_ENDPOINTS[section].map((f) => GATES[f]).reduce((acc, roles) => acc.filter((r) => roles.includes(r)))

describe('roles: sections against the documented server gates', () => {
  Object.keys(SECTION_ENDPOINTS).forEach((section) => {
    it(`${section}: opens for exactly the roles every endpoint behind it allows`, () => {
      const expected = documentedRoles(section)
      const actual = ALL_STAFF.filter((role) => canAccessSection(role, section))
      expect(actual.sort()).toEqual([...expected].sort())
    })
  })

  it('never opens a section for a role that one of its endpoints refuses', () => {
    // The safety property behind K-01, stated the other way round.
    ALL_STAFF.forEach((role) => {
      Object.entries(SECTION_ENDPOINTS).forEach(([section, files]) => {
        if (!canAccessSection(role, section)) return
        files.forEach((f) => expect(GATES[f], `${role} sees ${section} but ${f} refuses it`).toContain(role))
      })
    })
  })

  it('keeps tailors away from money, messages and enquiries (tailors never receive money fields)', () => {
    ;['payments', 'finance', 'messages', 'enquiries', 'today', 'reports', 'suppliers', 'settings'].forEach((s) => {
      expect(canAccessSection('tailor', s), `tailor should not open ${s}`).toBe(false)
    })
    ;['jobs', 'clients', 'appointments'].forEach((s) => expect(canAccessSection('tailor', s)).toBe(true))
  })

  it('opens the owner-only pages for the three owner roles and nobody else', () => {
    ;['today', 'messages', 'payments', 'settings', 'reports', 'finance', 'suppliers', 'loyalty'].forEach((s) => {
      OWNER.forEach((r) => expect(canAccessSection(r, s), `${r} ${s}`).toBe(true))
      ;['tailor', 'editor', 'seller', 'employee'].forEach((r) => expect(canAccessSection(r, s), `${r} ${s}`).toBe(false))
    })
  })

  it('leaves Team & Access and permissions to super_admin and admin only', () => {
    expect(STAFF_ROLES.filter((r) => canAccessSection(r, 'team'))).toEqual(['super_admin', 'admin'])
    expect(STAFF_ROLES.filter((r) => canAccessSection(r, 'permissions'))).toEqual(['super_admin', 'admin'])
  })

  it('opens the self-service profile and Brand Studio for every staff role', () => {
    STAFF_ROLES.forEach((r) => {
      expect(canAccessSection(r, 'profile')).toBe(true)
      expect(canAccessSection(r, 'studio')).toBe(true)
    })
  })

  it('treats a section nobody listed as admin-only rather than open', () => {
    expect(canAccessSection('admin', 'brand-new-page')).toBe(true)
    expect(canAccessSection('super_admin', 'brand-new-page')).toBe(true)
    ;['manager', 'tailor', 'editor', 'seller', 'employee'].forEach((r) => expect(canAccessSection(r, 'brand-new-page')).toBe(false))
  })

  it('gives no access to a missing role or to the customer role', () => {
    expect(canAccessSection(undefined, 'today')).toBe(false)
    expect(canAccessSection(null, 'profile')).toBe(false)
    expect(canAccessSection('', 'profile')).toBe(false)
    expect(canAccessSection('customer', 'profile')).toBe(false)
    expect(canAccessSection('hacker', 'studio')).toBe(false)
  })
})

describe('roles: paths and landing pages', () => {
  it('reads the first URL segment as the section', () => {
    expect(pathSection('/jobs/5')).toBe('jobs')
    expect(pathSection('/jobs?stage=ready')).toBe('jobs')
    expect(pathSection('payments')).toBe('payments')
    expect(pathSection('/')).toBe('today')
    expect(pathSection('')).toBe('today')
    expect(pathSection()).toBe('today')
  })

  it('applies the section rule to deep paths', () => {
    expect(canAccessPath('tailor', '/jobs/12/measurements')).toBe(true)
    expect(canAccessPath('tailor', '/payments/12')).toBe(false)
    expect(canAccessPath('manager', '/payments?month=10')).toBe(true)
  })

  it('sends each role to a page it may open', () => {
    expect(roleHome('super_admin')).toBe('/today')
    expect(roleHome('admin')).toBe('/today')
    expect(roleHome('manager')).toBe('/today')
    expect(roleHome('tailor')).toBe('/jobs')
    expect(roleHome('editor')).toBe('/catalogue')
    expect(roleHome('seller')).toBe('/whatsapp')
    expect(roleHome('employee')).toBe('/enquiries')
    STAFF_ROLES.forEach((role) => {
      expect(canAccessPath(role, roleHome(role)), `${role} cannot open its own home ${roleHome(role)}`).toBe(true)
    })
  })
})

describe('roles: permissions matrix', () => {
  it('lists each module with the same roles canAccessSection allows', () => {
    expect(ACCESS_MATRIX.length).toBeGreaterThan(20)
    ACCESS_MATRIX.forEach((m) => {
      STAFF_ROLES.forEach((role) => {
        expect(m.roles.includes(role), `${m.key} for ${role}`).toBe(canAccessSection(role, m.key))
      })
    })
  })

  it('has no duplicate module keys', () => {
    const keys = ACCESS_MATRIX.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('roles: sidebar filtering', () => {
  const flat = (items) => items.flatMap((i) => (i.children ? flat(i.children) : [i]))
  const keysFor = (role) => flat(filterMenuByRole(MENU_ITEMS, role)).filter((i) => !i.isTitle).map((i) => i.key)

  it('shows each role exactly the menu items it may open', () => {
    STAFF_ROLES.forEach((role) => {
      const leaves = flat(MENU_ITEMS).filter((i) => !i.isTitle)
      const expected = leaves.filter((i) => canAccessSection(role, i.key)).map((i) => i.key)
      expect(keysFor(role), role).toEqual(expected)
    })
  })

  it('shows a tailor the workshop pages only', () => {
    const keys = keysFor('tailor')
    expect(keys).toEqual(expect.arrayContaining(['appointments', 'clients', 'jobs']))
    expect(keys).not.toEqual(expect.arrayContaining(['payments']))
    expect(keys).not.toContain('settings')
    expect(keys).not.toContain('finance')
  })

  it('drops a section title and a group that end up with nothing under them', () => {
    const menu = [
      { key: 'a', label: 'A', isTitle: true },
      { key: 'payments', label: 'Payments', url: '/payments' },
      { key: 'b', label: 'B', isTitle: true },
      { key: 'jobs', label: 'Jobs', url: '/jobs' },
      { key: 'c', label: 'C', isTitle: true },
      { key: 'g', label: 'Group', children: [{ key: 'finance', label: 'Finance', url: '/finance' }] },
    ]
    const out = filterMenuByRole(menu, 'tailor')
    expect(out.map((i) => i.key)).toEqual(['b', 'jobs'])
    expect(out.some((i) => '__title' in i)).toBe(false)
  })

  it('returns the menu unchanged when no role is known yet', () => {
    expect(filterMenuByRole(MENU_ITEMS, undefined)).toBe(MENU_ITEMS)
  })
})
