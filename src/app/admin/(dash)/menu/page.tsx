import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { getCategories, getProducts, getSettings } from '@/lib/data'
import { money } from '@/lib/money'
import { Photo } from '@/components/Photo'
import { Flash, G, Toggle } from '@/components/admin/ui'
import { createProduct, deleteCategory, moveCategory, saveCategory, setShowServes, toggleProductFlag, uploadCategoryPhoto } from '../../actions'

export default async function Menu({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const [cats, products, { general }] = await Promise.all([getCategories(true), getProducts(), getSettings()])
  const back = '/admin/menu'
  const B = () => <input type="hidden" name="back" value={back} />
  return (
    <div className="stack" style={G('22px')}>
      <Flash sp={sp} />
      <div className="panel stack" style={G('12px')}>
        <h3>Categories</h3>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Photo</th><th>Name and visibility</th><th>Order</th><th>Dishes</th><th></th></tr></thead>
            <tbody>
              {cats.map((c, i) => {
                const n = products.filter((p) => p.category_id === c.id).length
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="row" style={{ ...G('8px'), flexWrap: 'nowrap' }}>
                        <div className="thumb"><Photo src={c.photo_url} alt={c.name} sizes="84px" /></div>
                        <form action={uploadCategoryPhoto} className="row" style={G('6px')}>
                          <B /><input type="hidden" name="id" value={c.id} />
                          <label className="upl">{c.photo_url ? 'Replace' : 'Upload'}<input type="file" name="photo" accept="image/*" required /></label>
                          <button className="btn btn-quiet btn-sm">Save photo</button>
                        </form>
                      </div>
                    </td>
                    <td style={{ minWidth: 260 }}>
                      <form action={saveCategory} className="row" style={G('8px')}>
                        <B /><input type="hidden" name="id" value={c.id} />
                        <label className="vh" htmlFor={`cn-${c.id}`}>Category name</label>
                        <input id={`cn-${c.id}`} name="name" className="mini" defaultValue={c.name} style={{ width: 180 }} />
                        <label className="check small"><input type="checkbox" name="hidden" defaultChecked={c.hidden} />Hidden</label>
                        <button className="btn btn-quiet btn-sm">Save</button>
                      </form>
                    </td>
                    <td>
                      <div className="row" style={{ ...G('4px'), flexWrap: 'nowrap' }}>
                        <form action={moveCategory}><B /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" /><button className="btn btn-quiet btn-sm" disabled={i === 0} aria-label={`Move ${c.name} up`}>↑</button></form>
                        <form action={moveCategory}><B /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" /><button className="btn btn-quiet btn-sm" disabled={i === cats.length - 1} aria-label={`Move ${c.name} down`}>↓</button></form>
                      </div>
                    </td>
                    <td className="num">{n}</td>
                    <td>{n ? null : <form action={deleteCategory}><B /><input type="hidden" name="id" value={c.id} /><button className="link small bad">Delete</button></form>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <form action={saveCategory} className="row" style={G('8px')}>
          <B />
          <label htmlFor="newcat" className="small">New category</label>
          <input id="newcat" name="name" className="mini" style={{ width: 220 }} required />
          <button className="btn btn-quiet btn-sm">Add category</button>
        </form>
        <p className="hint">Hidden categories and their dishes don’t show to customers. A category can only be deleted once it has no dishes.</p>
      </div>

      <div className="stack" style={G('12px')}>
        <div className="section-hd" style={{ margin: 0 }}>
          <div className="stack"><h2>Dishes</h2><p className="small muted">Switch Available off to show a dish as sold out without deleting it.</p></div>
          <form action={createProduct}><button className="btn btn-ink btn-sm">Add dish</button></form>
        </div>
        <div className="row" style={G('10px')}>
          <Toggle action={setShowServes} on={general.showServes} label="Show serving estimates" hidden={{ back }} />
          <span>Show serving estimates to customers <span className="small muted">(turn on once portions are tested)</span></span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Dish</th><th>Category</th><th className="r">From</th><th>Sizes</th><th>Available</th><th>Featured</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="row" style={{ ...G('10px'), flexWrap: 'nowrap' }}>
                      <div className="thumb"><Photo src={p.photo_url} alt={p.name} sizes="84px" /></div>
                      <span><b>{p.name}</b>{p.photo_url ? null : <><br /><span className="small" style={{ color: 'var(--warn)' }}>Needs photo</span></>}</span>
                    </div>
                  </td>
                  <td>{cats.find((c) => c.id === p.category_id)?.name ?? '—'}</td>
                  <td className="r num">{p.sizes.length ? money(Math.min(...p.sizes.map((s) => s.price_pence))) : '—'}</td>
                  <td className="small">{p.sizes.map((s) => s.size).join(' ')}</td>
                  <td><Toggle action={toggleProductFlag} on={p.available} label={`${p.name} available`} hidden={{ id: p.id, field: 'available', back }} /></td>
                  <td><Toggle action={toggleProductFlag} on={p.featured} label={`${p.name} featured`} hidden={{ id: p.id, field: 'featured', back }} /></td>
                  <td className="r"><Link className="btn btn-quiet btn-sm" href={`/admin/menu/${p.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Featured dishes appear on the homepage, up to four, in the order listed here.</p>
      </div>
    </div>
  )
}
