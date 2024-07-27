const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const parseEgrulNalog = async (query) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("download", async (download) => {
    const filePath = path.resolve(
      __dirname,
      "egrulPdf",
      download.suggestedFilename()
    );
    console.log(`Скачивание файла в ${filePath}`);

    await download.saveAs(filePath);
    console.log("Файл успешно загружен и сохранен");

    results[results.length - 1].filePath = filePath;
  });

  await page.goto("https://egrul.nalog.ru/index.html");

  await page.fill("input[name='query']", query);
  await page.click('button[type="submit"]');

  await page.waitForSelector(".res-row");

  const results = [];

  const searchRes = await page.$$(".res-row");

  for (const res of searchRes) {
    // Получение описания
    const description = await res.$eval(".res-text", (el) => el.innerText);

    // Клик по ссылке для скачивания
    const link = await res.$("a.op-excerpt"); // Замените селектор на актуальный
    if (link) {
      // Запоминаем описание и заголовок до начала загрузки
      const title = await link.textContent();
      results.push({ title, description });

      await link.click();

      // Добавляем небольшую задержку между кликами, чтобы предотвратить перегрузку событий загрузки
      await page.waitForTimeout(1000);
    }
  }

  // Ожидание завершения всех загрузок (можно добавить дополнительную логику ожидания, если нужно)
  await page.waitForTimeout(5000);

  console.log(results);

  await browser.close();
  return results;
};

module.exports = parseEgrulNalog;
