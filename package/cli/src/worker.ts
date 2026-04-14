import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'
import type { Worker } from '@rezics/dispatch-worker'
import type { RezicsConfig } from './config'
import bookCrawler from './crawler/book/index'
import animeCrawler from './crawler/anime/index'

export function createRezicsWorker(config: RezicsConfig): Worker {
  const token = config.hub.token

  const workerConfig = defineWorkerConfig({
    hub: {
      url: config.hub.url,
      getToken: async () => token,
    },
    mode: config.worker.mode,
    concurrency: config.worker.concurrency,
    pollInterval: config.worker.poll_interval,
    shutdownTimeout: config.worker.shutdown_timeout,
    heartbeatInterval: config.worker.heartbeat_interval,
    plugin: [
      [bookCrawler, {
        rateLimit: config.crawler.book.rate_limit,
        sources: config.crawler.book.sources,
        proxy: config.crawler.book.proxy,
      }],
      [animeCrawler, {
        sources: config.crawler.anime.sources,
        malApiKey: config.crawler.anime.mal_api_key,
        anilistToken: config.crawler.anime.anilist_token,
      }],
    ],
  })

  return createWorker(workerConfig)
}
