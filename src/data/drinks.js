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
    id: 'mojito',
    name: 'Mojito',
    price: 3,
    category: 'cocktail',
    emoji: '🍹',
    description: 'Fresh mint & lime classic'
  },
  {
    id: 'cosmopolitan',
    name: 'Cosmopolitan',
    price: 4,
    category: 'cocktail',
    emoji: '🍸',
    description: 'Elegant vodka cranberry'
  },
  {
    id: 'sex_on_the_beach',
    name: 'Sex on the Beach',
    price: 4,
    category: 'cocktail',
    emoji: '🏖️',
    description: 'Fruity summer vibes'
  },
  {
    id: 'passion_fruit_martini',
    name: 'Passion Fruit Martini',
    price: 5,
    category: 'premium',
    emoji: '🍹',
    description: 'The star of the party',
    popular: true
  }
]

export const drinkCategories = [
  { id: 'basic', name: 'Free', color: '#9ca3af' },
  { id: 'cocktail', name: 'Cocktails', color: '#FBCFE8' },
  { id: 'premium', name: 'Premium', color: '#A78BFA' }
]

export function getDrinkById(id) {
  return drinks.find(d => d.id === id)
}

export function getDrinksByCategory(category) {
  return drinks.filter(d => d.category === category)
}
