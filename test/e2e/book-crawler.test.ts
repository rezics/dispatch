import { describe, expect, it } from 'bun:test'

// These tests require a running hub with database.
// Run with: DATABASE_URL=... bun test test/e2e/book-crawler.test.ts

const HUB_URL = process.env.HUB_URL || 'http://localhost:3721'

describe('Book Crawler E2E', () => {
  it('creates and processes book:crawl tasks', async () => {
    // Create a book:crawl task
    const createRes = await fetch(`${HUB_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: 'test',
        type: 'book:crawl',
        payload: {
          url: 'https://example.com/book/1',
          webhookUrl: 'https://httpbin.org/post',
        },
      }),
    })

    expect(createRes.status).toBe(201)
    const task = await createRes.json()
    expect(task.type).toBe('book:crawl')
    expect(task.status).toBe('pending')
  })
})
