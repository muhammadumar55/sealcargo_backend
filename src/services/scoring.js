/**
 * SEAL AI Scoring Engine
 * Scores suppliers based on price, quality, reliability, and MOQ
 */

export function scoreSuppliers(suppliers, userRequirements) {
  const { budget = 50000, quantity = 1000 } = userRequirements;
  const budgetPerUnit = budget / quantity;

  const scored = suppliers.map((supplier) => {

    // ── 1. Price Score (0–100) ────────────────────────────────────────────────
    let priceScore = 50;
    if (supplier.price > 0 && budgetPerUnit > 0) {
      if (supplier.price <= budgetPerUnit) {
        priceScore = Math.min(
          100,
          Math.round((budgetPerUnit / supplier.price) * 50)
        );
      } else {
        priceScore = Math.max(
          0,
          Math.round(
            100 - ((supplier.price - budgetPerUnit) / budgetPerUnit) * 100
          )
        );
      }
    }

    // ── 2. Quality Score (0–100) ──────────────────────────────────────────────
    const ratingScore = ((supplier.rating || 0) / 5) * 60;
    const reviewScore = Math.min(40, ((supplier.reviews || 0) / 2000) * 40);
    const qualityScore = Math.round(ratingScore + reviewScore);

    // ── 3. Reliability Score (0–100) ──────────────────────────────────────────
    const responseScore = ((supplier.responseRate || 0) / 100) * 40;
    const yearsScore = Math.min(30, (supplier.yearsInBusiness || 0) * 2);
    const verifiedScore = supplier.verified ? 30 : 0;
    const reliabilityScore = Math.round(responseScore + yearsScore + verifiedScore);

    // ── 4. MOQ Score (0–100) ──────────────────────────────────────────────────
    let moqScore = 50;
    if (supplier.moq > 0) {
      if (supplier.moq <= quantity) {
        moqScore = Math.min(
          100,
          Math.round((quantity / supplier.moq) * 50)
        );
      } else {
        moqScore = Math.max(
          0,
          Math.round(
            100 - ((supplier.moq - quantity) / quantity) * 100
          )
        );
      }
    }

    // ── 5. Final Weighted AI Score ────────────────────────────────────────────
    const aiScore = Math.round(
      priceScore       * 0.25 +
      qualityScore     * 0.30 +
      reliabilityScore * 0.30 +
      moqScore         * 0.15
    );

    // ── 6. Qualification gate ─────────────────────────────────────────────────
    const isQualified =
      aiScore >= 60 &&
      (supplier.rating || 0) >= 4.0 &&
      (supplier.responseRate || 0) >= 80;

    return {
      ...supplier,
      priceScore,
      qualityScore,
      reliabilityScore,
      moqScore,
      aiScore,
      isQualified,
    };
  });

  // Best score first
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
  if ((supplier.rating || 0) < 4.0)
    return `Rating too low (${supplier.rating})`;
  if ((supplier.responseRate || 0) < 80)
    return `Response rate too low (${supplier.responseRate}%)`;
  if ((supplier.aiScore || 0) < 60)
    return `AI score too low (${supplier.aiScore}/100)`;
  return "Did not meet quality threshold";
}