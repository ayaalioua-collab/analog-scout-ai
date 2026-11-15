const completeDataset =
    typeof allSites !== "undefined"
      ? allSites.map(site => ({
          id: site.id,
          name: site.name,
          planet: site.planet,
          country: site.country,
          targetSiteId: site.target_site_id,

          features: {
            slope: site.slope,
            roughness: site.roughness,
            albedo: site.albedo,
            thermalInertia: site.thermal,
            localRelief: site.relief
          },

          coordinates: {
            latitude: site.latitude,
            longitude: site.longitude
          },

          geology: site.geology,
          regolith: site.regolith,
          missionUse: site.mission_use,
          environmentalLimitations: site.environment_limits,
          dataSource: site.data_source,

          dataNotes: {
            slope: site.slope_raw_note,
            roughness: site.roughness_raw_note,
            localRelief: site.local_relief_raw_note,
            source: site.source_notes
          }
        }))
      : [];

  const selectedRow = document.querySelector(
    '.row[aria-selected="true"]'
  );

  const selectedIndex = selectedRow
    ? Number(selectedRow.dataset.i)
    : 0;

  const currentResults =
    typeof results !== "undefined" ? results : [];

  const topFive = currentResults.map((result, index) => ({
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
        completeDataset,

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
      "Use completeDataset to answer questions about any of the 48 sites.",
      "You can compare Earth, Mars, and Moon sites using their supplied records.",
      "When asked about a site, identify it by its exact name or ID.",
      "Use only the fields available for that site.",
      "Never treat missing values as zero.",
      "Do not confuse documented site information with proposed research applications.",
      "Use only supplied project data.",
      "Never invent measurements, scores, distances, or rankings.",
      "Never recalculate similarity scores.",
      "Preserve missing values.",
      "Distinguish numerical terrain similarity from geological similarity.",
      "Distinguish documented information from research proposals.",
      "State when requested information is unavailable."
    ]
  };
}
