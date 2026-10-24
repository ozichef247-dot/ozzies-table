import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

// Runs the real migration and seed in an in-memory Postgres to test slot holds, expiry and confirmation.
const db = new PGlite()
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows
let slotId = ''

const order = (name: string, date = '2030-01-04') => JSON.stringify({
  method: 'collection', fulfil_date: date, slot_id: slotId, slot_label: '12:00–13:00', slot_start: '12:00',
  customer_first: name, customer_last: 'Test', customer_email: 't@example.com', customer_phone: '07700900000',
  subtotal_pence: 3800, discount_pence: 0, delivery_fee_pence: 0, total_pence: 3800,
})
const items = JSON.stringify([{ product_id: '', name: 'Egusi Soup', size_label: '2 litres', included_text: 'Includes beef', extras: ['Extra stockfish (+£5.00)'], seasoning: 'Hot', qty: 1, unit_pence: 3800, line_pence: 3800 }])
const reserve = (name: string, existing: string | null = null) =>
  q<{ r_id: string; r_ref: string }>('select * from reserve_order($1::jsonb, $2::jsonb, $3, 10, 24)', [order(name), items, existing])

beforeAll(async () => {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as 'select null::uuid';
    create schema storage; create table storage.buckets(id text primary key, name text, public bool); create role anon; create role authenticated;`)
  const root = path.resolve(__dirname, '..', 'supabase')
  await db.exec(fs.readFileSync(path.join(root, 'migrations', fs.readdirSync(path.join(root, 'migrations'))[0]), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8'))
  slotId = (await q<{ id: string }>(`select id from slots where method = 'collection' and start_time = '12:00'`))[0].id // capacity 4
}, 60_000)

describe('slot holds', () => {
  it('seeds the menu', async () => {
    const [r] = await q<{ n: number }>('select count(*)::int n from products')
    expect(r.n).toBe(15)
  })

  const ids: string[] = []
  it('holds places up to capacity, then refuses', async () => {
    for (const n of ['A', 'B', 'C', 'D']) ids.push((await reserve(n))[0].r_id)
    await expect(reserve('E')).rejects.toThrow(/SLOT_FULL/)
  })

  it('frees a place when a hold expires', async () => {
    await q(`update orders set hold_until = now() - interval '1 minute' where id = $1`, [ids[0]])
    const [{ n }] = await q<{ n: number }>('select expire_holds() n')
    expect(n).toBe(1)
    ids.push((await reserve('F'))[0].r_id)
    await expect(reserve('G')).rejects.toThrow(/SLOT_FULL/)
  })

  it('confirms a payment inside its hold exactly once', async () => {
    expect((await q<{ r: string }>('select try_confirm_order($1, 24) r', [ids[1]]))[0].r).toBe('confirmed')
    expect((await q<{ r: string }>('select try_confirm_order($1, 24) r', [ids[1]]))[0].r).toBe('already')
  })

  it('refuses a late payment once the slot has filled (two customers cannot both get the last place)', async () => {
    expect((await q<{ r: string }>('select try_confirm_order($1, 24) r', [ids[0]]))[0].r).toBe('full')
  })

  it('accepts a late payment if there is still room', async () => {
    await q(`update orders set status = 'cancelled' where id = $1`, [ids[2]])
    expect((await q<{ r: string }>('select try_confirm_order($1, 24) r', [ids[0]]))[0].r).toBe('confirmed')
  })

  it('reuses one unpaid order on retry instead of creating another', async () => {
    const [{ before }] = await q<{ before: number }>('select count(*)::int before from orders')
    const r = await reserve('D2', ids[3])
    const [{ after }] = await q<{ after: number }>('select count(*)::int after from orders')
    expect(r[0].r_id).toBe(ids[3])
    expect(after).toBe(before)
  })

  it('keeps item choices on the order', async () => {
    const [i] = await q<{ extras: string[]; seasoning: string }>('select extras, seasoning from order_items limit 1')
    expect(i).toEqual({ extras: ['Extra stockfish (+£5.00)'], seasoning: 'Hot' })
  })
})
