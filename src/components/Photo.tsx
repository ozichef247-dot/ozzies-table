import Image from 'next/image'

const bowl = (
  <svg viewBox="0 0 100 64" aria-hidden="true">
    <path d="M4 14 Q7 58 50 60 Q93 58 96 14 Z" fill="var(--card)" stroke="var(--line-2)" strokeWidth="2.6" strokeLinejoin="round" />
    <ellipse cx="50" cy="14" rx="46" ry="9" fill="var(--cream-3)" stroke="var(--line-2)" strokeWidth="2.6" />
  </svg>
)

/** Dish and page photos. One crop everywhere (4:3 for dishes); a neutral placeholder until the owner uploads a photo. */
export function Photo({
  src, alt, ratio = '4/3', sizes = '(min-width: 960px) 33vw, (min-width: 560px) 50vw, 100vw', priority = false, className = '',
}: { src: string | null | undefined; alt: string; ratio?: string; sizes?: string; priority?: boolean; className?: string }) {
  const style = { ['--ratio' as string]: ratio } as React.CSSProperties
  if (src)
    return (
      <div className={`ph ${className}`} style={style}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />
      </div>
    )
  return (
    <div className={`ph ph-empty ${className}`} style={style} role="img" aria-label={`Photo to come: ${alt}`}>
      {bowl}
      <span>Photo to come · {ratio.replace('/', ':')}</span>
    </div>
  )
}

export function BowlIcon({ width }: { width: number }) {
  return (
    <svg width={width} height={Math.round(width * 0.64)} viewBox="0 0 100 64" aria-hidden="true">
      <path d="M4 14 Q7 58 50 60 Q93 58 96 14 Z" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <ellipse cx="50" cy="14" rx="46" ry="9" fill="var(--cream-3)" stroke="var(--ink)" strokeWidth="2.6" />
    </svg>
  )
}
