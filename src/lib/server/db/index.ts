import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export const getDb = (d1: D1Database) => drizzle(d1, { schema });

/**
 * The database type used everywhere, including `App.Locals`. There is no global
 * singleton — the Worker model forbids one, so every query takes this first.
 */
export type Database = ReturnType<typeof getDb>;
