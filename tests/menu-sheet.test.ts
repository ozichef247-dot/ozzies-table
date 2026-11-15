import { beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const root = path.join(__dirname, '..', 'supabase')
const menu = fs.readFileSync(path.join(root, 'menu', '2026-11-price-list.sql'), 'utf8')

beforeAll(async () => {
  const setup = fs.readFileSync(path.join(__dirname, 'database.test.ts'), 'utf8').match(/await db\.exec\(`(create schema auth[\s\S]*?)`\)/)![1]
  await db.exec(setup)
  for (const f of fs.readdirSync(path.join(root, 'migrations')).sort()) await db.exec(fs.readFileSync(path.join(root, 'migrations', f), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8'))
  await db.exec(`update public.products set photo_url = 'egusi.jpg', featured = true where slug = 'egusi-soup'`)
  await db.exec(menu)
  await db.exec(menu) // safe to run twice
}, 60000)

const one = async <T,>(sql: string) => (await db.query<T>(sql)).rows

describe('November price list', () => {
  it('shows exactly the 18 dishes on the sheet and hides the rest', async () => {
    const [{ n }] = await one<{ n: number }>(`select count(*)::int n from products where available`)
    expect(n).toBe(18)
    const hidden = await one<{ slug: string }>(`select slug from products where not available order by slug`)
    expect(hidden.map((h) => h.slug)).toContain('asun')
  })
  it('sets prices and options from the sheet', async () => {
    const r = await one<{ size: string; price_pence: number }>(`select s.size, s.price_pence from product_sizes s join products p on p.id = s.product_id where p.slug = 'oha-soup' order by s.size`)
    expect(r).toEqual([{ size: '2L', price_pence: 6500 }, { size: '3L', price_pence: 9000 }, { size: '4L', price_pence: 11000 }])
    const o = await one<{ name: string; price_pence: number; kind: string }>(`select o.name, o.price_pence, o.kind from protein_options o join products p on p.id = o.product_id where p.slug = 'egusi-soup' order by o.sort`)
    expect(o.map((x) => `${x.kind}:${x.name}:${x.price_pence}`)).toEqual([
      'swap:Swap to chicken:700', 'swap:Swap to goat meat:900', 'swap:Swap to fish (no beef):700', 'swap:Swap to turkey:900',
      'add:Extra assorted meat:600', 'add:Extra stockfish:500',
    ])
    const stew = await one<{ included: string }>(`select s.included from product_sizes s join products p on p.id = s.product_id where p.slug = 'chicken-stew' and s.size = '3L'`)
    expect(stew[0].included).toBe('10–12 pieces of chicken')
  })
  it('keeps photos and featured, and sells banana bread whole', async () => {
    const [e] = await one<{ photo_url: string; featured: boolean }>(`select photo_url, featured from products where slug = 'egusi-soup'`)
    expect(e).toEqual({ photo_url: 'egusi.jpg', featured: true })
    const b = await one<{ size: string; price_pence: number; cat: string }>(`select s.size, s.price_pence, c.name cat from product_sizes s join products p on p.id = s.product_id join categories c on c.id = p.category_id where p.slug = 'banana-bread'`)
    expect(b).toEqual([{ size: 'Whole', price_pence: 1500, cat: 'Specials' }])
  })
})
