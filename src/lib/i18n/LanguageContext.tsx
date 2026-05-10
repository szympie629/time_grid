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

  // Always render inside Provider – on SSR isMounted=false but we still provide
  // the default Polish context so useTranslation() never throws during prerender.
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    // SSR / prerender safety fallback – return Polish dictionary directly
    const fallbackT = (path: string): string => {
      const keys = path.split('.')
      let value: any = dictionaries['pl']
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key]
        } else {
          return path
        }
      }
      return typeof value === 'string' ? value : path
    }
    return { language: 'pl' as const, setLanguage: (_: 'pl' | 'en') => {}, t: fallbackT }
  }
  return context
}
