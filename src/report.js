const { vpns, MINER_PORT } = require('./config');
const { connectVPN, disconnectVPN } = require('./vpn');
const { generateIps } = require('./ipUtils');
const { queryMiner } = require('./miner');
const { parseSummary, emptyMinerRecord } = require('./parser');
const { createExcelReport } = require('./excel');
const { sendDocument } = require('./telegram');

/**
 * Сводные метрики по отчёту.
 * @param {Array<Object>} report
 * @returns {{ totalHash: number, totalPower: number, maxTemp: string, offlineCount: number }}
 */
function getSummaryMetrics(report) {
  const totalHash = report.reduce((sum, r) => sum + (r.hash_avg || 0), 0);
  const totalPower = report.reduce((sum, r) => sum + (r.power || 0), 0);
  const maxTemps = report.filter((r) => r.chip_temp_max != null).map((r) => r.chip_temp_max);
  const maxTemp = maxTemps.length ? Math.max(...maxTemps).toFixed(1) : '0';
  const offlineCount = report.filter((r) => r.hash_avg === 0).length;
  return { totalHash, totalPower, maxTemp, offlineCount };
}

/**
 * Формирование текста подписи для Telegram.
 * @param {Object} summary - результат getSummaryMetrics
 * @returns {string}
 */
function formatSummaryCaption(summary) {
  return [
    '📊 Miner Summary:',
    `Total Hash Avg: ${summary.totalHash.toFixed(2)}`,
    `Total Power: ${summary.totalPower.toFixed(2)} W`,
    `Max Chip Temp: ${summary.maxTemp}°C`,
    `Offline Miners: ${summary.offlineCount}`,
  ].join('\n');
}

/**
 * Сканирование одной VPN: подключение, обход IP, сбор данных, отключение.
 * @param {Object} vpn
 * @returns {Promise<Array<Object>>} - массив записей по майнерам
 */
async function scanVpn(vpn) {
  const report = [];
  await connectVPN(vpn);
  const ips = generateIps(vpn.ipStart, vpn.ipEnd);
  console.log(`Сканирование ${ips.length} IP в VPN ${vpn.profile}...`);

  for (const ip of ips) {
    const res = await queryMiner(ip, 'summary', MINER_PORT);
    const parsed = parseSummary(res.data);
    if (parsed) {
      report.push({ ip, vpn: vpn.profile, ...parsed });
    } else {
      report.push({ ip, vpn: vpn.profile, ...emptyMinerRecord() });
    }
  }

  await disconnectVPN(vpn.profile);
  return report;
}

/**
 * Главный процесс: обход всех VPN, Excel, отправка в Telegram.
 * @returns {Promise<void>}
 */
async function runFullReport() {
  const report = [];

  for (const vpn of vpns) {
    try {
      const rows = await scanVpn(vpn);
      report.push(...rows);
    } catch (err) {
      console.error(`Ошибка VPN ${vpn.profile}:`, err.message);
    }
  }

  const filePath = await createExcelReport(report);
  const summary = getSummaryMetrics(report);
  const caption = formatSummaryCaption(summary);

  await sendDocument(filePath, caption);
  console.log('✅ Отчёт отправлен в Telegram.');
}

module.exports = {
  getSummaryMetrics,
  formatSummaryCaption,
  scanVpn,
  runFullReport,
};
