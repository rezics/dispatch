import { describe, expect, it, mock } from 'bun:test'
import { z } from 'zod'
import { parseBook } from '../src/crawler/book/parser'
import bookCrawlerPlugin from '../src/crawler/book/index'
import type { PluginContext, Task } from '@rezics/dispatch-type'

describe('book-crawler', () => {
  describe('config validation', () => {
    const schema = bookCrawlerPlugin.config

    it('accepts valid config with defaults', () => {
      const result = schema.parse({})
      expect(result.rateLimit).toBe(10)
      expect(result.sources).toEqual(['qidian'])
      expect(result.proxy).toBeUndefined()
    })

    it('accepts custom config', () => {
      const result = schema.parse({
        rateLimit: 5,
        sources: ['jjwxc', 'novel'],
        proxy: 'http://proxy.example.com:8080',
      })
      expect(result.rateLimit).toBe(5)
      expect(result.sources).toEqual(['jjwxc', 'novel'])
      expect(result.proxy).toBe('http://proxy.example.com:8080')
    })

    it('rejects invalid source', () => {
      expect(() => schema.parse({ sources: ['invalid'] })).toThrow()
    })
  })

  describe('parser', () => {
    it('parses basic HTML with title and author', () => {
      const html = `
        <html>
          <title>Test Book - WebNovel</title>
          <div class="author">John Doe</div>
          <meta name="description" content="A great book">
        </html>
      `
      const result = parseBook(html, 'https://example.com/book/1')
      expect(result.title).toBe('Test Book - WebNovel')
      expect(result.author).toBe('John Doe')
      expect(result.contentHash).toBeTruthy()
      expect(result.sourceUrl).toBe('https://example.com/book/1')
    })

    it('produces consistent content hash for same input', () => {
      const html = '<html><title>Test</title></html>'
      const r1 = parseBook(html, 'https://example.com')
      const r2 = parseBook(html, 'https://example.com')
      expect(r1.contentHash).toBe(r2.contentHash)
    })

    it('produces different hash for different input', () => {
      const r1 = parseBook('<html><title>Book A</title></html>', 'https://example.com')
      const r2 = parseBook('<html><title>Book B</title></html>', 'https://example.com')
      expect(r1.contentHash).not.toBe(r2.contentHash)
    })
  })

  describe('plugin definition', () => {
    it('has correct metadata', () => {
      expect(bookCrawlerPlugin.name).toBe('@rezics/dispatch-cli/book-crawler')
      expect(bookCrawlerPlugin.capabilities).toEqual(['book:crawl', 'book:update'])
      expect(bookCrawlerPlugin.trust).toBe('receipted')
      expect(bookCrawlerPlugin.mode).toBe('http')
    })

    it('has handlers for all capabilities', () => {
      expect(bookCrawlerPlugin.handlers['book:crawl']).toBeDefined()
      expect(bookCrawlerPlugin.handlers['book:update']).toBeDefined()
    })
  })

  describe('handlers', () => {
    const mockCtx: PluginContext<{ rateLimit: number; sources: string[]; proxy?: string }> = {
      config: { rateLimit: 10, sources: ['qidian'] },
      logger: {
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        debug: mock(() => {}),
      },
      progress: mock(async () => {}),
    }

    it('book:crawl returns webhook result', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () =>
        new Response('<html><title>My Book</title><div class="author">Author</div></html>'),
      ) as typeof fetch

      try {
        const task = {
          id: 'test-1',
          project: 'test',
          type: 'book:crawl',
          payload: { url: 'https://example.com/book/1', webhookUrl: 'https://api.example.com/books' },
          priority: 1,
          status: 'running' as const,
          workerId: 'w1',
          attempts: 1,
          maxAttempts: 3,
          scheduledAt: new Date(),
          startedAt: new Date(),
          leaseExpiresAt: null,
          finishedAt: null,
          error: null,
          createdAt: new Date(),
        }

        const result = await bookCrawlerPlugin.handlers['book:crawl'](task, mockCtx)
        expect(result.strategy).toBe('webhook')
        if (result.strategy === 'webhook') {
          expect(result.url).toBe('https://api.example.com/books')
          expect(result.data).toHaveProperty('title')
          expect(result.data).toHaveProperty('author')
        }
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('book:update returns discard when unchanged', async () => {
      const html = '<html><title>My Book</title></html>'
      const book = parseBook(html, 'https://example.com')

      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () => new Response(html)) as typeof fetch

      try {
        const task = {
          id: 'test-2',
          project: 'test',
          type: 'book:update',
          payload: {
            url: 'https://example.com/book/1',
            webhookUrl: 'https://api.example.com/books',
            previousHash: book.contentHash,
          },
          priority: 1,
          status: 'running' as const,
          workerId: 'w1',
          attempts: 1,
          maxAttempts: 3,
          scheduledAt: new Date(),
          startedAt: new Date(),
          leaseExpiresAt: null,
          finishedAt: null,
          error: null,
          createdAt: new Date(),
        }

        const result = await bookCrawlerPlugin.handlers['book:update'](task, mockCtx)
        expect(result.strategy).toBe('discard')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})
