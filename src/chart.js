const https = require('https');

const CHART_FILENAME = 'miner_chart.png';
const fs = require('fs');

/**
 * Форматирование даты "13 мар" для подписей на графике.
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {string}
 */
function shortDate(isoDate) {
  const [, m, d] = isoDate.split('-').map(Number);
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d} ${months[m - 1]}`;
}

/**
 * Запрос к QuickChart.io и получение PNG в виде Buffer.
 * @param {Object} chartConfig - Chart.js конфиг
 * @returns {Promise<Buffer>}
 */
function fetchChartPng(chartConfig) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      version: 3,
      chart: chartConfig,
      width: 900,
      height: 500,
      devicePixelRatio: 1.5,
      format: 'png',
      backgroundColor: 'white',
    });

    const options = {
      hostname: 'quickchart.io',
      path: '/chart',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`QuickChart вернул статус ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Генерация графика тенденций по дням и сохранение в PNG файл.
 *
 * @param {Array<{day: string, hash_mh: number, power_wh: number, active_miners: number}>} dailyRows
 * @returns {Promise<string>} - путь к PNG файлу
 */
async function generateDailyChart(dailyRows) {
  const labels = dailyRows.map((r) => shortDate(r.day));
  const hashValues = dailyRows.map((r) => Number((r.hash_mh / 1000).toFixed(2)));
  const powerValues = dailyRows.map((r) => Number((r.power_wh / 1000).toFixed(2)));
  const minerCounts = dailyRows.map((r) => Number(r.active_miners));

  // Chart.js v3 синтаксис (version: 3 передаётся в QuickChart)
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'gHASH',
          data: hashValues,
          yAxisID: 'yHash',
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          order: 3,
        },
        {
          type: 'line',
          label: 'Потребление (кВт·ч)',
          data: powerValues,
          yAxisID: 'yPower',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
          tension: 0.3,
          order: 2,
        },
        {
          type: 'line',
          label: 'Активных майнеров',
          data: minerCounts,
          yAxisID: 'yMiners',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
          tension: 0.3,
          order: 1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Тенденция работы майнеров по дням',
        },
        legend: { position: 'top' },
      },
      scales: {
        yHash: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'gHASH' },
          grid: { drawOnChartArea: true },
        },
        yPower: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'кВт·ч' },
          grid: { drawOnChartArea: false },
        },
        yMiners: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Майнеров' },
          grid: { drawOnChartArea: false },
        },
      },
    },
  };

  const buf = await fetchChartPng(chartConfig);
  fs.writeFileSync(CHART_FILENAME, buf);
  return CHART_FILENAME;
}

module.exports = { generateDailyChart, CHART_FILENAME };
