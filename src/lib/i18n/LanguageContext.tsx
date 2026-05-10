"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { pl, TranslationType } from './pl'
import { en } from './en'

type Language = 'pl' | 'en'

interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const dictionaries: Record<Language, TranslationType> = {
  pl,
  en,
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pl')
  const [isMounted, setIsMounted] = useState(false)

  // Pobranie języka przy montowaniu
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('app-language') as Language
    if (saved && (saved === 'pl' || saved === 'en')) {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('app-language', lang)
  }

  // Funkcja "t" - pobiera wartość na podstawie klucza kropkowego (np. "common.save")
  const t = (path: string): string => {
    const keys = path.split('.')
    let value: any = dictionaries[language]

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        // Fallback do polskiego, jeśli brakuje tłumaczenia
        let fallbackValue: any = dictionaries['pl']
        for (const fKey of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fKey in fallbackValue) {
            fallbackValue = fallbackValue[fKey]
          } else {
            return path // Zwraca ścieżkę jako fallback
          }
        }
        return typeof fallbackValue === 'string' ? fallbackValue : path
      }
    }

    return typeof value === 'string' ? value : path
  }

  // Zapobiegamy renderowaniu przed pobraniem localStorage, by uniknąć migotania języka (hydration mismatch)
  if (!isMounted) {
    return <>{children}</> // Renderuje z defaultowym 'pl' po stronie serwera
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
