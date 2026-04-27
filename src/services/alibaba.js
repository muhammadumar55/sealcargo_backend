import axios from "axios";

// ── Helper: extract best price based on quantity ──────────────────────────────
function extractPrice(priceList, quantity) {
  if (!priceList || !priceList.length) return 0;

  // Find the price tier that matches the quantity
  let bestPrice = parseFloat(priceList[0]?.price) || 0;

  for (const tier of priceList) {
    const min = tier.minQuantity || 0;
    const max = tier.maxQuantity === -1 ? Infinity : (tier.maxQuantity || Infinity);
    if (quantity >= min && quantity <= max) {
      bestPrice = parseFloat(tier.price) || bestPrice;
      break;
    }
  }

  // If no tier matched, use the lowest price (bulk price)
  if (!bestPrice) {
    const sorted = [...priceList].sort((a, b) =>
      parseFloat(a.price) - parseFloat(b.price)
    );
    bestPrice = parseFloat(sorted[0]?.price) || 0;
  }

  return bestPrice;
}

// ── Helper: extract rating from storeEvaluates ────────────────────────────────
function extractRating(storeEvaluates) {
  if (!storeEvaluates || !storeEvaluates.length) return 4.0;

  const allReview = storeEvaluates.find(e => e.title === "All Product Review");
  if (allReview && parseFloat(allReview.score) > 0) {
    return parseFloat(allReview.score);
  }

  const scores = storeEvaluates
    .map(e => parseFloat(e.score))
    .filter(s => s > 0);

  if (!scores.length) return 4.0;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
}

// ── Helper: build tags from company status ────────────────────────────────────
function buildTags(company) {
  const tags = [];
  if (company?.status?.gold)           tags.push("Gold Supplier");
  if (company?.status?.assessed)       tags.push("Assessed");
  if (company?.status?.verified)       tags.push("Verified");
  if (company?.status?.tradeAssurance === "1") tags.push("Trade Assurance");
  return tags;
}

