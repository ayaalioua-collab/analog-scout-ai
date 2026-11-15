
  const selectedRow = document.querySelector(
    function getAnalysisContext() {
    '.row[aria-selected="true"]'
  );

  const selectedIndex = selectedRow
    ? Number(selectedRow.dataset.i)
    : 0;

  const currentResults =
    typeof results !== "undefined" ? results : [];

  const topFive = currentResults.slice(0, 5).map((result, index) => ({
    rank: index + 1,
    name: result.site.name,
    id: result.site.id,
    country: result.site.country,
    similarity: result.score,
    difference: result.difference,
    distance: result.D,
    availableFeatures: result.activeFeatures
  }));

  const selectedResult =
    currentResults[selectedIndex] || currentResults[0] || null;

  let selectedAnalog = null;

  if (selectedResult && reference) {
    const result = selectedResult;
    const site = result.site;

    selectedAnalog = {
      name: site.name,
      id: site.id,
      country: site.country,

      similarity: result.score,
      difference: result.difference,
      distance: result.D,

      availableFeatures: result.activeFeatures,

      featureComparison: features.map(feature => {
        const detail = result.featureDetails[feature.k] || null;
        const contribution = result.sq[feature.k] ?? null;

        return {
          feature: feature.label,
          key: feature.k,
          unit: feature.unit,

          referenceValue: reference[feature.k],
          earthValue: site[feature.k],

          rawDifference: detail?.rawDifference ?? null,

          normalizedDifference: detail
            ? Math.abs(detail.earth - detail.reference)
            : null,

          activeWeight: detail?.activeWeight ?? null,

          contributionPercent:
            contribution !== null && result.D > 0
              ? 100 * contribution / (result.D ** 2)
              : 0
        };
      }),

      geology: site.geology,
      regolith: site.regolith,
      missionUse: site.mission_use,
      environmentalLimitations: site.environment_limits,
      dataSource: site.data_source,

      interpretation: Engine.explain(result)
    };
  }

  return {
    project: "Analog Scout AI",

    analysisStatus: reference
      ? "Analysis completed"
      : "No reference selected",

    reference: reference
      ? {
          name: reference.name,
          planet: reference.planet,
          features: features.map(feature => ({
            name: feature.label,
            value: reference[feature.k],
            unit: feature.unit
          }))
        }
      : null,

    method: {
      scaling: "Min-Max normalization",
      distance: "Weighted Euclidean distance",
      similarityFormula: "100 * exp(-D)",
      originalWeights: "20% per feature",
      missingValues:
        "Missing measurements excluded; remaining weights renormalized"
    },

    topFiveEarthAnalogs: topFive,
    selectedAnalog,

    instructions: [
      "Use the supplied reference, top five Earth analogs, and selected analog data.",
      "Answer using only the information available in the supplied context.",
      "Identify sites by their exact names or IDs.",
      "Never treat missing values as zero.",
      "Do not confuse documented site information with proposed research applications.",
      "Never invent measurements, scores, distances, or rankings.",
      "Never recalculate similarity scores.",
      "Preserve missing values.",
      "Distinguish numerical terrain similarity from geological similarity.",
      "Distinguish documented information from research proposals.",
      "State when requested information is unavailable."
    ]
  };
}
