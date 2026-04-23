import axios from "axios";
import crypto from "crypto";

// ── Alibaba Official API ──────────────────────────────────────────────────────
async function searchAlibabaOfficial({ keyword, pageSize = 20 }) {
  const appKey    = process.env.ALIBABA_APP_KEY;
  const appSecret = process.env.ALIBABA_APP_SECRET;

  const params = {
    app_key:     appKey,
    timestamp:   Date.now().toString(),
    sign_method: "sha1",
    keywords:    keyword,
    page_size:   pageSize.toString(),
    page_no:     "1",
    country:     "CN",
    language:    "en_US",
  };

  // Generate HMAC-SHA1 signature
  const sortedKeys   = Object.keys(params).sort();
  let   stringToSign = "";
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

  console.log(`🔗 Calling Alibaba API for: "${keyword}"`);

const response = await axios.get(url, {
  params,
  timeout: 12000,
}).catch(error => {
  // Log the full error response
  console.error("❌ Alibaba full error:", {
    status:  error.response?.status,
    data:    JSON.stringify(error.response?.data),
    message: error.message,
  });
  throw error;
});

  console.log("📦 Alibaba raw response:", JSON.stringify(response.data).slice(0, 300));

  return normalizeAlibabaResults(response.data);
}

function normalizeAlibabaResults(rawData) {
  // Try different response structures
  const products =
    rawData?.result?.products ||
    rawData?.result?.productList ||
    rawData?.products ||
    [];

  if (!products.length) {
    console.log("⚠️  Alibaba returned 0 products — response:", JSON.stringify(rawData).slice(0, 500));
    return [];
  }

  return products.map((product, index) => ({
    id:              product.productId   || index + 1,
    name:            product.companyName || product.supplierName || product.subjectTrans || "Unknown Supplier",
    rating:          parseFloat(product.supplierRating) || 4.5,
    reviews:         parseInt(product.reviewCount)      || 0,
    moq:             parseInt(product.minOrderQuantity) || 100,
    price:           parseFloat(product.priceInfo?.price || product.price) || 0,
    verified:        product.supplierVerified || false,
    location:        `${product.city || "China"}, ${product.country || "CN"}`,
    yearsInBusiness: parseInt(product.businessYears)   || 0,
    responseRate:    parseInt(product.responseRate)     || 85,
    tags:            product.supplierBadges             || [],
    contactEmail:    product.contactEmail               || "",
    contactPhone:    product.contactPhone               || "",
    imageUrl:        product.imageUrl                   || "",
    productUrl:      product.productDetailUrl           || "",
  }));
}

