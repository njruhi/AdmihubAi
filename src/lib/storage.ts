import type { BrainDoc } from '../types'

const PREFIX = 'admihub.'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (err) {
    console.warn('[admihub] localStorage write failed', key, err)
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* noop */
  }
}

export function clearAllLocal() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ *
 * IndexedDB — uploaded "Brain" documents can be large (PDF text),
 * so they live outside localStorage.
 * ------------------------------------------------------------------ */

const DB_NAME = 'admihub-brain'
const STORE = 'docs'
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const brainDb = {
  async all(): Promise<BrainDoc[]> {
    try {
      const rows = await tx<BrainDoc[]>('readonly', (s) => s.getAll() as IDBRequest<BrainDoc[]>)
      return (rows || []).sort((a, b) => b.addedAt - a.addedAt)
    } catch {
      return []
    }
  },
  async put(doc: BrainDoc): Promise<void> {
    await tx('readwrite', (s) => s.put(doc) as IDBRequest<IDBValidKey>)
  },
  async del(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>)
  },
  async clear(): Promise<void> {
    await tx('readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>)
  },
}

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  )
}
