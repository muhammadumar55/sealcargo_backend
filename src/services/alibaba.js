import axios from "axios";

// ── Helper: extract best price for given quantity ─────────────────────────────
function extractBestPrice(priceList, quantity) {
  if (!priceList || !priceList.length) return 0;

  let bestPrice = 0;

  for (const tier of priceList) {
    const min   = parseInt(tier.minQuantity) || 0;
    const max   = tier.maxQuantity === -1
                  ? Infinity
                  : (parseInt(tier.maxQuantity) || Infinity);
    const price = parseFloat(tier.price) || 0;

    if (quantity >= min && quantity <= max && price > 0) {
      bestPrice = price;
      break;
    }
  }

  // Fallback: use lowest price available
  if (!bestPrice) {
    const valid = priceList
      .map(t => parseFloat(t.price))
      .filter(p => p > 0);
    bestPrice = valid.length ? Math.min(...valid) : 0;
  }

  return bestPrice;
}

// ── Helper: extract rating from storeEvaluates ────────────────────────────────
function extractRating(storeEvaluates) {
  if (!storeEvaluates || !storeEvaluates.length) return 4.3;

  const allReview = storeEvaluates.find(e => e.title === "All Product Review");
  if (allReview && parseFloat(allReview.score) > 0) {
    return Math.min(5.0, parseFloat(parseFloat(allReview.score).toFixed(1)));
  }

  const scores = storeEvaluates
    .map(e => parseFloat(e.score))
    .filter(s => s > 0);

  if (!scores.length) return 4.3;
  return Math.min(5.0, parseFloat(
    (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  ));
}

// ── Helper: build tags from company status ────────────────────────────────────
function buildTags(company) {
  const tags = [];
  if (company?.status?.gold)                   tags.push("Gold Supplier");
  if (company?.status?.assessed)               tags.push("Assessed");
  if (company?.status?.verified)               tags.push("Verified");
  if (company?.status?.tradeAssurance === "1") tags.push("Trade Assurance");
  return tags;
}

// ── Helper: build image URLs ──────────────────────────────────────────────────
function buildImageUrl(raw) {
  if (!raw)                   return "";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("//"))   return `https:${raw}`;
  return raw;
}

