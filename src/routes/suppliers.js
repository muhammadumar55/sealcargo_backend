import express from "express";
import NodeCache from "node-cache";
import { searchAliExpress } from "../services/aliexpress.js";
import { scoreSuppliers, categorizeSuppliers } from "../services/scoring.js";

const router = express.Router();

// Cache results for 1 hour so we don't spam the API
const cache = new NodeCache({ stdTTL: 3600 });

// ── GET /api/suppliers/test ───────────────────────────────────────────────────
// Open this in browser to confirm route works
router.get("/test", (_req, res) => {
  res.json({
    message: "✅ Suppliers route is working!",
    usage:   "POST /api/suppliers/search",
    body:    "{ productType, material, quantity, budget, destination }",
  });
});

// ── POST /api/suppliers/search ────────────────────────────────────────────────
router.post("/search", async (req, res) => {
  try {
    const { productType, material, quantity, budget, destination } = req.body;

    // Validate
    if (!productType) {
      return res.status(400).json({ error: "productType is required" });
    }

    const qty     = parseInt(quantity)   || 1000;
    const bdg     = parseFloat(budget)   || 50000;
    const keyword = `${productType} ${material || ""}`.trim();

    console.log(`\n🔍 Search request`);
    console.log(`   Keyword:     "${keyword}"`);
    console.log(`   Quantity:    ${qty}`);
    console.log(`   Budget:      $${bdg}`);
    console.log(`   Destination: ${destination || "not specified"}`);

    // Check cache first
    const cacheKey = `search_${keyword}_${qty}_${bdg}`;
    const cached   = cache.get(cacheKey);

    if (cached) {
      console.log("⚡ Cache hit — returning cached result\n");
      return res.json({ ...cached, fromCache: true });
    }

    // Fetch from AliExpress (or mock if no key)
    const rawSuppliers = await searchAliExpress({ keyword, pageSize: 20 });

    // Score every supplier
    const scored = scoreSuppliers(rawSuppliers, { budget: bdg, quantity: qty });

    // Split into qualified / filtered-out
    const result = categorizeSuppliers(scored);

    console.log(`✅ Done: ${result.qualifiedCount} qualified, ${result.filteredOut.length} filtered out\n`);

    // Store in cache
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