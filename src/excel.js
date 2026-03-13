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

const DAILY_REPORT_FILENAME = 'miner_daily_report.xlsx';

const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/**
 * Форматирование даты: "13 марта 2026 г."
 */
function formatDateRu(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y} г.`;
}

/**
 * Создание месячного отчёта по майнерам (для отправки в Telegram).
 * Заголовок, таблица по IP, итоги.
 *
 * @param {Array<{ip: string, hours: number, hash_mh: number, power_wh: number}>} aggregates - агрегаты по IP
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @returns {Promise<string>} - путь к файлу
 */
async function createMonthlyReportByIp(aggregates, dateFrom, dateTo) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Отчёт по майнингу');

  const title = `Отчет по майнингу за ${formatDateRu(dateFrom)} по ${formatDateRu(dateTo)}`;
  sheet.addRow([title]);
  sheet.mergeCells('A1:E1');
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.addRow([]);

  sheet.addRow(['IP адрес', 'Часы работы', 'Выработка gHASH', 'Потребление kW']);
  sheet.getRow(3).font = { bold: true };

  let totalHours = 0;
  let totalHashMh = 0;
  let totalPowerWh = 0;

  for (const row of aggregates) {
    const hours = Number(row.hours.toFixed(2));
    const hashGh = Number((row.hash_mh / 1000).toFixed(2));
    const powerKwh = Number((row.power_wh / 1000).toFixed(2));
    sheet.addRow([row.ip, hours, hashGh, powerKwh]);
    totalHours += row.hours;
    totalHashMh += row.hash_mh;
    totalPowerWh += row.power_wh;
  }

  sheet.addRow([]);
  sheet.addRow([
    'Итого:',
    `Оборудований: ${aggregates.length}`,
    `Часов: ${totalHours.toFixed(2)}`,
    `gHASH: ${(totalHashMh / 1000).toFixed(2)}`,
    `Потребление (кВт·ч): ${(totalPowerWh / 1000).toFixed(2)}`,
  ]);
  sheet.getRow(sheet.rowCount).font = { bold: true };

  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 18;

  await workbook.xlsx.writeFile(DAILY_REPORT_FILENAME);
  return DAILY_REPORT_FILENAME;
}

module.exports = {
  createExcelReport,
  createDailyCumulativeReport: createMonthlyReportByIp,
  createMonthlyReportByIp,
  REPORT_FILENAME,
  DAILY_REPORT_FILENAME,
};
