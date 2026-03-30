import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/dispatch',
  },
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
})
