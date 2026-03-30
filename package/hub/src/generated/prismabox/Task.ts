import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TaskPlain = t.Object(
  {
    id: t.String(),
    project: t.String(),
    type: t.String(),
    payload: t.Any(),
    priority: t.Integer(),
    status: t.String(),
    workerId: __nullable__(t.String()),
    attempts: t.Integer(),
    maxAttempts: t.Integer(),
    scheduledAt: t.Date(),
    startedAt: __nullable__(t.Date()),
    leaseExpiresAt: __nullable__(t.Date()),
    finishedAt: __nullable__(t.Date()),
    error: __nullable__(t.String()),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const TaskRelations = t.Object(
  {
    projectRef: t.Object(
      {
        id: t.String(),
        trustLevel: t.String(),
        receiptSecret: __nullable__(t.String()),
        jwksUri: __nullable__(t.String()),
        createdAt: t.Date(),
      },
      { additionalProperties: false },
    ),
    workerRef: __nullable__(
      t.Object(
        {
          id: t.String(),
          project: t.String(),
          capabilities: t.Array(t.String(), { additionalProperties: false }),
          concurrency: t.Integer(),
          mode: t.String(),
          metadata: __nullable__(t.Any()),
          connectedAt: t.Date(),
          lastSeen: t.Date(),
        },
        { additionalProperties: false },
      ),
    ),
    result: __nullable__(
      t.Object(
        { taskId: t.String(), data: t.Any(), createdAt: t.Date() },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const TaskPlainInputCreate = t.Object(
  {
    project: t.String(),
    type: t.String(),
    payload: t.Any(),
    priority: t.Optional(t.Integer()),
    status: t.Optional(t.String()),
    attempts: t.Optional(t.Integer()),
    maxAttempts: t.Optional(t.Integer()),
    scheduledAt: t.Optional(t.Date()),
    startedAt: t.Optional(__nullable__(t.Date())),
    leaseExpiresAt: t.Optional(__nullable__(t.Date())),
    finishedAt: t.Optional(__nullable__(t.Date())),
    error: t.Optional(__nullable__(t.String())),
  },
  { additionalProperties: false },
);

export const TaskPlainInputUpdate = t.Object(
  {
    project: t.Optional(t.String()),
    type: t.Optional(t.String()),
    payload: t.Optional(t.Any()),
    priority: t.Optional(t.Integer()),
    status: t.Optional(t.String()),
    attempts: t.Optional(t.Integer()),
    maxAttempts: t.Optional(t.Integer()),
    scheduledAt: t.Optional(t.Date()),
    startedAt: t.Optional(__nullable__(t.Date())),
    leaseExpiresAt: t.Optional(__nullable__(t.Date())),
    finishedAt: t.Optional(__nullable__(t.Date())),
    error: t.Optional(__nullable__(t.String())),
  },
  { additionalProperties: false },
);

export const TaskRelationsInputCreate = t.Object(
  {
    projectRef: t.Object(
      {
        connect: t.Object(
          {
            id: t.String({ additionalProperties: false }),
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
    workerRef: t.Optional(
      t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
    result: t.Optional(
      t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const TaskRelationsInputUpdate = t.Partial(
  t.Object(
    {
      projectRef: t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
      workerRef: t.Partial(
        t.Object(
          {
            connect: t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            disconnect: t.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
      result: t.Partial(
        t.Object(
          {
            connect: t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            disconnect: t.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export const TaskWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          project: t.String(),
          type: t.String(),
          payload: t.Any(),
          priority: t.Integer(),
          status: t.String(),
          workerId: t.String(),
          attempts: t.Integer(),
          maxAttempts: t.Integer(),
          scheduledAt: t.Date(),
          startedAt: t.Date(),
          leaseExpiresAt: t.Date(),
          finishedAt: t.Date(),
          error: t.String(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Task" },
  ),
);

export const TaskWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object({ id: t.String() }, { additionalProperties: false }),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ id: t.String() })], {
          additionalProperties: false,
        }),
        t.Partial(
          t.Object({
            AND: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            NOT: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            OR: t.Array(Self, { additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object(
            {
              id: t.String(),
              project: t.String(),
              type: t.String(),
              payload: t.Any(),
              priority: t.Integer(),
              status: t.String(),
              workerId: t.String(),
              attempts: t.Integer(),
              maxAttempts: t.Integer(),
              scheduledAt: t.Date(),
              startedAt: t.Date(),
              leaseExpiresAt: t.Date(),
              finishedAt: t.Date(),
              error: t.String(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Task" },
);

export const TaskSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      project: t.Boolean(),
      type: t.Boolean(),
      payload: t.Boolean(),
      priority: t.Boolean(),
      status: t.Boolean(),
      workerId: t.Boolean(),
      attempts: t.Boolean(),
      maxAttempts: t.Boolean(),
      scheduledAt: t.Boolean(),
      startedAt: t.Boolean(),
      leaseExpiresAt: t.Boolean(),
      finishedAt: t.Boolean(),
      error: t.Boolean(),
      createdAt: t.Boolean(),
      projectRef: t.Boolean(),
      workerRef: t.Boolean(),
      result: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TaskInclude = t.Partial(
  t.Object(
    {
      projectRef: t.Boolean(),
      workerRef: t.Boolean(),
      result: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TaskOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      project: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      type: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      payload: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      priority: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      status: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      workerId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      attempts: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      maxAttempts: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      scheduledAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      startedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      leaseExpiresAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      finishedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      error: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Task = t.Composite([TaskPlain, TaskRelations], {
  additionalProperties: false,
});

export const TaskInputCreate = t.Composite(
  [TaskPlainInputCreate, TaskRelationsInputCreate],
  { additionalProperties: false },
);

export const TaskInputUpdate = t.Composite(
  [TaskPlainInputUpdate, TaskRelationsInputUpdate],
  { additionalProperties: false },
);
