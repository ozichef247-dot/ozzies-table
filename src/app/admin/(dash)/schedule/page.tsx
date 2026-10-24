import { requireStaff } from '@/lib/auth'
import { db } from '@/lib/supabase/admin'
import { getClosures, getSettings, getSlots, getBookedRows } from '@/lib/data'
import { liveOrdersBetween } from '@/lib/admin-data'
import { countBooked } from '@/lib/schedule'
import { addDays, DOW, dow, fmtDate, todayUK } from '@/lib/time'
import { OPEN_STATUSES } from '@/lib/types'
import { ProductionList } from '@/components/admin/ProductionList'
import { Flash, G } from '@/components/admin/ui'
import { removeSlot, saveScheduleSettings, saveSlot, toggleClosure } from '../../actions'

export default async function Schedule({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const t = todayUK()
  const end = addDays(t, 20)
  const [{ general }, slots, closures, rows, orders, upcoming] = await Promise.all([
    getSettings(), getSlots(), getClosures(), getBookedRows(t, end), liveOrdersBetween(t, end),
    db().from('orders').select('slot_id').gte('fulfil_date', t).in('status', OPEN_STATUSES),
  ])
  const booked = countBooked(rows)
  const useCount = (id: string) => (upcoming.data ?? []).filter((o) => o.slot_id === id).length
  const days = Array.from({ length: 21 }, (_, i) => addDays(t, i))
  const closed = (d: string, s: string | null) => closures.some((c) => c.date === d && c.slot_id === s)
  const back = '/admin/schedule'

  const SlotTable = ({ method }: { method: 'collection' | 'delivery' }) => (
    <div className="stack" style={G('10px')}>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Start</th><th>End</th><th>Capacity</th><th>Upcoming</th><th></th></tr></thead>
          <tbody>
            {slots.filter((s) => s.method === method).map((s) => (
              <tr key={s.id}>
                <td colSpan={3}>
                  <form action={saveSlot} className="row" style={{ ...G('6px'), flexWrap: 'nowrap' }}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="back" value={back} />
                    <label className="vh" htmlFor={`st-${s.id}`}>Start</label><input id={`st-${s.id}`} name="start" type="time" className="mini" defaultValue={s.start_time} />
                    <label className="vh" htmlFor={`en-${s.id}`}>End</label><input id={`en-${s.id}`} name="end" type="time" className="mini" defaultValue={s.end_time} />
                    <label className="vh" htmlFor={`cap-${s.id}`}>Capacity</label><input id={`cap-${s.id}`} name="capacity" type="number" min={0} className="mini w-s" defaultValue={s.capacity} />
                    <button className="btn btn-quiet btn-sm">Save</button>
                  </form>
                </td>
                <td className="num">{useCount(s.id)}</td>
                <td className="r"><form action={removeSlot}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="back" value={back} /><button className="link small bad">Remove</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={saveSlot} className="row" style={G('6px')}>
        <input type="hidden" name="method" value={method} /><input type="hidden" name="back" value={back} />
        <label className="small" htmlFor={`new-st-${method}`}>New {method} slot</label>
        <input id={`new-st-${method}`} name="start" type="time" className="mini" style={{ width: 'auto' }} required aria-label="Start" />
        <input name="end" type="time" className="mini" style={{ width: 'auto' }} required aria-label="End" />
        <input name="capacity" type="number" min={0} defaultValue={4} className="mini w-s" aria-label="Capacity" />
        <button className="btn btn-quiet btn-sm">Add</button>
      </form>
    </div>
  )

  return (
    <div className="stack" style={G('22px')}>
      <Flash sp={sp} />
      <form action={saveScheduleSettings} className="panel stack" style={G('16px')}>
        <input type="hidden" name="back" value={back} />
        <h3>Notice, holds and cooking days</h3>
        <div className="f2">
          <div className="fld"><label htmlFor="leadHours">Minimum notice (hours)</label><input id="leadHours" name="leadHours" type="number" min={0} className="mini" defaultValue={general.leadHours} /><p className="hint">Used everywhere the site mentions notice, unless a dish or size sets its own.</p></div>
          <div className="fld"><label htmlFor="dailyCap">Maximum orders per day</label><input id="dailyCap" name="dailyCap" type="number" min={0} className="mini" defaultValue={general.dailyCap} /><p className="hint">Across collection and delivery.</p></div>
          <div className="fld"><label htmlFor="holdMinutes">Hold a slot during payment (minutes)</label><input id="holdMinutes" name="holdMinutes" type="number" min={5} max={30} className="mini" defaultValue={general.holdMinutes} /><p className="hint">Unpaid orders expire after this and free their slot.</p></div>
          <div className="fld"><label htmlFor="cancelHours">Free cancellation up to (hours before slot)</label><input id="cancelHours" name="cancelHours" type="number" min={0} className="mini" defaultValue={general.cancelHours} /></div>
        </div>
        <fieldset className="plain stack" style={G('8px')}>
          <legend style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: 8 }}>Cooking days</legend>
          <div className="row" style={G('12px')}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label key={d} className="check"><input type="checkbox" name={`day_${d}`} defaultChecked={general.cookingDays.includes(d)} />{DOW[d]}</label>
            ))}
          </div>
        </fieldset>
        <div><button className="btn btn-ink btn-sm">Save</button></div>
      </form>

      <div className="f2">
        <div className="panel stack"><h3>Collection slots</h3><SlotTable method="collection" /></div>
        <div className="panel stack"><h3>Delivery windows</h3><SlotTable method="delivery" /></div>
      </div>

      <div className="stack" style={G('10px')}>
        <div className="section-hd" style={{ margin: 0 }}><h2>Next three weeks</h2><span className="small muted">Open a day to close slots and see what to cook</span></div>
        {days.map((d) => {
          const open = general.cookingDays.includes(dow(d))
          const dayClosed = closed(d, null)
          const b = booked[d]?.total ?? 0
          const pct = Math.min(100, (b / (general.dailyCap || 1)) * 100)
          const dayOrders = orders.filter((o) => o.fulfil_date === d)
          return (
            <details key={d} className="dayrow">
              <summary style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
                <b>{fmtDate(d)}</b>
                <span className="row" style={{ ...G('10px'), flexWrap: 'nowrap' }}>
                  {!open ? <span className="pill muted">Not a cooking day</span> : dayClosed ? <span className="pill bad">Closed</span> : (
                    <><span className="cap grow" style={{ maxWidth: 220 }}><i className={b >= general.dailyCap ? 'full' : ''} style={{ width: `${pct}%` }} /></span><span className="small num muted">{b}/{general.dailyCap}</span></>
                  )}
                </span>
                <span className="muted" aria-hidden="true">+</span>
              </summary>
              <div className="inner">
                {open ? (
                  <>
                    <div className="row between">
                      <span className="small muted">{dayClosed ? 'Customers can’t book this day.' : 'Close the day for holidays or emergencies. Existing orders are kept.'}</span>
                      <form action={toggleClosure}><input type="hidden" name="date" value={d} /><input type="hidden" name="back" value={back} /><button className={`btn btn-sm ${dayClosed ? 'btn-ink' : 'btn-quiet'}`}>{dayClosed ? 'Reopen day' : 'Close day'}</button></form>
                    </div>
                    <div className="tbl-wrap">
                      <table>
                        <thead><tr><th>Slot</th><th>Booked</th><th></th></tr></thead>
                        <tbody>
                          {slots.map((s) => {
                            const n = booked[d]?.bySlot[s.id] ?? 0
                            const c = closed(d, s.id)
                            return (
                              <tr key={s.id}>
                                <td>{s.method === 'delivery' ? 'Delivery' : 'Collection'} <span className="num">{s.start_time}–{s.end_time}</span></td>
                                <td><span className="row" style={{ ...G('8px'), flexWrap: 'nowrap' }}><span className="cap" style={{ width: 80 }}><i className={n >= s.capacity ? 'full' : ''} style={{ width: `${Math.min(100, (n / (s.capacity || 1)) * 100)}%` }} /></span><span className="num small">{n}/{s.capacity}</span></span></td>
                                <td className="r">{dayClosed ? null : <form action={toggleClosure}><input type="hidden" name="date" value={d} /><input type="hidden" name="slotId" value={s.id} /><input type="hidden" name="back" value={back} /><button className="link small">{c ? 'Reopen' : 'Close'}</button></form>}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <p className="small muted">Not a cooking day. Tick it under Cooking days to take orders.</p>}
                <ProductionList items={dayOrders.flatMap((o) => o.order_items)} orderCount={dayOrders.length} />
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
