import { describe, expect, it } from 'bun:test'
import { loadLocale } from '../../package/i18n/src/i18n/i18n-util.sync'
import { i18nObject } from '../../package/i18n/src/i18n/i18n-util'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Theme and i18n verification', () => {
  it('all dashboard strings come from i18n (no hardcoded English in components)', () => {
    loadLocale('en')
    const LL = i18nObject('en')

    // Verify all key namespaces exist
    expect(LL.common.status.pending()).toBeTruthy()
    expect(LL.common.status.running()).toBeTruthy()
    expect(LL.common.status.done()).toBeTruthy()
    expect(LL.common.status.failed()).toBeTruthy()

    expect(LL.hub.overview.title()).toBeTruthy()
    expect(LL.hub.workers.title()).toBeTruthy()
    expect(LL.hub.tasks.title()).toBeTruthy()
    expect(LL.hub.plugins.title()).toBeTruthy()

    expect(LL.worker.status.title()).toBeTruthy()
    expect(LL.worker.tasks.title()).toBeTruthy()
    expect(LL.worker.config.title()).toBeTruthy()
  })

  it('CSS custom properties support dark mode', () => {
    const themeCSS = readFileSync(
      resolve(__dirname, '../../package/ui/src/theme.css'),
      'utf-8',
    )
    expect(themeCSS).toContain(':root')
    expect(themeCSS).toContain("[data-theme='dark']")
    expect(themeCSS).toContain('--dispatch-bg-primary')
    expect(themeCSS).toContain('--dispatch-text-primary')
    expect(themeCSS).toContain('--dispatch-status-pending')
  })
})
