import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id)
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const todos = sqliteTable('todos', {
    id: text('id').primaryKey(), // using random UUID manually or ulid
    user_id: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    notes: text('notes'),
    priority: text('priority'),
    is_completed: integer('is_completed', { mode: 'boolean' }).default(false).notNull(),
    accumulated_time: integer('accumulated_time').default(0).notNull(),
    last_start_time: integer('last_start_time', { mode: 'timestamp' }),
    position: integer('position').default(0).notNull(),
    due_at: integer('due_at', { mode: 'timestamp' }),
    estimated_time: integer('estimated_time'),
    completed_at: integer('completed_at', { mode: 'timestamp' }),
    recurrence: text('recurrence'), // JSON string
    start_at: integer('start_at', { mode: 'timestamp' }),
    end_at: integer('end_at', { mode: 'timestamp' }),
    tags: text('tags', { mode: 'json' }).$type<string[]>(), // Array stored as JSON
    subtasks: text('subtasks', { mode: 'json' }), // Array stored as JSON
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).notNull()
});
