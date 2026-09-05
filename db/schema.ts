import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  profile: text('profile').notNull(),
  demo: integer('demo').notNull().default(0),
});
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    password: text('password').notNull(),
    recovery: text('recovery'),
    status: text('status').notNull().default('Active'),
    details: text('details').notNull().default('{}'),
  },
  (t) => [
    uniqueIndex('users_email').on(t.email),
    index('users_org').on(t.organizationId),
  ],
);
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expires: integer('expires').notNull(),
});
export const records = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    kind: text('kind').notNull(),
    parentId: text('parent_id'),
    ownerId: text('owner_id'),
    reviewerId: text('reviewer_id'),
    status: text('status').notNull(),
    data: text('data').notNull(),
    updated: text('updated').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    index('records_org_kind').on(t.organizationId, t.kind),
    index('records_parent').on(t.parentId),
  ],
);
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  recordId: text('record_id'),
  name: text('name').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  category: text('category').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  created: text('created').notNull(),
  version: integer('version').notNull().default(1),
});
export const attempts = sqliteTable('attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  until: integer('until').notNull(),
});
