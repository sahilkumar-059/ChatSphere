import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";

const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem("chatsphere-language");
    if (saved) return saved;
  } catch {
    // localStorage not available
  }
  return "en";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
  },
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  returnObjects: false,
  debug: false,
});

export default i18n;