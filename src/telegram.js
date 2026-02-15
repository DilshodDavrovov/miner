const { Telegraf } = require('telegraf');
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = require('./config');
const fs = require('fs');

let bot = null;

/**
 * Инициализация бота (ленивая).
 * @returns {Telegraf}
 */
function getBot() {
  if (!bot) {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');
    }
    bot = new Telegraf(TELEGRAM_BOT_TOKEN);
  }
  return bot;
}

/**
 * Отправка файла в Telegram с подписью.
 * @param {string} filePath - путь к файлу
 * @param {string} caption - подпись к файлу
 * @returns {Promise<void>}
 */
async function sendDocument(filePath, caption) {
  const chatId = TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error('TELEGRAM_CHAT_ID не задан в .env');
  }

  const telegram = getBot().telegram;
  const filename = filePath.split(/[/\\]/).pop() || 'miner_report.xlsx';
  await telegram.sendDocument(
    chatId,
    { source: fs.createReadStream(filePath), filename },
    { caption }
  );
}

module.exports = {
  getBot,
  sendDocument,
};
