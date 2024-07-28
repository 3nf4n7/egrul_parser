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

  try {
    await page.waitForSelector(".res-row", { timeout: 10000 });
  } catch {
    return [];
  }

  const results = [];

  let isSinglePage = false;

  const selector = ".page-nav li:nth-last-child(2) a";
  let dataPageValue = 1;
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    dataPageValue = await page.$eval(selector, (el) =>
      el.getAttribute("data-page")
    );
  } catch {
    isSinglePage = true;
  }

  for (let i = 0; i < dataPageValue; i++) {
    const searchRes = await page.$$(".res-row");
    for (const res of searchRes) {
      // Получение описания
      const description = await res.$eval(".res-text", (el) => el.innerText);

      // Клик по ссылке для скачивания
      const link = await res.$("a.op-excerpt");
      if (link) {
        // Запоминаем описание и заголовок до начала загрузки
        const title = await link.textContent();
        results.push({ title, description });

        await link.click();

        // Добавляем небольшую задержку между кликами, чтобы предотвратить перегрузку событий загрузки
        await page.waitForTimeout(1000);
      }
    }

    if (isSinglePage) break;

    await page.click(".lnk-page.lnk-page-next");

    try {
      await page.waitForSelector(".blockUI.blockMsg.blockPage", {
        state: "hidden",
        timeout: 5000,
      });
    } catch {
      return [];
    }
  }

  // Ожидание завершения всех загрузок
  await page.waitForTimeout(5000);

  await browser.close();
  return results;
};

module.exports = parseEgrulNalog;
