const WMS_ENDPOINT = "https://geoservices.bayern.de/od/wms/dop/v1/dop20";
const INFERENCE_ENDPOINT = "https://inference.do-ai.run/v1/chat/completions";
const MODEL = "qwen3.8-max";
const IMAGE_SIZE = 512;

async function main(event) {
  const jobId = String(event?.jobId ?? "");
  const tileId = String(event?.tileId ?? "");
  const bounds = event?.bounds;
  const callbackUrl = String(event?.callbackUrl ?? "");

  try {
    validateInput({ jobId, tileId, bounds, callbackUrl });
    const image = await fetchAerialImage(bounds);
    const rawDetections = await detectSolar(image, bounds);
    const detections = rawDetections.slice(0, 100).flatMap((detection, index) => {
      try {
        const normalized = normalizeDetection(detection, index, bounds);
        return normalized.confidence >= 0.55 ? [normalized] : [];
      } catch {
        return [];
      }
    });
    const result = {
      jobId,
      tileId,
      success: true,
      retrievedAt: new Date().toISOString(),
      detections
    };
    if (callbackUrl) await sendResult(callbackUrl, result);
    return { statusCode: 200, body: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    const result = { jobId, tileId, success: false, error: message, detections: [] };
    if (callbackUrl && jobId && tileId) {
      try {
        await sendResult(callbackUrl, result);
      } catch (callbackError) {
        return { statusCode: 502, body: { error: message, callbackError: callbackError instanceof Error ? callbackError.message : "Callback fehlgeschlagen" } };
      }
    }
    return { statusCode: 200, body: result };
  }
}

function validateInput({ jobId, tileId, bounds, callbackUrl }) {
  if (!/^[0-9a-f-]{36}$/i.test(jobId) || !/^[0-9a-f-]{36}$/i.test(tileId)) throw new Error("Ungültige Scan-Kennung");
  if (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some((value) => !Number.isFinite(Number(value)))) throw new Error("Ungültige Kachelgrenzen");
  const [west, south, east, north] = bounds.map(Number);
  if (west >= east || south >= north) throw new Error("Leere Kachelgrenzen");
  if (west < 8.8 || east > 13.9 || south < 47.1 || north > 50.7) throw new Error("Der DOP20-Scanner unterstützt derzeit Regionen in Bayern");
  if (callbackUrl) {
    const callback = new URL(callbackUrl);
    if (callback.protocol !== "https:" || !["wattbund.de", "www.wattbund.de"].includes(callback.hostname)) throw new Error("Ungültige Rückgabeadresse");
  }
  if (!process.env.DIGITALOCEAN_MODEL_ACCESS_KEY || !process.env.SOLAR_SCAN_SECRET) throw new Error("KI-Zugang ist nicht konfiguriert");
}

async function fetchAerialImage(bounds) {
  const url = new URL(WMS_ENDPOINT);
  const [west, south, east, north] = bounds.map(Number);
  const params = {
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "by_dop20c",
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: [west, south, east, north].join(","),
    WIDTH: String(IMAGE_SIZE),
    HEIGHT: String(IMAGE_SIZE),
    FORMAT: "image/jpeg",
    TRANSPARENT: "false"
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Luftbilddienst antwortet mit HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error("Luftbilddienst hat kein Bild geliefert");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5_000) throw new Error("Luftbild ist unerwartet klein");
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

async function detectSolar(imageUrl, bounds) {
  const response = await fetch(INFERENCE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DIGITALOCEAN_MODEL_ACCESS_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Du analysierst senkrechte RGB-Luftbilder. Erkenne nur bereits installierte Solaranlagen. Verwechsle Dachfenster, Glasdächer, Schatten und dunkle Dachziegel nicht mit Modulen. Antworte ausschließlich als valides JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analysiere diese 512x512-DOP20-Kachel (${bounds.join(",")}). Gib {"detections":[...]} zurück. Jeder Fund: {"type":"pv"|"solar_thermal"|"uncertain","confidence":0..1,"bbox":[xMin,yMin,xMax,yMax] auf einer Skala 0..1000 mit Ursprung links oben,"panel_area_m2":geschätzte sichtbare Modulfläche}. Nimm nur Anlagen mit confidence >= 0.55 auf. PV sind rechteckige blau/schwarze Modulfelder; Solarthermie nur bei klarer Erkennbarkeit, sonst uncertain.`
            },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(180_000)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`KI-Modell antwortet mit HTTP ${response.status}: ${detail.slice(0, 240)}`);
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((part) => part?.text ?? "").join("") : "";
  const parsed = parseJson(text);
  if (!Array.isArray(parsed?.detections)) throw new Error("KI-Antwort enthält keine Fundliste");
  return parsed.detections;
}

function parseJson(value) {
  const cleaned = String(value).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("KI-Antwort ist kein JSON");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function normalizeDetection(raw, detectionIndex, bounds) {
  const rawBox = Array.isArray(raw?.bbox) ? raw.bbox.map(Number) : [];
  if (rawBox.length !== 4 || rawBox.some((value) => !Number.isFinite(value))) throw new Error("KI-Fund enthält keine gültige Begrenzung");
  const scale = Math.max(...rawBox.map(Math.abs)) <= 1.01 ? 1 : 1000;
  const [x1, y1, x2, y2] = rawBox.map((value) => clamp(value / scale, 0, 1));
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  if (right - left < 0.002 || bottom - top < 0.002) throw new Error("KI-Fund ist zu klein");

  const [west, south, east, north] = bounds.map(Number);
  const polygonWest = west + (east - west) * left;
  const polygonEast = west + (east - west) * right;
  const polygonNorth = north - (north - south) * top;
  const polygonSouth = north - (north - south) * bottom;
  const kind = ["pv", "solar_thermal", "uncertain"].includes(raw?.type) ? raw.type : "uncertain";
  const confidence = clamp(Number(raw?.confidence) || 0.55, 0, 1);
  const bboxArea = approximateAreaM2([polygonWest, polygonSouth, polygonEast, polygonNorth]);
  const estimatedAreaM2 = clamp(Number(raw?.panel_area_m2) || bboxArea * 0.55, 1, Math.max(1, bboxArea));
  const estimatedKwp = estimatedAreaM2 * 0.2;

  return {
    detectionIndex,
    kind,
    confidence,
    geometry: {
      type: "Polygon",
      coordinates: [[
        [polygonWest, polygonSouth],
        [polygonEast, polygonSouth],
        [polygonEast, polygonNorth],
        [polygonWest, polygonNorth],
        [polygonWest, polygonSouth]
      ]]
    },
    estimatedAreaM2: round(estimatedAreaM2),
    estimatedKwp: round(estimatedKwp),
    annualYieldKwh: round(estimatedKwp * 1000),
    raw
  };
}

function approximateAreaM2([west, south, east, north]) {
  const middleLatitude = (south + north) / 2 * Math.PI / 180;
  const width = (east - west) * 111_320 * Math.cos(middleLatitude);
  const height = (north - south) * 111_320;
  return Math.max(1, Math.abs(width * height));
}

async function sendResult(callbackUrl, body) {
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Solar-Scan-Secret": process.env.SOLAR_SCAN_SECRET
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Rückgabe an WattBund fehlgeschlagen (HTTP ${response.status})`);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

exports.main = main;
