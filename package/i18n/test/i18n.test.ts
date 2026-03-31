import { describe, expect, it } from 'bun:test'
import { loadLocale, loadAllLocales } from '../src/i18n/i18n-util.sync'
import { i18nObject } from '../src/i18n/i18n-util'

describe('i18n', () => {
  it('loads the en locale and accesses translation keys', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    expect(LL.common.status.pending()).toBe('Pending')
    expect(LL.common.status.running()).toBe('Running')
    expect(LL.common.status.done()).toBe('Done')
    expect(LL.common.status.failed()).toBe('Failed')
  })

  it('supports parameterized translations', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    expect(LL.hub.overview.taskCount({ count: 42 })).toBe('42 tasks')
    expect(LL.hub.overview.taskCount({ count: 1 })).toBe('1 task')
    expect(LL.hub.overview.workerCount({ count: 3 })).toBe('3 workers')
  })

  it('provides hub dashboard strings', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    expect(LL.hub.overview.title()).toBe('Overview')
    expect(LL.hub.workers.title()).toBe('Workers')
    expect(LL.hub.tasks.title()).toBe('Tasks')
    expect(LL.hub.plugins.title()).toBe('Plugins')
  })

  it('provides worker dashboard strings', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    expect(LL.worker.status.connected()).toBe('Connected')
    expect(LL.worker.tasks.title()).toBe('Tasks')
    expect(LL.worker.config.title()).toBe('Configuration')
  })

  it('provides common labels', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    expect(LL.common.labels.id()).toBe('ID')
    expect(LL.common.labels.status()).toBe('Status')
    expect(LL.common.labels.noData()).toBe('No data available')
  })

  it('supports page parameterized translation', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    expect(LL.hub.tasks.page({ current: 2, total: 5 })).toBe('Page 2 of 5')
  })
})
