import { parseArgs } from 'util'

const USAGE = `Usage: rezics <command> [options]

Commands:
  start     Start the worker and dashboard server
  status    Show worker status
  tasks     Show active tasks
  config    Show loaded configuration

Options:
  --port <number>        Dashboard server port (default: 45321)
  --mode <http|ws>       Worker connection mode (default: http)
  --concurrency <number> Max concurrent tasks (default: 10)
  --config <path>        Config file path`

const args = process.argv.slice(2)
const command = args[0]

if (!command) {
  console.log(USAGE)
  process.exit(1)
}

const commandArgs = args.slice(1)

switch (command) {
  case 'start': {
    const { startCommand } = await import('./command/start')
    await startCommand(commandArgs)
    break
  }
  case 'status': {
    const { statusCommand } = await import('./command/status')
    await statusCommand(commandArgs)
    break
  }
  case 'tasks': {
    const { tasksCommand } = await import('./command/tasks')
    await tasksCommand(commandArgs)
    break
  }
  case 'config': {
    const { configCommand } = await import('./command/config')
    await configCommand(commandArgs)
    break
  }
  default:
    console.error(`Unknown command: ${command}`)
    console.log(USAGE)
    process.exit(1)
}
