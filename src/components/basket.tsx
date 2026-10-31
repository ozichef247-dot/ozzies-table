'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BasketLine } from '@/lib/pricing'

interface Prefs {
  postcode: string
  method: 'collection' | 'delivery'
  promo: string
  pending: { ref: string; token: string } | null
}

interface BasketCtx {
  lines: BasketLine[]
  count: number
  ready: boolean
  prefs: Prefs
  add: (line: BasketLine) => void
  replace: (index: number, line: BasketLine) => void
  setQty: (index: number, qty: number) => void
  remove: (index: number) => void
  clear: () => void
  setPrefs: (p: Partial<Prefs>) => void
}

const KEY = 'ozzies-basket-v1'
const PREFS = 'ozzies-prefs-v1'
const Ctx = createContext<BasketCtx | null>(null)

export const sameChoice = (a: BasketLine, b: BasketLine) =>
  a.productId === b.productId && a.size === b.size && (a.swapId ?? null) === (b.swapId ?? null) &&
  [...a.extraIds].sort().join() === [...b.extraIds].sort().join() && (a.seasoning ?? null) === (b.seasoning ?? null) &&
  (a.note ?? '') === (b.note ?? '')

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // private browsing or storage full: the basket still works for this visit
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([])
  const [prefs, setPrefsState] = useState<Prefs>({ postcode: '', method: 'collection', promo: '', pending: null })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLines(read<BasketLine[]>(KEY, []))
    setPrefsState((p) => ({ ...p, ...read<Partial<Prefs>>(PREFS, {}) }))
    setReady(true)
  }, [])
  useEffect(() => { if (ready) write(KEY, lines) }, [lines, ready])
  useEffect(() => { if (ready) write(PREFS, prefs) }, [prefs, ready])

  const add = useCallback((line: BasketLine) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => sameChoice(l, line))
      if (i < 0) return [...ls, line]
      const next = [...ls]
      next[i] = { ...next[i], qty: Math.min(20, next[i].qty + line.qty) }
      return next
    })
  }, [])
  const replace = useCallback((index: number, line: BasketLine) => setLines((ls) => ls.map((l, i) => (i === index ? line : l))), [])
  const setQty = useCallback((index: number, qty: number) =>
    setLines((ls) => (qty <= 0 ? ls.filter((_, i) => i !== index) : ls.map((l, i) => (i === index ? { ...l, qty: Math.min(20, qty) } : l)))), [])
  const remove = useCallback((index: number) => setLines((ls) => ls.filter((_, i) => i !== index)), [])
  const clear = useCallback(() => setLines([]), [])
  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((s) => ({ ...s, ...p })), [])

  const value = useMemo(
    () => ({ lines, count: lines.reduce((s, l) => s + l.qty, 0), ready, prefs, add, replace, setQty, remove, clear, setPrefs }),
    [lines, ready, prefs, add, replace, setQty, remove, clear, setPrefs],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBasket() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useBasket must be inside BasketProvider')
  return c
}
