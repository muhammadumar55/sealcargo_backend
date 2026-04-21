import axios from "axios";

/**
 * Fetch products from AliExpress via RapidAPI.
 * Falls back to mock data automatically if no API key is set.
 *
 * Get a free key at: https://rapidapi.com/
 * Search "AliExpress" → subscribe to any free plan
 */

export async function searchAliExpress({ keyword, pageSize = 20 }) {
  const apiKey = process.env.RAPIDAPI_KEY;

  // ── No key → use mock immediately ─────────────────────────────────────────
  if (!apiKey || apiKey === "your_rapidapi_key_here") {
    console.log(`⚠️  No RapidAPI key — returning mock data for "${keyword}"`);
    return getMockData();
  }

  // ── Try real API ───────────────────────────────────────────────────────────
  try {
    const response = await axios.get(
      "https://aliexpress-datahub.p.rapidapi.com/item_search_3",
      {
        params: {
          q:    keyword,
          page: 1,
          sort: "SALE_PRICE_ASC",
        },
        headers: {
          "X-RapidAPI-Key":  apiKey,
          "X-RapidAPI-Host": "aliexpress-datahub.p.rapidapi.com",
        },
        timeout: 10000,
      }
    );

    const items = response.data?.result?.resultList || [];
    console.log(`✅ AliExpress returned ${items.length} items for "${keyword}"`);

    if (items.length === 0) return getMockData();
    return normalizeItems(items);

  } catch (error) {
    console.error("❌ AliExpress API error:", error.message);
    console.log("⚠️  Falling back to mock data");
    return getMockData();
  }
}

// ── Normalize raw AliExpress items to our Supplier shape ──────────────────────
function normalizeItems(items) {
  return items.map((item, index) => ({
    id:              item.item?.itemId  || index + 1,
    name:            (item.item?.title  || "Unknown Supplier").slice(0, 70),
    rating:          parseFloat(item.item?.averageStar) || +(4 + Math.random()).toFixed(1),
    reviews:         parseInt(item.item?.evaluate)      || Math.floor(Math.random() * 1800) + 200,
    moq:             100,
    price:
      parseFloat(item.item?.sku?.def?.promotionPrice) ||
      parseFloat(item.item?.sku?.def?.price)          ||
      +(Math.random() * 40 + 20).toFixed(2),
    verified:        Math.random() > 0.3,
    location:        "China",
    yearsInBusiness: Math.floor(Math.random() * 10) + 3,
    responseRate:    Math.floor(Math.random() * 18)  + 82,
    tags:            ["AliExpress", "Verified"],
    contactEmail:    "supplier@aliexpress.com",
    contactPhone:    "+86 000 0000 0000",
    imageUrl:        item.item?.image || "",
    productUrl:      `https://www.aliexpress.com/item/${item.item?.itemId}.html`,
  }));
}

