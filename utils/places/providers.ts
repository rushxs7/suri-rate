import axios from "axios";
import * as cheerio from "cheerio";
import { ExchangeRate } from "@/utils/definitions";

export async function getFinabankExchangeRates(): Promise<ExchangeRate[]> {
  const url = "https://www.finabanknv.com/service-desk/koersen-rates/";
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const rates: ExchangeRate[] = [];

  const text = $("body").text();

  const usdMatch = text.match(/USD GIRAAL\s+([\d.,]+)\s+([\d.,]+)/);
  const eurMatch = text.match(/EUR GIRAAL\s+([\d.,]+)\s+([\d.,]+)/);

  if (usdMatch) {
    rates.push({
      currency: "USD",
      buy: usdMatch[1].replace(",", "."),
      sell: usdMatch[2].replace(",", "."),
    });
  }

  if (eurMatch) {
    rates.push({
      currency: "EUR",
      buy: eurMatch[1].replace(",", "."),
      sell: eurMatch[2].replace(",", "."),
    });
  }

  return rates;
}

export async function getCBVSExchangeRates(): Promise<ExchangeRate[]> {
  const url = "https://www.cbvs.sr";
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const rates: ExchangeRate[] = [];

  $(".rate-info table")
    .find("tr")
    .each((_, row) => {
      const cells = $(row)
        .find("td")
        .map((_, td) => $(td).text().trim())
        .get();

      if (cells.length === 3 && (cells[0] === "USD" || cells[0] === "EUR")) {
        rates.push({
          currency: cells[0],
          buy: parseFloat(cells[1].replace(",", ".")).toFixed(2),
          sell: parseFloat(cells[2].replace(",", ".")).toFixed(2),
        });
      }
    });

  return rates;
}

export async function getCMEExchangeRates(): Promise<ExchangeRate[]> {
  const url =
    "https://www.cme.sr/Home/GetTodaysExchangeRates/?BusinessDate=2016-07-25";

  const { data } = await axios.post(url);

  const item = data?.[0];

  if (!item) throw new Error("No exchange rate data received from CME");

  return [
    {
      currency: "USD",
      buy: item.BuyUsdExchangeRate.toFixed(2),
      sell: item.SaleUsdExchangeRate.toFixed(2),
    },
    {
      currency: "EUR",
      buy: item.BuyEuroExchangeRate.toFixed(2),
      sell: item.SaleEuroExchangeRate.toFixed(2),
    },
  ];
}

export async function getHakrinbankExchangeRates(): Promise<ExchangeRate[]> {
  const url = "https://www.hakrinbank.com/en/private/foreign-exchange/";
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  let usdBuy = "";
  let usdSell = "";
  let eurBuy = "";
  let eurSell = "";

  $("table").each((_, table) => {
    const headers = $(table)
      .find("thead tr th")
      .map((_, th) => $(th).text().trim().toLowerCase())
      .get();
    if (
      headers.includes("foreign exchange") &&
      headers.includes("purchase") &&
      headers.includes("sale")
    ) {
      $(table)
        .find("tbody tr")
        .each((_, row) => {
          const cells = $(row)
            .find("td")
            .map((_, td) => $(td).text().trim())
            .get();
          const currency = cells[0]?.toUpperCase();
          const buy = cells[1];
          const sell = cells[2];

          if (currency === "USD") {
            usdBuy = parseFloat(buy).toFixed(2);
            usdSell = parseFloat(sell).toFixed(2);
          } else if (currency === "EURO" || currency === "EUR") {
            eurBuy = parseFloat(buy).toFixed(2);
            eurSell = parseFloat(sell).toFixed(2);
          }
        });
    }
  });

  if (!usdBuy || !usdSell || !eurBuy || !eurSell) {
    throw new Error("No exchange rate data found on Hakrinbank page");
  }

  return [
    { currency: "USD", buy: usdBuy, sell: usdSell },
    { currency: "EUR", buy: eurBuy, sell: eurSell },
  ];
}
