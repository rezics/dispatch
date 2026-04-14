import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { createInterface } from 'readline'
import type { RezicsConfig } from './config'

const DEFAULT_SERVER_URL = 'https://rezics.com'

export async function ensureAuthToken(config: RezicsConfig): Promise<string> {
  if (config.auth.token) {
    return config.auth.token
  }

  const serverUrl = config.auth.server_url || DEFAULT_SERVER_URL
  const tokenUrl = `${serverUrl}/settings/tokens`

  console.log('\nNo auth token configured.')
  console.log(`Create an API token at: ${tokenUrl}`)
  console.log('Then paste it below.\n')

  const token = await promptForToken()

  if (!token) {
    console.error('No token provided. Exiting.')
    process.exit(1)
  }

  writeTokenToConfig(token)
  config.auth.token = token
  return token
}

async function promptForToken(): Promise<string | null> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<string | null>((resolve) => {
    rl.question('API token: ', (answer) => {
      rl.close()
      const trimmed = answer?.trim()
      resolve(trimmed || null)
    })

    rl.on('close', () => {
      resolve(null)
    })
  })
}

function writeTokenToConfig(token: string): void {
  const configDir = join(homedir(), '.rezics')
  const configPath = join(configDir, 'config.toml')

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  if (existsSync(configPath)) {
    let content = readFileSync(configPath, 'utf-8')
    if (content.includes('[auth]')) {
      content = content.replace(
        /\[auth\][^\[]*/,
        `[auth]\ntoken = "${token}"\n`,
      )
    } else {
      content += `\n[auth]\ntoken = "${token}"\n`
    }
    writeFileSync(configPath, content)
  } else {
    writeFileSync(configPath, `[auth]\ntoken = "${token}"\n`)
  }

  console.log(`Token saved to ${configPath}`)
}

export async function exchangeToken(apiToken: string, serverUrl: string): Promise<string> {
  const url = `${serverUrl}/token/session`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  })

  if (res.status === 401) {
    throw new Error('Invalid API token — the token was rejected by the server. Check your token at the server settings page.')
  }

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { token: string }
  return data.token
}
