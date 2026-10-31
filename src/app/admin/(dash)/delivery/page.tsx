import { requireStaff } from '@/lib/auth'
import { getSettings, getZones } from '@/lib/data'
import { checkPostcode } from '@/lib/postcode'
import { DEFAULT_OFFLINE_NOTE } from '@/lib/email'
import { env } from '@/lib/env'
import { money, pounds } from '@/lib/money'
import { Flash, G } from '@/components/admin/ui'
import { deleteZone, saveDeliverySettings, saveZone } from '../../actions'

export default async function Delivery({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; pc?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const [{ general }, zones] = await Promise.all([getSettings(), getZones()])
  const back = '/admin/delivery'
  const test = sp.pc ? checkPostcode(sp.pc, zones) : null
  return (
    <div className="stack" style={G('18px')}>
      <Flash sp={sp} />
      <form action={saveDeliverySettings} className="stack" style={G('18px')}>
        <input type="hidden" name="back" value={back} />
        <div className="panel stack" style={G('14px')}>
          <h3>Collection point</h3>
          <div className="fld"><label htmlFor="address">Address</label><textarea id="address" name="address" className="mini" rows={2} defaultValue={general.collection.address} /></div>
          <div className="fld"><label htmlFor="instructions">Instructions shown at checkout, on confirmation and in emails</label><textarea id="instructions" name="instructions" className="mini" rows={2} defaultValue={general.collection.instructions} /></div>
        </div>
        <div className="panel stack" style={G('14px')}>
          <h3>Contact for questions</h3>
          <div className="f2">
            <div className="fld"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" className="mini" defaultValue={general.contact.phone} /></div>
            <div className="fld"><label htmlFor="email">Order email (new-order alerts go here)</label><input id="email" name="email" type="email" className="mini" defaultValue={general.contact.email} /></div>
            <div className="fld"><label htmlFor="whatsappDisplay">WhatsApp number as shown</label><input id="whatsappDisplay" name="whatsappDisplay" className="mini" defaultValue={general.contact.whatsappDisplay} /></div>
            <div className="fld"><label htmlFor="whatsapp">WhatsApp number for the link</label><input id="whatsapp" name="whatsapp" className="mini" defaultValue={general.contact.whatsapp} placeholder="447700900000" /><p className="hint">International format, digits only.</p></div>
          </div>
        </div>
        <div className="panel stack" style={G('14px')}>
          <h3>Delivery rules</h3>
          <div className="f2">
            <div className="fld"><label htmlFor="minDelivery">Minimum order for delivery (£)</label><input id="minDelivery" name="minDelivery" className="mini" inputMode="decimal" defaultValue={pounds(general.minDeliveryPence)} /></div>
            <div className="fld"><label htmlFor="freeOver">Free delivery over (£)</label><input id="freeOver" name="freeOver" className="mini" inputMode="decimal" defaultValue={pounds(general.freeOverPence)} /><p className="hint">Set very high to turn off.</p></div>
          </div>
          <div className="fld"><label htmlFor="basis">Apply the minimum and free delivery to</label>
            <select id="basis" name="basis" className="mini" defaultValue={general.thresholdBasis}><option value="after">Subtotal after discounts</option><option value="before">Subtotal before discounts</option></select>
            <p className="hint">Both rules always use the same figure.</p></div>
        </div>
        <div className="panel stack" style={G('14px')}>
          <h3>Payment</h3>
          <p className="small muted">{env.paymentsEnabled() ? 'Customers pay online at checkout.' : 'Online payment is switched off. Each order is saved here and emailed to the order email above, with the customer’s details, so you can arrange payment.'}</p>
          <div className="fld"><label htmlFor="offlinePaymentNote">What customers are told about payment</label><textarea id="offlinePaymentNote" name="offlinePaymentNote" className="mini" rows={2} defaultValue={general.offlinePaymentNote || DEFAULT_OFFLINE_NOTE} /><p className="hint">Shown at checkout and on the order page while online payment is off. For example: “We’ll text you our bank details to pay before your slot.”</p></div>
        </div>
        <div className="panel stack" style={G('12px')}>
          <h3>Customer messages</h3>
          <label className="check"><input type="checkbox" name="notify_ready" defaultChecked={general.notify.ready} />Email when an order is ready for collection</label>
          <label className="check"><input type="checkbox" name="notify_out" defaultChecked={general.notify.out} />Email when an order is out for delivery</label>
          <label className="check"><input type="checkbox" name="notify_completed" defaultChecked={general.notify.completed !== false} />Email when an order is completed (collected or delivered)</label>
          <p className="hint">SMS is planned for a later phase (about 4p a message). The confirmation page only promises messages that are switched on here.</p>
        </div>
        <div><button className="btn btn-ink">Save</button></div>
      </form>

      <div className="panel stack" style={G('12px')}>
        <h3>Delivery zones</h3>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Zone, postcode districts and fee</th><th /></tr></thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id}>
                  <td>
                    <form action={saveZone} className="row" style={G('6px')}>
                      <input type="hidden" name="id" value={z.id} /><input type="hidden" name="back" value={back} />
                      <input name="name" className="mini" defaultValue={z.name} style={{ width: 180 }} aria-label="Zone name" />
                      <input name="outcodes" className="mini" defaultValue={z.outcodes.join(' ')} style={{ width: 240, textTransform: 'uppercase' }} aria-label="Postcode districts" />
                      <span className="small">£</span><input name="fee" className="mini w-s" inputMode="decimal" defaultValue={pounds(z.fee_pence)} aria-label="Fee" />
                      <button className="btn btn-quiet btn-sm">Save</button>
                    </form>
                  </td>
                  <td className="r"><form action={deleteZone}><input type="hidden" name="id" value={z.id} /><input type="hidden" name="back" value={back} /><button className="link small bad">Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={saveZone} className="row" style={G('6px')}>
          <input type="hidden" name="back" value={back} />
          <input name="name" className="mini" placeholder="New zone name" style={{ width: 180 }} aria-label="New zone name" required />
          <input name="outcodes" className="mini" placeholder="e.g. PE9 PE10" style={{ width: 240 }} aria-label="Postcode districts" />
          <span className="small">£</span><input name="fee" className="mini w-s" inputMode="decimal" placeholder="5.00" aria-label="Fee" />
          <button className="btn btn-quiet btn-sm">Add zone</button>
        </form>
        <form className="fld" style={{ maxWidth: 420 }}>
          <label htmlFor="pc">Test a postcode</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}><input id="pc" name="pc" className="inp grow" defaultValue={sp.pc ?? ''} placeholder="e.g. PE7 8QL" /><button className="btn btn-quiet btn-sm">Test</button></div>
          {test ? (test.ok ? <p className="hint" style={{ color: 'var(--ok)', fontWeight: 600 }}>{test.zone.name}: {money(test.zone.fee_pence)}</p> : <p className="err">{test.message}</p>) : null}
        </form>
      </div>
    </div>
  )
}
