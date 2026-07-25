import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import en from "./en.json";
import hi from "./hi.json";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import it from "./it.json";
import pt from "./pt.json";
import ru from "./ru.json";
import ar from "./ar.json";
import tr from "./tr.json";
import ja from "./ja.json";
import ko from "./ko.json";
import zh from "./zh.json";

const SUPPORTED_LANGUAGES = {
  en: { name: "English", flag: "🇺🇸", dir: "ltr" },
  hi: { name: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  es: { name: "Español", flag: "🇪🇸", dir: "ltr" },
  fr: { name: "Français", flag: "🇫🇷", dir: "ltr" },
  de: { name: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  it: { name: "Italiano", flag: "🇮🇹", dir: "ltr" },
  pt: { name: "Português", flag: "🇵🇹", dir: "ltr" },
  ru: { name: "Русский", flag: "🇷🇺", dir: "ltr" },
  ar: { name: "العربية", flag: "🇸🇦", dir: "rtl" },
  tr: { name: "Türkçe", flag: "🇹🇷", dir: "ltr" },
  ja: { name: "日本語", flag: "🇯🇵", dir: "ltr" },
  ko: { name: "한국어", flag: "🇰🇷", dir: "ltr" },
  zh: { name: "简体中文", flag: "🇨🇳", dir: "ltr" },
};

const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem("chatsphere-language");
    if (saved && SUPPORTED_LANGUAGES[saved]) return saved;
  } catch {
    // localStorage not available
  }
  return "en";
};

export const LANGUAGE_LIST = Object.entries(SUPPORTED_LANGUAGES).map(([code, data]) => ({
  code,
  ...data,
}));

export async function persistLanguage(user, langCode) {
  if (!user?.uid) return;
  try {
    localStorage.setItem("chatsphere-language", langCode);
    await updateDoc(doc(db, "users", user.uid), {
      language: langCode,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  } catch {
    // Silently fail
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    pt: { translation: pt },
    ru: { translation: ru },
    ar: { translation: ar },
    tr: { translation: tr },
    ja: { translation: ja },
    ko: { translation: ko },
    zh: { translation: zh },
  },
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  returnObjects: false,
  debug: false,
  react: {
    useSuspense: false,
  },
});

export default i18n;