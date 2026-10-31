/**
 * Branded email layout. Each email is described once as blocks; this file turns it into
 * a designed HTML email (table layout, inline styles, works in Gmail, Outlook and Apple Mail)
 * and a matching plain-text version.
 */

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'note'; text: string; tone?: 'gold' | 'warn' | 'ok' }
  | { kind: 'details'; title: string; rows: [string, string][] }
  | { kind: 'items'; title: string; items: { qty: number; name: string; price: string; meta: string[] }[]; totals: { label: string; value: string; strong?: boolean }[] }
  | { kind: 'button'; label: string; href: string }
  | { kind: 'small'; text: string }

export interface EmailDoc {
  /** Short line shown after the subject in the inbox list. */
  preheader: string
  eyebrow?: string
  heading: string
  blocks: Block[]
  /** Customer emails show contact details in the footer; owner emails don't need them. */
  audience: 'customer' | 'owner'
}

export interface EmailBrand {
  logo: string | null
  themeLine: string
  siteUrl: string
  contact: { phone: string; whatsappDisplay: string; email: string }
}

const C = {
  page: '#F3EBDB', card: '#FFFDF8', green: '#1E3A2A', onGreen: '#F6EFDF', onGreen2: '#CFC8B4',
  orange: '#B84E17', gold: '#B08A3E', goldSoft: '#F4EAD0', cream2: '#F3EBDB', ink: '#2A2724', muted: '#675F55', line: '#E3D8C3',
  warnBg: '#F8EBC9', warn: '#7A5000', okBg: '#E1EEDF', ok: '#1F6A43',
}
const SERIF = `Georgia,'Times New Roman',serif`
const SANS = `Arial,Helvetica,sans-serif`

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// ---------- plain text ----------

