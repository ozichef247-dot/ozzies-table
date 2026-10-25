import { requireStaff } from '@/lib/auth'
import { getFaqs, getReviews, getSettings } from '@/lib/data'
import { Photo } from '@/components/Photo'
import { Brand } from '@/components/ShopHeader'
import { Flash, G } from '@/components/admin/ui'
import {
  deleteFaq, deleteReview, saveFaq, saveFontPairing, saveHomepage, saveLegal, saveReview, saveSeo, uploadSiteImage,
} from '../../actions'

const back = '/admin/content'
const B = () => <input type="hidden" name="back" value={back} />

function ImageField({ which, label, hint, src, ratio }: { which: string; label: string; hint: string; src: string | null; ratio: string }) {
  return (
    <div className="row" style={{ ...G('14px'), alignItems: 'flex-start' }}>
      <div style={{ width: 220, maxWidth: '100%' }}>
        {which === 'logo'
          ? <div className="logo" style={{ background: 'var(--green)', color: 'var(--on-green)', padding: '12px 16px', borderRadius: 10 }}><Brand logo={src} sub="Header preview" /></div>
          : <Photo src={src} alt={label} ratio={ratio} sizes="220px" />}
      </div>
      <div className="stack grow" style={G('8px')}>
        <b>{label}</b>
        <p className="small muted">{hint}</p>
        <form action={uploadSiteImage} className="row" style={G('8px')}>
          <B /><input type="hidden" name="which" value={which} />
          <label className="upl">{src ? 'Choose new image' : 'Choose image'}<input type="file" name="photo" accept="image/*" required /></label>
          <button className="btn btn-quiet btn-sm">Upload</button>
        </form>
        {src ? <form action={uploadSiteImage}><B /><input type="hidden" name="which" value={which} /><input type="hidden" name="remove" value="true" /><button className="link small bad">Remove</button></form> : null}
      </div>
    </div>
  )
}

