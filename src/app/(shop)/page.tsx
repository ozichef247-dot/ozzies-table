import Link from 'next/link'
import { getPublicMenu, getReviews, getScheduleContext, getSettings, getZones } from '@/lib/data'
import { longNoticeNote, nextDates } from '@/lib/schedule'
import { DOW, DOW_LONG, dow, fmtDate, fmtWall } from '@/lib/time'
import { money } from '@/lib/money'
import { paragraphs } from '@/lib/text'
import { Photo } from '@/components/Photo'
import { DishCard } from '@/components/DishCard'
import { DeliveryDialog } from '@/components/DeliveryDialog'

export default async function Home() {
  const [{ general, content }, { categories, products }, zones, reviews, ctx] = await Promise.all([
    getSettings(), getPublicMenu(), getZones(), getReviews(true), getScheduleContext(),
  ])
  const next = nextDates(ctx, ['collection', 'delivery'], 1)[0]
  const featured = products.filter((p) => p.featured).slice(0, 4)
  const ln = longNoticeNote(products.filter((p) => p.available), general.leadHours)
  const minFee = zones.length ? Math.min(...zones.map((z) => z.fee_pence)) : 0
  const firstCollection = ctx.slots.filter((s) => s.method === 'collection')[0]?.start_time
  const days = [...general.cookingDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => `${DOW_LONG[d]}s`)

  return (
    <>
      <section className="hero">
        <div className="hero-ph"><Photo src={content.heroPhoto} alt="Oha, egusi, ugba and jollof served in bowls" ratio="3/2" sizes="(min-width: 1140px) 1080px, 100vw" priority /></div>
        <div className="wrap">
          <div className="hero-copy">
            <p className="rule eyebrow">{content.themeLine}</p>
            <h1>{content.headline}</h1>
            <p className="lede">{content.intro}</p>
            <div className="row">
              <Link className="btn btn-order" href="/menu">Order food</Link>
              <DeliveryDialog />
            </div>
            {next ? (
              <div className="next">
                <div className="cal"><span>{DOW[dow(next.date)]}</span><b className="num">{+next.date.slice(8)}</b></div>
                <div>
                  <p style={{ fontWeight: 700 }}>Next available: {fmtDate(next.date, true)}</p>
                  <p className="small muted">Order by <b className="num" style={{ color: 'var(--ink)' }}>{fmtWall(next.deadline)}</b>. All times UK.</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-hd"><h2>The menu</h2><Link className="link" href="/menu">See every dish</Link></div>
          <div className="tiles">
            {categories.map((c) => (
              <Link key={c.id} className="tile" href={`/menu?cat=${c.id}`}>
                <Photo src={c.photo_url || products.find((p) => p.category_id === c.id && p.photo_url)?.photo_url} alt={c.name} sizes="(min-width: 900px) 25vw, 50vw" />
                <b>{c.name}</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featured.length ? (
        <section className="section">
          <div className="wrap">
            <div className="section-hd"><div className="stack"><p className="eyebrow">Chosen by Ozzie</p><h2>Featured dishes</h2></div></div>
            <div className="grid">{featured.map((p) => <DishCard key={p.id} p={p} defaultLead={general.leadHours} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="wrap">
          <div className="section-hd"><h2>How ordering works</h2></div>
          <div className="steps">
            <div className="step"><h3>Choose your bowl</h3><p>Pick a dish and a size from 2 to 5 litres. Choose your seasoning and any extra protein.</p></div>
            <div className="step"><h3>Book a date</h3><p>Order at least {general.leadHours} hours ahead.{ln ? ` ${ln}` : ''} The calendar shows the order deadline for every date.</p></div>
            <div className="step"><h3>Collect or get delivery</h3><p>Collect from Ozzie’s kitchen, or get delivery around Peterborough from {money(minFee)}.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap story">
          <div><Photo src={content.storyPhoto} alt="Ozzie in the kitchen" sizes="(min-width: 860px) 50vw, 100vw" /></div>
          <div className="stack" style={{ ['--g' as string]: '14px' }}>
            <p className="eyebrow">Our story</p>
            <h2>From our pot to your table</h2>
            {paragraphs(content.story).map((p, i) => <p key={i} className="muted">{p}</p>)}
          </div>
        </div>
      </section>

      {reviews.length ? (
        <section className="section">
          <div className="wrap">
            <div className="section-hd"><h2>What customers say</h2></div>
            <div className="reviews">
              {reviews.slice(0, 6).map((r) => (
                <figure key={r.id} className="review"><q>{r.body}</q><figcaption className="small muted">{r.first_name}{r.town ? `, ${r.town}` : ''}</figcaption></figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" id="delivery">
        <div className="wrap">
          <div className="section-hd"><h2>Delivery and collection</h2></div>
          <div className="dinfo">
            <div className="panel stack" style={{ ['--g' as string]: '4px' }}>
              <h3 style={{ marginBottom: 8 }}>Delivery areas</h3>
              {zones.map((z) => (
                <div key={z.id} className="zone">
                  <span><b>{z.name}</b><br /><span className="small muted">{z.outcodes.join(', ')}</span></span>
                  <span className="num" style={{ fontWeight: 700 }}>{money(z.fee_pence)}</span>
                </div>
              ))}
              <p className="small muted" style={{ marginTop: 10 }}>Minimum order {money(general.minDeliveryPence)}. Free delivery over {money(general.freeOverPence)}.</p>
              <div style={{ marginTop: 12 }}><DeliveryDialog label="Check your postcode" className="btn btn-line btn-sm" /></div>
            </div>
            <div className="panel stack" style={{ ['--g' as string]: '8px' }}>
              <h3>Collection</h3>
              <p>{general.collection.address}</p>
              <p className="small muted">{general.collection.instructions}</p>
              {firstCollection ? <p className="small muted">Collection slots from {firstCollection} on {days.join(', ')}.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