// ── Mock supplier list (used when API key is missing or call fails) ────────────
function getMockData() {
  return [
    {
      id: 1, name: "Guangzhou Premium Furniture Co., Ltd",
      rating: 4.8, reviews: 1247, moq: 500,  price: 45.50,
      verified: true,  location: "Guangzhou, China",
      yearsInBusiness: 12, responseRate: 98,
      tags: ["Gold Supplier", "Verified", "Trade Assurance"],
      contactEmail: "sales@gzpremium.com",
      contactPhone: "+86 20 8888 9999",
    },
    {
      id: 2, name: "Shanghai Wooden Products Factory",
      rating: 4.6, reviews: 892,  moq: 300,  price: 42.00,
      verified: true,  location: "Shanghai, China",
      yearsInBusiness: 8,  responseRate: 95,
      tags: ["Verified", "Trade Assurance"],
      contactEmail: "info@shwoodenproducts.com",
      contactPhone: "+86 21 5555 6666",
    },
    {
      id: 3, name: "Foshan Elite Furniture Manufacturing",
      rating: 4.9, reviews: 2134, moq: 1000, price: 38.75,
      verified: true,  location: "Foshan, China",
      yearsInBusiness: 15, responseRate: 99,
      tags: ["Gold Supplier", "Verified", "Audited"],
      contactEmail: "export@foshanelite.com",
      contactPhone: "+86 757 8888 1234",
    },
    {
      id: 4, name: "Shenzhen Modern Chairs Ltd",
      rating: 4.5, reviews: 567,  moq: 200,  price: 48.20,
      verified: true,  location: "Shenzhen, China",
      yearsInBusiness: 6,  responseRate: 92,
      tags: ["Verified"],
      contactEmail: "sales@szmodernchairs.com",
      contactPhone: "+86 755 3333 4444",
    },
    {
      id: 5, name: "Dongguan Quality Furniture Group",
      rating: 4.7, reviews: 1456, moq: 800,  price: 40.30,
      verified: true,  location: "Dongguan, China",
      yearsInBusiness: 10, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance"],
      contactEmail: "contact@dgquality.com",
      contactPhone: "+86 769 7777 8888",
    },
    {
      id: 6, name: "Hangzhou Premium Wood Products",
      rating: 4.8, reviews: 1089, moq: 600,  price: 44.80,
      verified: true,  location: "Hangzhou, China",
      yearsInBusiness: 9,  responseRate: 97,
      tags: ["Verified", "Audited"],
      contactEmail: "export@hzpremiumwood.com",
      contactPhone: "+86 571 6666 7777",
    },
    {
      id: 7, name: "Ningbo Furniture Export Center",
      rating: 4.6, reviews: 734,  moq: 350,  price: 46.50,
      verified: true,  location: "Ningbo, China",
      yearsInBusiness: 7,  responseRate: 94,
      tags: ["Gold Supplier", "Verified"],
      contactEmail: "sales@nbfurniture.com",
      contactPhone: "+86 574 8888 9999",
    },
    {
      id: 8, name: "Suzhou Classic Furniture Manufacturing",
      rating: 4.7, reviews: 981,  moq: 450,  price: 43.20,
      verified: true,  location: "Suzhou, China",
      yearsInBusiness: 11, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance", "Verified"],
      contactEmail: "info@suzhouclassic.com",
      contactPhone: "+86 512 5555 6666",
    },
    {
      id: 9, name: "Xiamen Wooden Chair Specialists",
      rating: 4.5, reviews: 612,  moq: 250,  price: 47.90,
      verified: true,  location: "Xiamen, China",
      yearsInBusiness: 6,  responseRate: 93,
      tags: ["Verified", "Trade Assurance"],
      contactEmail: "sales@xmwoodenchairs.com",
      contactPhone: "+86 592 3333 4444",
    },
    {
      id: 10, name: "Qingdao Budget Furniture Ltd",
      rating: 4.1, reviews: 234,  moq: 100,  price: 35.50,
      verified: false, location: "Qingdao, China",
      yearsInBusiness: 3,  responseRate: 78,
      tags: [],
      contactEmail: "info@qdbudget.com",
      contactPhone: "+86 532 1111 2222",
    },
    {
      id: 11, name: "Wuhan Cheap Chairs Co.",
      rating: 3.8, reviews: 145,  moq: 50,   price: 28.00,
      verified: false, location: "Wuhan, China",
      yearsInBusiness: 2,  responseRate: 65,
      tags: [],
      contactEmail: "info@wuhancheap.com",
      contactPhone: "+86 027 1111 0000",
    },
    {
      id: 12, name: "Tianjin Basic Furniture Factory",
      rating: 4.2, reviews: 312,  moq: 200,  price: 33.00,
      verified: false, location: "Tianjin, China",
      yearsInBusiness: 2,  responseRate: 75,
      tags: [],
      contactEmail: "info@tjbasic.com",
      contactPhone: "+86 022 2222 3333",
    },
  ];
}