import { parseBook } from '../parser'
import type { BookMetadata } from '../type'

let rateLimiter = { lastRequest: 0, minInterval: 100 }

export function initRateLimit(rateLimit: number) {
  rateLimiter = { lastRequest: 0, minInterval: Math.floor(1000 / rateLimit) }
}

export async function fetchJjwxc(url: string, proxy?: string): Promise<string> {
  const elapsed = Date.now() - rateLimiter.lastRequest
  if (elapsed < rateLimiter.minInterval) {
    await new Promise((resolve) => setTimeout(resolve, rateLimiter.minInterval - elapsed))
  }
  rateLimiter.lastRequest = Date.now()

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

export async function crawlJjwxc(url: string, proxy?: string): Promise<BookMetadata> {
  const html = await fetchJjwxc(url, proxy)
  return parseBook(html, url)
}
