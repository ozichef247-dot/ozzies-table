export type Method = 'collection' | 'delivery'
export const SEASONS = ['Mild', 'Medium', 'Hot'] as const
export type Season = (typeof SEASONS)[number]
export const SIZES = ['2L', '3L', '4L', '5L'] as const
export type SizeCode = (typeof SIZES)[number]

export const ALLERGENS = [
  'Celery', 'Cereals containing gluten', 'Crustaceans', 'Eggs', 'Fish', 'Lupin', 'Milk',
  'Molluscs', 'Mustard', 'Peanuts', 'Sesame', 'Soya', 'Sulphites', 'Tree nuts',
] as const

export interface Category {
  id: string
  name: string
  sort: number
  hidden: boolean
  photo_url: string | null
}

export interface ProductSize {
  id: string
  product_id: string
  size: SizeCode
  price_pence: number
  lead_hours: number | null
  included: string | null
  serves: string | null
}

export interface ProteinOption {
  id: string
  product_id: string
  name: string
  price_pence: number
  kind: 'swap' | 'add'
  sort: number
}

export interface Product {
  id: string
  category_id: string
  slug: string
  name: string
  description: string
  included: string
  photo_url: string | null
  available: boolean
  featured: boolean
  allow_notes: boolean
  lead_hours: number | null
  cook_days: number[]
  seasoning_enabled: boolean
  season_prices: Record<Season, number>
  allergens: string[]
  tags: string[]
  sort: number
  sizes: ProductSize[]
  proteins: ProteinOption[]
}

export interface Slot {
  id: string
  method: Method
  start_time: string // HH:MM
  end_time: string
  capacity: number
  active: boolean
}

export interface Closure {
  id?: string
  date: string // YYYY-MM-DD
  slot_id: string | null
}

export interface Zone {
  id: string
  name: string
  outcodes: string[]
  fee_pence: number
  sort: number
}

export interface Promo {
  id: string
  code: string
  kind: 'pct' | 'fixed'
  value: number // percent, or pence for fixed
  min_pence: number
  starts_on: string | null
  ends_on: string | null
  usage_limit: number | null
  used_count: number
  active: boolean
}

export interface Faq { id: string; question: string; answer: string; sort: number }
export interface Review { id: string; first_name: string; town: string; body: string; permitted: boolean; sort: number }

export interface GeneralSettings {
  leadHours: number
  cancelHours: number
  holdMinutes: number
  dailyCap: number
  cookingDays: number[] // 0 = Sunday
  minDeliveryPence: number
  freeOverPence: number
  thresholdBasis: 'before' | 'after'
  showServes: boolean
  notify: { ready: boolean; out: boolean; sms: boolean }
  contact: { phone: string; whatsapp: string; whatsappDisplay: string; email: string }
  collection: { address: string; instructions: string }
}

export interface LegalSettings {
  sample: boolean
  allergenNote: string
  kitchen: string
  cancellation: string
  privacy: string
  terms: string
  cookies: string
  hygiene: string
  company: string
}

export interface SeoEntry { title: string; description: string }

export interface ContentSettings {
  themeLine: string
  headline: string
  intro: string
  notice: string
  story: string
  storyPhoto: string | null
  heroPhoto: string | null
  logo: string | null
  fontPairing: 'a' | 'b' | 'c'
  legal: LegalSettings
  seo: { home: SeoEntry; menu: SeoEntry; info: SeoEntry }
}

export type OrderStatus =
  | 'pending' | 'expired' | 'confirmed' | 'scheduled' | 'preparing' | 'ready' | 'out' | 'completed' | 'cancelled'

export type PaymentStatus = 'pending' | 'authorised' | 'paid' | 'refunded' | 'partially_refunded' | 'voided' | 'failed'

export const LIVE_STATUSES: OrderStatus[] = ['confirmed', 'scheduled', 'preparing', 'ready', 'out', 'completed']
export const OPEN_STATUSES: OrderStatus[] = ['confirmed', 'scheduled', 'preparing', 'ready', 'out']

export interface OrderItem {
  id?: string
  product_id: string | null
  name: string
  size_label: string
  included_text: string
  protein_swap: string
  extras: string[]
  seasoning: string
  note: string
  qty: number
  unit_pence: number
  line_pence: number
}

export interface Order {
  id: string
  ref: string
  view_token: string
  status: OrderStatus
  method: Method
  fulfil_date: string
  slot_id: string | null
  slot_label: string
  slot_start: string
  customer_first: string
  customer_last: string
  customer_email: string
  customer_phone: string
  address_line1: string | null
  address_line2: string | null
  town: string | null
  postcode: string | null
  notes: string
  subtotal_pence: number
  discount_pence: number
  promo_code: string | null
  delivery_fee_pence: number
  total_pence: number
  hold_until: string | null
  payment_status: PaymentStatus
  payment_method: string | null
  refunded_pence: number
  revolut_order_id: string | null
  revolut_token: string | null
  internal_notes: string
  created_at: string
  order_items?: OrderItem[]
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Payment pending',
  expired: 'Expired, not paid',
  confirmed: 'Order confirmed',
  scheduled: 'Scheduled',
  preparing: 'Preparing',
  ready: 'Ready for collection',
  out: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const STATUS_TONE: Record<OrderStatus, 'warn' | 'info' | 'ok' | 'muted' | 'bad'> = {
  pending: 'warn', expired: 'muted', confirmed: 'info', scheduled: 'info', preparing: 'warn',
  ready: 'ok', out: 'ok', completed: 'muted', cancelled: 'bad',
}
