export const drinks = [
  {
    id: 'water',
    name: 'Water',
    price: 0,
    category: 'basic',
    emoji: '💧',
    description: 'Stay hydrated!'
  },
  {
    id: 'vodka_juice',
    name: 'Vodka + Juice',
    price: 1,
    category: 'easy',
    emoji: '🍹',
    description: 'Classic party drink'
  },
  {
    id: 'red_wine',
    name: 'Red Wine',
    price: 2,
    category: 'medium',
    emoji: '🍷',
    description: 'Smooth and elegant'
  },
  {
    id: 'white_wine',
    name: 'White Wine',
    price: 2,
    category: 'medium',
    emoji: '🥂',
    description: 'Light and refreshing'
  },
  {
    id: 'rum_cocktail',
    name: 'Rum Cocktail',
    price: 3,
    category: 'fancy',
    emoji: '🍹',
    description: 'Tropical vibes'
  },
  {
    id: 'plum_wine',
    name: 'Japanese Plum Wine',
    price: 4,
    category: 'premium',
    emoji: '🍶',
    description: 'The finest choice',
    popular: true
  }
]

export const drinkCategories = [
  { id: 'basic', name: 'Free', color: '#9ca3af' },
  { id: 'easy', name: 'Easy Drinks', color: '#86EFAC' },
  { id: 'medium', name: 'Medium', color: '#FCD34D' },
  { id: 'fancy', name: 'Fancy', color: '#FBCFE8' },
  { id: 'premium', name: 'Premium', color: '#A78BFA' }
]

export function getDrinkById(id) {
  return drinks.find(d => d.id === id)
}

export function getDrinksByCategory(category) {
  return drinks.filter(d => d.category === category)
}
