import axios from "axios";
import crypto from "crypto";
import { chromium } from "playwright";

/* ─────────────────────────────────────────────────────────────
   1️⃣ Alibaba Official API
───────────────────────────────────────────────────────────── */
let lastScrapeTime = 0;

async function searchAlibabaOfficial({ keyword, pageSize = 20 }) {
  const appKey = process.env.ALIBABA_APP_KEY;
  const appSecret = process.env.ALIBABA_APP_SECRET;

  if (!appKey || !appSecret) return [];

  const params = {
    app_key: appKey,
    timestamp: Date.now().toString(),
    sign_method: "sha1",
    keywords: keyword,
    page_size: pageSize.toString(),
    page_no: "1",
    country: "CN",
    language: "en_US",
  };

  const sortedKeys = Object.keys(params).sort();
  let stringToSign = "";
  sortedKeys.forEach((key) => {
    stringToSign += key + params[key];
  });

  const sign = crypto
    .createHmac("sha1", appSecret)
    .update(stringToSign)
    .digest("hex")
    .toUpperCase();

  params.sign = sign;

  const url = `https://gw.api.alibaba.com/openapi/param2/1/com.alibaba.product/alibaba.product.search/${appKey}`;

  try {
    const response = await axios.get(url, { params, timeout: 12000 });
    return normalizeAlibabaResults(response.data);
  } catch (error) {
    console.error("❌ Alibaba API error:", error.message);
    return [];
  }
}

function normalizeAlibabaResults(rawData) {
  const products =
    rawData?.result?.products ||
    rawData?.result?.productList ||
    rawData?.products ||
    [];

  if (!products.length) return [];

  return products.map((product, index) => ({
    id: product.productId || index + 1,
    name: product.companyName || product.supplierName || "Unknown Supplier",
    rating: parseFloat(product.supplierRating) || 4.5,
    reviews: parseInt(product.reviewCount) || 0,
    moq: parseInt(product.minOrderQuantity) || 100,
    price: parseFloat(product.priceInfo?.price || product.price) || 0,
    verified: product.supplierVerified || false,
    location: `${product.city || "China"}, ${product.country || "CN"}`,
    yearsInBusiness: parseInt(product.businessYears) || 0,
    responseRate: parseInt(product.responseRate) || 85,
    tags: product.supplierBadges || [],
    contactEmail: product.contactEmail || "",
    contactPhone: product.contactPhone || "",
    imageUrl: product.imageUrl || "",
    productUrl: product.productDetailUrl || "",
  }));
}

/* ─────────────────────────────────────────────────────────────
   2️⃣ AliExpress RapidAPI
───────────────────────────────────────────────────────────── */

async function searchAliExpressRapid({ keyword, pageSize = 20 }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.get(
      "https://aliexpress-datahub.p.rapidapi.com/item_search_3",
      {
        params: { q: keyword, page: 1, sort: "SALE_PRICE_ASC" },
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "aliexpress-datahub.p.rapidapi.com",
        },
        timeout: 10000,
      }
    );

    const items = response.data?.result?.resultList || [];
    if (!items.length) return [];

    return items.map((item, index) => ({
      id: index + 1,
      name: (item.item?.title || "Unknown").slice(0, 70),
      rating: parseFloat(item.item?.averageStar) || 4.0,
      reviews: parseInt(item.item?.evaluate) || 0,
      moq: 100,
      price:
        parseFloat(item.item?.sku?.def?.promotionPrice) ||
        parseFloat(item.item?.sku?.def?.price) ||
        0,
      verified: false,
      location: "China",
      yearsInBusiness: 0,
      responseRate: 90,
      tags: [],
      contactEmail: "",
      contactPhone: "",
      imageUrl: item.item?.image || "",
      productUrl: `https://www.aliexpress.com/item/${item.item?.itemId}.html`,
    }));

  } catch (err) {
    console.error("❌ AliExpress error:", err.message);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   3️⃣ Playwright Scraper
───────────────────────────────────────────────────────────── */

async function searchAlibabaScraper({ keyword, pageSize = 20 }) {
  console.log("🕷️ Using ScraperAPI direct mode...");

  if (!process.env.SCRAPERAPI_KEY) {
    console.log("⚠️ No ScraperAPI key set");
    return [];
  }

  const targetUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}`;

  const scraperUrl = `https://api.scraperapi.com/?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(targetUrl)}&render=false`;

  try {
    const response = await axios.get(scraperUrl, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = response.data;

    if (!html || html.length < 5000) {
      console.log("⚠️ ScraperAPI returned small response (possibly blocked)");
      return [];
    }

    // ✅ Simple HTML parsing (basic extraction)
    const matches = [...html.matchAll(/"companyName":"(.*?)"/g)];

    const suppliers = matches.slice(0, pageSize).map((match, index) => ({
      id: index + 1,
      name: match[1],
      rating: 4.5,
      reviews: 0,
      moq: 100,
      price: 40 + index, // placeholder until price parser added
      verified: false,
      location: "China",
      yearsInBusiness: 3,
      responseRate: 85,
      tags: ["Scraped"],
      contactEmail: "",
      contactPhone: ""
    }));

    console.log(`✅ ScraperAPI extracted ${suppliers.length} suppliers`);
    return suppliers;

  } catch (err) {
    console.error("❌ ScraperAPI failed:", err.message);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   4️⃣ Mock Fallback
───────────────────────────────────────────────────────────── */

function getMockData() {
  console.log("📦 Using mock data");
  return [
    {
      id: 1,
      name: "Guangzhou Premium Furniture Co., Ltd",
      rating: 4.8,
      reviews: 1247,
      moq: 500,
      price: 45.5,
      verified: true,
      location: "Guangzhou, China",
      yearsInBusiness: 12,
      responseRate: 98,
      tags: ["Gold Supplier"],
    },
  ];
}

/* ─────────────────────────────────────────────────────────────
   ✅ FINAL SMART EXPORT
───────────────────────────────────────────────────────────── */

export async function searchSuppliers({ keyword, pageSize = 20 }) {

  // 1️⃣ Official Alibaba
  const official = await searchAlibabaOfficial({ keyword, pageSize });
  if (official.length) return official;

  // 2️⃣ AliExpress
  const rapid = await searchAliExpressRapid({ keyword, pageSize });
  if (rapid.length) return rapid;

  // 3️⃣ Scraper
  const scraped = await searchAlibabaScraper({ keyword, pageSize });
  if (scraped.length) return scraped;

  // 4️⃣ Mock
  return getMockData();
}