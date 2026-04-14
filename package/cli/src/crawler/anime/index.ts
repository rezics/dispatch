import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { PluginContext, Task, TaskResult } from '@rezics/dispatch-type'
import type { AnimeMetadata } from './type'
import { initRateLimit as initMal, fetchFromMal } from './source/mal'
import { initRateLimit as initAniList, fetchFromAniList } from './source/anilist'

const configSchema = z.object({
  sources: z.array(z.enum(['mal', 'anilist'])).default(['mal']),
  malApiKey: z.string().optional(),
  anilistToken: z.string().optional(),
})

type AnimeCrawlerConfig = z.infer<typeof configSchema>

export default definePlugin({
  name: '@rezics/dispatch-cli/anime-crawler',
  version: '0.1.0',
  capabilities: ['anime:crawl', 'anime:update'],
  config: configSchema,
  displayName: 'Anime Crawler',
  description: 'Crawls anime metadata from MAL and AniList',
  trust: 'receipted',
  mode: 'http',

  async onLoad(ctx: PluginContext<AnimeCrawlerConfig>) {
    initMal()
    initAniList()
    ctx.logger.info(`Anime crawler loaded: sources: ${ctx.config.sources.join(', ')}`)
  },

  handlers: {
    'anime:crawl': async (task: Task, ctx: PluginContext<AnimeCrawlerConfig>): Promise<TaskResult> => {
      const { source, animeId, webhookUrl } = task.payload as {
        source: 'mal' | 'anilist'
        animeId: number
        webhookUrl: string
      }

      await ctx.progress(10, `Fetching from ${source}`)

      let anime: AnimeMetadata
      if (source === 'mal') {
        anime = await fetchFromMal(animeId, ctx.config.malApiKey)
      } else {
        anime = await fetchFromAniList(animeId, ctx.config.anilistToken)
      }

      await ctx.progress(90, 'Done')
      ctx.logger.info(`Crawled: ${anime.title} (${anime.episodes ?? '?'} episodes, ${anime.status})`)

      return { strategy: 'webhook', url: webhookUrl, data: anime }
    },

    'anime:update': async (task: Task, ctx: PluginContext<AnimeCrawlerConfig>): Promise<TaskResult> => {
      const { source, animeId, webhookUrl, previousHash } = task.payload as {
        source: 'mal' | 'anilist'
        animeId: number
        webhookUrl: string
        previousHash: string
      }

      await ctx.progress(10, `Checking for updates from ${source}`)

      let anime: AnimeMetadata
      if (source === 'mal') {
        anime = await fetchFromMal(animeId, ctx.config.malApiKey)
      } else {
        anime = await fetchFromAniList(animeId, ctx.config.anilistToken)
      }

      if (anime.contentHash === previousHash) {
        ctx.logger.info(`No changes for anime ${animeId} on ${source}`)
        return { strategy: 'discard' }
      }

      ctx.logger.info(`Changes detected for: ${anime.title}`)
      return { strategy: 'webhook', url: webhookUrl, data: anime }
    },
  },
})
