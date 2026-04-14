import { parseArgs } from 'util'
import { loadConfig, redactSecrets, CONFIG_SEARCH_PATHS } from '../config'

export async function configCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      config: { type: 'string' },
    },
    allowPositionals: false,
  })

  const { config, configPath } = loadConfig({ config: values.config })

  if (!configPath) {
    console.log('No config file found')
    console.log('Searched:')
    for (const p of CONFIG_SEARCH_PATHS) {
      console.log(`  ${p}`)
    }
    console.log()
    console.log('Config resolved from environment variables and defaults:')
  } else {
    console.log(`Config loaded from: ${configPath}`)
  }

  console.log()
  console.log(JSON.stringify(redactSecrets(config), null, 2))
}
