const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'miner_data.db');

let db = null;
let SQL = null;

/**
 * Инициализация БД (асинхронно).
 * @returns {Promise<import('sql.js').Database>}
 */
async function initDb() {
  if (db) return db;
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS miner_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      ip TEXT NOT NULL,
      vpn TEXT NOT NULL,
      hash_1m REAL DEFAULT 0,
      hash_15m REAL DEFAULT 0,
      hash_avg REAL DEFAULT 0,
      power REAL DEFAULT 0,
      uptime INTEGER DEFAULT 0
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON miner_snapshots(timestamp)`);
  saveDb();
  return db;
}

/**
 * Сохранение БД в файл.
 */
function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

/**
 * Получение уже инициализированной БД (вызывать после initDb).
 */
function getDb() {
  return db;
}

/**
 * Сохранение снимка майнера в БД.
 * @param {Object} record - { ip, vpn, hash_1m, hash_15m, hash_avg, power, uptime }
 */
function insertSnapshot(record) {
  if (!db) throw new Error('БД не инициализирована. Вызовите initDb().');
  const now = Date.now();
  db.run(
    `INSERT INTO miner_snapshots (timestamp, ip, vpn, hash_1m, hash_15m, hash_avg, power, uptime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      now,
      record.ip || '',
      record.vpn || '',
      record.hash_1m ?? 0,
      record.hash_15m ?? 0,
      record.hash_avg ?? 0,
      record.power ?? 0,
      record.uptime ?? 0,
    ]
  );
  saveDb();
}

/**
 * Сохранение массива снимков (пакетная вставка).
 * @param {Array<Object>} records - массив записей { ip, vpn, hash_1m, ... }
 */
function insertSnapshots(records) {
  if (!db) throw new Error('БД не инициализирована. Вызовите initDb().');
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO miner_snapshots (timestamp, ip, vpn, hash_1m, hash_15m, hash_avg, power, uptime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const r of records) {
    stmt.run([
      now,
      r.ip || '',
      r.vpn || '',
      r.hash_1m ?? 0,
      r.hash_15m ?? 0,
      r.hash_avg ?? 0,
      r.power ?? 0,
      r.uptime ?? 0,
    ]);
  }
  stmt.free();
  saveDb();
}

/**
 * Получение агрегированных данных по дням за период.
 * Часы работы = количество интервалов по 15 мин, когда hash_avg > 0, * 0.25
 * Выработка Hash = сумма (hash_avg * 0.25) в MH·h
 * Потребление = сумма (power * 0.25) в Wh
 *
 * @param {string} dateFrom - дата начала (YYYY-MM-DD)
 * @param {string} dateTo - дата окончания (YYYY-MM-DD)
 * @returns {Array<{day: string, hours: number, hash_mh: number, power_wh: number}>}
 */
function getDailyAggregates(dateFrom, dateTo) {
  if (!db) throw new Error('БД не инициализирована. Вызовите initDb().');
  const stmt = db.prepare(`
    SELECT
      strftime('%Y-%m-%d', timestamp/1000, 'unixepoch', 'localtime') AS day,
      SUM(CASE WHEN hash_avg > 0 THEN 0.25 ELSE 0 END) AS hours,
      SUM(hash_avg * 0.25) AS hash_mh,
      SUM(power * 0.25) AS power_wh,
      COUNT(DISTINCT CASE WHEN hash_avg > 0 THEN ip END) AS active_miners
    FROM miner_snapshots
    WHERE strftime('%Y-%m-%d', timestamp/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
    GROUP BY day
    ORDER BY day ASC
  `);
  stmt.bind([dateFrom, dateTo]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Агрегаты по каждому IP за период. Только майнеры с hash_avg > 0 хотя бы раз.
 * @param {string} dateFrom - дата начала (YYYY-MM-DD)
 * @param {string} dateTo - дата окончания (YYYY-MM-DD)
 * @returns {Array<{ip: string, hours: number, hash_mh: number, power_wh: number}>}
 */
function getMonthlyAggregatesByIp(dateFrom, dateTo) {
  if (!db) throw new Error('БД не инициализирована. Вызовите initDb().');
  const stmt = db.prepare(`
    SELECT
      ip,
      SUM(CASE WHEN hash_avg > 0 THEN 0.25 ELSE 0 END) AS hours,
      SUM(hash_avg * 0.25) AS hash_mh,
      SUM(power * 0.25) AS power_wh
    FROM miner_snapshots
    WHERE strftime('%Y-%m-%d', timestamp/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
    GROUP BY ip
    HAVING SUM(hash_avg) > 0
    ORDER BY ip ASC
  `);
  stmt.bind([dateFrom, dateTo]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Закрытие соединения с БД.
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDb,
  getDb,
  insertSnapshot,
  insertSnapshots,
  getDailyAggregates,
  getMonthlyAggregatesByIp,
  closeDb,
  DB_PATH,
};
