// ── DeepL machine-translation client ─────────────────────────────────────────
// Fills empty language columns from a source language so an admin only has to
// write the content once (e.g. in English) and ru/ro/de are generated on save.
//
// Configuration: set DEEPL_API_KEY in the environment (.env). Free-tier keys
// end with ":fx" and hit the api-free host automatically. When no key is set,
// every helper degrades gracefully — empty fields simply stay empty and the
// view-layer fallback (utils/i18nContent) shows the source language instead.

const { LANGS } = require('./i18nContent');

// DeepL target codes (English → British by default); source uses base codes.
const TARGET_CODE = { en: 'EN-GB', ru: 'RU', ro: 'RO', de: 'DE' };
const SOURCE_CODE = { en: 'EN', ru: 'RU', ro: 'RO', de: 'DE' };

function apiKey() {
  return (process.env.DEEPL_API_KEY || '').trim();
}

function isConfigured() {
  return !!apiKey();
}

function endpoint() {
  // Free-tier keys are suffixed with ":fx" and use a separate host.
  return apiKey().endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

// Translate an array of strings into a single target language.
// Returns an array in the same order. Throws on transport/API errors.
async function translateBatch(texts, target, source) {
  const key = apiKey();
  if (!key || !texts.length) return texts.slice();

  const params = new URLSearchParams();
  texts.forEach(t => params.append('text', t));
  params.append('target_lang', TARGET_CODE[target] || String(target).toUpperCase());
  if (source && SOURCE_CODE[source]) params.append('source_lang', SOURCE_CODE[source]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params,
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`DeepL ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data.translations || []).map(t => t.text);
  } finally {
    clearTimeout(timer);
  }
}

// Fill the empty per-language columns of a record in place.
//   record : plain object with `${base}_${lang}` keys (e.g. title_en, title_ru…)
//   bases  : array of column bases to translate (e.g. ['title','content_short'])
//   source : source language code (default 'en')
// Only empty target columns are written — anything the admin typed by hand is
// preserved. One DeepL request per target language (batching every base field)
// keeps the call count low. Never throws: on any failure the record is returned
// unchanged so a save is never blocked by the translation service.
async function fillMissingFields(record, bases, source = 'en') {
  if (!isConfigured()) return record;

  const targets = LANGS.filter(l => l !== source);
  try {
    for (const target of targets) {
      const pending = [];   // { base, text }
      for (const base of bases) {
        const srcText = String(record[`${base}_${source}`] || '').trim();
        const dstText = String(record[`${base}_${target}`] || '').trim();
        if (srcText && !dstText) pending.push({ base, text: record[`${base}_${source}`] });
      }
      if (!pending.length) continue;
      const translated = await translateBatch(pending.map(p => p.text), target, source);
      pending.forEach((p, i) => {
        if (translated[i] != null) record[`${p.base}_${target}`] = translated[i];
      });
    }
  } catch (e) {
    console.error('[translate] fillMissingFields failed:', e.message);
  }
  return record;
}

module.exports = { isConfigured, translateBatch, fillMissingFields, LANGS };
