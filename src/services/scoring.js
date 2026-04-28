export function scoreSuppliers(suppliers, userRequirements) {
  const { budget = 50000, quantity = 1000 } = userRequirements;
  const budgetPerUnit = budget / quantity;

  // Price range for relative scoring
  const prices     = suppliers.map(s => s.price).filter(p => p > 0);
  const minPrice   = prices.length ? Math.min(...prices) : 0;
  const maxPrice   = prices.length ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice || 1;

  const scored = suppliers.map((supplier) => {

    // ── 1. Price Score (0-100) ────────────────────────────────────────────────
    let priceScore = 50;
    if (supplier.price > 0 && prices.length > 1) {
      const relativeScore = ((maxPrice - supplier.price) / priceRange) * 60;
      const budgetScore   = supplier.price <= budgetPerUnit
        ? 40
        : Math.max(0, 40 - ((supplier.price - budgetPerUnit) / budgetPerUnit) * 40);
      priceScore = Math.round(Math.min(100, relativeScore + budgetScore));
    } else if (supplier.price > 0) {
      priceScore = supplier.price <= budgetPerUnit ? 80 : 40;
    }

    // ── 2. Quality Score (0-100) ──────────────────────────────────────────────
    const rating       = supplier.rating  || 4.0;
    const reviews      = supplier.reviews || 0;
    const ratingScore  = (rating / 5) * 80;
    const reviewScore  = Math.min(20, (reviews / 500) * 20);
    const qualityScore = Math.round(ratingScore + reviewScore);

    // ── 3. Reliability Score (0-100) ──────────────────────────────────────────
    const yearsInBusiness  = supplier.yearsInBusiness || 3;
    const responseRate     = supplier.responseRate    || 85;
    const yearsScore       = Math.min(40, yearsInBusiness * 3);
    const responseScore    = (responseRate / 100) * 30;
    const verifiedScore    = supplier.verified       ? 15 : 0;
    const tradeScore       = supplier.tradeAssurance ? 10 : 0;
    const goldScore        = supplier.goldSupplier   ? 5  : 0;
    const reliabilityScore = Math.round(Math.min(100,
      yearsScore + responseScore + verifiedScore + tradeScore + goldScore
    ));

    // ── 4. MOQ Score (0-100) ──────────────────────────────────────────────────
    const moq = supplier.moq || 1;
    const moqScore = moq <= quantity
      ? 100
      : Math.max(10, Math.round(100 - ((moq - quantity) / quantity) * 60));

    // ── 5. Final weighted AI Score ────────────────────────────────────────────
    const aiScore = Math.round(
      priceScore       * 0.35 +
      qualityScore     * 0.30 +
      reliabilityScore * 0.25 +
      moqScore         * 0.10
    );

    return {
      ...supplier,
      priceScore:       Math.round(priceScore),
      qualityScore:     Math.round(qualityScore),
      reliabilityScore: Math.round(reliabilityScore),
      moqScore:         Math.round(moqScore),
      aiScore,
      isQualified:      true,
    };
  });

  return scored.sort((a, b) => b.aiScore - a.aiScore);
}

export function categorizeSuppliers(scoredSuppliers) {
  console.log("Scored suppliers:", scoredSuppliers.slice(0, 5).map(s => ({
    name:    s.name.slice(0, 40),
    price:   s.price,
    aiScore: s.aiScore,
  })));

  return {
    topSuppliers:   scoredSuppliers.slice(0, 9),
    filteredOut:    [],
    totalAnalyzed:  scoredSuppliers.length,
    qualifiedCount: scoredSuppliers.length,
  };
}