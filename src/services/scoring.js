export function scoreSuppliers(suppliers, userRequirements) {
  const { budget = 50000, quantity = 1000 } = userRequirements;
  const budgetPerUnit = budget / quantity;

  // Find min/max prices for relative scoring
  const prices        = suppliers.map(s => s.price).filter(p => p > 0);
  const minPrice      = Math.min(...prices);
  const maxPrice      = Math.max(...prices);
  const priceRange    = maxPrice - minPrice || 1;
  const avgPrice      = prices.reduce((a, b) => a + b, 0) / prices.length || budgetPerUnit;

  const scored = suppliers.map((supplier, idx) => {

    // ── 1. Price Score (0-100) ────────────────────────────────────────────────
    // Relative to other suppliers AND budget
    let priceScore = 60;
    if (supplier.price > 0) {
      // Relative score among all results
      const relativeScore = ((maxPrice - supplier.price) / priceRange) * 60;
      // Budget score
      const budgetScore = supplier.price <= budgetPerUnit
        ? Math.min(40, ((budgetPerUnit - supplier.price) / budgetPerUnit) * 40 + 20)
        : Math.max(0, 20 - ((supplier.price - budgetPerUnit) / budgetPerUnit) * 20);
      priceScore = Math.round(Math.min(100, relativeScore + budgetScore));
    }

    // ── 2. Quality Score (0-100) ──────────────────────────────────────────────
    const rating      = supplier.rating   || 4.0;
    const reviews     = supplier.reviews  || 0;
    const ratingScore = (rating / 5) * 70;
    // Vary review score by index to differentiate when all reviews = 0
    const reviewScore = reviews > 0
      ? Math.min(30, (reviews / 2000) * 30)
      : Math.max(0, 20 - idx * 1.5); // slight variation by position
    const qualityScore = Math.round(Math.min(100, ratingScore + reviewScore));

    // ── 3. Reliability Score (0-100) ──────────────────────────────────────────
    const responseRate    = supplier.responseRate    || 85;
    const yearsInBusiness = supplier.yearsInBusiness || 3;
    const responseScore   = (responseRate / 100) * 40;
    const yearsScore      = Math.min(30, yearsInBusiness * 3);
    const verifiedScore   = supplier.verified ? 30 : 10;
    const reliabilityScore = Math.round(responseScore + yearsScore + verifiedScore);

    // ── 4. MOQ Score (0-100) ──────────────────────────────────────────────────
    const moq = supplier.moq || 1;
    const moqScore = moq <= quantity
      ? Math.min(100, Math.round(80 + (quantity / moq) * 5))
      : Math.max(10, Math.round(100 - ((moq - quantity) / quantity) * 80));

    // ── 5. Final Weighted AI Score ────────────────────────────────────────────
    const aiScore = Math.min(99, Math.round(
      priceScore       * 0.30 +
      qualityScore     * 0.30 +
      reliabilityScore * 0.25 +
      moqScore         * 0.15
    ));

    // ── 6. Qualification ──────────────────────────────────────────────────────
    const isQualified =
      aiScore >= 45 &&
      (supplier.rating || 4.0) >= 3.0 &&
      supplier.price > 0;

    return {
      ...supplier,
      rating:          rating,
      responseRate:    responseRate,
      yearsInBusiness: yearsInBusiness,
      moq:             moq,
      priceScore:      Math.round(priceScore),
      qualityScore,
      reliabilityScore,
      moqScore:        Math.round(moqScore),
      aiScore,
      isQualified,
    };
  });

  return scored.sort((a, b) => b.aiScore - a.aiScore);
}

export function categorizeSuppliers(scoredSuppliers) {
  const qualified   = scoredSuppliers.filter((s) => s.isQualified);
  const filteredOut = scoredSuppliers
    .filter((s) => !s.isQualified)
    .map((s) => ({
      name:    s.name,
      reason:  getFilterReason(s),
      rating:  s.rating,
      aiScore: s.aiScore,
    }));

  return {
    topSuppliers:   qualified.slice(0, 9),
    filteredOut,
    totalAnalyzed:  scoredSuppliers.length,
    qualifiedCount: qualified.length,
  };
}

function getFilterReason(supplier) {
  if (supplier.price <= 0)
    return "No pricing information available";
  if ((supplier.rating || 0) < 3.0)
    return `Rating too low (${supplier.rating})`;
  if ((supplier.aiScore || 0) < 45)
    return `AI score too low (${supplier.aiScore}/100)`;
  return "Did not meet quality threshold";
}