// scripts/build-ecmwf-wpac.js
// Lit data/wnp-catalog.json et génère data/ecmwf-wpac.json
// avec des URLs PNG directes (pas de téléchargement).

import fs from "node:fs";
import path from "node:path";

// Dossiers et chemins
const dataDir = path.resolve("data");
const catalogPath = path.join(dataDir, "wnp-catalog.json");
const outputPath = path.join(dataDir, "ecmwf-wpac.json");

function log(msg) {
  console.log(`[build-ecmwf-wpac] ${msg}`);
}

// Parse une URL de type "products/cyclone?base_time=...&product=...&offset=...&unique_id=..."
function parseProductUrl(pageUrl) {
  if (!pageUrl) return null;
  try {
    const u = new URL(pageUrl);
    return {
      base_time: u.searchParams.get("base_time"),
      product: u.searchParams.get("product"),
      offset: u.searchParams.get("offset"),
      unique_id: u.searchParams.get("unique_id"),
    };
  } catch (err) {
    log(`⚠️ URL invalide: ${pageUrl}`);
    return null;
  }
}

// Construit l'URL PNG OpenCharts à partir des paramètres
function buildPngUrl(info) {
  if (!info || !info.base_time || !info.product) return null;

  const api = new URL(
    "https://charts.ecmwf.int/opencharts-api/v1/products/cyclone/"
  );
  api.searchParams.set("format", "png");
  api.searchParams.set("product", info.product);
  api.searchParams.set("base_time", info.base_time);

  if (info.offset) api.searchParams.set("offset", info.offset);
  if (info.unique_id) api.searchParams.set("unique_id", info.unique_id);

  return api.toString();
}

function main() {
  log("Lecture du catalogue WNP…");

  if (!fs.existsSync(catalogPath)) {
    log(`❌ Fichier introuvable: ${catalogPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(catalogPath, "utf-8");
  const catalog = JSON.parse(raw);

  const systemsIn = Array.isArray(catalog.systems) ? catalog.systems : [];

  const out = {
    basin: catalog.basin || "WPAC",
    lastUpdate: catalog.lastUpdate || new Date().toISOString(),
    systems: [],
  };

  if (!systemsIn.length) {
    log("Aucun système actif → fichier ecmwf-wpac.json vide.");
    fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), "utf-8");
    log(`Écrit: ${outputPath}`);
    return;
  }

  for (const sys of systemsIn) {
    const id = sys.id || "UNKNOWN";
    const name = sys.name || id;

    const strikeInfo = parseProductUrl(sys.strikeUrl);
    const plumesInfo = parseProductUrl(sys.plumesUrl);

    const strikeImage = buildPngUrl(strikeInfo);
    const plumesImage = buildPngUrl(plumesInfo);

    out.systems.push({
      id,
      name,
      year: sys.year || null,
      basin: sys.basin || out.basin,
      center: sys.center || "ECMWF",
      advisoryTime: sys.advisoryTime || null,

      // Ce que le front utilise pour les <img>
      strikeImage,
      plumesImage,

      // On garde aussi les pages interactives
      strikePage: sys.strikeUrl || null,
      plumesPage: sys.plumesUrl || null,
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), "utf-8");
  log(`Fichier généré: ${outputPath}`);
}

main();
