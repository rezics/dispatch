import { describe, expect, it, mock } from 'bun:test'
import animeCrawlerPlugin from '../src/anime-crawler/index'
import type { PluginContext, Task } from '@rezics/dispatch-type'

describe('anime-crawler', () => {
  describe('config validation', () => {
    const schema = animeCrawlerPlugin.config

    it('accepts valid config with defaults', () => {
      const result = schema.parse({})
      expect(result.sources).toEqual(['mal'])
      expect(result.malApiKey).toBeUndefined()
      expect(result.anilistToken).toBeUndefined()
    })

    it('accepts custom config', () => {
      const result = schema.parse({
        sources: ['mal', 'anilist'],
        malApiKey: 'my-key',
        anilistToken: 'my-token',
      })
      expect(result.sources).toEqual(['mal', 'anilist'])
      expect(result.malApiKey).toBe('my-key')
      expect(result.anilistToken).toBe('my-token')
    })

    it('rejects invalid source', () => {
      expect(() => schema.parse({ sources: ['crunchyroll'] })).toThrow()
    })
  })

  describe('plugin definition', () => {
    it('has correct metadata', () => {
      expect(animeCrawlerPlugin.name).toBe('@rezics/dispatch-worker/anime-crawler')
      expect(animeCrawlerPlugin.capabilities).toEqual(['anime:crawl', 'anime:update'])
      expect(animeCrawlerPlugin.trust).toBe('receipted')
      expect(animeCrawlerPlugin.mode).toBe('http')
    })

    it('has handlers for all capabilities', () => {
      expect(animeCrawlerPlugin.handlers['anime:crawl']).toBeDefined()
      expect(animeCrawlerPlugin.handlers['anime:update']).toBeDefined()
    })
  })

  describe('handlers', () => {
    const mockCtx: PluginContext<{ sources: string[]; malApiKey?: string; anilistToken?: string }> = {
      config: { sources: ['mal'] },
      logger: {
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        debug: mock(() => {}),
      },
      progress: mock(async () => {}),
    }

    it('anime:crawl returns webhook result for MAL', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () =>
        new Response(
          JSON.stringify({
            title: 'Naruto',
            num_episodes: 220,
            status: 'finished_airing',
            genres: [{ name: 'Action' }, { name: 'Adventure' }],
            synopsis: 'A ninja anime',
            main_picture: { large: 'https://cdn.mal.com/naruto.jpg' },
            mean: 8.5,
          }),
        ),
      ) as typeof fetch

      try {
        const task: Task = {
          id: 'test-1',
          project: 'test',
          type: 'anime:crawl',
          payload: { source: 'mal', animeId: 20, webhookUrl: 'https://api.example.com/anime' },
          priority: 1,
          status: 'running',
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

        const result = await animeCrawlerPlugin.handlers['anime:crawl'](task, mockCtx)
        expect(result.strategy).toBe('webhook')
        if (result.strategy === 'webhook') {
          expect(result.url).toBe('https://api.example.com/anime')
          const data = result.data as { title: string; episodes: number; genres: string[] }
          expect(data.title).toBe('Naruto')
          expect(data.episodes).toBe(220)
          expect(data.genres).toEqual(['Action', 'Adventure'])
        }
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('anime:update returns discard when unchanged', async () => {
      const malData = {
        title: 'Naruto',
        num_episodes: 220,
        status: 'finished_airing',
        genres: [],
        synopsis: '',
      }

      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () => new Response(JSON.stringify(malData))) as typeof fetch

      try {
        // First crawl to get hash
        const crawlTask: Task = {
          id: 'test-2a',
          project: 'test',
          type: 'anime:crawl',
          payload: { source: 'mal', animeId: 20, webhookUrl: 'https://api.example.com/anime' },
          priority: 1,
          status: 'running',
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

        const crawlResult = await animeCrawlerPlugin.handlers['anime:crawl'](crawlTask, mockCtx)
        const hash = (crawlResult as { data: { contentHash: string } }).data.contentHash

        // Update with same data
        const updateTask: Task = {
          id: 'test-2b',
          project: 'test',
          type: 'anime:update',
          payload: { source: 'mal', animeId: 20, webhookUrl: 'https://api.example.com/anime', previousHash: hash },
          priority: 1,
          status: 'running',
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

        const result = await animeCrawlerPlugin.handlers['anime:update'](updateTask, mockCtx)
        expect(result.strategy).toBe('discard')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})
