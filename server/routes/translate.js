const express = require("express");
const router = express.Router();
const translations = require("../translations");

// GET /api/translate - Get all translations or a specific key
router.get("/", (req, res) => {
  const { key, lang } = req.query;

  // If requesting a specific key
  if (key) {
    const translation = translations[key];
    if (!translation) {
      return res.status(404).json({ error: "Translation key not found" });
    }
    return res.json({ key, translations: translation });
  }

  // If requesting all translations for a specific language
  if (lang) {
    const result = {};
    for (const [k, langs] of Object.entries(translations)) {
      if (langs[lang]) {
        result[k] = langs[lang];
      }
    }
    return res.json({ language: lang, translations: result });
  }

  // Return all translations
  res.json({
    supportedLanguages: ["en", "fr", "es", "ha", "yo", "de"],
    totalKeys: Object.keys(translations).length,
    translations
  });
});

// POST /api/translate - Batch translate multiple keys
router.post("/", (req, res) => {
  const { keys, lang } = req.body;

  if (!keys || !Array.isArray(keys)) {
    return res.status(400).json({ error: "Array of keys required" });
  }

  const targetLang = lang || "en";
  const result = {};

  for (const key of keys) {
    const translation = translations[key];
    if (translation) {
      result[key] = translation[targetLang] || translation.en;
    }
  }

  res.json({ language: targetLang, translations: result });
});

// GET /api/translate/languages - List supported languages
router.get("/languages", (req, res) => {
  res.json({
    languages: [
      { code: "en", name: "English", native: "English" },
      { code: "fr", name: "French", native: "Français" },
      { code: "es", name: "Spanish", native: "Español" },
      { code: "ha", name: "Hausa", native: "Hausa" },
      { code: "yo", name: "Yoruba", native: "Yorùbá" },
      { code: "de", name: "German", native: "Deutsch" }
    ],
    default: "en"
  });
});

module.exports = router;
