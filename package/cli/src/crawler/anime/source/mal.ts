import type { AnimeMetadata } from '../type'

// MAL: 3 req/s = ~333ms interval
let rateLimiter = { lastRequest: 0, minInterval: 334 }

export function initRateLimit() {
  rateLimiter = { lastRequest: 0, minInterval: 334 }
}

function computeHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

async function throttledFetch(url: string, headers?: Record<string, string>): Promise<unknown> {
  const elapsed = Date.now() - rateLimiter.lastRequest
  if (elapsed < rateLimiter.minInterval) {
    await new Promise((resolve) => setTimeout(resolve, rateLimiter.minInterval - elapsed))
  }
  rateLimiter.lastRequest = Date.now()

  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchFromMal(
  animeId: number,
  apiKey?: string,
): Promise<AnimeMetadata> {
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['X-MAL-CLIENT-ID'] = apiKey
  }

  const data = (await throttledFetch(
    `https://api.myanimelist.net/v2/anime/${animeId}?fields=title,num_episodes,status,genres,synopsis,main_picture,mean`,
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
