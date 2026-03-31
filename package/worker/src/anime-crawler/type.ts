export interface AnimeMetadata {
  title: string
  episodes: number | null
  status: 'airing' | 'finished' | 'upcoming' | 'unknown'
  genres: string[]
  synopsis: string
  source: 'mal' | 'anilist'
  sourceId: number
  coverUrl?: string
  score?: number
  contentHash: string
}