// ── AliExpress via RapidAPI ───────────────────────────────────────────────────
async function searchAliExpressRapid({ keyword, pageSize = 20 }) {
  const apiKey = process.env.RAPIDAPI_KEY;

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

  if (!items.length) return [];

  return items.map((item, index) => ({
    id:              item.item?.itemId  || index + 1,
    name:            (item.item?.title  || "Unknown").slice(0, 70),
    rating:          parseFloat(item.item?.averageStar) || 4.0,
    reviews:         parseInt(item.item?.evaluate)      || 0,
    moq:             100,
    price:
      parseFloat(item.item?.sku?.def?.promotionPrice) ||
      parseFloat(item.item?.sku?.def?.price)          ||
      0,
    verified:        false,
    location:        "China",
    yearsInBusiness: 0,
    responseRate:    90,
    tags:            [],
    contactEmail:    "",
    contactPhone:    "",
    imageUrl:        item.item?.image || "",
    productUrl:      `https://www.aliexpress.com/item/${item.item?.itemId}.html`,
  }));
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
function getMockData() {
  console.log("📦 Using mock supplier data");
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
      rating: 4.6, reviews: 892, moq: 300, price: 42.00,
      verified: true, location: "Shanghai, China",
      yearsInBusiness: 8, responseRate: 95,
      tags: ["Verified", "Trade Assurance"],
      contactEmail: "info@shwoodenproducts.com",
      contactPhone: "+86 21 5555 6666",
    },
    {
      id: 3, name: "Foshan Elite Furniture Manufacturing",
      rating: 4.9, reviews: 2134, moq: 1000, price: 38.75,
      verified: true, location: "Foshan, China",
      yearsInBusiness: 15, responseRate: 99,
      tags: ["Gold Supplier", "Verified", "Audited"],
      contactEmail: "export@foshanelite.com",
      contactPhone: "+86 757 8888 1234",
    },
    {
      id: 4, name: "Shenzhen Modern Chairs Ltd",
      rating: 4.5, reviews: 567, moq: 200, price: 48.20,
      verified: true, location: "Shenzhen, China",
      yearsInBusiness: 6, responseRate: 92,
      tags: ["Verified"],
      contactEmail: "sales@szmodernchairs.com",
      contactPhone: "+86 755 3333 4444",
    },
    {
      id: 5, name: "Dongguan Quality Furniture Group",
      rating: 4.7, reviews: 1456, moq: 800, price: 40.30,
      verified: true, location: "Dongguan, China",
      yearsInBusiness: 10, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance"],
      contactEmail: "contact@dgquality.com",
      contactPhone: "+86 769 7777 8888",
    },
    {
      id: 6, name: "Hangzhou Premium Wood Products",
      rating: 4.8, reviews: 1089, moq: 600, price: 44.80,
      verified: true, location: "Hangzhou, China",
      yearsInBusiness: 9, responseRate: 97,
      tags: ["Verified", "Audited"],
      contactEmail: "export@hzpremiumwood.com",
      contactPhone: "+86 571 6666 7777",
    },
    {
      id: 7, name: "Ningbo Furniture Export Center",
      rating: 4.6, reviews: 734, moq: 350, price: 46.50,
      verified: true, location: "Ningbo, China",
      yearsInBusiness: 7, responseRate: 94,
      tags: ["Gold Supplier", "Verified"],
      contactEmail: "sales@nbfurniture.com",
      contactPhone: "+86 574 8888 9999",
    },
    {
      id: 8, name: "Suzhou Classic Furniture Manufacturing",
      rating: 4.7, reviews: 981, moq: 450, price: 43.20,
      verified: true, location: "Suzhou, China",
      yearsInBusiness: 11, responseRate: 96,
      tags: ["Gold Supplier", "Trade Assurance", "Verified"],
      contactEmail: "info@suzhouclassic.com",
      contactPhone: "+86 512 5555 6666",
    },
    {
      id: 9, name: "Xiamen Wooden Chair Specialists",
      rating: 4.5, reviews: 612, moq: 250, price: 47.90,
      verified: true, location: "Xiamen, China",
      yearsInBusiness: 6, responseRate: 93,
      tags: ["Verified", "Trade Assurance"],
      contactEmail: "sales@xmwoodenchairs.com",
      contactPhone: "+86 592 3333 4444",
    },
    {
      id: 10, name: "Qingdao Budget Furniture Ltd",
      rating: 4.1, reviews: 234, moq: 100, price: 35.50,
      verified: false, location: "Qingdao, China",
      yearsInBusiness: 3, responseRate: 78,
      tags: [],
      contactEmail: "info@qdbudget.com",
      contactPhone: "+86 532 1111 2222",
    },
    {
      id: 11, name: "Wuhan Cheap Chairs Co.",
      rating: 3.8, reviews: 145, moq: 50, price: 28.00,
      verified: false, location: "Wuhan, China",
      yearsInBusiness: 2, responseRate: 65,
      tags: [],
      contactEmail: "info@wuhancheap.com",
      contactPhone: "+86 027 1111 0000",
    },
    {
      id: 12, name: "Tianjin Basic Furniture Factory",
      rating: 4.2, reviews: 312, moq: 200, price: 33.00,
      verified: false, location: "Tianjin, China",
      yearsInBusiness: 2, responseRate: 75,
      tags: [],
      contactEmail: "info@tjbasic.com",
      contactPhone: "+86 022 2222 3333",
    },
  ];
}

// ── Main Export — Smart Fallback Chain ────────────────────────────────────────
export async function searchSuppliers({ keyword, pageSize = 20 }) {
  const hasAlibaba   = process.env.ALIBABA_APP_KEY &&
                       process.env.ALIBABA_APP_KEY !== "your_app_key_here";
  const hasRapidApi  = process.env.RAPIDAPI_KEY &&
                       process.env.RAPIDAPI_KEY !== "your_rapidapi_key_here";

  // ── Try Alibaba first ─────────────────────────────────────────────────────
  if (hasAlibaba) {
    try {
      console.log("🏭 Trying Alibaba Official API...");
      const results = await searchAlibabaOfficial({ keyword, pageSize });
      if (results.length > 0) {
        console.log(`✅ Alibaba returned ${results.length} suppliers`);
        return results;
      }
      console.log("⚠️  Alibaba returned 0 results — trying AliExpress");
    } catch (err) {
      console.error("❌ Alibaba failed:", err.message);
      console.log("⚠️  Falling back to AliExpress...");
    }
  }

  // ── Try AliExpress next ───────────────────────────────────────────────────
  if (hasRapidApi) {
    try {
      console.log("🛒 Trying AliExpress RapidAPI...");
      const results = await searchAliExpressRapid({ keyword, pageSize });
      if (results.length > 0) return results;
      console.log("⚠️  AliExpress returned 0 results — using mock");
    } catch (err) {
      console.error("❌ AliExpress failed:", err.message);
      console.log("⚠️  Falling back to mock data...");
    }
  }

  // ── Always works ──────────────────────────────────────────────────────────
  return getMockData();
}