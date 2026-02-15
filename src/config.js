require('dotenv').config();

const MINER_PORT = Number(process.env.MINER_PORT) || 4028;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const VPN_PASSWORD = process.env.VPN_PASSWORD || '';

/**
 * Профили VPN из .env (VPN_PROFILES — JSON-массив).
 * У каждого профиля может быть свой pass; если нет — используется VPN_PASSWORD.
 */
function parseVpnProfiles() {
  const raw = process.env.VPN_PROFILES;
  if (!raw || !raw.trim()) {
    return [];
  }
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (p) => p && p.profile && p.ipStart && p.ipEnd
    );
  } catch {
    return [];
  }
}

const vpnProfiles = parseVpnProfiles();
if (vpnProfiles.length === 0) {
  console.warn('Предупреждение: VPN_PROFILES в .env пуст или невалиден. Сканирование не будет выполнено.');
}
const vpns = vpnProfiles.map((v) => ({
  profile: v.profile,
  user: v.user || 'sstp',
  ipStart: v.ipStart,
  ipEnd: v.ipEnd,
  pass: v.pass ?? VPN_PASSWORD,
}));

module.exports = {
  MINER_PORT,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  vpns,
};
