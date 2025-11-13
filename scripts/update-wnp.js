import fs from "node:fs";
import path from "node:path";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Dossier data/ à la racine du dépôt
const dataDir = path.resolve("data");
ensureDir(dataDir);

const catalogPath = path.join(dataDir, "wnp-catalog.json");

// Pour l'instant : un système de test, FUNG WONG.
// On pourra ensuite ajouter d'autres systèmes ici.
const systems = [
  {
    id: "32W",
    name: "FUNG WONG",
    year: 2025,
    basin: "WPAC",
    center: "ECMWF",
    advisoryTime: "2025-11-13 00Z · offset D-8",
    strikeUrl:
      "https://charts.ecmwf.int/products/cyclone?base_time=202511130000&offset=D-8&product=tc_strike_aifs_ens&unique_id=32W_FUNGWONG_2025",
    plumesUrl:
      "https://charts.ecmwf.int/products/cyclone?base_time=202511130000&offset=D-8&product=tc_plumes_aifs_ens&unique_id=32W_FUNGWONG_2025"
  }
];

const catalog = {
  basin: "WPAC",
  lastUpdate: new Date().toISOString(),
  systems
};

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");

console.log("Catalogue WNP mis à jour :", catalogPath);
