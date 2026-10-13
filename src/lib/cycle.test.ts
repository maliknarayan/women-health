import { describe, expect, it } from 'vitest'
import { addDays, analyse, diffDays, type Cycle } from './cycle'

const c = (start_date: string, end_date: string | null = null, id = 0): Cycle => ({ id, start_date, end_date })

describe('analyse', () => {
  it('returns nothing with no cycles', () => {
    expect(analyse([], '2026-10-12')).toEqual({ prediction: null, insights: [] })
  })

  it('uses defaults with a single cycle', () => {
    const { prediction, insights } = analyse([c('2026-10-01')], '2026-10-12')
    expect(prediction?.cycleLength).toBe(28)
    expect(prediction?.periodLength).toBe(5)
    expect(prediction?.nextStart).toBe('2026-10-29')
    expect(prediction?.ovulation).toBe('2026-10-15')
    expect(prediction?.fertileStart).toBe('2026-10-10')
    expect(prediction?.fertileEnd).toBe('2026-10-16')
    expect(prediction?.earliest).toBe(prediction?.nextStart)
    expect(insights).toEqual([])
  })

  it('averages cycle and period length regardless of input order', () => {
    const cycles = [c('2026-08-30', '2026-09-03'), c('2026-08-01', '2026-08-05'), c('2026-09-30', '2026-10-05')]
    const { prediction } = analyse(cycles, '2026-10-12')
    expect(prediction?.cycleLength).toBe(30) // 29 and 31
    expect(prediction?.periodLength).toBe(5) // 5, 5, 6
    expect(prediction?.earliest).toBe('2026-10-29')
    expect(prediction?.latest).toBe('2026-10-31')
  })

  it('counts days late', () => {
    expect(analyse([c('2026-09-01')], '2026-10-03').prediction?.daysLate).toBe(4)
  })

  it('flags long, irregular, missed and long-period cycles', () => {
    const cycles = [c('2026-01-01', '2026-01-09'), c('2026-02-15'), c('2026-03-10'), c('2026-04-20')]
    const ids = analyse(cycles, '2026-08-01').insights.map((i) => i.id)
    expect(ids).toEqual(['missed', 'long', 'irregular', 'long-period'])
  })

  it('flags short cycles', () => {
    const ids = analyse([c('2026-09-01'), c('2026-09-19')], '2026-09-20').insights.map((i) => i.id)
    expect(ids).toEqual(['short'])
  })
})

describe('date helpers', () => {
  it('crosses month and leap-year boundaries', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(diffDays('2026-12-25', '2027-01-04')).toBe(10)
  })
})
