import { Elysia } from 'elysia'
import {
  TaskPlain,
  TaskPlainInputCreate,
  TaskPlainInputUpdate,
} from '../generated/prismabox/Task'
import { ProjectPlain, ProjectPlainInputCreate, ProjectPlainInputUpdate } from '../generated/prismabox/Project'
import { WorkerPlain, WorkerPlainInputCreate } from '../generated/prismabox/Worker'
import { TaskResultPlain } from '../generated/prismabox/TaskResult'

export const models = new Elysia({ name: 'models' }).model({
  'Task.Plain': TaskPlain,
  'Task.Create': TaskPlainInputCreate,
  'Task.Update': TaskPlainInputUpdate,
  'Project.Plain': ProjectPlain,
  'Project.Create': ProjectPlainInputCreate,
  'Project.Update': ProjectPlainInputUpdate,
  'Worker.Plain': WorkerPlain,
  'Worker.Register': WorkerPlainInputCreate,
  'TaskResult.Plain': TaskResultPlain,
})
