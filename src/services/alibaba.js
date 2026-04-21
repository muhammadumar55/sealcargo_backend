import axios from "axios";
import crypto from "crypto";

// ─── OPTION A: Official Alibaba API (after approval) ───────────────
class AlibabaOfficialService {
  constructor() {
    this.appKey = process.env.ALIBABA_APP_KEY;
    this.appSecret = process.env.ALIBABA_APP_SECRET;
    this.baseURL = "https://gw.api.alibaba.com/openapi/";
  }

  // Generate the required signature for Alibaba API
  generateSignature(params) {
    const sortedKeys = Object.keys(params).sort();
    let stringToSign = "";
    
    sortedKeys.forEach(key => {
      stringToSign += key + params[key];
    });
    
    return crypto
      .createHmac("sha1", this.appSecret)
      .update(stringToSign)
      .digest("hex")
      .toUpperCase();
  }

  async searchSuppliers({ keyword, country = "CN", pageSize = 20, pageIndex = 1 }) {
    const params = {
      app_key: this.appKey,
      timestamp: Date.now().toString(),
      sign_method: "sha1",
      keyword,
      country,
      pageSize,
      pageIndex,
    };

    params.sign = this.generateSignature(params);

    try {
      const response = await axios.get(
        `${this.baseURL}param2/1/com.alibaba.product/alibaba.product.search/${this.appKey}`,
        { params }
      );
      return this.normalizeSuppliers(response.data);
    } catch (error) {
      console.error("Alibaba API error:", error.message);
      throw error;
    }
  }

  // Normalize Alibaba response to our app's format
  normalizeSuppliers(rawData) {
    if (!rawData?.result?.products) return [];
    
    return rawData.result.products.map(product => ({
      id: product.productId,
      name: product.companyName || product.supplierName,
      rating: product.supplierRating || 4.5,
      reviews: product.reviewCount || 0,
      moq: parseInt(product.minOrderQuantity) || 100,
      price: parseFloat(product.priceInfo?.price) || 0,
      verified: product.supplierVerified || false,
      location: `${product.city || ""}, ${product.country || "China"}`,
      yearsInBusiness: product.businessYears || 0,
      responseRate: product.responseRate || 0,
      tags: product.supplierBadges || [],
      productName: product.subjectTrans || product.subject,
      imageUrl: product.imageUrl || "",
      detailUrl: product.productDetailUrl || "",
      // AI scores calculated separately
      aiScore: 0,
      qualityScore: 0,
      reliabilityScore: 0,
      priceScore: 0,
    }));
  }
}

// ─── OPTION B: RapidAPI / AliExpress (immediate use) ───────────────
class AliExpressRapidAPIService {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.baseURL = "https://aliexpress-datahub.p.rapidapi.com";
  }

  async searchProducts({ keyword, pageSize = 20, pageIndex = 1, sort = "SALE_PRICE_ASC" }) {
    try {
      const response = await axios.get(`${this.baseURL}/item_search_3`, {
        params: {
          q: keyword,
          page: pageIndex,
          sort,
        },
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": "aliexpress-datahub.p.rapidapi.com",
        },
      });

      return this.normalizeProducts(response.data);
    } catch (error) {
      console.error("RapidAPI error:", error.message);
      throw error;
    }
  }

  normalizeProducts(rawData) {
    if (!rawData?.result?.resultList) return [];

    return rawData.result.resultList.map((item, index) => ({
      id: item.item?.itemId || index,
      name: item.item?.title || "Unknown Supplier",
      rating: parseFloat(item.item?.averageStar) || 4.0,
      reviews: parseInt(item.item?.evaluate) || 0,
      moq: 1,
      price: parseFloat(item.item?.sku?.def?.promotionPrice) || 0,
      verified: false,
      location: "China",
      yearsInBusiness: 0,
      responseRate: 90,
      tags: [],
      productName: item.item?.title || "",
      imageUrl: item.item?.image || "",
      detailUrl: `https://www.aliexpress.com/item/${item.item?.itemId}.html`,
      aiScore: 0,
      qualityScore: 0,
      reliabilityScore: 0,
      priceScore: 0,
    }));
  }
}

// Export whichever is available
export const alibabaService = process.env.ALIBABA_APP_KEY
  ? new AlibabaOfficialService()
  : new AliExpressRapidAPIService();