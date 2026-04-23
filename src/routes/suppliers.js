import express from "express";
import NodeCache from "node-cache";
import { searchSuppliers } from "../services/alibaba.js";
import { scoreSuppliers, categorizeSuppliers } from "../services/scoring.js";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });

router.get("/test", (_req, res) => {
  res.json({
    message: "✅ Suppliers route is working!",
    alibaba:  !!process.env.ALIBABA_APP_KEY,
    rapidApi: !!process.env.RAPIDAPI_KEY,
  });
});

router.post("/search", async (req, res) => {
  try {
    const { productType, material, quantity, budget, destination } = req.body;

    if (!productType) {
      return res.status(400).json({ error: "productType is required" });
    }

    const qty     = parseInt(quantity)  || 1000;
    const bdg     = parseFloat(budget)  || 50000;
    const keyword = `${productType} ${material || ""}`.trim();

    console.log(`\n🔍 Search request`);
    console.log(`   Keyword:     "${keyword}"`);
    console.log(`   Quantity:    ${qty}`);
    console.log(`   Budget:      $${bdg}`);
    console.log(`   Destination: ${destination || "not specified"}`);

    const cacheKey = `search_${keyword}_${qty}_${bdg}`;
    const cached   = cache.get(cacheKey);

    if (cached) {
      console.log("⚡ Cache hit\n");
      return res.json({ ...cached, fromCache: true });
    }

    // Uses Alibaba → AliExpress → Mock fallback chain
    const rawSuppliers = await searchSuppliers({ keyword, pageSize: 20 });

    const scored = scoreSuppliers(rawSuppliers, { budget: bdg, quantity: qty });
    const result = categorizeSuppliers(scored);

    console.log(`✅ Done: ${result.qualifiedCount} qualified, ${result.filteredOut.length} filtered out\n`);

    cache.set(cacheKey, result);
    res.json({ ...result, fromCache: false });

  } catch (error) {
    console.error("❌ /search error:", error.message);
    res.status(500).json({
      error:   "Failed to search suppliers",
      details: error.message,
    });
  }
});

export default router;