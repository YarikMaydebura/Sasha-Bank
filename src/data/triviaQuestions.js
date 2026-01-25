// Trivia questions about Sasha
// TODO: Fill in the correct answers before the party!
// correctIndex: 0 = first option, 1 = second, etc.

export const triviaQuestions = [
  {
    id: 1,
    question: "When is Sasha's birthday?",
    options: ["February 1st", "January 15th", "March 10th", "February 20th"],
    correctIndex: 0, // Update this!
    category: "basics",
    difficulty: "easy"
  },
  {
    id: 2,
    question: "Where was Sasha born?",
    options: ["City A", "City B", "City C", "City D"],
    correctIndex: 0, // Update this!
    category: "basics",
    difficulty: "easy"
  },
  {
    id: 3,
    question: "How old is Sasha turning?",
    options: ["21", "22", "23", "24"],
    correctIndex: 0, // Update this!
    category: "basics",
    difficulty: "easy"
  },
  {
    id: 4,
    question: "What is Sasha's favorite color?",
    options: ["Blue", "Pink", "Green", "Purple"],
    correctIndex: 0, // Update this!
    category: "favorites",
    difficulty: "easy"
  },
  {
    id: 5,
    question: "What is Sasha's favorite food?",
    options: ["Pizza", "Sushi", "Pasta", "Borsch"],
    correctIndex: 0, // Update this!
    category: "favorites",
    difficulty: "medium"
  },
  {
    id: 6,
    question: "What is Sasha's favorite movie?",
    options: ["Titanic", "Harry Potter", "The Notebook", "Interstellar"],
    correctIndex: 0, // Update this!
    category: "favorites",
    difficulty: "medium"
  },
  {
    id: 7,
    question: "What is Sasha's favorite season?",
    options: ["Spring", "Summer", "Autumn", "Winter"],
    correctIndex: 0, // Update this!
    category: "favorites",
    difficulty: "easy"
  },
  {
    id: 8,
    question: "What is Sasha's favorite drink?",
    options: ["Coffee", "Tea", "Juice", "Smoothie"],
    correctIndex: 0, // Update this!
    category: "favorites",
    difficulty: "medium"
  },
  {
    id: 9,
    question: "What is Sasha's zodiac sign?",
    options: ["Aquarius", "Pisces", "Aries", "Capricorn"],
    correctIndex: 0, // Update this!
    category: "fun",
    difficulty: "easy"
  },
  {
    id: 10,
    question: "How many languages does Sasha speak?",
    options: ["1", "2", "3", "4+"],
    correctIndex: 0, // Update this!
    category: "fun",
    difficulty: "easy"
  },
  {
    id: 11,
    question: "Where does Sasha dream of traveling?",
    options: ["Japan", "Italy", "USA", "Australia"],
    correctIndex: 0, // Update this!
    category: "dreams",
    difficulty: "medium"
  },
  {
    id: 12,
    question: "What is Sasha's hidden talent?",
    options: ["Singing", "Dancing", "Drawing", "Cooking"],
    correctIndex: 0, // Update this!
    category: "fun",
    difficulty: "hard"
  },
  {
    id: 13,
    question: "What pet did Sasha have growing up?",
    options: ["Dog", "Cat", "Hamster", "No pet"],
    correctIndex: 0, // Update this!
    category: "memories",
    difficulty: "medium"
  },
  {
    id: 14,
    question: "What makes Sasha laugh the most?",
    options: ["Memes", "Dad jokes", "Physical comedy", "Sarcasm"],
    correctIndex: 0, // Update this!
    category: "personality",
    difficulty: "medium"
  },
  {
    id: 15,
    question: "What is Sasha's biggest fear?",
    options: ["Spiders", "Heights", "Public speaking", "The dark"],
    correctIndex: 0, // Update this!
    category: "personality",
    difficulty: "hard"
  },
]

// Get random questions for a trivia game
export function getRandomQuestions(count = 3) {
  const shuffled = [...triviaQuestions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Check if answer is correct
export function checkAnswer(questionId, answerIndex) {
  const question = triviaQuestions.find(q => q.id === questionId)
  return question ? question.correctIndex === answerIndex : false
}
