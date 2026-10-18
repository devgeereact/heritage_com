import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  naira, fmtDate, fmtUtc, lagosToday, daysFromToday, initials, titleCase, waLink,
  lagosYmd, fmtTime, fmtDay, fmtWhen, addDays, weekStart, lagosLocal, groupSlotsByDay,
  ENQUIRY_NEXT, ENQUIRY_LABELS, STAGE_LABELS,
} from '@/helpers/format'

afterEach(() => {
  vi.useRealTimers()
})

describe('naira', () => {
  it('shows whole amounts without kobo and groups thousands', () => {
    expect(naira(18500)).toBe('₦18,500')
    expect(naira(0)).toBe('₦0')
    expect(naira(1234567)).toBe('₦1,234,567')
  })

  it('shows kobo to two places only when there is a fraction', () => {
    expect(naira(18500.5)).toBe('₦18,500.50')
    expect(naira(0.07)).toBe('₦0.07')
  })

  it('accepts the decimal strings the API sends', () => {
    expect(naira('45000.50')).toBe('₦45,000.50')
    expect(naira('45000.00')).toBe('₦45,000')
  })

  it('puts the minus sign before the currency symbol', () => {
    expect(naira(-1200)).toBe('−₦1,200')
  })

  it('reads missing or non-numeric values as zero rather than showing NaN', () => {
    expect(naira(null)).toBe('₦0')
    expect(naira(undefined)).toBe('₦0')
    expect(naira('abc')).toBe('₦0')
    expect(naira(Infinity)).toBe('₦0')
  })
})

describe('calendar dates', () => {
  it('formats a YYYY-MM-DD date without shifting it by timezone', () => {
    expect(fmtDate('2026-10-12')).toBe('12 Oct 2026')
    expect(fmtDate('2026-10-12', { withYear: false })).toBe('12 Oct')
    expect(fmtDate('2026-01-01')).toBe('1 Jan 2026')
  })

  it('reads the date part of a datetime string and passes junk through unchanged', () => {
    expect(fmtDate('2026-10-12 23:59:00')).toBe('12 Oct 2026')
    expect(fmtDate('soon')).toBe('soon')
    expect(fmtDate('')).toBe('')
    expect(fmtDate(null)).toBe('')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('finds the Monday of the week, treating Sunday as the last day', () => {
    expect(weekStart('2026-10-12')).toBe('2026-10-12') // Monday
    expect(weekStart('2026-10-14')).toBe('2026-10-12') // Wednesday
    expect(weekStart('2026-10-18')).toBe('2026-10-12') // Sunday
    expect(weekStart('2026-10-19')).toBe('2026-10-19') // next Monday
  })

  it('names the weekday in a short day label', () => {
    expect(fmtDay('2026-10-12')).toMatch(/^Mon,? 12 Oct$/)
    expect(fmtDay('2026-10-12', { withYear: true })).toMatch(/12 Oct 2026$/)
    expect(fmtDay('')).toBe('')
    expect(fmtDay('not a date')).toBe('')
  })
})

describe('Lagos time', () => {
  it('shows a UTC datetime from the API in Lagos time (UTC+1)', () => {
    expect(fmtUtc('2026-10-10 14:05:00')).toMatch(/^10 Oct 2026,? 15:05$/)
  })

  it('moves to the next Lagos day when UTC is late evening', () => {
    expect(fmtUtc('2026-10-10 23:30:00')).toMatch(/^11 Oct 2026,? 00:30$/)
  })

  it('respects an explicit offset instead of appending Z', () => {
    expect(fmtUtc('2026-10-10T14:05:00+01:00')).toMatch(/14:05$/)
  })

  it('can omit the time, and returns the input when it cannot be parsed', () => {
    expect(fmtUtc('2026-10-10 14:05:00', { time: false })).toBe('10 Oct 2026')
    expect(fmtUtc('garbage')).toBe('garbage')
    expect(fmtUtc('')).toBe('')
  })

  it('takes today from the Lagos clock, not the UTC clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T23:30:00Z')) // 00:30 on the 11th in Lagos
    expect(lagosToday()).toBe('2026-10-11')
  })

  it('counts whole days from Lagos today, negative when past', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T23:30:00Z'))
    expect(daysFromToday('2026-10-14')).toBe(3)
    expect(daysFromToday('2026-10-11')).toBe(0)
    expect(daysFromToday('2026-10-09')).toBe(-2)
    expect(daysFromToday('2026-10-14 09:00:00')).toBe(3)
    expect(daysFromToday(null)).toBeNull()
  })

  it('gives the Lagos calendar day and clock time of an ISO moment', () => {
    expect(lagosYmd('2026-10-12T23:30:00+01:00')).toBe('2026-10-12')
    expect(lagosYmd('2026-10-12T23:30:00Z')).toBe('2026-10-13')
    expect(fmtTime('2026-10-12T10:00:00+01:00')).toBe('10:00')
    expect(fmtTime('2026-10-12T09:00:00Z')).toBe('10:00')
    expect(lagosYmd('nonsense')).toBe('')
    expect(fmtTime(null)).toBe('')
  })

  it('builds the local start the API accepts and the "when" label', () => {
    expect(lagosLocal('2026-10-12T10:00:00+01:00')).toBe('2026-10-12T10:00')
    expect(lagosLocal('')).toBe('')
    expect(fmtWhen('2026-10-12T10:00:00+01:00')).toMatch(/^Mon,? 12 Oct, 10:00$/)
    expect(fmtWhen('2026-10-12T10:00:00+01:00', { allDay: true })).toMatch(/, all day$/)
    expect(fmtWhen('bad')).toBe('')
  })

  it('groups slots by Lagos day, in order, splitting at Lagos midnight', () => {
    const slots = [
      { start: '2026-10-12T09:00:00+01:00' },
      { start: '2026-10-12T23:00:00+01:00' },
      { start: '2026-10-12T23:30:00Z' }, // 00:30 on the 13th in Lagos
      { start: '2026-10-13T10:00:00+01:00' },
    ]
    const groups = groupSlotsByDay(slots)
    expect(groups.map((g) => g.day)).toEqual(['2026-10-12', '2026-10-13'])
    expect(groups[0].slots).toHaveLength(2)
    expect(groups[1].slots).toHaveLength(2)
    expect(groupSlotsByDay()).toEqual([])
  })
})

