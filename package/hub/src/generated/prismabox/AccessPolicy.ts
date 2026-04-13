import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const AccessPolicyPlain = t.Object(
  {
    id: t.String(),
    issPattern: t.String(),
    claimField: t.String(),
    claimPattern: t.String(),
    projectScope: __nullable__(t.String()),
    createdBy: t.String(),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const AccessPolicyRelations = t.Object(
  {},
  { additionalProperties: false },
);

export const AccessPolicyPlainInputCreate = t.Object(
  {
    issPattern: t.String(),
    claimField: t.String(),
    claimPattern: t.String(),
    projectScope: t.Optional(__nullable__(t.String())),
    createdBy: t.String(),
  },
  { additionalProperties: false },
);

export const AccessPolicyPlainInputUpdate = t.Object(
  {
    issPattern: t.Optional(t.String()),
    claimField: t.Optional(t.String()),
    claimPattern: t.Optional(t.String()),
    projectScope: t.Optional(__nullable__(t.String())),
    createdBy: t.Optional(t.String()),
  },
  { additionalProperties: false },
);

export const AccessPolicyRelationsInputCreate = t.Object(
  {},
  { additionalProperties: false },
);

export const AccessPolicyRelationsInputUpdate = t.Partial(
  t.Object({}, { additionalProperties: false }),
);

export const AccessPolicyWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          issPattern: t.String(),
          claimField: t.String(),
          claimPattern: t.String(),
          projectScope: t.String(),
          createdBy: t.String(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "AccessPolicy" },
  ),
);

export const AccessPolicyWhereUnique = t.Recursive(
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
              issPattern: t.String(),
              claimField: t.String(),
              claimPattern: t.String(),
              projectScope: t.String(),
              createdBy: t.String(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "AccessPolicy" },
);

export const AccessPolicySelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      issPattern: t.Boolean(),
      claimField: t.Boolean(),
      claimPattern: t.Boolean(),
      projectScope: t.Boolean(),
      createdBy: t.Boolean(),
      createdAt: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const AccessPolicyInclude = t.Partial(
  t.Object({ _count: t.Boolean() }, { additionalProperties: false }),
);

export const AccessPolicyOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      issPattern: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      claimField: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      claimPattern: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      projectScope: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdBy: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const AccessPolicy = t.Composite(
  [AccessPolicyPlain, AccessPolicyRelations],
  { additionalProperties: false },
);

export const AccessPolicyInputCreate = t.Composite(
  [AccessPolicyPlainInputCreate, AccessPolicyRelationsInputCreate],
  { additionalProperties: false },
);

export const AccessPolicyInputUpdate = t.Composite(
  [AccessPolicyPlainInputUpdate, AccessPolicyRelationsInputUpdate],
  { additionalProperties: false },
);
