import { treaty } from '@elysiajs/eden'
import type { app } from '@rezics/dispatch-hub'

const baseUrl = window.location.origin

export const api = treaty<typeof app>(baseUrl)
