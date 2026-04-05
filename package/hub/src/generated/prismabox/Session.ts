import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const SessionPlain = t.Object(
  {
    id: t.String(),
    token: t.String(),
    userId: t.String(),
    expiresAt: t.Date(),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const SessionRelations = t.Object(
  {
    user: t.Object(
      {
        id: t.String(),
        isRoot: t.Boolean(),
        passwordHash: __nullable__(t.String()),
        createdAt: t.Date(),
        createdBy: __nullable__(t.String()),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const SessionPlainInputCreate = t.Object(
  { token: t.String(), expiresAt: t.Date() },
  { additionalProperties: false },
);

export const SessionPlainInputUpdate = t.Object(
  { token: t.Optional(t.String()), expiresAt: t.Optional(t.Date()) },
  { additionalProperties: false },
);

export const SessionRelationsInputCreate = t.Object(
  {
    user: t.Object(
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

export const SessionRelationsInputUpdate = t.Partial(
  t.Object(
    {
      user: t.Object(
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

export const SessionWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          token: t.String(),
          userId: t.String(),
          expiresAt: t.Date(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Session" },
  ),
);

export const SessionWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String(), token: t.String() },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [t.Object({ id: t.String() }), t.Object({ token: t.String() })],
          { additionalProperties: false },
        ),
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
              token: t.String(),
              userId: t.String(),
              expiresAt: t.Date(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Session" },
);

export const SessionSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      token: t.Boolean(),
      userId: t.Boolean(),
      expiresAt: t.Boolean(),
      createdAt: t.Boolean(),
      user: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const SessionInclude = t.Partial(
  t.Object(
    { user: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const SessionOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      token: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      userId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      expiresAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Session = t.Composite([SessionPlain, SessionRelations], {
  additionalProperties: false,
});

export const SessionInputCreate = t.Composite(
  [SessionPlainInputCreate, SessionRelationsInputCreate],
  { additionalProperties: false },
);

export const SessionInputUpdate = t.Composite(
  [SessionPlainInputUpdate, SessionRelationsInputUpdate],
  { additionalProperties: false },
);
