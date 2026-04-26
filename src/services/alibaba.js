import axios from "axios";

/* ============================================================
   ✅ 1️⃣ Alibaba DataHub (RapidAPI)
   ============================================================ */

async function searchAlibabaDataHub({ keyword, pageSize = 20 }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log("⚠️ RAPIDAPI_KEY not configured");
    return [];
  }

  try {
    const response = await axios.get(
      "https://alibaba-datahub.p.rapidapi.com/item_search",
      {
        params: {
          q: keyword,
          page: 1,
          sort: "SALE_PRICE_ASC",
        },
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "alibaba-datahub.p.rapidapi.com",
        },
        timeout: 15000,
      }
    );

    const items =
      response.data?.result?.resultList ||
      response.data?.result ||
      [];

    if (!items.length) return [];

    console.log(`✅ Alibaba DataHub returned ${items.length} items`);

    return items.slice(0, pageSize).map((item, index) => ({
      id: index + 1,
      name: (item.item?.title || "Unknown Supplier").slice(0, 80),
      rating: parseFloat(item.item?.averageStar) || 4.3,
      reviews: parseInt(item.item?.evaluate) || 0,
      moq: 100,
      price:
        parseFloat(item.item?.sku?.def?.promotionPrice) ||
        parseFloat(item.item?.sku?.def?.price) ||
        0,
      verified: true,
      location: "China",
      yearsInBusiness: 5,
      responseRate: 90,
      tags: ["Alibaba DataHub"],
      contactEmail: "",
      contactPhone: "",
    }));

  } catch (error) {
    console.error("❌ Alibaba DataHub error:", error.message);
    return [];
  }
}

/* ============================================================
   ✅ 2️⃣ AliExpress RapidAPI Fallback
   ============================================================ */

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

    console.log(`✅ AliExpress returned ${items.length} items`);

    return items.slice(0, pageSize).map((item, index) => ({
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
      tags: ["AliExpress"],
      contactEmail: "",
      contactPhone: "",
      imageUrl: item.item?.image || "",
      productUrl: `https://www.aliexpress.com/item/${item.item?.itemId}.html`,
    }));

  } catch (err) {
    console.error("❌ AliExpress API failed:", err.message);
    return [];
  }
}

/* ============================================================
   ✅ 3️⃣ Mock Fallback
   ============================================================ */

function getMockData() {
  console.log("📦 Using mock fallback data");
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

/* ============================================================
   ✅ FINAL EXPORT
   ============================================================ */

export async function searchSuppliers({ keyword, pageSize = 20 }) {

  // 1️⃣ Alibaba DataHub (Primary)
  const alibaba = await searchAlibabaDataHub({ keyword, pageSize });
  if (alibaba.length) return alibaba;

  // 2️⃣ AliExpress Fallback
  const aliExpress = await searchAliExpressRapid({ keyword, pageSize });
  if (aliExpress.length) return aliExpress;

  // 3️⃣ Mock Fallback
  return getMockData();
}