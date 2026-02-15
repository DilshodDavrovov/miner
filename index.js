const { runFullReport } = require('./src/report');

(async () => {
  try {
    await runFullReport();
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
})();
