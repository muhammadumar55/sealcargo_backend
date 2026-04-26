export function scoreSuppliers(suppliers, userRequirements) {
  const { budget = 50000, quantity = 1000 } = userRequirements;
  const budgetPerUnit = budget / quantity;

  const prices = suppliers.map(s => s.price).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice || 1;

  const scored = suppliers.map((supplier, idx) => {

    // ─── Price Score ───
    let priceScore = 50;
    if (supplier.price > 0) {
      const relativeScore = ((maxPrice - supplier.price) / priceRange) * 50;
      const budgetScore =
        supplier.price <= budgetPerUnit
          ? 50
          : Math.max(0, 50 - ((supplier.price - budgetPerUnit) / budgetPerUnit) * 50);

      priceScore = Math.round(Math.min(100, relativeScore + budgetScore));
    }

    // ─── Quality Score ───
    const rating = supplier.rating || 4.0;
    const reviews = supplier.reviews || 0;
    const qualityScore = Math.round((rating / 5) * 100 * 0.7 + Math.min(30, reviews / 50));

    // ─── Reliability Score ───
    const responseRate = supplier.responseRate || 85;
    const yearsInBusiness = supplier.yearsInBusiness || 3;
    const reliabilityScore = Math.round(
      responseRate * 0.5 +
      Math.min(50, yearsInBusiness * 5)
    );

    // ─── Final AI Score ───
    const aiScore = Math.round(
      priceScore * 0.35 +
      qualityScore * 0.30 +
      reliabilityScore * 0.25 +
      10
    );

    return {
      ...supplier,
      priceScore,
      qualityScore,
      reliabilityScore,
      aiScore,
      isQualified: true // ✅ Always true now
    };
  });

  return scored.sort((a, b) => b.aiScore - a.aiScore);
}

export function categorizeSuppliers(scoredSuppliers) {
  return {
    topSuppliers: scoredSuppliers.slice(0, 9),
    filteredOut: [],
    totalAnalyzed: scoredSuppliers.length,
    qualifiedCount: scoredSuppliers.length,
  };
}