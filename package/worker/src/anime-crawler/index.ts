import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { PluginContext, Task, TaskResult } from '@rezics/dispatch-type'
import type { AnimeMetadata } from './type'

const configSchema = z.object({
  sources: z.array(z.enum(['mal', 'anilist'])).default(['mal']),
  malApiKey: z.string().optional(),
  anilistToken: z.string().optional(),
})

type AnimeCrawlerConfig = z.infer<typeof configSchema>

const rateLimiters: Record<string, { lastRequest: number; minInterval: number }> = {}

function computeHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

async function throttledFetch(
  url: string,
  source: string,
  headers?: Record<string, string>,
): Promise<unknown> {
  const limiter = rateLimiters[source]
  if (limiter) {
    const elapsed = Date.now() - limiter.lastRequest
    if (elapsed < limiter.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, limiter.minInterval - elapsed))
    }
    limiter.lastRequest = Date.now()
  }

  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

async function fetchFromMal(
  animeId: number,
  apiKey?: string,
): Promise<AnimeMetadata> {
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['X-MAL-CLIENT-ID'] = apiKey
  }

  const data = (await throttledFetch(
    `https://api.myanimelist.net/v2/anime/${animeId}?fields=title,num_episodes,status,genres,synopsis,main_picture,mean`,
    'mal',
    headers,
  )) as Record<string, unknown>

  const genres = Array.isArray(data.genres)
    ? (data.genres as Array<{ name: string }>).map((g) => g.name)
    : []

  const statusMap: Record<string, AnimeMetadata['status']> = {
    currently_airing: 'airing',
    finished_airing: 'finished',
    not_yet_aired: 'upcoming',
  }

  return {
    title: (data.title as string) || 'Unknown',
    episodes: (data.num_episodes as number) || null,
    status: statusMap[data.status as string] || 'unknown',
    genres,
    synopsis: (data.synopsis as string) || '',
    source: 'mal',
    sourceId: animeId,
    coverUrl: (data.main_picture as Record<string, string>)?.large,
    score: data.mean as number | undefined,
    contentHash: computeHash(JSON.stringify(data)),
  }
}

async function fetchFromAniList(
  animeId: number,
  token?: string,
): Promise<AnimeMetadata> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        title { romaji english }
        episodes
        status
        genres
        description
        coverImage { large }
        averageScore
      }
    }
  `

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: { id: animeId } }),
  })

  if (!response.ok) {
    throw new Error(`AniList HTTP ${response.status}: ${response.statusText}`)
  }

  const result = (await response.json()) as { data: { Media: Record<string, unknown> } }
  const media = result.data.Media

  const titleObj = media.title as { romaji?: string; english?: string }
  const statusMap: Record<string, AnimeMetadata['status']> = {
    RELEASING: 'airing',
    FINISHED: 'finished',
    NOT_YET_RELEASED: 'upcoming',
  }

  return {
    title: titleObj.english || titleObj.romaji || 'Unknown',
    episodes: (media.episodes as number) || null,
    status: statusMap[media.status as string] || 'unknown',
    genres: (media.genres as string[]) || [],
    synopsis: ((media.description as string) || '').replace(/<[^>]+>/g, ''),
    source: 'anilist',
    sourceId: animeId,
    coverUrl: (media.coverImage as Record<string, string>)?.large,
    score: media.averageScore as number | undefined,
    contentHash: computeHash(JSON.stringify(media)),
  }
}

export default definePlugin({
  name: '@rezics/dispatch-worker/anime-crawler',
  version: '0.1.0',
  capabilities: ['anime:crawl', 'anime:update'],
  config: configSchema,
  displayName: 'Anime Crawler',
  description: 'Crawls anime metadata from MAL and AniList',
  trust: 'receipted',
  mode: 'http',

  async onLoad(ctx: PluginContext<AnimeCrawlerConfig>) {
    // MAL: 3 req/s = ~333ms interval
    rateLimiters['mal'] = { lastRequest: 0, minInterval: 334 }
    // AniList: 90 req/min = ~667ms interval
    rateLimiters['anilist'] = { lastRequest: 0, minInterval: 667 }

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
