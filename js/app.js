// UI logic only. All scoring lives in engine.js, all data in data.js.

const $ = id => document.getElementById(id);
let results = [];

function init() {
  $("ws").innerHTML = Engine.FEATURES.map(f =>
    `<div class="w"><label class="lbl" for="w_${f.k}">${f.label}</label><span id="v_${f.k}">${f.w}</span></div>` +
    `<input type="range" id="w_${f.k}" min="0" max="100" value="${f.w}">`).join("");
  Engine.FEATURES.forEach(f =>
    $("w_" + f.k).addEventListener("input", e => { $("v_" + f.k).textContent = e.target.value; }));
  document.querySelectorAll("input[name=pl]").forEach(r => r.addEventListener("change", fillSites));
  $("go").addEventListener("click", run);
  fillSites();
}

function fillSites() {
  const planet = document.querySelector("input[name=pl]:checked").value;
  $("site").innerHTML = REFERENCES[planet].map(r => `<option value="${r.id}">${r.name}</option>`).join("");
  run();
}

function readWeights() {
  const raw = {}; let sum = 0;
  Engine.FEATURES.forEach(f => { raw[f.k] = +$("w_" + f.k).value; sum += raw[f.k]; });
  Engine.FEATURES.forEach(f => { raw[f.k] = sum ? raw[f.k] / sum : 0.25; });
  return raw;
}

function fmt(f, obj) { return f.k === "geo" ? GEO_LABELS[obj.geo] : obj[f.k] + f.unit; }

function run() {
  const planet = document.querySelector("input[name=pl]:checked").value;
  const ref = REFERENCES[planet].find(r => r.id === $("site").value);
  results = Engine.rank(ref, EARTH_SITES, readWeights());

  $("ref").innerHTML = `<b>${ref.name}</b>: relief ${ref.relief} m, slope ${ref.slope}°, roughness ${ref.rough}, geology ${GEO_LABELS[ref.geo]}`;
  $("list").innerHTML = results.map((r, i) =>
    `<div class="row" role="option" tabindex="0" data-i="${i}" aria-selected="${i === 0}">` +
    `<span class="rk">${i + 1}</span><div><div class="nm">${r.site.name}</div>` +
    `<div class="bar"><i style="width:${r.score.toFixed(0)}%"></i></div></div>` +
    `<span class="sc">${r.score.toFixed(0)}%</span></div>`).join("");

  document.querySelectorAll(".row").forEach(el => {
    const pick = () => show(+el.dataset.i, ref);
    el.addEventListener("click", pick);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
  });
  show(0, ref);
}

function show(i, ref) {
  document.querySelectorAll(".row").forEach(el => el.setAttribute("aria-selected", +el.dataset.i === i));
  const r = results[i];
  const rows = Engine.FEATURES.map(f =>
    `<tr><td>${f.label}</td><td>${fmt(f, ref)}</td><td>${fmt(f, r.site)}</td>` +
    `<td><div class="mini"><i style="width:${r.total ? (100 * r.sq[f.k] / r.total).toFixed(0) : 0}%"></i></div></td></tr>`).join("");
  $("detail").innerHTML =
    `<h3>${r.site.name}</h3><p class="note" style="margin:0">Similarity ${r.score.toFixed(1)}, distance ${r.D.toFixed(2)}</p>` +
    `<table><thead><tr><th>Feature</th><th>Reference</th><th>Earth</th><th>Share of difference</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<p class="why">${Engine.explain(r)}</p>`;
}

init();
