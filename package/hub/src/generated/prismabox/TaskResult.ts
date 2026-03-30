import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TaskResultPlain = t.Object(
  { taskId: t.String(), data: t.Any(), createdAt: t.Date() },
  { additionalProperties: false },
);

export const TaskResultRelations = t.Object(
  {
    task: t.Object(
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
    ),
  },
  { additionalProperties: false },
);

export const TaskResultPlainInputCreate = t.Object(
  { data: t.Any() },
  { additionalProperties: false },
);

export const TaskResultPlainInputUpdate = t.Object(
  { data: t.Optional(t.Any()) },
  { additionalProperties: false },
);

export const TaskResultRelationsInputCreate = t.Object(
  {
    task: t.Object(
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
  },
  { additionalProperties: false },
);

export const TaskResultRelationsInputUpdate = t.Partial(
  t.Object(
    {
      task: t.Object(
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
    },
    { additionalProperties: false },
  ),
);

export const TaskResultWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          taskId: t.String(),
          data: t.Any(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "TaskResult" },
  ),
);

export const TaskResultWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object({ taskId: t.String() }, { additionalProperties: false }),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ taskId: t.String() })], {
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
            { taskId: t.String(), data: t.Any(), createdAt: t.Date() },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "TaskResult" },
);

export const TaskResultSelect = t.Partial(
  t.Object(
    {
      taskId: t.Boolean(),
      data: t.Boolean(),
      createdAt: t.Boolean(),
      task: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TaskResultInclude = t.Partial(
  t.Object(
    { task: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const TaskResultOrderBy = t.Partial(
  t.Object(
    {
      taskId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      data: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const TaskResult = t.Composite([TaskResultPlain, TaskResultRelations], {
  additionalProperties: false,
});

export const TaskResultInputCreate = t.Composite(
  [TaskResultPlainInputCreate, TaskResultRelationsInputCreate],
  { additionalProperties: false },
);

export const TaskResultInputUpdate = t.Composite(
  [TaskResultPlainInputUpdate, TaskResultRelationsInputUpdate],
  { additionalProperties: false },
);
