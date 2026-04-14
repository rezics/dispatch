import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const WorkerPlain = t.Object(
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
);

export const WorkerRelations = t.Object(
  {
    projectRef: t.Object(
      {
        id: t.String(),
        verification: t.String(),
        receiptSecret: __nullable__(t.String()),
        jwksUri: __nullable__(t.String()),
        maxTaskHoldTime: __nullable__(t.Integer()),
        agingRate: __nullable__(t.Number()),
        agingMaxPriority: __nullable__(t.Integer()),
        createdAt: t.Date(),
      },
      { additionalProperties: false },
    ),
    tasks: t.Array(
      t.Object(
        {
          id: t.String(),
          project: t.String(),
          type: t.String(),
          payload: t.Any(),
          priority: t.Integer(),
          basePriority: t.Integer(),
          status: t.String(),
          workerId: __nullable__(t.String()),
          attempts: t.Integer(),
          maxAttempts: t.Integer(),
          scheduledAt: t.Date(),
          startedAt: __nullable__(t.Date()),
          leaseExpiresAt: __nullable__(t.Date()),
          maxHoldExpiresAt: __nullable__(t.Date()),
          finishedAt: __nullable__(t.Date()),
          error: __nullable__(t.String()),
          recurrenceInterval: __nullable__(t.Integer()),
          recurrenceJitter: __nullable__(t.Integer()),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const WorkerPlainInputCreate = t.Object(
  {
    project: t.String(),
    capabilities: t.Array(t.String(), { additionalProperties: false }),
    concurrency: t.Optional(t.Integer()),
    mode: t.String(),
    metadata: t.Optional(__nullable__(t.Any())),
    connectedAt: t.Optional(t.Date()),
    lastSeen: t.Optional(t.Date()),
  },
  { additionalProperties: false },
);

export const WorkerPlainInputUpdate = t.Object(
  {
    project: t.Optional(t.String()),
    capabilities: t.Optional(
      t.Array(t.String(), { additionalProperties: false }),
    ),
    concurrency: t.Optional(t.Integer()),
    mode: t.Optional(t.String()),
    metadata: t.Optional(__nullable__(t.Any())),
    connectedAt: t.Optional(t.Date()),
    lastSeen: t.Optional(t.Date()),
  },
  { additionalProperties: false },
);

export const WorkerRelationsInputCreate = t.Object(
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
    tasks: t.Optional(
      t.Object(
        {
          connect: t.Array(
            t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const WorkerRelationsInputUpdate = t.Partial(
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
      tasks: t.Partial(
        t.Object(
          {
            connect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
            disconnect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export const WorkerWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          project: t.String(),
          capabilities: t.Array(t.String(), { additionalProperties: false }),
          concurrency: t.Integer(),
          mode: t.String(),
          metadata: t.Any(),
          connectedAt: t.Date(),
          lastSeen: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Worker" },
  ),
);

export const WorkerWhereUnique = t.Recursive(
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
              capabilities: t.Array(t.String(), {
                additionalProperties: false,
              }),
              concurrency: t.Integer(),
              mode: t.String(),
              metadata: t.Any(),
              connectedAt: t.Date(),
              lastSeen: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Worker" },
);

export const WorkerSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      project: t.Boolean(),
      capabilities: t.Boolean(),
      concurrency: t.Boolean(),
      mode: t.Boolean(),
      metadata: t.Boolean(),
      connectedAt: t.Boolean(),
      lastSeen: t.Boolean(),
      projectRef: t.Boolean(),
      tasks: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const WorkerInclude = t.Partial(
  t.Object(
    { projectRef: t.Boolean(), tasks: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const WorkerOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      project: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      capabilities: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      concurrency: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      mode: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      metadata: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      connectedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      lastSeen: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Worker = t.Composite([WorkerPlain, WorkerRelations], {
  additionalProperties: false,
});

export const WorkerInputCreate = t.Composite(
  [WorkerPlainInputCreate, WorkerRelationsInputCreate],
  { additionalProperties: false },
);

export const WorkerInputUpdate = t.Composite(
  [WorkerPlainInputUpdate, WorkerRelationsInputUpdate],
  { additionalProperties: false },
);
