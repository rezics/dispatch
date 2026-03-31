import type { ResultPlugin } from './interface'

export function createDiscardPlugin(): ResultPlugin {
  return {
    id: 'discard',
    async handle() {
      // No-op — task result is intentionally discarded
    },
  }
}
