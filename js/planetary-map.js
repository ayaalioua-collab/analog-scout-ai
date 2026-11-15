
// ANALOG SCOUT AI — NASA Planetary Globe
// NASA WMTS imagery + CesiumJS 3D globe

(() => {
  const state = {
    viewer: null,
    mode: "mars",
    data: {
      allSites: [],
      references: {},
      results: [],
      reference: null
    }
  };

  
const PLANETS = {
  earth: {
    radius: 6378137,
    polarRadius: 6356752.314245,
    name: "EARTH",
    layer: "BlueMarble_NextGeneration",
    tileMatrixSetID: "500m",
    maximumLevel: 7,
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/default/500m/{TileMatrix}/{TileRow}/{TileCol}.jpeg"
  },

  mars: {
    radius: 3396190,
    polarRadius: 3376200,
    name: "MARS",
    layer: "Mars_MGS_MOLA_ClrShade_merge_global_463m",
    tileMatrixSetID: "default028mm",
    maximumLevel: 8,
    url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg"
  },

  moon: {
    radius: 1737400,
    polarRadius: 1737400,
    name: "MOON",
    layer: "LRO_WAC_Mosaic_Global_303ppd_v02",
    tileMatrixSetID: "default028mm",
    maximumLevel: 8,
    url: "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg"
  }
};


  const $ = id => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function initializeMap() {
    const container = $("planet-map-view");

    if (!container || !window.Cesium) {
      console.error("CesiumJS or map container is unavailable.");
      return;
    }

    container.innerHTML = `
      <div class="analog-map-interface">
        <div class="analog-map-toolbar">
          <button class="analog-map-tab active" data-planet="mars">MARS</button>
          <button class="analog-map-tab" data-planet="moon">MOON</button>
          <button class="analog-map-tab" data-planet="earth">EARTH</button>
        </div>

        <div class="analog-map-layout">
          <div class="analog-globe-container" id="analog-globe"></div>

          <aside class="analog-map-info" id="analog-map-info">
            <span class="analog-map-label">LOCATION INTELLIGENCE</span>
            <h3>Select a location</h3>
            <p>Click a marker to explore its scientific information.</p>
          </aside>
        </div>

        <div class="analog-map-legend">
          <span><i class="legend-reference"></i> Reference sites</span>
          <span><i class="legend-analog"></i> Top 5 Earth analogs</span>
          <span><i class="legend-earth"></i> Other Earth sites</span>
        </div>
      </div>
    `;

    container.querySelectorAll(".analog-map-tab").forEach(button => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.planet;

        container.querySelectorAll(".analog-map-tab").forEach(tab => {
          tab.classList.toggle("active", tab === button);
        });

        createPlanetViewer();
      });
    });

    createPlanetViewer();
  }

  function createPlanetViewer() {
    if (!window.Cesium) return;

    if (state.viewer && !state.viewer.isDestroyed()) {
      state.viewer.destroy();
    }

    const planet = PLANETS[state.mode];

    const ellipsoid = new Cesium.Ellipsoid(
      planet.radius,
      planet.radius,
      planet.polarRadius
    );

    const viewer = new Cesium.Viewer("analog-globe", {
      globe: new Cesium.Globe(ellipsoid),
      baseLayer: false,
      baseLayerPicker: false,
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyBox: false,
      skyAtmosphere: false
    });

    state.viewer = viewer;

    viewer.scene.backgroundColor =
      Cesium.Color.fromCssColorString("#050816");

    viewer.scene.globe.baseColor =
      Cesium.Color.fromCssColorString("#10182b");

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.showGroundAtmosphere = false;

    if (planet.url) {
  loadNASAImagery(viewer, planet);
}

    renderMarkers(viewer);

    viewer.selectedEntityChanged.addEventListener(entity => {
      if (entity && entity.siteData) {
        showSiteInfo(entity.siteData);
      }
    });

    viewer.camera.setView({
      destination: new Cesium.Cartesian3(
        0,
        -planet.radius * 3,
        0
      ),
      orientation: {
        direction: new Cesium.Cartesian3(0, 1, 0),
        up: new Cesium.Cartesian3(0, 0, 1)
      }
    });
  }

  function loadNASAImagery(viewer, planet) {
    try {
      const provider =
        new Cesium.WebMapTileServiceImageryProvider({
          url: planet.url,
          layer: planet.layer,
          style: "default",
          format: "image/jpeg",
          tileMatrixSetID: planet.tileMatrixSetID,
          tilingScheme: new Cesium.GeographicTilingScheme({
            ellipsoid: viewer.scene.globe.ellipsoid
          }),
          maximumLevel: planet.maximumLevel,
          credit: new Cesium.Credit(
            "NASA / JPL / LRO / MGS MOLA"
          ),
          enablePickFeatures: false
        });

      viewer.imageryLayers.addImageryProvider(provider);

    } catch (error) {
      console.error("NASA imagery loading error:", error);
    }
  }

  function getReferenceIds() {
    return new Set(
      Object.values(state.data.references || {})
        .filter(Boolean)
        .map(site => site.site_id || site.id)
    );
  }

  function getTopAnalogIds() {
    return new Set(
      (state.data.results || [])
        .slice(0, 5)
        .map(result =>
          result.site?.site_id || result.site?.id
        )
        .filter(Boolean)
    );
  }

  function renderMarkers(viewer) {
    const sites = state.data.allSites || [];

    const referenceIds = getReferenceIds();
    const topAnalogIds = getTopAnalogIds();

    const visibleSites = sites.filter(site => {
      if (state.mode === "earth") {
        return site.planet === "earth";
      }

      return site.planet === state.mode;
    });

    visibleSites.forEach(site => {
      const latitude = Number(site.latitude);
      const longitude = Number(site.longitude);

      if (!Number.isFinite(latitude) ||
          !Number.isFinite(longitude)) return;

      const id = site.site_id || site.id;

      const isReference = referenceIds.has(id);
      const isTopAnalog =
        state.mode === "earth" && topAnalogIds.has(id);

      let color = Cesium.Color.fromCssColorString("#8295b5");

      if (isReference) {
        color = Cesium.Color.fromCssColorString("#c084fc");
      } else if (isTopAnalog) {
        color = Cesium.Color.fromCssColorString("#39f5ff");
      }

      viewer.entities.add({
        name: site.name,
        position: Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude
        ),
        point: {
          pixelSize: isTopAnalog || isReference ? 11 : 7,
          color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1
        },
        label: {
          text: site.name || id,
          font: "11px sans-serif",
          fillColor: Cesium.Color.WHITE,
          show: false,
          pixelOffset: new Cesium.Cartesian2(0, -18)
        },
        siteData: site
      });
    });
  }

  function showSiteInfo(site) {
    const panel = $("analog-map-info");
    if (!panel) return;

    const id = site.site_id || site.id;

    const result = (state.data.results || []).find(item =>
      (item.site?.site_id || item.site?.id) === id
    );

    const score = result
      ? `<div class="analog-info-score">
           <span>SIMILARITY SCORE</span>
           <strong>${Number(result.score).toFixed(1)}%</strong>
         </div>`
      : "";

    panel.innerHTML = `
      <span class="analog-map-label">LOCATION INTELLIGENCE</span>
      <h3>${escapeHTML(site.name)}</h3>

      <span class="analog-site-planet">
        ${escapeHTML(site.planet.toUpperCase())}
      </span>

      ${site.country
        ? `<p>${escapeHTML(site.country)}</p>`
        : ""}

      ${score}

      <div class="analog-info-coordinates">
        <div>
          <span>LATITUDE</span>
          <strong>${Number(site.latitude).toFixed(4)}°</strong>
        </div>
        <div>
          <span>LONGITUDE</span>
          <strong>${Number(site.longitude).toFixed(4)}°</strong>
        </div>
      </div>

      <div class="analog-info-details">
        ${infoRow("Geology", site.geology)}
        ${infoRow("Regolith", site.regolith)}
        ${infoRow("Mission use", site.mission_use)}
        ${infoRow("Environment limits", site.environment_limits)}
        ${infoRow("Data source", site.data_source)}
      </div>
    `;
  }

  function infoRow(label, value) {
    if (!value) return "";

    return `
      <div class="analog-info-row">
        <span>${escapeHTML(label)}</span>
        <p>${escapeHTML(value)}</p>
      </div>
    `;
  }

  window.updateAnalogGlobe = function(data) {
    state.data = {
      ...state.data,
      ...data
    };

    if (!state.viewer || state.viewer.isDestroyed()) {
      initializeMap();
    } else {
      state.viewer.entities.removeAll();
      renderMarkers(state.viewer);
    }
  };

  window.addEventListener("resize", () => {
    if (state.viewer && !state.viewer.isDestroyed()) {
      state.viewer.resize();
    }
  });

})();