// ── Main: Alibaba DataHub search ──────────────────────────────────────────────
async function searchAlibabaDataHub({ keyword, pageSize = 20, quantity = 1000 }) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey || apiKey === "your_rapidapi_key_here") {
    console.log("⚠️  No RAPIDAPI_KEY — using mock data");
    return [];
  }

  try {
    const response = await axios.get(
      "https://alibaba-datahub.p.rapidapi.com/item_search",
      {
        params: {
          q:      keyword,
          page:   1,
          region: "US",
          locale: "en_US",
          currency: "USD",
        },
        headers: {
          "X-RapidAPI-Key":  apiKey,
          "X-RapidAPI-Host": "alibaba-datahub.p.rapidapi.com",
        },
        timeout: 15000,
      }
    );

    const resultList = response.data?.result?.resultList || [];

    if (!resultList.length) {
      console.log("⚠️  Alibaba DataHub returned 0 results");
      return [];
    }

    console.log(`✅ Alibaba DataHub returned ${resultList.length} items`);

    return resultList.slice(0, pageSize).map((entry, index) => {
      const item    = entry.item    || {};
      const seller  = entry.seller  || {};
      const company = entry.company || {};

      const priceList = item.sku?.def?.priceModule?.priceList || [];
      const price     = extractPrice(priceList, quantity);
      const moq       = parseInt(item.sku?.def?.quantityModule?.minOrder?.quantity) || 1;
      const rating    = extractRating(seller.storeEvaluates);
      const storeAge  = parseInt(seller.storeAge) || 3;
      const tags      = buildTags(company);

      return {
        id:              index + 1,
        itemId:          item.itemId || "",
        name:            company.companyName || (item.title || "Unknown Supplier").slice(0, 80),
        productName:     (item.title || "").slice(0, 80),
        rating,
        reviews:         0,
        moq,
        price,
        priceRange:      item.sku?.def?.priceModule?.priceFormatted || "",
        priceList,
        verified:        company.status?.assessed || false,
        location:        company.companyAddress?.country || "China",
        yearsInBusiness: storeAge,
        responseRate:    90,
        employees:       company.companyEmployeesCount || "N/A",
        buildingSize:    company.companyBuildingSize   || "N/A",
        tags,
        contactEmail:    "",
        contactPhone:    "",
        imageUrl:        item.image
                           ? `https:${item.image}`
                           : "",
        productUrl:      item.itemUrl
                           ? `https:${item.itemUrl}`
                           : `https://www.alibaba.com/product-detail/_${item.itemId}.html`,
        storeUrl:        seller.storeUrl
                           ? `https:${seller.storeUrl}`
                           : "",
        storeEvaluates:  seller.storeEvaluates || [],
        tradeAssurance:  company.status?.tradeAssurance === "1",
        goldSupplier:    company.status?.gold || false,
      };
    });

  } catch (error) {
    console.error("❌ Alibaba DataHub error:", error.response?.data || error.message);
    return [];
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function getMockData() {
  console.log("📦 Using mock supplier data");
  return [
    {
      id: 1, name: "Guangzhou Premium Furniture Co., Ltd",
      productName: "Premium Wooden Furniture",
      rating: 4.8, reviews: 1247, moq: 500, price: 45.50,
      verified: true, location: "China",
      yearsInBusiness: 12, responseRate: 98,
      tags: ["Gold Supplier", "Verified", "Trade Assurance"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 2, name: "Shanghai Wooden Products Factory",
      productName: "Wooden Products",
      rating: 4.6, reviews: 892, moq: 300, price: 42.00,
      verified: true, location: "China",
      yearsInBusiness: 8, responseRate: 95,
      tags: ["Verified", "Trade Assurance"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 3, name: "Foshan Elite Furniture Manufacturing",
      productName: "Elite Furniture",
      rating: 4.9, reviews: 2134, moq: 1000, price: 38.75,
      verified: true, location: "China",
      yearsInBusiness: 15, responseRate: 99,
      tags: ["Gold Supplier", "Verified", "Audited"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 4, name: "Shenzhen Modern Chairs Ltd",
      productName: "Modern Chairs",
      rating: 4.5, reviews: 567, moq: 200, price: 48.20,
      verified: true, location: "China",
      yearsInBusiness: 6, responseRate: 92,
      tags: ["Verified"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 5, name: "Dongguan Quality Furniture Group",
      productName: "Quality Furniture",
      rating: 4.7, reviews: 1456, moq: 800, price: 40.30,
      verified: true, location: "China",
      yearsInBusiness: 10, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 6, name: "Hangzhou Premium Wood Products",
      productName: "Premium Wood Products",
      rating: 4.8, reviews: 1089, moq: 600, price: 44.80,
      verified: true, location: "China",
      yearsInBusiness: 9, responseRate: 97,
      tags: ["Verified", "Audited"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 7, name: "Ningbo Furniture Export Center",
      productName: "Export Furniture",
      rating: 4.6, reviews: 734, moq: 350, price: 46.50,
      verified: true, location: "China",
      yearsInBusiness: 7, responseRate: 94,
      tags: ["Gold Supplier", "Verified"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 8, name: "Suzhou Classic Furniture Manufacturing",
      productName: "Classic Furniture",
      rating: 4.7, reviews: 981, moq: 450, price: 43.20,
      verified: true, location: "China",
      yearsInBusiness: 11, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance", "Verified"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
    {
      id: 9, name: "Xiamen Wooden Chair Specialists",
      productName: "Wooden Chairs",
      rating: 4.5, reviews: 612, moq: 250, price: 47.90,
      verified: true, location: "China",
      yearsInBusiness: 6, responseRate: 93,
      tags: ["Verified", "Trade Assurance"],
      contactEmail: "", contactPhone: "",
      imageUrl: "", productUrl: "",
    },
  ];
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function searchSuppliers({ keyword, pageSize = 20, quantity = 1000 }) {
  const results = await searchAlibabaDataHub({ keyword, pageSize, quantity });
  return results.length ? results : getMockData();
}