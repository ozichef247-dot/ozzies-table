import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { getCategories, getProducts, getSettings } from '@/lib/data'
import { ALLERGENS, SEASONS, SIZES } from '@/lib/types'
import { DOW } from '@/lib/time'
import { pounds } from '@/lib/money'
import { Photo } from '@/components/Photo'
import { Flash, G } from '@/components/admin/ui'
import { deleteProduct, removeProductPhoto, saveProduct, uploadProductPhoto } from '../../../actions'

export default async function EditDish({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; confirm?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  await requireStaff(['owner'])
  const [products, cats, { general }] = await Promise.all([getProducts(), getCategories(true), getSettings()])
  const p = products.find((x) => x.id === id)
  if (!p) notFound()
  const back = `/admin/menu/${p.id}`
  return (
    <div className="stack" style={G('18px')}>
      <Flash sp={sp} />
      <div className="row between">
        <div><p className="small"><Link className="link" href="/admin/menu">← Menu</Link></p><h1 style={{ fontSize: '1.8rem' }}>{p.name}</h1></div>
        <Link className="btn btn-quiet btn-sm" href={`/menu/${p.slug}`} target="_blank">View on site</Link>
      </div>

      <div className="panel row" style={{ ...G('16px'), alignItems: 'flex-start' }}>
        <div style={{ width: 200, maxWidth: '100%' }}><Photo src={p.photo_url} alt={p.name} sizes="200px" /></div>
        <div className="stack grow" style={G('8px')}>
          <b>Dish photo</b>
          <p className="small muted">Shoot in natural light at 4:3. Uploads are cropped to 4:3 around the food, resized and saved in modern formats.</p>
          <form action={uploadProductPhoto} className="row" style={G('8px')}>
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
            <label className="upl">{p.photo_url ? 'Choose new photo' : 'Choose photo'}<input type="file" name="photo" accept="image/*" required /></label>
            <button className="btn btn-quiet btn-sm">Upload</button>
          </form>
          {p.photo_url ? <form action={removeProductPhoto}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} /><button className="link small bad">Remove photo</button></form> : null}
        </div>
      </div>

      <form action={saveProduct} className="stack" style={G('18px')}>
        <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
        <div className="panel stack" style={G('14px')}>
          <h3>Basics</h3>
          <div className="f2">
            <div className="fld"><label htmlFor="name">Name</label><input id="name" name="name" className="mini" defaultValue={p.name} required /></div>
            <div className="fld"><label htmlFor="category_id">Category</label><select id="category_id" name="category_id" className="mini" defaultValue={p.category_id}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.hidden ? ' (hidden)' : ''}</option>)}</select></div>
          </div>
          <div className="fld"><label htmlFor="description">Short description <span className="opt-tx">one or two lines on the menu</span></label><textarea id="description" name="description" className="mini" rows={2} maxLength={400} defaultValue={p.description} /></div>
          <div className="fld"><label htmlFor="included">Protein included in the base price</label><input id="included" name="included" className="mini" defaultValue={p.included} placeholder="e.g. assorted beef and stockfish (leave blank for none)" /><p className="hint">Shown as “Includes …”. Set a different one per size below if it changes with size.</p></div>
          <div className="fld"><label htmlFor="slug">Web address</label><input id="slug" name="slug" className="mini" defaultValue={p.slug} /><p className="hint">ozziestable…/menu/<b>{p.slug}</b></p></div>
          <div className="row" style={G('18px')}>
            <label className="check"><input type="checkbox" name="available" defaultChecked={p.available} />Available</label>
            <label className="check"><input type="checkbox" name="featured" defaultChecked={p.featured} />Featured on homepage</label>
            <label className="check"><input type="checkbox" name="allow_notes" defaultChecked={p.allow_notes} />Allow special instructions</label>
          </div>
        </div>

        <div className="panel stack" style={G('10px')}>
          <h3>Sizes and prices</h3>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Offered</th><th>Price £</th><th>Notice h</th><th>Included protein for this size</th><th>Serving estimate</th></tr></thead>
              <tbody>
                {SIZES.map((s) => {
                  const v = p.sizes.find((x) => x.size === s)
                  return (
                    <tr key={s}>
                      <td><label className="check"><input type="checkbox" name={`size_${s}_on`} defaultChecked={!!v} /><b>{s}</b></label></td>
                      <td><input name={`size_${s}_price`} className="mini w-s" inputMode="decimal" defaultValue={v ? pounds(v.price_pence) : ''} aria-label={`${s} price`} /></td>
                      <td><input name={`size_${s}_lead`} type="number" min={0} className="mini w-s" defaultValue={v?.lead_hours ?? ''} placeholder="—" aria-label={`${s} notice hours`} /></td>
                      <td style={{ minWidth: 180 }}><input name={`size_${s}_included`} className="mini" defaultValue={v?.included ?? ''} placeholder="Same as above" aria-label={`${s} included protein`} /></td>
                      <td style={{ minWidth: 140 }}><input name={`size_${s}_serves`} className="mini" defaultValue={v?.serves ?? ''} placeholder="e.g. Serves 4–5" aria-label={`${s} serving estimate`} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="hint">Leave notice blank to use the dish or site default ({general.leadHours} hours). Serving estimates stay hidden until “Show serving estimates” is on.</p>
        </div>

        <div className="panel stack" style={G('10px')}>
          <h3>Protein choices</h3>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Choice</th><th>Type</th><th>Price £</th><th>Remove</th></tr></thead>
              <tbody>
                {p.proteins.map((x) => (
                  <tr key={x.id}>
                    <td style={{ minWidth: 220 }}><input type="hidden" name="prot_id" value={x.id} /><input name={`prot_${x.id}_name`} className="mini" defaultValue={x.name} aria-label="Choice" /></td>
                    <td><select name={`prot_${x.id}_kind`} className="mini" defaultValue={x.kind} aria-label="Type"><option value="swap">Swap (pick one)</option><option value="add">Extra (any)</option></select></td>
                    <td><input name={`prot_${x.id}_price`} className="mini w-s" inputMode="decimal" defaultValue={pounds(x.price_pence)} aria-label="Price" /></td>
                    <td><input type="checkbox" name={`prot_${x.id}_delete`} aria-label={`Remove ${x.name}`} /></td>
                  </tr>
                ))}
                {[0, 1, 2].map((n) => (
                  <tr key={`n${n}`}>
                    <td><input name={`new_${n}_name`} className="mini" placeholder="Add a choice, e.g. Extra goat meat" aria-label="New choice" /></td>
                    <td><select name={`new_${n}_kind`} className="mini" defaultValue="add" aria-label="Type"><option value="swap">Swap (pick one)</option><option value="add">Extra (any)</option></select></td>
                    <td><input name={`new_${n}_price`} className="mini w-s" inputMode="decimal" placeholder="0.00" aria-label="Price" /></td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel stack" style={G('10px')}>
          <h3>Seasoning</h3>
          <label className="check"><input type="checkbox" name="seasoning_enabled" defaultChecked={p.seasoning_enabled} />Customer must choose Mild, Medium or Hot</label>
          <div className="row" style={G('12px')}>
            {SEASONS.map((s) => (
              <div key={s} className="fld" style={{ width: 120 }}><label htmlFor={`season_${s}`}>{s} +£</label><input id={`season_${s}`} name={`season_${s}`} className="mini" inputMode="decimal" defaultValue={pounds(p.season_prices?.[s] ?? 0)} /></div>
            ))}
          </div>
        </div>

        <div className="panel stack" style={G('10px')}>
          <h3>Allergens</h3>
          <p className="hint">Fixed facts about the dish. Customer choices never change this list.</p>
          <div className="row" style={G('8px 16px')}>
            {ALLERGENS.map((a) => <label key={a} className="check small"><input type="checkbox" name={`allergen_${a}`} defaultChecked={p.allergens.includes(a)} />{a}</label>)}
          </div>
        </div>

        <div className="panel stack" style={G('12px')}>
          <h3>Labels and availability</h3>
          <div className="row" style={G('16px')}>
            {['Vegetarian', 'Vegan'].map((t) => <label key={t} className="check"><input type="checkbox" name={`tag_${t}`} defaultChecked={p.tags.includes(t)} />{t}</label>)}
          </div>
          <div className="f2">
            <div className="fld"><label htmlFor="lead_hours">Notice for this dish (hours)</label><input id="lead_hours" name="lead_hours" type="number" min={0} className="mini" defaultValue={p.lead_hours ?? ''} placeholder={`Default ${general.leadHours}`} /></div>
            <fieldset className="plain stack" style={G('6px')}>
              <legend style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: 6 }}>Only cooked on</legend>
              <div className="row" style={G('10px')}>{[5, 6, 0, 1, 2, 3, 4].map((d) => <label key={d} className="check small"><input type="checkbox" name={`cook_${d}`} defaultChecked={p.cook_days.includes(d)} />{DOW[d]}</label>)}</div>
              <p className="hint">None ticked means every cooking day.</p>
            </fieldset>
          </div>
        </div>

        <div className="row between">
          <button className="btn btn-ink">Save dish</button>
          {sp.confirm === 'delete' ? null : <Link className="link small bad" href={`${back}?confirm=delete`}>Delete dish</Link>}
        </div>
      </form>
      {sp.confirm === 'delete' ? (
        <div className="alert bad stack" style={G('10px')}>
          <span>Delete {p.name}? Past orders keep their details. To hide it for now instead, switch Available off.</span>
          <div className="row">
            <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value="/admin/menu" /><button className="btn btn-danger btn-sm">Delete dish</button></form>
            <Link className="btn btn-quiet btn-sm" href={back}>Keep it</Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