export function docToText(doc: EmailDoc): string {
  const L: string[] = [doc.heading, '']
  for (const b of doc.blocks) {
    if (b.kind === 'p' || b.kind === 'note' || b.kind === 'small') L.push(b.text, '')
    else if (b.kind === 'details') L.push(b.title.toUpperCase(), ...b.rows.map(([k, v]) => `${k}: ${v}`), '')
    else if (b.kind === 'items') {
      L.push(b.title.toUpperCase())
      for (const i of b.items) L.push(`${i.qty} × ${i.name} — ${i.price}`, ...i.meta.map((m) => `   ${m}`))
      L.push('', ...b.totals.map((t) => `${t.label}: ${t.value}`), '')
    } else if (b.kind === 'button') L.push(`${b.label}: ${b.href}`, '')
  }
  L.push('Ozzie’s Table')
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ---------- HTML ----------

function block(b: Block): string {
  switch (b.kind) {
    case 'p':
      return `<p style="margin:0 0 16px;font:16px/1.6 ${SANS};color:${C.ink}">${esc(b.text)}</p>`
    case 'small':
      return `<p style="margin:0 0 14px;font:13px/1.55 ${SANS};color:${C.muted}">${esc(b.text)}</p>`
    case 'note': {
      const [bg, bar, fg] = b.tone === 'warn' ? [C.warnBg, C.warn, C.warn] : b.tone === 'ok' ? [C.okBg, C.ok, C.ok] : [C.goldSoft, C.gold, C.ink]
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="background:${bg};border-left:4px solid ${bar};border-radius:6px;padding:14px 16px;font:15px/1.55 ${SANS};color:${fg}">${esc(b.text)}</td></tr></table>`
    }
    case 'details':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${C.cream2};border-radius:10px">
<tr><td style="padding:16px 18px 6px;font:700 11px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold}">${esc(b.title)}</td></tr>
${b.rows.map(([k, v]) => `<tr><td style="padding:6px 18px"><div style="font:12px/1.4 ${SANS};color:${C.muted}">${esc(k)}</div><div style="font:600 15px/1.45 ${SANS};color:${C.ink}">${esc(v)}</div></td></tr>`).join('')}
<tr><td style="height:12px;line-height:12px">&nbsp;</td></tr></table>`
    case 'items':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">
<tr><td colspan="2" style="padding:0 0 8px;font:700 11px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold};border-bottom:2px solid ${C.ink}">${esc(b.title)}</td></tr>
${b.items.map((i) => `<tr><td valign="top" style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.line}">
<div style="font:700 15px/1.4 ${SANS};color:${C.ink}">${i.qty} × ${esc(i.name)}</div>
${i.meta.map((m) => `<div style="font:13px/1.5 ${SANS};color:${C.muted}">${esc(m)}</div>`).join('')}
</td><td valign="top" align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font:600 15px/1.4 ${SANS};color:${C.ink};white-space:nowrap">${esc(i.price)}</td></tr>`).join('')}
${b.totals.map((t) => `<tr><td style="padding:${t.strong ? '12px' : '8px'} 12px 0 0;font:${t.strong ? `700 17px` : `14px`}/1.4 ${SANS};color:${t.strong ? C.ink : C.muted}">${esc(t.label)}</td><td align="right" style="padding:${t.strong ? '12px' : '8px'} 0 0;font:${t.strong ? `700 17px` : `14px`}/1.4 ${SANS};color:${C.ink};white-space:nowrap">${esc(t.value)}</td></tr>`).join('')}
</table>`
    case 'button':
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px"><tr><td style="background:${C.orange};border-radius:999px">
<a href="${esc(b.href)}" style="display:inline-block;padding:14px 28px;font:700 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:999px">${esc(b.label)}</a></td></tr></table>`
  }
}

export function renderEmail(doc: EmailDoc, brand: EmailBrand): string {
  const logo = brand.logo
    ? `<img src="${esc(brand.logo)}" alt="Ozzie’s Table" height="48" style="display:block;margin:0 auto;height:48px;width:auto;max-width:240px;border:0">`
    : `<div style="font:400 30px/1.1 ${SERIF};color:${C.onGreen};letter-spacing:.01em">Ozzie’s Table</div>`
  const contact = doc.audience === 'customer'
    ? `<p style="margin:0 0 6px;font:14px/1.6 ${SANS};color:${C.ink}"><b>Questions?</b> Call ${esc(brand.contact.phone)}${brand.contact.whatsappDisplay ? ` or WhatsApp ${esc(brand.contact.whatsappDisplay)}` : ''}${brand.contact.email ? `, or reply to this email` : ''}.</p>`
    : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(doc.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page}">${esc(doc.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.card};border-radius:16px;overflow:hidden;border:1px solid ${C.line}">
<tr><td align="center" style="background:${C.green};padding:30px 24px 24px;border-bottom:4px solid ${C.gold}">
${logo}
<div style="margin:12px auto 0;width:36px;height:2px;background:${C.gold};line-height:2px;font-size:0">&nbsp;</div>
<div style="margin-top:10px;font:italic 14px/1.4 ${SERIF};color:${C.onGreen2}">${esc(brand.themeLine)}</div>
</td></tr>
<tr><td style="padding:32px 28px 12px">
${doc.eyebrow ? `<div style="margin:0 0 10px;font:700 12px/1 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.gold}">${esc(doc.eyebrow)}</div>` : ''}
<h1 style="margin:0 0 18px;font:400 28px/1.2 ${SERIF};color:${C.ink}">${esc(doc.heading)}</h1>
${doc.blocks.map(block).join('\n')}
</td></tr>
<tr><td style="padding:20px 28px 26px;background:${C.cream2};border-top:1px solid ${C.line}">
${contact}
<p style="margin:0;font:13px/1.6 ${SANS};color:${C.muted}">Ozzie’s Table · Nigerian home cooking · Peterborough<br><a href="${esc(brand.siteUrl)}" style="color:${C.green};font-weight:700">${esc(brand.siteUrl.replace(/^https?:\/\//, ''))}</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
}
