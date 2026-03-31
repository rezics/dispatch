import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { PluginContext, Task, TaskResult } from '@rezics/dispatch-type'
import { parseBook } from './parser'

const configSchema = z.object({
  rateLimit: z.number().default(10),
  proxy: z.url().optional(),
  sources: z.array(z.enum(['qidian', 'jjwxc', 'novel'])).default(['qidian']),
})

type BookCrawlerConfig = z.infer<typeof configSchema>

let rateLimiter: { lastRequest: number; minInterval: number } | null = null

async function throttledFetch(url: string, proxy?: string): Promise<string> {
  if (rateLimiter) {
    const elapsed = Date.now() - rateLimiter.lastRequest
    if (elapsed < rateLimiter.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, rateLimiter!.minInterval - elapsed))
    }
    rateLimiter.lastRequest = Date.now()
  }

  const fetchOptions: RequestInit = {}
  if (proxy) {
    fetchOptions.headers = { 'X-Proxy-URL': proxy }
  }

  const response = await fetch(url, fetchOptions)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.text()
}

export default definePlugin({
  name: '@rezics/dispatch-worker/book-crawler',
  version: '0.1.0',
  capabilities: ['book:crawl', 'book:update'],
  config: configSchema,
  displayName: 'Book Crawler',
  description: 'Crawls book metadata from web novel sources',
  trust: 'receipted',
  mode: 'http',

  async onLoad(ctx: PluginContext<BookCrawlerConfig>) {
    const interval = Math.floor(1000 / ctx.config.rateLimit)
    rateLimiter = { lastRequest: 0, minInterval: interval }
    ctx.logger.info(`Book crawler loaded: rate limit ${ctx.config.rateLimit} req/s, sources: ${ctx.config.sources.join(', ')}`)
    if (ctx.config.proxy) {
      ctx.logger.info(`Using proxy: ${ctx.config.proxy}`)
    }
  },

  handlers: {
    'book:crawl': async (task: Task, ctx: PluginContext<BookCrawlerConfig>): Promise<TaskResult> => {
      const { url, webhookUrl } = task.payload as { url: string; webhookUrl: string }

      await ctx.progress(10, 'Fetching page')
      const html = await throttledFetch(url, ctx.config.proxy)

      await ctx.progress(80, 'Parsing book metadata')
      const book = parseBook(html, url)

      ctx.logger.info(`Crawled: ${book.title} by ${book.author} (${book.chapters.length} chapters)`)

      return { strategy: 'webhook', url: webhookUrl, data: book }
    },

    'book:update': async (task: Task, ctx: PluginContext<BookCrawlerConfig>): Promise<TaskResult> => {
      const { url, webhookUrl, previousHash } = task.payload as {
        url: string
        webhookUrl: string
        previousHash: string
      }

      await ctx.progress(10, 'Checking for updates')
      const html = await throttledFetch(url, ctx.config.proxy)

      await ctx.progress(50, 'Comparing content')
      const book = parseBook(html, url)

      if (book.contentHash === previousHash) {
        ctx.logger.info(`No changes detected for: ${url}`)
        return { strategy: 'discard' }
      }

      ctx.logger.info(`Changes detected for: ${book.title}, re-crawled`)
      return { strategy: 'webhook', url: webhookUrl, data: book }
    },
  },
})
