import type { AnimeMetadata } from '../type'

// AniList: 90 req/min = ~667ms interval
let rateLimiter = { lastRequest: 0, minInterval: 667 }

export function initRateLimit() {
  rateLimiter = { lastRequest: 0, minInterval: 667 }
}

function computeHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

export async function fetchFromAniList(
  animeId: number,
  token?: string,
): Promise<AnimeMetadata> {
  const elapsed = Date.now() - rateLimiter.lastRequest
  if (elapsed < rateLimiter.minInterval) {
    await new Promise((resolve) => setTimeout(resolve, rateLimiter.minInterval - elapsed))
  }
  rateLimiter.lastRequest = Date.now()

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
