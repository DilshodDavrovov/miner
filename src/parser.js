/**
 * Парсинг ответа summary от майнера.
 * @param {string|null} raw - сырой ответ API
 * @returns {Object|null} - объект с полями или null при ошибке
 */
function parseSummary(raw) {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw);
    const msg = json.Msg || {};
    return {
      hash_1m: msg['MHS 1m'] ?? 0,
      hash_15m: msg['MHS 15m'] ?? 0,
      hash_avg: msg['MHS av'] ?? 0,
      chip_temp_min: msg['Chip Temp Min'] ?? 0,
      chip_temp_max: msg['Chip Temp Max'] ?? 0,
      chip_temp_avg: msg['Chip Temp Avg'] ?? 0,
      power: msg['Power'] ?? 0,
      hash_stable: msg['Hash Stable'] ?? false,
      pool_reject: msg['Pool Rejected%'] ?? 0,
      uptime: msg['Uptime'] ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Форматирование uptime (секунды) в читаемый вид.
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

/**
 * Пустая запись майнера (оффлайн/нет ответа).
 * @returns {Object}
 */
function emptyMinerRecord() {
  return {
    hash_1m: 0,
    hash_15m: 0,
    hash_avg: 0,
    chip_temp_min: 0,
    chip_temp_max: 0,
    chip_temp_avg: 0,
    power: 0,
    hash_stable: false,
    pool_reject: 0,
    uptime: 0,
  };
}

module.exports = {
  parseSummary,
  formatUptime,
  emptyMinerRecord,
};
