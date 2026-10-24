import { requireStaff } from '@/lib/auth'
import { getPromos } from '@/lib/data'
import { pounds } from '@/lib/money'
import { Flash, G } from '@/components/admin/ui'
import { deletePromo, savePromo } from '../../actions'
import type { Promo } from '@/lib/types'

function PromoForm({ p }: { p?: Promo }) {
  const back = '/admin/promotions'
  return (
    <form action={savePromo} className="row" style={{ ...G('6px'), alignItems: 'flex-end' }}>
      <input type="hidden" name="back" value={back} />{p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="fld"><label className="small">Code</label><input name="code" className="mini" defaultValue={p?.code} style={{ width: 130, textTransform: 'uppercase' }} required /></div>
      <div className="fld"><label className="small">Type</label><select name="kind" className="mini" defaultValue={p?.kind ?? 'pct'}><option value="pct">% off</option><option value="fixed">£ off</option></select></div>
      <div className="fld"><label className="small">Value</label><input name="value" className="mini w-s" defaultValue={p ? (p.kind === 'pct' ? p.value : pounds(p.value)) : ''} /></div>
      <div className="fld"><label className="small">Min spend £</label><input name="min" className="mini w-s" defaultValue={p ? pounds(p.min_pence) : ''} /></div>
      <div className="fld"><label className="small">From</label><input name="starts_on" type="date" className="mini" defaultValue={p?.starts_on ?? ''} /></div>
      <div className="fld"><label className="small">Until</label><input name="ends_on" type="date" className="mini" defaultValue={p?.ends_on ?? ''} /></div>
      <div className="fld"><label className="small">Use limit</label><input name="usage_limit" type="number" min={0} className="mini w-s" defaultValue={p?.usage_limit ?? ''} /></div>
      <label className="check small" style={{ paddingBottom: 8 }}><input type="checkbox" name="active" defaultChecked={p?.active ?? true} />Active</label>
      <button className="btn btn-quiet btn-sm">{p ? 'Save' : 'Add code'}</button>
      {p ? <span className="small muted" style={{ paddingBottom: 8 }}>Used {p.used_count}</span> : null}
    </form>
  )
}

export default async function Promotions({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const promos = await getPromos()
  return (
    <div className="stack" style={G('16px')}>
      <Flash sp={sp} />
      <h2>Promotions</h2>
      {promos.map((p) => (
        <div key={p.id} className="panel row between" style={G('10px')}>
          <PromoForm p={p} />
          <form action={deletePromo}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value="/admin/promotions" /><button className="link small bad">Delete</button></form>
        </div>
      ))}
      <div className="panel stack" style={G('8px')}><h3>New code</h3><PromoForm /></div>
    </div>
  )
}
