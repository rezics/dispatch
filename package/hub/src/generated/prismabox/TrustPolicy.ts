import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TrustPolicyPlain = t.Object(
  {
    id: t.String(),
    issPattern: t.String(),
    claimField: t.String(),
    claimPattern: t.String(),
    permissions: t.Array(t.String(), { additionalProperties: false }),
    projectScope: __nullable__(t.String()),
    createdBy: t.String(),
    createdAt: t.Date(),
  },
  { additionalProperties: false },
);

export const TrustPolicyRelations = t.Object(
  {},
  { additionalProperties: false },
);

export const TrustPolicyPlainInputCreate = t.Object(
  {
    issPattern: t.String(),
    claimField: t.String(),
    claimPattern: t.String(),
    permissions: t.Array(t.String(), { additionalProperties: false }),
    projectScope: t.Optional(__nullable__(t.String())),
    createdBy: t.String(),
  },
  { additionalProperties: false },
);

export const TrustPolicyPlainInputUpdate = t.Object(
  {
    issPattern: t.Optional(t.String()),
    claimField: t.Optional(t.String()),
    claimPattern: t.Optional(t.String()),
    permissions: t.Optional(
      t.Array(t.String(), { additionalProperties: false }),
    ),
    projectScope: t.Optional(__nullable__(t.String())),
    createdBy: t.Optional(t.String()),
  },
  { additionalProperties: false },
);

export const TrustPolicyRelationsInputCreate = t.Object(
  {},
  { additionalProperties: false },
);

export const TrustPolicyRelationsInputUpdate = t.Partial(
  t.Object({}, { additionalProperties: false }),
);

export const TrustPolicyWhere = t.Partial(
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
          permissions: t.Array(t.String(), { additionalProperties: false }),
          projectScope: t.String(),
          createdBy: t.String(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "TrustPolicy" },
  ),
);

export const TrustPolicyWhereUnique = t.Recursive(
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
              permissions: t.Array(t.String(), { additionalProperties: false }),
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
  { $id: "TrustPolicy" },
);

export const TrustPolicySelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      issPattern: t.Boolean(),
      claimField: t.Boolean(),
      claimPattern: t.Boolean(),
      permissions: t.Boolean(),
      projectScope: t.Boolean(),
      createdBy: t.Boolean(),
      createdAt: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TrustPolicyInclude = t.Partial(
  t.Object({ _count: t.Boolean() }, { additionalProperties: false }),
);

export const TrustPolicyOrderBy = t.Partial(
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
      permissions: t.Union([t.Literal("asc"), t.Literal("desc")], {
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

export const TrustPolicy = t.Composite(
  [TrustPolicyPlain, TrustPolicyRelations],
  { additionalProperties: false },
);

export const TrustPolicyInputCreate = t.Composite(
  [TrustPolicyPlainInputCreate, TrustPolicyRelationsInputCreate],
  { additionalProperties: false },
);

export const TrustPolicyInputUpdate = t.Composite(
  [TrustPolicyPlainInputUpdate, TrustPolicyRelationsInputUpdate],
  { additionalProperties: false },
);
