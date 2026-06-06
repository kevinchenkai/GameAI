import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { runMigrations } from './migrations.js';

let database = null;
let initError = null;

export function initDatabase() {
  if (!config.memory.enabled) {
    return { ok: true, enabled: false, status: 'disabled' };
  }

  if (database) {
    return { ok: true, enabled: true, status: 'ok' };
  }

  try {
    fs.mkdirSync(path.dirname(config.db.path), { recursive: true });
    database = new DatabaseSync(config.db.path);
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('PRAGMA busy_timeout = 5000');
    database.exec('PRAGMA journal_mode = WAL');
    runMigrations(database);
    initError = null;
    return { ok: true, enabled: true, status: 'ok' };
  } catch (error) {
    initError = error;
    database = null;
    return {
      ok: false,
      enabled: true,
      status: 'error',
      error: error.message
    };
  }
}

export function getDatabase() {
  const result = initDatabase();
  if (!result.ok || !database) {
    throw initError || new Error('Database is unavailable');
  }
  return database;
}

export function getDatabaseHealth() {
  if (!config.memory.enabled) {
    return { ok: true, status: 'disabled' };
  }

  try {
    const db = getDatabase();
    const migrationCount = db
      .prepare('SELECT COUNT(*) AS count FROM schema_migrations')
      .get().count;
    return {
      ok: true,
      status: 'ok',
      migrations: Number(migrationCount)
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      error: error.message
    };
  }
}
