const cron = require('node-cron');
const { scanVpn } = require('./report');
const { vpns } = require('./config');
const { initDb, insertSnapshots, getMonthlyAggregatesByIp, getDailyAggregates } = require('./database');
const { createMonthlyReportByIp } = require('./excel');
const { sendDocument, sendPhoto } = require('./telegram');
const { generateDailyChart } = require('./chart');

let isCollecting = false;
let isSendingReport = false;

/**
 * Сбор данных по всем майнерам и сохранение в БД.
 */
async function collectAndSave() {
  if (isCollecting) {
    console.log('[Сбор данных] Пропуск: предыдущая задача ещё выполняется.');
    return;
  }
  isCollecting = true;
  try {
  const report = [];
  for (const vpn of vpns) {
    try {
      const rows = await scanVpn(vpn);
      report.push(...rows);
    } catch (err) {
      console.error(`Ошибка VPN ${vpn.profile}:`, err.message);
    }
  }

  if (report.length > 0) {
    const records = report.map((r) => ({
      ip: r.ip,
      vpn: r.vpn,
      hash_1m: r.hash_1m,
      hash_15m: r.hash_15m,
      hash_avg: r.hash_avg,
      power: r.power,
      uptime: r.uptime,
    }));
    insertSnapshots(records);
    console.log(`[${new Date().toISOString()}] Сохранено ${records.length} снимков майнеров в БД.`);
  }
  } finally {
    isCollecting = false;
  }
}

/**
 * Формирование и отправка ежедневного отчёта.
 * Данные с 1-го числа текущего месяца по вчера (нарастающим итогом).
 */
async function sendDailyReport() {
  if (isSendingReport) {
    console.log('[Ежедневный отчёт] Пропуск: предыдущая отправка ещё выполняется.');
    return;
  }
  isSendingReport = true;
  try {
  const toLocalDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateTo = toLocalDate(yesterday);

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateFrom = toLocalDate(firstOfMonth);

  const aggregates = getMonthlyAggregatesByIp(dateFrom, dateTo);
  const dailyRows = getDailyAggregates(dateFrom, dateTo);
  const filePath = await createMonthlyReportByIp(aggregates, dateFrom, dateTo);

  const totalHours = aggregates.reduce((sum, r) => sum + (r.hours || 0), 0);
  const totalHashGh = aggregates.reduce((sum, r) => sum + (r.hash_mh || 0), 0) / 1000;
  const totalPowerKwh = aggregates.reduce((sum, r) => sum + (r.power_wh || 0), 0) / 1000;

  const captionLines = [
    `📊 Отчёт по майнингу`,
    `Период: ${dateFrom} — ${dateTo}`,
  ];
  if (aggregates.length === 0) {
    captionLines.push('Нет данных за период.');
  } else {
    captionLines.push(`Майнеров в отчёте: ${aggregates.length}`);
    captionLines.push(`Часов работы: ${totalHours.toFixed(2)}`);
    captionLines.push(`gHASH: ${totalHashGh.toFixed(2)}`);
    captionLines.push(`Потребление (кВт·ч): ${totalPowerKwh.toFixed(2)}`);
  }
  const caption = captionLines.join('\n');

  await sendDocument(filePath, caption);

  if (dailyRows.length > 0) {
    try {
      const chartPath = await generateDailyChart(dailyRows);
      await sendPhoto(chartPath, `📈 Тенденция по дням: ${dateFrom} — ${dateTo}`);
    } catch (err) {
      console.error('Ошибка генерации/отправки графика:', err.message);
    }
  }

  console.log(`[${new Date().toISOString()}] Ежедневный отчёт отправлен в Telegram.`);
  } finally {
    isSendingReport = false;
  }
}

/**
 * Запуск планировщика:
 * - каждые 15 минут — сбор данных в БД;
 * - каждый день в 10:00 — отправка отчёта в Telegram.
 */
async function startScheduler() {
  await initDb();
  // Каждые 15 минут (в :00, :15, :30, :45)
  cron.schedule('0,15,30,45 * * * *', async () => {
    try {
      await collectAndSave();
    } catch (err) {
      console.error('Ошибка сбора данных:', err.message);
    }
  });

  // Каждый день в 10:00
  cron.schedule('0 10 * * *', async () => {
    try {
      await sendDailyReport();
    } catch (err) {
      console.error('Ошибка отправки ежедневного отчёта:', err.message);
    }
  });

  console.log('Планировщик запущен:');
  console.log('  - Сбор данных: каждые 15 минут');
  console.log('  - Ежедневный отчёт в Telegram: 10:00');
  console.log('  - Первый сбор данных выполняется сейчас...');
  try {
    await collectAndSave();
  } catch (err) {
    console.error('Ошибка первого сбора:', err.message);
  }
}

module.exports = {
  collectAndSave,
  sendDailyReport,
  startScheduler,
};
