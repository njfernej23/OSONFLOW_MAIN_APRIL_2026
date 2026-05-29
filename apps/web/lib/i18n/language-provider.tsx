"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  LANGUAGE_LABELS,
  type Language,
  SUPPORTED_LANGUAGES,
  normalizeTranslatableText,
  translateText,
} from "./translations"

const LANGUAGE_STORAGE_KEY = "osonflow-language"

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (value: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const textNodeOriginals = new WeakMap<Text, string>()

const ATTRIBUTES_TO_TRANSLATE = [
  "aria-label",
  "alt",
  "placeholder",
  "title",
  "data-placeholder",
]

const isLanguage = (value: string | null): value is Language =>
  SUPPORTED_LANGUAGES.includes(value as Language)

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en"
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)

  if (isLanguage(stored)) {
    return stored
  }

  const browserLanguage = window.navigator.language.toLowerCase()

  if (browserLanguage.startsWith("uz")) {
    return "uz"
  }

  if (browserLanguage.startsWith("ru")) {
    return "ru"
  }

  return "en"
}

function preserveSpacing(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? ""
  const trailing = original.match(/\s*$/)?.[0] ?? ""

  return `${leading}${translated}${trailing}`
}

function translateTextNode(node: Text, language: Language) {
  const currentValue = node.nodeValue ?? ""
  const storedOriginal = textNodeOriginals.get(node)
  const currentLooksTranslatable =
    language !== "en" && translateText(currentValue, language) !== currentValue
  const originalValue = currentLooksTranslatable
    ? currentValue
    : storedOriginal ?? currentValue
  const normalized = normalizeTranslatableText(originalValue)

  if (!normalized) {
    return
  }

  const nextValue =
    language === "en"
      ? originalValue
      : preserveSpacing(originalValue, translateText(originalValue, language))

  if (nextValue !== currentValue) {
    textNodeOriginals.set(node, originalValue)
    node.nodeValue = nextValue
  }
}

function translateElementAttributes(element: Element, language: Language) {
  for (const attribute of ATTRIBUTES_TO_TRANSLATE) {
    const value = element.getAttribute(attribute)

    if (!value) {
      continue
    }

    const originalAttribute = `data-i18n-original-${attribute}`
    const storedOriginal = element.getAttribute(originalAttribute)
    const currentLooksTranslatable =
      language !== "en" && translateText(value, language) !== value
    const original = currentLooksTranslatable
      ? value
      : storedOriginal ?? value
    const translated = translateText(original, language)

    if (!element.hasAttribute(originalAttribute)) {
      element.setAttribute(originalAttribute, original)
    }

    if (element.getAttribute(attribute) !== translated) {
      element.setAttribute(attribute, translated)
    }
  }
}

function translateDom(root: Node, language: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language)
    return
  }

  if (root instanceof Element) {
    translateElementAttributes(root, language)
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  )

  let current = walker.nextNode()

  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text, language)
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(current as Element, language)
    }

    current = walker.nextNode()
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    queueMicrotask(() => setLanguageState(getInitialLanguage()))
  }, [])

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    setLanguageState(nextLanguage)
  }, [])

  const t = useCallback(
    (value: string) => translateText(value, language),
    [language]
  )

  useEffect(() => {
    document.documentElement.lang = language
    translateDom(document.body, language)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.TEXT_NODE
          ) {
            translateDom(node, language)
          }
        })

        if (
          mutation.type === "characterData" &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          translateTextNode(mutation.target as Text, language)
        }

        if (
          mutation.type === "attributes" &&
          mutation.target.nodeType === Node.ELEMENT_NODE
        ) {
          translateElementAttributes(mutation.target as Element, language)
        }
      }
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ATTRIBUTES_TO_TRANSLATE,
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider")
  }

  return context
}

export { LANGUAGE_LABELS, SUPPORTED_LANGUAGES }