export default async function Content({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const [{ content: c }, faqs, reviews] = await Promise.all([getSettings(), getFaqs(), getReviews(false)])
  const l = c.legal
  return (
    <div className="stack" style={G('18px')}>
      <Flash sp={sp} />

      <form action={saveFontPairing} className="panel stack" style={G('12px')}>
        <B /><h3>Font pairing</h3>
        <p className="small muted">Three proposals. All are free Google Fonts, licensed for web use.</p>
        <div className="row" style={G('16px')}>
          {[['a', 'Young Serif + Figtree'], ['b', 'Cormorant Garamond + Mulish'], ['c', 'DM Serif Display + Karla']].map(([k, label]) => (
            <label key={k} className="check"><input type="radio" name="fontPairing" value={k} defaultChecked={c.fontPairing === k} />{label}</label>
          ))}
        </div>
        <div><button className="btn btn-quiet btn-sm">Use this pairing</button></div>
      </form>

      <div className="panel stack" style={G('16px')}>
        <h3>Images</h3>
        <ImageField which="logo" label="Logo" hint="Shown on the green header, so use a light or white version. PNG or SVG with a transparent background works best. Until one is uploaded, the name is set in the heading font." src={c.logo} ratio="3/1" />
        <ImageField which="heroPhoto" label="Hero photo" hint="Oha, egusi, ugba and jollof in bowls. Cropped to 3:2; on phones a little is trimmed from the top and bottom, so keep the bowls near the middle." src={c.heroPhoto} ratio="3/2" />
        <ImageField which="storyPhoto" label="Our story photo" hint="Ozzie or the kitchen. Cropped to 4:3." src={c.storyPhoto} ratio="4/3" />
      </div>

      <form action={saveHomepage} className="panel stack" style={G('14px')}>
        <B /><h3>Homepage text</h3>
        <div className="fld"><label htmlFor="notice">Announcement bar</label><input id="notice" name="notice" className="mini" defaultValue={c.notice} /><p className="hint">Leave empty to hide it.</p></div>
        <div className="fld"><label htmlFor="themeLine">Theme line</label><input id="themeLine" name="themeLine" className="mini" defaultValue={c.themeLine} /></div>
        <div className="fld"><label htmlFor="headline">Headline</label><input id="headline" name="headline" className="mini" defaultValue={c.headline} /></div>
        <div className="fld"><label htmlFor="intro">Intro line</label><textarea id="intro" name="intro" className="mini" rows={2} defaultValue={c.intro} /></div>
        <div className="fld"><label htmlFor="story">Our story</label><textarea id="story" name="story" className="mini" rows={5} defaultValue={c.story} /><p className="hint">Leave a blank line between paragraphs.</p></div>
        <div><button className="btn btn-ink btn-sm">Save homepage</button></div>
      </form>

      <div className="panel stack" style={G('14px')}>
        <h3>Reviews</h3>
        <p className="small muted">Enter genuine reviews only, with the customer’s permission. The site shows first name and town only, and hides the section until at least one review is marked as permitted.</p>
        {reviews.map((r) => (
          <div key={r.id} className="stack" style={{ ...G('8px'), borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <form action={saveReview} className="stack" style={G('8px')}>
              <B /><input type="hidden" name="id" value={r.id} />
              <div className="f2">
                <div className="fld"><label>First name</label><input name="first_name" className="mini" defaultValue={r.first_name} /></div>
                <div className="fld"><label>Town</label><input name="town" className="mini" defaultValue={r.town} /></div>
              </div>
              <div className="fld"><label>Review</label><textarea name="body" className="mini" rows={2} defaultValue={r.body} /></div>
              <div className="row between"><label className="check"><input type="checkbox" name="permitted" defaultChecked={r.permitted} />Customer gave permission to publish</label><button className="btn btn-quiet btn-sm">Save</button></div>
            </form>
            <form action={deleteReview}><B /><input type="hidden" name="id" value={r.id} /><button className="link small bad">Remove review</button></form>
          </div>
        ))}
        <form action={saveReview} className="stack" style={{ ...G('8px'), borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <B /><b>Add a review</b>
          <div className="f2">
            <div className="fld"><label htmlFor="r-first">First name</label><input id="r-first" name="first_name" className="mini" /></div>
            <div className="fld"><label htmlFor="r-town">Town</label><input id="r-town" name="town" className="mini" defaultValue="Peterborough" /></div>
          </div>
          <div className="fld"><label htmlFor="r-body">Review</label><textarea id="r-body" name="body" className="mini" rows={2} /></div>
          <div className="row between"><label className="check"><input type="checkbox" name="permitted" />Customer gave permission to publish</label><button className="btn btn-quiet btn-sm">Add review</button></div>
        </form>
      </div>

      <div className="panel stack" style={G('14px')}>
        <h3>FAQs</h3>
        <p className="hint">Use {'{notice}'}, {'{cancel}'}, {'{min}'}, {'{free}'}, {'{fee}'}, {'{areas}'} or {'{phone}'} to show the current setting, so answers never go out of date.</p>
        {faqs.map((f) => (
          <div key={f.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }} className="stack">
            <form action={saveFaq} className="stack" style={G('6px')}>
              <B /><input type="hidden" name="id" value={f.id} />
              <div className="row" style={G('8px')}>
                <div className="fld grow"><label>Question</label><input name="question" className="mini" defaultValue={f.question} /></div>
                <div className="fld" style={{ width: 80 }}><label>Order</label><input name="sort" type="number" className="mini" defaultValue={f.sort} /></div>
              </div>
              <div className="fld"><label>Answer</label><textarea name="answer" className="mini" rows={3} defaultValue={f.answer} /></div>
              <div><button className="btn btn-quiet btn-sm">Save</button></div>
            </form>
            <form action={deleteFaq}><B /><input type="hidden" name="id" value={f.id} /><button className="link small bad">Remove question</button></form>
          </div>
        ))}
        <form action={saveFaq} className="stack" style={{ ...G('6px'), borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <B /><b>Add a question</b>
          <div className="fld"><label htmlFor="fq">Question</label><input id="fq" name="question" className="mini" /></div>
          <div className="fld"><label htmlFor="fa">Answer</label><textarea id="fa" name="answer" className="mini" rows={3} /></div>
          <input type="hidden" name="sort" value={(faqs.at(-1)?.sort ?? 0) + 1} />
          <div><button className="btn btn-quiet btn-sm">Add question</button></div>
        </form>
      </div>

      <form action={saveLegal} className="panel stack" style={G('14px')}>
        <B /><h3>Policies and legal</h3>
        <p className="small muted">Shown on the Policies page, on every dish and in the footer. Use {'{cancel}'}, {'{notice}'} or {'{phone}'} to show the current setting.{l.sample ? ' These are sample wordings until you save your own.' : ''}</p>
        {([
          ['allergenNote', 'Allergy warning on every dish', 2], ['kitchen', 'Kitchen cross-contamination note', 2], ['cancellation', 'Cancellations and refunds', 4],
          ['privacy', 'Privacy notice', 6], ['terms', 'Terms', 6], ['cookies', 'Cookies', 3],
        ] as const).map(([k, label, rows]) => (
          <div key={k} className="fld"><label htmlFor={`lg-${k}`}>{label}</label><textarea id={`lg-${k}`} name={k} className="mini" rows={rows} defaultValue={l[k]} /></div>
        ))}
        <div className="f2">
          <div className="fld"><label htmlFor="hygiene">Food hygiene rating</label><input id="hygiene" name="hygiene" className="mini" defaultValue={l.hygiene} placeholder="e.g. 5 (Very good), Peterborough City Council" /></div>
          <div className="fld"><label htmlFor="company">Company details for the footer</label><textarea id="company" name="company" className="mini" rows={2} defaultValue={l.company} placeholder="e.g. Ozzie’s Table Ltd, company no. …, registered address …" /></div>
        </div>
        <div><button className="btn btn-ink btn-sm">Save policies</button></div>
      </form>

      <form action={saveSeo} className="panel stack" style={G('14px')}>
        <B /><h3>Search engines</h3>
        {([['home', 'Homepage'], ['menu', 'Menu'], ['info', 'How it works & FAQ']] as const).map(([k, label]) => (
          <div key={k} className="stack" style={{ ...G('8px'), borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <b>{label}</b>
            <div className="fld"><label htmlFor={`${k}_title`}>Page title</label><input id={`${k}_title`} name={`${k}_title`} className="mini" defaultValue={c.seo[k].title} /></div>
            <div className="fld"><label htmlFor={`${k}_description`}>Description</label><textarea id={`${k}_description`} name={`${k}_description`} className="mini" rows={2} defaultValue={c.seo[k].description} /></div>
          </div>
        ))}
        <p className="hint">Each dish page uses the dish name and description automatically.</p>
        <div><button className="btn btn-quiet btn-sm">Save</button></div>
      </form>
    </div>
  )
}
