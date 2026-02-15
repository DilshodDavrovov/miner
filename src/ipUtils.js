/**
 * Преобразование IP-адреса в число для сравнения и итерации.
 * @param {string} ip - адрес вида "192.168.1.1"
 * @returns {number}
 */
function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

/**
 * Преобразование числа обратно в IP.
 * @param {number} num
 * @returns {string}
 */
function numberToIp(num) {
  return [
    (num >> 24) & 0xff,
    (num >> 16) & 0xff,
    (num >> 8) & 0xff,
    num & 0xff,
  ].join('.');
}

/**
 * Генерация списка IP в диапазоне [start, end] включительно.
 * @param {string} start - начальный IP
 * @param {string} end - конечный IP
 * @returns {string[]}
 */
function generateIps(start, end) {
  const ips = [];
  let startNum = ipToNumber(start);
  const endNum = ipToNumber(end);
  for (; startNum <= endNum; startNum++) {
    ips.push(numberToIp(startNum));
  }
  return ips;
}

module.exports = {
  ipToNumber,
  numberToIp,
  generateIps,
};
