import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { PluginContext, Task, TaskResult } from '@rezics/dispatch-type'
import { parseBook } from './parser'
import { initRateLimit as initQidian, fetchQidian } from './source/qidian'
import { initRateLimit as initJjwxc, fetchJjwxc } from './source/jjwxc'
import { initRateLimit as initNovel, fetchNovel } from './source/novel'

const configSchema = z.object({
  rateLimit: z.number().default(10),
  proxy: z.url().optional(),
  sources: z.array(z.enum(['qidian', 'jjwxc', 'novel'])).default(['qidian']),
})

type BookCrawlerConfig = z.infer<typeof configSchema>

function detectSource(url: string): 'qidian' | 'jjwxc' | 'novel' | null {
  if (url.includes('qidian') || url.includes('webnovel')) return 'qidian'
  if (url.includes('jjwxc')) return 'jjwxc'
  if (url.includes('novel')) return 'novel'
  return null
}

async function fetchBySource(url: string, proxy?: string): Promise<string> {
  const source = detectSource(url)
  switch (source) {
    case 'qidian':
      return fetchQidian(url, proxy)
    case 'jjwxc':
      return fetchJjwxc(url, proxy)
    case 'novel':
      return fetchNovel(url, proxy)
    default:
      return fetchQidian(url, proxy)
  }
}

export default definePlugin({
  name: '@rezics/dispatch-cli/book-crawler',
  version: '0.1.0',
  capabilities: ['book:crawl', 'book:update'],
  config: configSchema,
  displayName: 'Book Crawler',
  description: 'Crawls book metadata from web novel sources',
  trust: 'receipted',
  mode: 'http',

  async onLoad(ctx: PluginContext<BookCrawlerConfig>) {
    initQidian(ctx.config.rateLimit)
    initJjwxc(ctx.config.rateLimit)
    initNovel(ctx.config.rateLimit)

    ctx.logger.info(`Book crawler loaded: rate limit ${ctx.config.rateLimit} req/s, sources: ${ctx.config.sources.join(', ')}`)
    if (ctx.config.proxy) {
      ctx.logger.info(`Using proxy: ${ctx.config.proxy}`)
    }
  },

  handlers: {
    'book:crawl': async (task: Task, ctx: PluginContext<BookCrawlerConfig>): Promise<TaskResult> => {
      const { url, webhookUrl } = task.payload as { url: string; webhookUrl: string }

      await ctx.progress(10, 'Fetching page')
      const html = await fetchBySource(url, ctx.config.proxy)

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
      const html = await fetchBySource(url, ctx.config.proxy)

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
