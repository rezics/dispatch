import { treaty } from '@elysiajs/eden'
import type { app } from '@rezics/dispatch-hub'
import { env } from '../env'

export const api = treaty<typeof app>(env.VITE_API_URL)
