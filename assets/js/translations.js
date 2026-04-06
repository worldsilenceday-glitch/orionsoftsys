/**
 * Orion Multilingual Translation Engine v2.0
 * Fetches translations from backend API and applies them dynamically.
 * Supports: English (default), French, Spanish, Hausa, Yoruba, German
 *
 * USAGE:
 *   1. Add data-i18n="key" to any HTML element with translatable text.
 *   2. The engine fetches translations on page load and replaces content.
 *   3. When user switches language, content updates instantly.
 */

(function () {
  "use strict";

  // ========================================
  // CONFIGURATION
  // ========================================
  const API_BASE =
    typeof window !== "undefined" && typeof window.API_URL !== "undefined"
      ? window.API_URL
      : (typeof localStorage !== "undefined" && localStorage.getItem("apiUrl")) || "";

  const SUPPORTED_LANGS = ["en", "fr", "es", "ha", "yo", "de"];
  const FALLBACK_LANG = "en";

  // ========================================
  // TRANSLATION ENGINE
  // ========================================
  const TranslationEngine = {
    currentLang: FALLBACK_LANG,
    translations: {},
    loaded: false,
    pendingCallbacks: [],

    // ---- Initialisation ----
    init() {
      this.currentLang = this._getSavedLanguage();
      this._updateLanguageSwitcherUI();
      this._fetchTranslations();
      this._bindLanguageSwitcher();
    },

    // ---- Fetch translations from backend ----
    async _fetchTranslations() {
      // Try fetching from API first
      if (API_BASE) {
        try {
          const res = await fetch(`${API_BASE}/translate?lang=${this.currentLang}`);
          if (res.ok) {
            const data = await res.json();
            this.translations = data.translations || {};
            this.loaded = true;
            this._applyTranslations();
            this._runPendingCallbacks();
            return;
          }
        } catch (e) {
          console.warn("[i18n] API unavailable, using local fallback:", e.message);
        }
      }

      // Fallback: load from inline dictionary (static pages with no API)
      this._loadLocalTranslations();
      this.loaded = true;
      this._applyTranslations();
      this._runPendingCallbacks();
    },

    // ---- Local fallback dictionary (subset for when API is down) ----
    _loadLocalTranslations() {
      this.translations = this._getLocalDictionary();
    },

    _getLocalDictionary() {
      return {
        "nav.home": { en: "Home", fr: "Accueil", es: "Inicio", ha: "Gida", yo: "Ilé", de: "Startseite" },
        "nav.about": { en: "About", fr: "À propos", es: "Acerca de", ha: "Game da", yo: "Nípa", de: "Über uns" },
        "nav.services": { en: "Services", fr: "Services", es: "Servicios", ha: "Ayyuka", yo: "Iṣẹ́", de: "Dienste" },
        "nav.products": { en: "Products", fr: "Produits", es: "Productos", ha: "Samfura", yo: "Ọjà", de: "Produkte" },
        "nav.pricing": { en: "Pricing", fr: "Tarifs", es: "Precios", ha: "Farashin", yo: "Iye owó", de: "Preise" },
        "nav.projects": { en: "Projects", fr: "Projets", es: "Proyectos", ha: "Aikace", yo: "Iṣẹ́ àgbékalẹ̀", de: "Projekte" },
        "nav.download": { en: "Download", fr: "Télécharger", es: "Descargar", ha: "Sauke", yo: "Gba sílẹ̀", de: "Herunterladen" },
        "nav.contact": { en: "Contact", fr: "Contact", es: "Contacto", ha: "Tuntuɓa", yo: "Kan sí", de: "Kontakt" },
        "nav.dashboard": { en: "Dashboard", fr: "Tableau de bord", es: "Panel", ha: "Dashboard", yo: "Dashboard", de: "Dashboard" },
        "nav.demo": { en: "Book a Demo", fr: "Réserver", es: "Reservar", ha: "Ajiye Demo", yo: "Forúkọsílẹ̀ Demo", de: "Demo buchen" },
        "nav.login": { en: "Sign In", fr: "Connexion", es: "Iniciar sesión", ha: "Shiga", yo: "Wọlé", de: "Anmelden" },
        "nav.register": { en: "Get Started", fr: "Commencer", es: "Empezar", ha: "Fara", yo: "Bẹ̀rẹ̀", de: "Loslegen" },
        "nav.logout": { en: "Sign Out", fr: "Déconnexion", es: "Cerrar sesión", ha: "Fita", yo: "Jáde", de: "Abmelden" },
        "hero.title": {
          en: 'We Build <span class="text-gradient">AI Systems</span> That Help Your Business Grow',
          fr: 'Nous construisons des <span class="text-gradient">systèmes IA</span> qui aident votre entreprise à croître',
          es: 'Creamos <span class="text-gradient">sistemas de IA</span> que ayudan a crecer su negocio',
          ha: 'Muna gina <span class="text-gradient">Tsarin AI</span> da ke taimaka wa kasuwancinku girma',
          yo: 'A ń kọ́ <span class="text-gradient">Ètò AI</span> Tí Ó N Ràn Ọ́ Lọ́wọ́ Láti Fa Iṣẹ́ Rẹ Dàgbà',
          de: 'Wir bauen <span class="text-gradient">KI-Systeme</span>, die Ihrem Unternehmen helfen zu wachsen'
        },
        "hero.subtitle": {
          en: "Automate customer responses, capture leads, and scale your business with intelligent systems.",
          fr: "Automatisez les réponses clients, capturez des leads et développez votre entreprise avec des systèmes intelligents.",
          es: "Automatice las respuestas al cliente, capture clientes potenciales y escale su negocio con sistemas inteligentes.",
          ha: "Ba da amsoshin abokan ciniki ta atomatik, samu leads, da faɗaɗa kasuwancinku tare da tsarin wayo.",
          yo: "Ṣe àtúnṣe àwọn ìdáhùn oníbàárà, gba àwọn oníbàárà tuntun, àti láti fa iṣẹ́ rẹ dagba pẹ̀lú ètò ọgbọ́n.",
          de: "Automatisieren Sie Kundenantworten, erfassen Sie Leads und skalieren Sie Ihr Unternehmen mit intelligenten Systemen."
        },
        "hero.cta.primary": { en: "Get Your AI Assistant", fr: "Obtenez votre assistant IA", es: "Obtenga su asistente de IA", ha: "Samu AI Assistant ɗinku", yo: "Gba AI Assistant Rẹ", de: "Erhalten Sie Ihren KI-Assistenten" },
        "hero.cta.secondary": { en: "Book a Demo", fr: "Réserver une démo", es: "Reservar una demo", ha: "Ajiye Demo", yo: "Forúkọsílẹ̀ Demo", de: "Demo buchen" },
        "services.title": { en: "Our Services", fr: "Nos Services", es: "Nuestros Servicios", ha: "Ayyukanmu", yo: "Àwọn Iṣẹ́ Wa", de: "Unsere Dienste" },
        "why.title": { en: "Why Choose Orion?", fr: "Pourquoi choisir Orion ?", es: "¿Por qué elegir Orion?", ha: "Mece ya sa za a zaɓi Orion?", yo: "Kí nìdí tí a ó fi yan Orion?", de: "Warum Orion wählen?" },
        "projects.title": { en: "Recent Projects", fr: "Projets Récents", es: "Proyectos Recientes", ha: "Aikacen baya-bayan nan", yo: "Àwọn Iṣẹ́ Àjọ̀ṣe Tuntun", de: "Aktuelle Projekte" },
        "cta.title": { en: "Let's Build Something That Works", fr: "Construisons quelque chose qui fonctionne", es: "Construyamos algo que funcione", ha: "Bari mu gina wani abu mai aiki", yo: "Jẹ́ ká kọ́ nǹkan tí ó ń ṣiṣẹ́", de: "Lassen Sie uns etwas bauen, das funktioniert" },
        "cta.start": { en: "Start a Project", fr: "Démarrer un Projet", es: "Iniciar un Proyecto", ha: "Fara aikin", yo: "Bẹ̀rẹ̀ Iṣẹ́", de: "Ein Projekt starten" },
        "cta.contact": { en: "Contact Us", fr: "Contactez-nous", es: "Contáctenos", ha: "Tuntuɓe mu", yo: "Kan sí wa", de: "Kontaktieren Sie uns" },
        "chat.title": { en: "Orion Assistant", fr: "Assistant Orion", es: "Asistente Orion", ha: "Orion Assistant", yo: "Orion Assistant", de: "Orion Assistent" },
        "chat.status": { en: "Online", fr: "En ligne", es: "En línea", ha: "Kan layin", yo: "Lórí ila", de: "Online" },
        "chat.placeholder": { en: "Type a message...", fr: "Tapez un message...", es: "Escribe un mensaje...", ha: "Rubuta sako...", yo: "Tẹ ìfiránṣẹ́...", de: "Nachricht eingeben..." },
        "chat.send": { en: "Send", fr: "Envoyer", es: "Enviar", ha: "Aika", yo: "Fi ranṣẹ́", de: "Senden" },
        "common.back_home": { en: "Back to Home", fr: "Retour à l'accueil", es: "Volver al inicio", ha: "Komawa gida", yo: "Padà sí Ilé", de: "Zurück zur Startseite" },
        "lang.english": { en: "English", fr: "Anglais", es: "Inglés", ha: "Turanci", yo: "Gẹ̀ẹ́sì", de: "Englisch" },
        "lang.french": { en: "French", fr: "Français", es: "Francés", ha: "Faransanci", yo: "Faransé", de: "Französisch" },
        "lang.spanish": { en: "Spanish", fr: "Espagnol", es: "Español", ha: "Spaniyanci", yo: "Sípáníìṣì", de: "Spanisch" },
        "lang.hausa": { en: "Hausa", fr: "Haoussa", es: "Hausa", ha: "Hausa", yo: "Hausa", de: "Haussa" },
        "lang.yoruba": { en: "Yoruba", fr: "Yoruba", es: "Yoruba", ha: "Yarbanci", yo: "Yorùbá", de: "Yoruba" },
        "lang.german": { en: "German", fr: "Allemand", es: "Alemán", ha: "Jamusanci", yo: "Jámánì", de: "Deutsch" },
        "why.subtitle": { en: "We don't just write code. We build systems that solve real problems.", fr: "Nous n'écrivons pas seulement du code. Nous construisons des systèmes qui résolvent de vrais problèmes.", es: "No solo escribimos código.", ha: "Ba mu kawai rubuta code ba.", yo: "A kì í kọ kóòdù nìkan.", de: "Wir schreiben nicht nur Code." },
        "why.1.desc": { en: "Every solution is designed to work as a complete system.", fr: "Chaque solution est conçue comme un système complet.", es: "Cada solución es un sistema completo.", ha: "Kowane mafita tsari ne cikakke.", yo: "Gbogbo ojutu ètò kíkún ni.", de: "Jede Lösung ist ein komplettes System." },
        "why.2.desc": { en: "We use AI to make your systems smarter from day one.", fr: "Nous utilisons l'IA dès le premier jour.", es: "Usamos IA desde el primer día.", ha: "Muna amfani da AI tun daga rana ta farko.", yo: "A ń lò AI láti ọjọ́ àkọ́kọ́.", de: "Wir nutzen KI vom ersten Tag an." },
        "why.3.desc": { en: "Built to handle growth so you never rebuild.", fr: "Conçu pour gérer la croissance.", es: "Diseñado para el crecimiento.", ha: "An gina don girma.", yo: "A kọ́ fún ìdàgbàsókè.", de: "Für Wachstum ausgelegt." },
        "why.4.desc": { en: "Tested in real conditions for reliable performance.", fr: "Testé en conditions réelles.", es: "Probado en condiciones reales.", ha: "An gwada a yanayin gaske.", yo: "A dán wò ní ipò gidi.", de: "Unter realen Bedingungen getestet." },
        "project.problem": { en: "Problem:", fr: "Problème :", es: "Problema:", ha: "Matsala:", yo: "Ìṣòro:", de: "Problem:" },
        "project.solution": { en: "Solution:", fr: "Solution :", es: "Solución:", ha: "Mafita:", yo: "Ojutù:", de: "Lösung:" },
        "project.result": { en: "Result:", fr: "Résultat :", es: "Resultado:", ha: "Sakamako:", yo: "Àbájáde:", de: "Ergebnis:" },
        "project.1.problem": { en: "A growing online store was missing 40% of customer inquiries outside business hours.", fr: "Une boutique en ligne manquait 40% des demandes clients.", es: "Una tienda online perdía el 40% de consultas.", ha: "Wani shagon yanar gizo ya rasa 40% na tambayoyin.", yo: "Ìtajà kan padánù 40% àwọn ìbéèrè.", de: "Ein Online-Shop verpasste 40% der Anfragen." },
        "project.1.solution": { en: "We deployed an AI assistant on WhatsApp and their website that handles inquiries 24/7.", fr: "Un assistant IA sur WhatsApp et leur site web gère les demandes 24/7.", es: "Un asistente IA en WhatsApp maneja consultas 24/7.", ha: "AI assistant akan WhatsApp da yanar gizo 24/7.", yo: "AI assistant lórí WhatsApp àti wẹ́ẹ̀bù 24/7.", de: "KI-Assistent auf WhatsApp und Website 24/7." },
        "project.1.result": { en: "85% reduction in response time and 30% increase in captured leads.", fr: "-85% du temps de réponse et +30% des leads.", es: "-85% tiempo de respuesta y +30% leads.", ha: "Ragujin 85% a lokacin amsawa da +30% leads.", yo: "Ìdínkù 85% àti +30% oníbàárà tuntun.", de: "-85% Antwortzeit und +30% Leads." },
        "project.2.problem": { en: "A property firm struggled to track and follow up with leads from multiple sources.", fr: "Une entreprise immobilière avait du mal à suivre les leads.", es: "Una inmobiliaria no podía rastrear leads.", ha: "Kamfanin kadarorci na fama da bin leads.", yo: "Ilé-iṣẹ́ ohun ìní ń fúnpa láti tọpa leads.", de: "Immobilienunternehmen konnte Leads nicht verfolgen." },
        "project.2.solution": { en: "Built a custom CRM with automated follow-ups, WhatsApp notifications, and analytics.", fr: "CRM personnalisé avec relances automatisées et notifications WhatsApp.", es: "CRM con seguimientos automatizados y WhatsApp.", ha: "CRM na musamman tare da biyo baya na atomatik.", yo: "CRM pàtó pẹ̀lú ìtẹ̀lẹ́ àtọ̀runwá àti WhatsApp.", de: "Maßgeschneidertes CRM mit automatisierten Follow-ups." },
        "project.2.result": { en: "2x lead conversion rate within the first 3 months.", fr: "Doublement du taux de conversion en 3 mois.", es: "Duplicó la conversión en 3 meses.", ha: "2x ƙimar canza leads a watanni 3.", yo: "Ìlọ̀po méjì ìyípadà láàárín oṣù 3.", de: "Verdoppelung in 3 Monaten." },
        "project.3.problem": { en: "A logistics company spent 20+ hours per week on manual invoice data entry.", fr: "20h+/semaine sur la saisie manuelle des factures.", es: "20h+/semana en entrada manual de facturas.", ha: "20+ awanni a kowane mako akan invoice.", yo: "20+ wákàtí ní ọ̀sẹ̀ lórí ìwé ìsanwó.", de: "20+ Std./Woche manueller Eingabe." },
        "project.3.solution": { en: "Implemented an AI-powered system that extracts, validates, and processes invoices automatically.", fr: "Système IA qui extrait et traite les factures automatiquement.", es: "Sistema IA que procesa facturas automáticamente.", ha: "Tsarin AI wanda ke saranta invoices ta atomatik.", yo: "Ètò AI tó ń ṣe ìlànà ìwé ìsanwó láìfọwọ́ṣe.", de: "KI-System verarbeitet Rechnungen automatisch." },
        "project.3.result": { en: "90% time saved and near-zero data entry errors.", fr: "90% de temps économisé, zéro erreur.", es: "90% tiempo ahorrado, cero errores.", ha: "90% lokacin da ake adana, sifili kurakurai.", yo: "90% àkókò pamọ́, kò sí àṣìṣe.", de: "90% Zeitersparnis, null Fehler." },
        "cta.subtitle": { en: "Tell us about your project and we will show you how AI can help.", fr: "Parlez-nous de votre projet et nous vous montrerons comment l'IA peut aider.", es: "Cuéntenos sobre su proyecto y le mostraremos cómo la IA puede ayudar.", ha: "Gaya mana game da aikinku kuma zamu nuna yadda AI zata taimaka.", yo: "Sọ fún wa nípa iṣẹ́ rẹ, a ó fi hàn bí AI ṣe lè ràn ọ́ lọ́wọ́.", de: "Erzählen Sie uns von Ihrem Projekt und wir zeigen, wie KI hilft." },
        "footer.company": { en: "Orion Soft Systems. Building Intelligent Systems for a Smarter Future.", fr: "Orion Soft Systems. Construire des systèmes intelligents pour un avenir plus intelligent.", es: "Orion Soft Systems. Construyendo sistemas inteligentes.", ha: "Orion Soft Systems. Gina tsarin wayo.", yo: "Orion Soft Systems. Ǹ ń kọ́ ètò ọgbọ́n.", de: "Orion Soft Systems. Intelligente Systeme bauen." },
        "footer.quick": { en: "Quick Links", fr: "Liens Rapides", es: "Enlaces Rápidos", ha: "Haɗin Sauri", yo: "Ìsopọ̀ Kúkúrú", de: "Schnelllinks" },
        "footer.services": { en: "Our Services", fr: "Nos Services", es: "Nuestros Servicios", ha: "Ayyukanmu", yo: "Àwọn Iṣẹ́ Wa", de: "Unsere Dienste" },
        "footer.contact": { en: "Contact Info", fr: "Infos Contact", es: "Info de Contacto", ha: "Bayanin Tuntuɓar", yo: "Alàyè Ìbáṣepọ̀", de: "Kontaktinfo" },
        "footer.rights": { en: "All rights reserved.", fr: "Tous droits réservés.", es: "Todos los derechos reservados.", ha: "Dukkan haƙƙoƙin an keɓe.", yo: "Gbogbo ẹ̀tọ́ ni a fi pa mọ́.", de: "Alle Rechte vorbehalten." },
        "services.webdev.desc": { en: "Fast, responsive websites and web apps built to convert visitors into customers.", fr: "Sites web rapides et réactifs conçus pour convertir les visiteurs.", es: "Sitios web rápidos diseñados para convertir visitantes.", ha: "Yanar gizo mai sauri da aka gina don canza masu ziyara.", yo: "Ojú òpó wẹ́ẹ̀bù yára tí a kọ́ láti yí alábàárà padà.", de: "Schnelle Websites, die Besucher in Kunden konvertieren." },
        "services.ai.desc": { en: "Custom AI assistants, chatbots, and intelligent automation for your business workflows.", fr: "Assistants IA personnalisés et automatisation intelligente.", es: "Asistentes IA personalizados y automatización.", ha: "AI assistants na musamman da automation.", yo: "AI assistant pàtó àti ìṣàkóso ọgbọ́n.", de: "Maßgeschneiderte KI-Assistenten und Automatisierung." },
        "services.automation.desc": { en: "Streamline repetitive tasks and free your team to focus on what matters most.", fr: "Simplifiez les tâches répétitives et libérez votre équipe.", es: "Simplifique tareas repetitivas y libere a su equipo.", ha: "Sauƙaƙe maimaita ayyuka ku 'yanci tawagarku.", yo: "Dínkùn iṣẹ́ ìtúntún kí ẹgbẹ́ rẹ lè kọ́kọ́ sí ohun tí ó ṣe pàtàkì.", de: "Automatisieren Sie repetitive Aufgaben." },
        "services.custom.desc": { en: "Tailored software solutions built to solve your unique business challenges.", fr: "Solutions logicielles sur mesure pour vos défis uniques.", es: "Soluciones de software a medida para sus desafíos.", ha: "Software na musamman don magance kalubalen kasuwanci.", yo: "Software pàtó láti yanjú àwọn ìṣòro iṣẹ́ rẹ.", de: "Maßgeschneiderte Software für Ihre Herausforderungen." },
        "product.desc": { en: "An AI assistant that replies instantly to customers, works 24/7, and helps businesses never miss a lead.", fr: "Un assistant IA qui répond instantanément aux clients, fonctionne 24/7.", es: "Un asistente IA que responde al instante, funciona 24/7.", ha: "AI assistant da ke amsawa ga abokan ciniki nan take, yana aiki 24/7.", yo: "AI assistant tí ó ń dáhùn sí oníbàárà lẹ́sẹ̀kẹsẹ̀, ń ṣiṣẹ́ 24/7.", de: "Ein KI-Assistent, der sofort antwortet und 24/7 arbeitet." },
      };
    },

    // ---- Language persistence ----
    _getSavedLanguage() {
      if (typeof localStorage === "undefined") return FALLBACK_LANG;
      const saved = localStorage.getItem("orion_language");
      return saved && SUPPORTED_LANGS.includes(saved) ? saved : FALLBACK_LANG;
    },

    _saveLanguage(lang) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("orion_language", lang);
      }
    },

    // ---- Translate a single key ----
    t(key) {
      const entry = this.translations[key];
      if (!entry) return key;
      return entry[this.currentLang] || entry[FALLBACK_LANG] || key;
    },

    // ---- Apply translations to DOM ----
    _applyTranslations() {
      // 1. Elements with data-i18n (innerHTML — supports HTML tags)
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const translated = this.t(key);
        if (translated && translated !== key) {
          el.innerHTML = translated;
        }
      });

      // 2. Elements with data-i18n-text (textContent only)
      document.querySelectorAll("[data-i18n-text]").forEach((el) => {
        const key = el.getAttribute("data-i18n-text");
        const translated = this.t(key);
        if (translated && translated !== key) {
          el.textContent = translated;
        }
      });

      // 3. Placeholders
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        const translated = this.t(key);
        if (translated && translated !== key) {
          el.placeholder = translated;
        }
      });

      // 4. Title attributes
      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        const translated = this.t(key);
        if (translated && translated !== key) {
          el.title = translated;
        }
      });

      // 5. Update html lang attribute
      document.documentElement.lang = this.currentLang;
    },

    // ---- Language switcher binding ----
    _bindLanguageSwitcher() {
      const switcherBtn = document.getElementById("langSwitcherBtn");
      const dropdown = document.getElementById("langDropdown");
      const langOptions = document.querySelectorAll(".lang-option");

      if (switcherBtn && dropdown) {
        switcherBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("active");
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", () => {
          dropdown.classList.remove("active");
        });

        // Prevent dropdown close on inside click
        dropdown.addEventListener("click", (e) => e.stopPropagation());
      }

      langOptions.forEach((option) => {
        option.addEventListener("click", () => {
          const lang = option.getAttribute("data-lang");
          this.setLanguage(lang);
          dropdown.classList.remove("active");
        });
      });
    },

    // ---- Set language ----
    setLanguage(lang) {
      if (!SUPPORTED_LANGS.includes(lang)) return;
      this.currentLang = lang;
      this._saveLanguage(lang);
      this._updateLanguageSwitcherUI();
      this._applyTranslations();

      // If API not loaded yet, fetch for new language
      if (!this.loaded) {
        this._fetchTranslations();
      }
    },

    // ---- Update language switcher UI ----
    _updateLanguageSwitcherUI() {
      // Update button label
      const btn = document.getElementById("langSwitcherBtn");
      if (btn) {
        const labels = { en: "EN", fr: "FR", es: "ES", ha: "HA", yo: "YO", de: "DE" };
        btn.textContent = labels[this.currentLang] || "EN";
      }

      // Update active class on dropdown options
      document.querySelectorAll(".lang-option").forEach((opt) => {
        opt.classList.toggle("active", opt.getAttribute("data-lang") === this.currentLang);
      });
    },

    // ---- Callback system (wait for translations to load) ----
    onReady(callback) {
      if (this.loaded) {
        callback();
      } else {
        this.pendingCallbacks.push(callback);
      }
    },

    _runPendingCallbacks() {
      this.pendingCallbacks.forEach((cb) => cb());
      this.pendingCallbacks = [];
    },
  };

  // ========================================
  // INITIALIZE
  // ========================================
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => TranslationEngine.init());
    } else {
      TranslationEngine.init();
    }
  }

  // Make available globally
  if (typeof window !== "undefined") {
    window.TranslationEngine = TranslationEngine;
    window.t = (key) => TranslationEngine.t(key);
  }
})();
