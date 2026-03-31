import type { BookMetadata, BookParser, ChapterInfo } from './type'

function computeHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(36)
}

function extractText(html: string, tagPattern: RegExp): string {
  const match = html.match(tagPattern)
  if (!match) return ''
  return match[1].replace(/<[^>]+>/g, '').trim()
}

function extractAll(html: string, pattern: RegExp): string[] {
  const results: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    results.push(match[1].replace(/<[^>]+>/g, '').trim())
  }
  return results
}

const qidianParser: BookParser = {
  supports(url: string) {
    return url.includes('qidian') || url.includes('webnovel')
  },
  parse(html: string, url: string): BookMetadata {
    const title = extractText(html, /<h1[^>]*>(.*?)<\/h1>/s) || 'Unknown Title'
    const author = extractText(html, /author[^>]*>(.*?)<\//s) || 'Unknown Author'
    const description = extractText(html, /description[^>]*>(.*?)<\/div>/s) || ''
    const chapterTitles = extractAll(html, /chapter[^>]*title[^>]*>(.*?)<\//gi)
    const chapters: ChapterInfo[] = chapterTitles.map((t, i) => ({
      index: i + 1,
      title: t,
      url: `${url}/chapter/${i + 1}`,
    }))
    return {
      title,
      author,
      description,
      chapters,
      source: 'qidian',
      sourceUrl: url,
      contentHash: computeHash(html),
    }
  },
}

const genericParser: BookParser = {
  supports() {
    return true
  },
  parse(html: string, url: string): BookMetadata {
    const title = extractText(html, /<title[^>]*>(.*?)<\/title>/s) || 'Unknown Title'
    const author = extractText(html, /author[^>]*>(.*?)<\//s) || 'Unknown Author'
    const description = extractText(html, /<meta[^>]*description[^>]*content="([^"]*)"/) || ''
    return {
      title,
      author,
      description,
      chapters: [],
      source: 'generic',
      sourceUrl: url,
      contentHash: computeHash(html),
    }
  },
}

const parsers: BookParser[] = [qidianParser, genericParser]

export function parseBook(html: string, url: string): BookMetadata {
  const parser = parsers.find((p) => p.supports(url)) ?? genericParser
  return parser.parse(html, url)
}
