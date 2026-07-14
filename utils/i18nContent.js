// Shared helper for picking a localized DB field with a graceful fallback chain.
// Content rows store per-language columns like `title_en`, `title_ru`,
// `title_ro`, `title_de`. When the requested language is empty we fall back to
// English → Russian → Romanian → German → the legacy single column.

const LANGS = ['en', 'ru', 'ro', 'de'];

function pick(obj, base, lang) {
  if (!obj) return '';
  return obj[`${base}_${lang}`]
      || obj[`${base}_en`]
      || obj[`${base}_ru`]
      || obj[`${base}_ro`]
      || obj[`${base}_de`]
      || obj[base]
      || '';
}

module.exports = { LANGS, pick };
