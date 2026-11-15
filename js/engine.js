
// ANALOG SCOUT AI — Scientific Similarity Engine
// Method: MinMaxScaler + weighted Euclidean distance
// Five numerical features, equal weights, pairwise missing-value handling.

const Engine = (() => {
  const FEATURES = [
    { k: "slope", label: "Slope", unit: "°", w: 20, db: "slope_deg" },
    { k: "roughness", label: "Surface Roughness", unit: "", w: 20, db: "roughness_rms" },
    { k: "albedo", label: "Albedo", unit: "", w: 20, db: "albedo" },
    { k: "thermal", label: "Thermal Inertia", unit: "", w: 20, db: "thermal_inertia" },
    { k: "relief", label: "Local Relief", unit: " m", w: 20, db: "local_relief_m" }
  ];

  const WEIGHTS = {
    slope: 0.20,
    roughness: 0.20,
    albedo: 0.20,
    thermal: 0.20,
    relief: 0.20
  };

  function numericValue(value) {
    if (value === null || value === undefined || value === "") {
      return NaN;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  // Apply Min-Max scaling to all supplied sites.
  // Missing values remain missing.
  function scaler(sites) {
    const ranges = {};

    FEATURES.forEach(feature => {
      const values = sites
        .map(site => numericValue(site[feature.k]))
        .filter(Number.isFinite);

      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;

      ranges[feature.k] = { min, max };
    });

    return ranges;
  }

  function normalize(value, range) {
    const number = numericValue(value);

    if (!Number.isFinite(number)) return NaN;

    const span = range.max - range.min;

    return span === 0
      ? 0
      : (number - range.min) / span;
  }

  // Rank Earth analogs against one planetary reference.
  function rank(reference, earthSites, allSites) {
    const ranges = scaler(allSites);

    return earthSites.map(site => {
      const differences = {};
      const activeFeatures = [];

      let activeWeightSum = 0;

      FEATURES.forEach(feature => {
        const refValue = normalize(
          reference[feature.k],
          ranges[feature.k]
        );

        const earthValue = normalize(
          site[feature.k],
          ranges[feature.k]
        );

        if (
          Number.isFinite(refValue) &&
          Number.isFinite(earthValue)
        ) {
          differences[feature.k] = {
            reference: refValue,
            earth: earthValue,
            rawDifference: Math.abs(
              numericValue(reference[feature.k]) -
              numericValue(site[feature.k])
            ),
            weight: WEIGHTS[feature.k]
          };

          activeFeatures.push(feature);
          activeWeightSum += WEIGHTS[feature.k];
        }
      });

      if (activeWeightSum === 0) {
        return null;
      }

      let sum = 0;
      const sq = {};

      activeFeatures.forEach(feature => {
        const item = differences[feature.k];
        const activeWeight = item.weight / activeWeightSum;

        item.activeWeight = activeWeight;

        const delta = item.earth - item.reference;
        sq[feature.k] = activeWeight * delta ** 2;

        sum += sq[feature.k];
      });

      const D = Math.sqrt(sum);
      const similarity = 100 * Math.exp(-D);
      const score = Math.round(similarity * 10) / 10;

      return {
        site,
        sq,
        D,
        score,
        similarity: score,
        difference: Math.round((100 - score) * 10) / 10,
        activeFeatures: activeFeatures.map(feature => feature.k),
        featureDetails: differences,
        activeWeightSum
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  }

  // Generate a scientific interpretation from calculated results.
  function explain(result) {
    if (!result || !result.activeFeatures.length) {
      return "Insufficient shared numerical features for a scientific comparison.";
    }

    const labels = Object.fromEntries(
      FEATURES.map(feature => [feature.k, feature.label])
    );

    const totalSquaredDistance = Object.values(result.sq)
      .reduce((sum, value) => sum + value, 0);

    const ranked = [...result.activeFeatures].map(key => {
      const item = result.featureDetails[key];

      const contributionPercent = totalSquaredDistance > 0
        ? (result.sq[key] / totalSquaredDistance) * 100
        : 0;

      return {
        key,
        label: labels[key] || key,
        contribution: result.sq[key],
        contributionPercent,
        rawDifference: item.rawDifference
      };
    }).sort((a, b) => a.contribution - b.contribution);

    const closest = ranked[0];
    const mostDifferent = ranked[ranked.length - 1];

    const strongestMatches = ranked
      .slice(0, 2)
      .map(item => item.label);

    const majorDifferences = ranked
      .slice(-2)
      .reverse()
      .map(item => item.label);

    let interpretation =
      `The Earth site achieves a terrain similarity score of ${result.score.toFixed(1)}% ` +
      `with the planetary reference site. `;

    if (totalSquaredDistance > 0) {
      interpretation +=
        `The smallest contribution to the distance comes from ${closest.label} ` +
        `(${closest.contributionPercent.toFixed(1)}%). `;

      interpretation +=
        `The largest contribution comes from ${mostDifferent.label}, ` +
        `accounting for ${mostDifferent.contributionPercent.toFixed(1)}% ` +
        `of the total weighted squared distance. `;
    } else {
      interpretation +=
        `All available numerical features match after normalization, ` +
        `resulting in zero weighted distance. `;
    }

    interpretation +=
      `The two smallest distance contributions are associated with ` +
      `${strongestMatches.join(" and ")}, while the largest differences ` +
      `are associated with ${majorDifferences.join(" and ")}. `;

    interpretation +=
      `${result.activeFeatures.length} out of 5 terrain features were available. `;

    if (result.activeFeatures.length < 5) {
      interpretation +=
        `Missing measurements were excluded and the remaining feature weights were renormalized. `;
    }

    interpretation +=
      `The score measures similarity across the available numerical terrain features only. ` +
      `It does not establish geological equivalence, environmental safety, ` +
      `or suitability for a landing site or permanent human settlement.`;

    return interpretation;
  }

  return {
    FEATURES,
    WEIGHTS,
    scaler,
    rank,
    explain
  };
})();
