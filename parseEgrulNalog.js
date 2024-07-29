const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const parseEgrulNalog = async (query) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

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
      const description = await res.$eval(".res-text", (el) => el.innerText);

      const link = await res.$("a.op-excerpt");
      if (link) {
        const title = await link.textContent();
        results.push({ title, description });
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

  await browser.close();
  return results;
};

async function egrulDownload(query) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let filePath;

  await page.goto("https://egrul.nalog.ru/index.html");

  await page.fill("input[name='query']", query);
  await page.click('button[type="submit"]');

  try {
    await page.waitForSelector(".res-row", { timeout: 10000 });
  } catch {
    return [];
  }

  const searchRes = await page.$$(".res-row");
  const res = searchRes[0];

  const link = await res.$("a.op-excerpt");
  if (link) {
    await link.click();
  }

  page.on("download", async (download) => {
    filePath = path.resolve(
      __dirname,
      "egrulPdf",
      download.suggestedFilename()
    );
    console.log(`Скачивание файла в ${filePath}`);

    await download.saveAs(filePath);
    console.log("Файл успешно загружен и сохранен");
  });

  await page.waitForTimeout(5000);

  await browser.close();
  return filePath;
}

module.exports = { parseEgrulNalog, egrulDownload };
