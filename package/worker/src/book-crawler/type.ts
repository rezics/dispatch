export interface BookMetadata {
  title: string
  author: string
  description: string
  chapters: ChapterInfo[]
  source: string
  sourceUrl: string
  coverUrl?: string
  tags?: string[]
  status?: 'ongoing' | 'completed' | 'hiatus'
  contentHash: string
}

export interface ChapterInfo {
  index: number
  title: string
  url: string
  publishedAt?: string
}

export interface BookParser {
  parse(html: string, url: string): BookMetadata
  supports(url: string): boolean
}
