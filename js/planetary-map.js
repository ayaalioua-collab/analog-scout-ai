
// ANALOG SCOUT AI — Interactive 3D Planetary Map
// Uses Globe.gl to display Mars, Moon and Earth locations.

(() => {
  const state = {
    globe: null,
    mode: "mars",
    data: {
      allSites: [],
      references: {},
      results: [],
      reference: null
    },
    selectedSite: null
  };

  const textures = {
    earth: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    mars: "https://unpkg.com/three-globe/example/img/mars.jpg",
    moon: "https://unpkg.com/three-globe/example/img/moon.jpg"
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function initializeMap() {
    const container = getElement("planet-map-view");

    if (!container || typeof Globe !== "function") {
      console.warn("Planetary map container or Globe.gl is unavailable.");
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
            <p>Click a marker on the planetary globe to explore its scientific information.</p>
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

        renderGlobe();
      });
    });

    state.globe = Globe()(getElement("analog-globe"))
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor("#36cfff")
      .atmosphereAltitude(0.16)
      .pointLat("latitude")
      .pointLng("longitude")
      .pointAltitude(point => point.isTopAnalog ? 0.035 : 0.018)
      .pointRadius(point => point.isTopAnalog ? 0.42 : 0.28)
      .pointColor(point => {
        if (point.isReference) return "#c084fc";
        if (point.isTopAnalog) return "#39f5ff";
        return "#8295b5";
      })
      .pointLabel(point => `
        <div style="padding:8px;color:#fff;background:#10182b;border:1px solid #39f5ff;border-radius:8px;">
          <strong>${escapeHTML(point.name)}</strong><br>
          <small>${escapeHTML(point.planet.toUpperCase())}</small>
        </div>
      `)
      .onPointClick(point => showSiteInfo(point));

    renderGlobe();

    window.addEventListener("resize", resizeGlobe);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function getSitesForMode() {
    const sites = state.data.allSites;

    if (state.mode === "earth") {
      return sites.filter(site => site.planet === "earth");
    }

    return sites.filter(site => site.planet === state.mode);
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
        .map(result => result.site?.site_id || result.site?.id)
        .filter(Boolean)
    );
  }

  function renderGlobe() {
    if (!state.globe) return;

    const sites = getSitesForMode();

    const points = sites
      .filter(site =>
        Number.isFinite(Number(site.latitude)) &&
        Number.isFinite(Number(site.longitude))
      )
      .map(site => ({
        ...site,
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
        isReference: getReferenceIds().has(site.site_id || site.id),
        isTopAnalog:
          state.mode === "earth" &&
          getTopAnalogIds().has(site.site_id || site.id)
      }));

    state.globe
      .globeImageUrl(textures[state.mode])
      .pointsData(points);

    if (state.mode === "earth") {
      state.globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1000);
    } else {
      state.globe.pointOfView({ lat: 0, lng: 0, altitude: 1.8 }, 1000);
    }

    state.selectedSite = null;
  }

  function showSiteInfo(site) {
    state.selectedSite = site;

    const panel = getElement("analog-map-info");
    if (!panel) return;

    const matchingResult = (state.data.results || []).find(result =>
      (result.site?.site_id || result.site?.id) ===
      (site.site_id || site.id)
    );

    const score = matchingResult
      ? `<div class="analog-info-score">
           <span>SIMILARITY SCORE</span>
           <strong>${Number(matchingResult.score).toFixed(1)}%</strong>
         </div>`
      : "";

    panel.innerHTML = `
      <span class="analog-map-label">LOCATION INTELLIGENCE</span>
      <h3>${escapeHTML(site.name)}</h3>
      <span class="analog-site-planet">${escapeHTML(site.planet.toUpperCase())}</span>
      ${site.country ? `<p>${escapeHTML(site.country)}</p>` : ""}
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

  function resizeGlobe() {
    const element = getElement("analog-globe");

    if (!state.globe || !element) return;

    state.globe.width(element.clientWidth);
    state.globe.height(element.clientHeight);
  }

  window.updateAnalogGlobe = function (data) {
    state.data = {
      ...state.data,
      ...data
    };

    if (!state.globe) {
      initializeMap();
    } else {
      renderGlobe();
    }
  };

})();
