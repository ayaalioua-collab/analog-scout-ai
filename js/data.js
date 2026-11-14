// ILLUSTRATIVE VALUES ONLY. Replace with features computed from real DEM data
// (see README, "Replacing the demo data").
// relief = local relief in metres, slope = mean slope in degrees,
// rough = roughness index 0..1, geo = rock class key from GEO_LABELS.

const GEO_LABELS = { basalt: "Basalt", tuff: "Volcanic ash", sed: "Sedimentary", cryst: "Crystalline" };

// Similarity between rock classes (0..1). Ask a geologist to tune this table.
const GEO_SIM = {
  "basalt|basalt": 1, "basalt|tuff": 0.7, "basalt|sed": 0.3, "basalt|cryst": 0.4,
  "tuff|tuff": 1, "tuff|sed": 0.3, "tuff|cryst": 0.3,
  "sed|sed": 1, "sed|cryst": 0.2, "cryst|cryst": 1
};

const REFERENCES = {
  mars: [
    { id: "jez",  name: "Jezero Crater",        relief: 1600, slope: 12, rough: 0.55, geo: "basalt" },
    { id: "gale", name: "Gale Crater",          relief: 4500, slope: 9,  rough: 0.50, geo: "sed" }
  ],
  moon: [
    { id: "shk", name: "Shackleton Crater",     relief: 4200, slope: 18, rough: 0.72, geo: "cryst" },
    { id: "tqm", name: "Mare Tranquillitatis",  relief: 300,  slope: 3,  rough: 0.20, geo: "basalt" }
  ]
};

const EARTH_SITES = [
  { name: "Hoggar, Algeria",          relief: 1800, slope: 14, rough: 0.62, geo: "basalt" },
  { name: "Tassili, Algeria",         relief: 1400, slope: 13, rough: 0.60, geo: "sed" },
  { name: "Tibesti, Chad",            relief: 2200, slope: 16, rough: 0.70, geo: "basalt" },
  { name: "Atacama, Chile",           relief: 900,  slope: 6,  rough: 0.30, geo: "sed" },
  { name: "Death Valley, USA",        relief: 1500, slope: 10, rough: 0.48, geo: "tuff" },
  { name: "Craters of the Moon, USA", relief: 700,  slope: 11, rough: 0.58, geo: "basalt" },
  { name: "Mauna Kea, Hawaii",        relief: 4200, slope: 12, rough: 0.55, geo: "basalt" },
  { name: "Haughton Crater, Canada",  relief: 300,  slope: 7,  rough: 0.40, geo: "sed" },
  { name: "Lut Desert, Iran",         relief: 480,  slope: 5,  rough: 0.35, geo: "sed" }
];
