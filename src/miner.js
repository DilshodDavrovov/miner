const net = require('net');

/**
 * Запрос к API майнера по TCP (порт 4028).
 * @param {string} ip - IP майнера
 * @param {string} cmd - команда API (по умолчанию 'summary')
 * @param {number} port - порт майнера
 * @param {number} timeoutMs - таймаут в мс
 * @returns {Promise<{ ip: string, data: string|null }>}
 */
function queryMiner(ip, cmd = 'summary', port, timeoutMs = 100) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let data = '';

    client.setTimeout(timeoutMs);

    client.connect(port, ip, () => {
      client.write(JSON.stringify({ cmd }));
    });

    client.on('data', (chunk) => (data += chunk.toString()));
    client.on('close', () => resolve({ ip, data }));
    client.on('error', () => resolve({ ip, data: null }));
    client.on('timeout', () => {
      client.destroy();
      resolve({ ip, data: null });
    });
  });
}

module.exports = {
  queryMiner,
};
