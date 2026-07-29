import { Coffee, Gamepad2, Utensils, Wine } from 'lucide-react'

const CATEGORY_ICONS = {
  cafe: Coffee,
  restaurant: Utensils,
  bar: Wine,
  activity: Gamepad2,
}

function PlaceCategoryIcon({ category, className = 'h-4 w-4' }) {
  const CategoryIcon = CATEGORY_ICONS[category] || MapPinFallback

  return <CategoryIcon className={className} aria-hidden="true" />
}

function MapPinFallback({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export default PlaceCategoryIcon
