const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_memory_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL,
        session_id TEXT NOT NULL DEFAULT 'default',
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        text TEXT NOT NULL,
        mood TEXT,
        heart_score INTEGER,
        intimacy TEXT,
        source TEXT,
        client_time TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_uid_created_at ON chat_messages(uid, created_at);

      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT,
        level TEXT NOT NULL CHECK (level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        normalized_text TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL DEFAULT '[]',
        source TEXT NOT NULL DEFAULT 'manual',
        source_message_ids_json TEXT NOT NULL DEFAULT '[]',
        confidence REAL NOT NULL DEFAULT 1.0,
        importance INTEGER NOT NULL DEFAULT 5,
        durability INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived', 'rejected')),
        pinned INTEGER NOT NULL DEFAULT 0,
        use_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_level ON memories(level);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_uid_status ON memories(uid, status);
      CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at);

      CREATE TABLE IF NOT EXISTS memory_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_memory_id INTEGER NOT NULL,
        to_memory_id INTEGER NOT NULL,
        relation TEXT NOT NULL CHECK (relation IN ('duplicate', 'updates', 'conflicts', 'supports')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT,
        type TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        rule TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_corrections_enabled ON corrections(enabled);
      CREATE INDEX IF NOT EXISTS idx_corrections_uid_enabled ON corrections(uid, enabled);

      CREATE TABLE IF NOT EXISTS conversation_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL,
        session_id TEXT NOT NULL DEFAULT 'default',
        scope TEXT NOT NULL,
        start_message_id INTEGER,
        end_message_id INTEGER,
        summary TEXT NOT NULL,
        facts_json TEXT NOT NULL DEFAULT '[]',
        mood_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_id ON conversation_summaries(session_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_summaries_uid ON conversation_summaries(uid);

      CREATE TABLE IF NOT EXISTS memory_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_type TEXT NOT NULL CHECK (job_type IN ('extract', 'compress')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed')),
        input_json TEXT NOT NULL,
        output_json TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  },
  {
    version: 2,
    name: 'add_uid_identity_scope',
    up(db) {
      if (!hasColumn(db, 'chat_messages', 'uid')) {
        db.exec(`
          ALTER TABLE chat_messages RENAME TO chat_messages_old;

          CREATE TABLE chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL,
            session_id TEXT NOT NULL DEFAULT 'default',
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            text TEXT NOT NULL,
            mood TEXT,
            heart_score INTEGER,
            intimacy TEXT,
            source TEXT,
            client_time TEXT,
            created_at TEXT NOT NULL
          );

          INSERT INTO chat_messages (
            id, uid, session_id, role, text, mood, heart_score, intimacy, source, client_time, created_at
          )
          SELECT
            id,
            COALESCE(NULLIF(session_id, ''), 'legacy'),
            session_id,
            role,
            text,
            mood,
            heart_score,
            intimacy,
            source,
            client_time,
            created_at
          FROM chat_messages_old;

          DROP TABLE chat_messages_old;
        `);
      }

      if (!hasColumn(db, 'memories', 'uid')) {
        db.exec('ALTER TABLE memories ADD COLUMN uid TEXT;');
      }

      if (!hasColumn(db, 'corrections', 'uid')) {
        db.exec('ALTER TABLE corrections ADD COLUMN uid TEXT;');
      }

      if (!hasColumn(db, 'conversation_summaries', 'uid')) {
        db.exec(`
          ALTER TABLE conversation_summaries RENAME TO conversation_summaries_old;

          CREATE TABLE conversation_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL,
            session_id TEXT NOT NULL DEFAULT 'default',
            scope TEXT NOT NULL,
            start_message_id INTEGER,
            end_message_id INTEGER,
            summary TEXT NOT NULL,
            facts_json TEXT NOT NULL DEFAULT '[]',
            mood_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          INSERT INTO conversation_summaries (
            id, uid, session_id, scope, start_message_id, end_message_id,
            summary, facts_json, mood_json, created_at, updated_at
          )
          SELECT
            id,
            COALESCE(NULLIF(session_id, ''), 'legacy'),
            session_id,
            scope,
            start_message_id,
            end_message_id,
            summary,
            facts_json,
            mood_json,
            created_at,
            updated_at
          FROM conversation_summaries_old;

          DROP TABLE conversation_summaries_old;
        `);
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_uid_created_at ON chat_messages(uid, created_at);
        CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
        CREATE INDEX IF NOT EXISTS idx_memories_level ON memories(level);
        CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
        CREATE INDEX IF NOT EXISTS idx_memories_uid_status ON memories(uid, status);
        CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at);
        CREATE INDEX IF NOT EXISTS idx_corrections_enabled ON corrections(enabled);
        CREATE INDEX IF NOT EXISTS idx_corrections_uid_enabled ON corrections(uid, enabled);
        CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_id ON conversation_summaries(session_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_summaries_uid ON conversation_summaries(uid);
      `);
    }
  }
];

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => Number(row.version))
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    db.exec('BEGIN');
    try {
      if (typeof migration.up === 'function') {
        migration.up(db);
      } else {
        db.exec(migration.sql);
      }
      db
        .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

function hasColumn(db, table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => row.name === column);
}
