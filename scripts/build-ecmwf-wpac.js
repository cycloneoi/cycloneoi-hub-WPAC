// scripts/build-ecmwf-wpac.js
// Transforme wnp-catalog.json -> ecmwf-wpac.json (format pour le Hub)

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

const WNP_CATALOG_PATH = path.join(DATA_DIR, "wnp-catalog.json");
const OUTPUT_PATH = path.join(DATA_DIR, "ecmwf-wpac.json");

function log(msg) {
  console.log(`[build-ecmwf-wpac] ${msg}`);
}

async function main() {
  log("Lecture du catalogue WNP…");

  let catalog;
  try {
    const raw = await fs.readFile(WNP_CATALOG_PATH, "utf8");
    catalog = JSON.parse(raw);
  } catch (err) {
    log(`ERREUR: impossible de lire ${WNP_CATALOG_PATH}`);
    log(String(err));
    process.exit(1);
  }

  const systems = Array.isArray(catalog.systems) ? catalog.systems : [];

  const out = {
    basin: "WPAC",
    lastUpdate: catalog.lastUpdate || new Date().toISOString(),
    systems: [],
  };

  if (!systems.length) {
    log("Aucun système actif → on écrit un fichier vide.");
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
    log(`Écrit: ${OUTPUT_PATH}`);
    return;
  }

  for (const sys of systems) {
    out.systems.push({
      id: sys.id || "UNKNOWN",
      name: sys.name || sys.id || "Système",
      year: sys.year || null,
      basin: sys.basin || catalog.basin || "WPAC",
      center: sys.center || "ECMWF",
      advisoryTime: sys.advisoryTime || null,

      // Pour l’instant, on réutilise les liens HTML du catalogue existant.
      // (Étape suivante: on pointera vers des PNG locaux si tu veux)
      strikeUrl: sys.strikeUrl || null,
      plumesUrl: sys.plumesUrl || null,
    });
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  log(`Écrit: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  log("ERREUR FATALE:");
  console.error(err);
  process.exit(1);
});
