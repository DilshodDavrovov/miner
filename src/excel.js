const ExcelJS = require('exceljs');
const { formatUptime } = require('./parser');

const REPORT_FILENAME = 'miner_report.xlsx';

const COLUMNS = [
  { header: 'IP', key: 'ip', width: 15 },
  { header: 'VPN', key: 'vpn', width: 15 },
  { header: 'Hash 1m', key: 'hash_1m', width: 12 },
  { header: 'Hash 15m', key: 'hash_15m', width: 12 },
  { header: 'Hash Avg', key: 'hash_avg', width: 12 },
  { header: 'Chip Temp Min', key: 'chip_temp_min', width: 15 },
  { header: 'Chip Temp Max', key: 'chip_temp_max', width: 15 },
  { header: 'Chip Temp Avg', key: 'chip_temp_avg', width: 15 },
  { header: 'Power (W)', key: 'power', width: 12 },
  { header: 'Hash Stable', key: 'hash_stable', width: 12 },
  { header: 'Pool Reject %', key: 'pool_reject', width: 15 },
  { header: 'Uptime', key: 'uptime', width: 15 },
];

/**
 * Создание Excel-отчёта по списку записей майнеров.
 * @param {Array<Object>} report - массив записей { ip, vpn, hash_1m, ... }
 * @returns {Promise<string>} - путь к сохранённому файлу
 */
async function createExcelReport(report) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Miner Report');
  sheet.columns = COLUMNS;

  for (const row of report) {
    sheet.addRow({
      ip: row.ip,
      vpn: row.vpn,
      hash_1m: row.hash_1m,
      hash_15m: row.hash_15m,
      hash_avg: row.hash_avg,
      chip_temp_min: row.chip_temp_min,
      chip_temp_max: row.chip_temp_max,
      chip_temp_avg: row.chip_temp_avg,
      power: row.power,
      hash_stable: row.hash_stable,
      pool_reject: row.pool_reject,
      uptime: formatUptime(row.uptime),
    });
  }

  await workbook.xlsx.writeFile(REPORT_FILENAME);
  return REPORT_FILENAME;
}

module.exports = {
  createExcelReport,
};