describe('small text helpers', () => {
  it('takes up to two initials', () => {
    expect(initials('Ada Okafor')).toBe('AO')
    expect(initials('  ada  ')).toBe('A')
    expect(initials('Ada Bola Chidi')).toBe('AB')
    expect(initials('')).toBe('?')
    expect(initials(null)).toBe('?')
  })

  it('turns a snake_case status into a sentence-case label', () => {
    expect(titleCase('part_paid')).toBe('Part paid')
    expect(titleCase('')).toBe('')
  })

  it('builds a wa.me link from Nigerian local and international numbers', () => {
    expect(waLink('0803 123 4567')).toBe('https://wa.me/2348031234567')
    expect(waLink('+234 803 123 4567')).toBe('https://wa.me/2348031234567')
    expect(waLink('')).toBeNull()
    expect(waLink(null)).toBeNull()
    expect(waLink('no digits')).toBeNull()
  })
})

describe('labels that mirror the server', () => {
  // docs/API-SPEC.md and php-api/_domain.php own these rules; the client copy
  // must not drift, or the UI offers moves the server refuses (or hides ones it allows).
  const php = readFileSync(resolve(import.meta.dirname, '../../php-api/_domain.php'), 'utf8')

  const phpArray = (name) => {
    const start = php.indexOf(`const ${name} = [`)
    expect(start, `${name} not found in _domain.php`).toBeGreaterThan(-1)
    return php.slice(start, php.indexOf('];', start))
  }

  it('offers the same enquiry moves as ENQUIRY_TRANSITIONS in _domain.php', () => {
    const body = phpArray('ENQUIRY_TRANSITIONS')
    const fromServer = {}
    for (const m of body.matchAll(/'(\w+)' => \[([^\]]*)\]/g)) {
      fromServer[m[1]] = [...m[2].matchAll(/'(\w+)'/g)].map((x) => x[1])
    }
    expect(Object.keys(fromServer).length).toBeGreaterThan(0)
    expect(ENQUIRY_NEXT).toEqual(fromServer)
  })

  it('only moves between enquiry states that have a label, and never to itself', () => {
    Object.entries(ENQUIRY_NEXT).forEach(([from, targets]) => {
      expect(ENQUIRY_LABELS).toHaveProperty(from)
      expect(targets).not.toContain(from)
      targets.forEach((to) => expect(ENQUIRY_LABELS).toHaveProperty(to))
    })
  })

  it('labels the same job stages as JOB_STAGES and JOB_STAGE_LABELS in _domain.php', () => {
    const stages = [...phpArray('JOB_STAGES').matchAll(/'(\w+)'/g)].map((x) => x[1])
    expect(Object.keys(STAGE_LABELS).sort()).toEqual([...stages].sort())
    const labels = {}
    for (const m of phpArray('JOB_STAGE_LABELS').matchAll(/'(\w+)' => '([^']+)'/g)) labels[m[1]] = m[2]
    expect(STAGE_LABELS).toEqual(labels)
  })
})
