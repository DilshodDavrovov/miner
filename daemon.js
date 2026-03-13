/**
 * Демон: сбор данных каждые 15 минут в SQLite,
 * ежедневный Excel-отчёт в Telegram в 10:00.
 *
 * Запуск: npm run daemon
 */
require('dotenv').config();
const { startScheduler } = require('./src/scheduler');

(async () => {
  await startScheduler();
})();

// Держим процесс активным
process.on('SIGINT', () => {
  const { closeDb } = require('./src/database');
  closeDb();
  process.exit(0);
});
