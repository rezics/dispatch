import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const ProjectPlain = t.Object(
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
);

export const ProjectRelations = t.Object(
  {
    workers: t.Array(
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

export const ProjectPlainInputCreate = t.Object(
  {
    verification: t.Optional(t.String()),
    receiptSecret: t.Optional(__nullable__(t.String())),
    jwksUri: t.Optional(__nullable__(t.String())),
    maxTaskHoldTime: t.Optional(__nullable__(t.Integer())),
    agingRate: t.Optional(__nullable__(t.Number())),
    agingMaxPriority: t.Optional(__nullable__(t.Integer())),
  },
  { additionalProperties: false },
);

export const ProjectPlainInputUpdate = t.Object(
  {
    verification: t.Optional(t.String()),
    receiptSecret: t.Optional(__nullable__(t.String())),
    jwksUri: t.Optional(__nullable__(t.String())),
    maxTaskHoldTime: t.Optional(__nullable__(t.Integer())),
    agingRate: t.Optional(__nullable__(t.Number())),
    agingMaxPriority: t.Optional(__nullable__(t.Integer())),
  },
  { additionalProperties: false },
);

export const ProjectRelationsInputCreate = t.Object(
  {
    workers: t.Optional(
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

export const ProjectRelationsInputUpdate = t.Partial(
  t.Object(
    {
      workers: t.Partial(
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

export const ProjectWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          verification: t.String(),
          receiptSecret: t.String(),
          jwksUri: t.String(),
          maxTaskHoldTime: t.Integer(),
          agingRate: t.Number(),
          agingMaxPriority: t.Integer(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Project" },
  ),
);

export const ProjectWhereUnique = t.Recursive(
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
              verification: t.String(),
              receiptSecret: t.String(),
              jwksUri: t.String(),
              maxTaskHoldTime: t.Integer(),
              agingRate: t.Number(),
              agingMaxPriority: t.Integer(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Project" },
);

export const ProjectSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      verification: t.Boolean(),
      receiptSecret: t.Boolean(),
      jwksUri: t.Boolean(),
      maxTaskHoldTime: t.Boolean(),
      agingRate: t.Boolean(),
      agingMaxPriority: t.Boolean(),
      createdAt: t.Boolean(),
      workers: t.Boolean(),
      tasks: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const ProjectInclude = t.Partial(
  t.Object(
    { workers: t.Boolean(), tasks: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const ProjectOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      verification: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      receiptSecret: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      jwksUri: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      maxTaskHoldTime: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      agingRate: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      agingMaxPriority: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Project = t.Composite([ProjectPlain, ProjectRelations], {
  additionalProperties: false,
});

export const ProjectInputCreate = t.Composite(
  [ProjectPlainInputCreate, ProjectRelationsInputCreate],
  { additionalProperties: false },
);

export const ProjectInputUpdate = t.Composite(
  [ProjectPlainInputUpdate, ProjectRelationsInputUpdate],
  { additionalProperties: false },
);
