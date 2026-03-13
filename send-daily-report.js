/**
 * Немедленная отправка ежедневного отчёта в Telegram (для тестирования).
 * Запуск: npm run send-report
 */
require('dotenv').config();
const { initDb, closeDb } = require('./src/database');
const { sendDailyReport } = require('./src/scheduler');

(async () => {
  try {
    await initDb();
    await sendDailyReport();
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  } finally {
    closeDb();
  }
})();