function buildImages(item) {
  const images = [];
  if (item.image) images.push(buildImageUrl(item.image));
  if (item.images && Array.isArray(item.images)) {
    item.images.forEach(img => {
      const url = buildImageUrl(img);
      if (url && !images.includes(url)) images.push(url);
    });
  }
  return images;
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
          q:        keyword,
          page:     1,
          region:   "US",
          locale:   "en_US",
          currency: "USD",
        },
        headers: {
          "X-RapidAPI-Key":  apiKey,
          "X-RapidAPI-Host": "alibaba-datahub.p.rapidapi.com",
        },
        timeout: 20000,
      }
    );

    const resultList = response.data?.result?.resultList || [];
    if (!resultList.length) {
      console.log("⚠️  Alibaba DataHub returned 0 results");
      return [];
    }

    // Map all items
    const mapped = resultList.slice(0, pageSize).map((entry, index) => {
      const item    = entry.item    || {};
      const seller  = entry.seller  || {};
      const company = entry.company || {};

      const priceList    = item.sku?.def?.priceModule?.priceList || [];
      const price        = extractBestPrice(priceList, quantity);
      const moq          = parseInt(item.sku?.def?.quantityModule?.minOrder?.quantity) || 1;
      const rating       = extractRating(seller.storeEvaluates);
      const storeAge     = parseInt(seller.storeAge) || 3;
      const tags         = buildTags(company);
      const images       = buildImages(item);
      const productImage = images[0] || "";

      return {
        id:              index + 1,
        itemId:          item.itemId || "",
        name:            company.companyName ||
                         (item.title || "Unknown Supplier").slice(0, 80),
        productName:     (item.title || "").slice(0, 80),
        productImage,
        images,
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
        tags,
        tradeAssurance:  company.status?.tradeAssurance === "1",
        goldSupplier:    company.status?.gold || false,
        contactEmail:    "",
        contactPhone:    "",
        productUrl:      item.itemUrl
                           ? `https:${item.itemUrl}`
                           : `https://www.alibaba.com/product-detail/_${item.itemId}.html`,
        storeUrl:        seller.storeUrl
                           ? `https:${seller.storeUrl}`
                           : "",
      };
    });

    // ── Filter out junk items (accessories, hardware) ─────────────────────────
    const filtered = mapped.filter(item => {
      if (item.price === 0)    return false; // no price
      if (item.price < 5)      return false; // too cheap — accessories/parts
      if (item.price > 100000) return false; // unrealistic
      return true;
    });

    console.log(
      `✅ Alibaba DataHub returned ${resultList.length} items` +
      ` (${filtered.length} after quality filter)`
    );

    return filtered;

  } catch (error) {
    console.error(
      "❌ Alibaba DataHub error:",
      error.response?.data || error.message
    );
    return [];
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function getMockData() {
  console.log("📦 Using mock supplier data");
  return [
    {
      id: 1, name: "Guangzhou Premium Furniture Co., Ltd",
      productName: "Premium Solid Wood Furniture Collection",
      rating: 4.8, reviews: 1247, moq: 500, price: 45.50,
      verified: true, location: "China",
      yearsInBusiness: 12, responseRate: 98,
      tags: ["Gold Supplier", "Verified", "Trade Assurance"],
      tradeAssurance: true, goldSupplier: true,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 2, name: "Shanghai Wooden Products Factory",
      productName: "Eco-Friendly Wood Products",
      rating: 4.6, reviews: 892, moq: 300, price: 42.00,
      verified: true, location: "China",
      yearsInBusiness: 8, responseRate: 95,
      tags: ["Verified", "Trade Assurance"],
      tradeAssurance: true, goldSupplier: false,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 3, name: "Foshan Elite Furniture Manufacturing",
      productName: "Elite Custom Furniture",
      rating: 4.9, reviews: 2134, moq: 1000, price: 38.75,
      verified: true, location: "China",
      yearsInBusiness: 15, responseRate: 99,
      tags: ["Gold Supplier", "Verified", "Audited"],
      tradeAssurance: true, goldSupplier: true,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 4, name: "Shenzhen Modern Chairs Ltd",
      productName: "Modern Ergonomic Chairs",
      rating: 4.5, reviews: 567, moq: 200, price: 48.20,
      verified: true, location: "China",
      yearsInBusiness: 6, responseRate: 92,
      tags: ["Verified"],
      tradeAssurance: false, goldSupplier: false,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 5, name: "Dongguan Quality Furniture Group",
      productName: "Quality Hardwood Furniture",
      rating: 4.7, reviews: 1456, moq: 800, price: 40.30,
      verified: true, location: "China",
      yearsInBusiness: 10, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance"],
      tradeAssurance: true, goldSupplier: true,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 6, name: "Hangzhou Premium Wood Products",
      productName: "Premium Wood Range",
      rating: 4.8, reviews: 1089, moq: 600, price: 44.80,
      verified: true, location: "China",
      yearsInBusiness: 9, responseRate: 97,
      tags: ["Verified", "Audited"],
      tradeAssurance: false, goldSupplier: false,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 7, name: "Ningbo Furniture Export Center",
      productName: "Export Grade Furniture",
      rating: 4.6, reviews: 734, moq: 350, price: 46.50,
      verified: true, location: "China",
      yearsInBusiness: 7, responseRate: 94,
      tags: ["Gold Supplier", "Verified"],
      tradeAssurance: false, goldSupplier: true,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 8, name: "Suzhou Classic Furniture Manufacturing",
      productName: "Classic Style Furniture",
      rating: 4.7, reviews: 981, moq: 450, price: 43.20,
      verified: true, location: "China",
      yearsInBusiness: 11, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance", "Verified"],
      tradeAssurance: true, goldSupplier: true,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
    {
      id: 9, name: "Xiamen Wooden Chair Specialists",
      productName: "Specialist Wooden Chairs",
      rating: 4.5, reviews: 612, moq: 250, price: 47.90,
      verified: true, location: "China",
      yearsInBusiness: 6, responseRate: 93,
      tags: ["Verified", "Trade Assurance"],
      tradeAssurance: true, goldSupplier: false,
      contactEmail: "", contactPhone: "",
      productImage: "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=300&fit=crop",
      ],
      productUrl: "", storeUrl: "",
    },
  ];
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function searchSuppliers({ keyword, pageSize = 20, quantity = 1000 }) {
  const results = await searchAlibabaDataHub({ keyword, pageSize, quantity });
  return results.length ? results : getMockData();
}