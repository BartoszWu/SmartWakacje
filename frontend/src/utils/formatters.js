export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

export function abbreviateCount(n) {
  if (!n && n !== 0) return '–'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function getRatingClass(rating) {
  if (rating >= 8) return 'rating-high'
  if (rating >= 6) return 'rating-mid'
  return 'rating-low'
}

export function getRatingBgClass(rating) {
  if (rating >= 8) return 'bg-[#1a3d26] border-green'
  if (rating >= 6) return 'bg-[#3a2e14] border-gold'
  return 'bg-[#3d1a1a] border-red'
}

export function getRatingTextClass(rating) {
  if (rating >= 8) return 'text-green'
  if (rating >= 6) return 'text-gold'
  return 'text-red'
}

export function formatPrice(n) {
  return n?.toLocaleString('pl') ?? '–'
}
