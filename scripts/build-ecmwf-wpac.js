// scripts/build-ecmwf-wpac.js
// Lit wnp-catalog.json, télécharge les PNG ECMWF et génère ecmwf-wpac.json

import { promises as fs } from "fs";
import path from "path";
import https from "https";
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

// Télécharge un PNG et l'enregistre sur le disque
async function downloadPng(url, targetPath) {
  if (!url) return null;

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  return new Promise((resolve) => {
    log(`Téléchargement PNG: ${url}`);

    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          log(
            `⚠️  Échec téléchargement (${res.statusCode}) pour ${url} — image ignorée.`
          );
          res.resume();
          return resolve(null);
        }

        const fileStream = fs.createWriteStream(targetPath);
        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          log(`PNG enregistré: ${targetPath}`);
          resolve(targetPath);
        });
      })
      .on("error", (err) => {
        log(`⚠️  Erreur réseau pour ${url}: ${err.message}`);
        resolve(null);
      });
  });
}

// Extrait les paramètres utiles d'une URL "products/cyclone?..."
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
  } catch (e) {
    log(`⚠️  URL invalide: ${pageUrl}`);
    return null;
  }
}

// Construit l'URL API PNG OpenCharts à partir des paramètres
function buildPngApiUrl(info) {
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
    log("Aucun système actif → fichier ecmwf-wpac.json vide.");
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
    log(`Écrit: ${OUTPUT_PATH}`);
    return;
  }

  for (const sys of systems) {
    const id = (sys.id || "UNKNOWN").replace(/[^A-Za-z0-9]/g, "");
    const name = sys.name || id;

    const strikeInfo = parseProductUrl(sys.strikeUrl);
    const plumesInfo = parseProductUrl(sys.plumesUrl);

    const strikeApiUrl = buildPngApiUrl(strikeInfo);
    const plumesApiUrl = buildPngApiUrl(plumesInfo);

    const localDir = path.join(DATA_DIR, id);
    const strikeLocalPath = path.join(localDir, "strike.png");
    const plumesLocalPath = path.join(localDir, "plumes.png");

    let strikeImage = null;
    let plumesImage = null;

    if (strikeApiUrl) {
      const p = await downloadPng(strikeApiUrl, strikeLocalPath);
      if (p) {
        strikeImage = `./data/${id}/strike.png`;
      }
    }

    if (plumesApiUrl) {
      const p = await downloadPng(plumesApiUrl, plumesLocalPath);
      if (p) {
        plumesImage = `./data/${id}/plumes.png`;
      }
    }

    out.systems.push({
      id,
      name,
      year: sys.year || null,
      basin: sys.basin || catalog.basin || "WPAC",
      center: sys.center || "ECMWF",
      advisoryTime: sys.advisoryTime || null,

      // Chemins utilisés par le front
      strikeImage,
      plumesImage,

      // Liens vers les pages interactives ECMWF
      strikePage: sys.strikeUrl || null,
      plumesPage: sys.plumesUrl || null,
    });
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  log(`Fichier généré: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  log("ERREUR FATALE:");
  console.error(err);
  process.exit(1);
});
