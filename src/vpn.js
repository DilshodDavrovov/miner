const { exec } = require('child_process');

/**
 * Подключение к VPN через Windows rasdial.
 * @param {Object} vpn - { profile, user, pass }
 * @returns {Promise<void>}
 */
function connectVPN(vpn) {
  return new Promise((resolve, reject) => {
    console.log(`Подключение к VPN: ${vpn.profile}...`);
    exec(`rasdial "${vpn.profile}" ${vpn.user} ${vpn.pass}`, (err) => {
      if (err) return reject(err);
      console.log(`Подключено: ${vpn.profile}`);
      resolve();
    });
  });
}

/**
 * Отключение от VPN по имени профиля.
 * @param {string} vpnProfile - имя профиля
 * @returns {Promise<void>}
 */
function disconnectVPN(vpnProfile) {
  return new Promise((resolve) => {
    exec(`rasdial "${vpnProfile}" /disconnect`, () => resolve());
  });
}

module.exports = {
  connectVPN,
  disconnectVPN,
};
