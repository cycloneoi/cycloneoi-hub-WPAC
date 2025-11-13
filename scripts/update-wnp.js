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

const catalog = {
  basin: "WPAC",
  lastUpdate: new Date().toISOString(),
  systems: [] // ← pour l'instant, aucun système actif (on branchera ECMWF après)
};

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");

console.log("Catalogue WNP mis à jour :", catalogPath);
