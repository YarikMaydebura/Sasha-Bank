import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Timer } from '../components/ui/Timer'
import { getRandomQuestions, checkAnswer } from '../data/triviaQuestions'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { supabase } from '../lib/supabase'
import { CONSTANTS, cn } from '../lib/utils'

const QUESTION_TIME = 30 // seconds per question

export function Trivia() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)
  const { isOnCooldown, getCooldownRemaining, setCooldown } = useGameStore()

  const [gameState, setGameState] = useState('start') // start, playing, result
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [isLoading, setIsLoading] = useState(false)

  const cooldownRemaining = getCooldownRemaining('trivia')
  const onCooldown = isOnCooldown('trivia')

  const currentQuestion = questions[currentIndex]
  const correctCount = answers.filter((a, i) =>
    checkAnswer(questions[i]?.id, a)
  ).length
  const isWin = correctCount >= 2

  const startGame = async () => {
    if (user.balance < CONSTANTS.TRIVIA_COST) {
      showToast('error', "Not enough coins!")
      return
    }

    setIsLoading(true)

    try {
      // Deduct entry cost
      const newBalance = user.balance - CONSTANTS.TRIVIA_COST
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: CONSTANTS.TRIVIA_COST,
        type: 'trivia_entry',
        description: 'Trivia game entry',
      })

      updateBalance(newBalance)

      // Start game
      const gameQuestions = getRandomQuestions(3)
      setQuestions(gameQuestions)
      setCurrentIndex(0)
      setAnswers([])
      setSelectedAnswer(null)
      setTimeLeft(QUESTION_TIME)
      setGameState('playing')
    } catch (error) {
      console.error('Error starting trivia:', error)
      showToast('error', 'Failed to start game')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswer = (answerIndex) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(answerIndex)
    const newAnswers = [...answers, answerIndex]
    setAnswers(newAnswers)

    // Move to next question or finish
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setSelectedAnswer(null)
        setTimeLeft(QUESTION_TIME)
      } else {
        finishGame(newAnswers)
      }
    }, 1500)
  }

  const handleTimeUp = () => {
    handleAnswer(-1) // -1 means time ran out
  }

  const finishGame = async (finalAnswers) => {
    const correct = finalAnswers.filter((a, i) =>
      checkAnswer(questions[i]?.id, a)
    ).length
    const won = correct >= 2

    if (won) {
      try {
        // Award coins
        const newBalance = user.balance + CONSTANTS.TRIVIA_WIN_REWARD
        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: CONSTANTS.TRIVIA_WIN_REWARD,
          type: 'trivia_win',
          description: `Trivia win (${correct}/3 correct)`,
        })

        updateBalance(newBalance)
      } catch (error) {
        console.error('Error awarding trivia win:', error)
      }
    }

    // Set cooldown
    setCooldown('trivia', CONSTANTS.TRIVIA_COOLDOWN_MS)
    setGameState('result')
  }

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing' || selectedAnswer !== null) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, selectedAnswer, currentIndex])

  return (
    <>
      <Header title="Trivia" showBack showBalance />

      <PageWrapper className="pt-0">
        {gameState === 'start' && (
          <StartScreen
            onStart={startGame}
            isLoading={isLoading}
            onCooldown={onCooldown}
            cooldownRemaining={cooldownRemaining}
            hasEnoughCoins={user?.balance >= CONSTANTS.TRIVIA_COST}
          />
        )}

        {gameState === 'playing' && currentQuestion && (
          <QuestionScreen
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            timeLeft={timeLeft}
            selectedAnswer={selectedAnswer}
            onAnswer={handleAnswer}
          />
        )}

        {gameState === 'result' && (
          <ResultScreen
            isWin={isWin}
            correctCount={correctCount}
            totalQuestions={questions.length}
            onPlayAgain={() => setGameState('start')}
            onGoBack={() => navigate('/dashboard')}
          />
        )}
      </PageWrapper>
    </>
  )
}

function StartScreen({ onStart, isLoading, onCooldown, cooldownRemaining, hasEnoughCoins }) {
  return (
    <div className="text-center py-8">
      <span className="text-6xl block mb-4">🧠</span>
      <h2 className="text-2xl font-bold text-white mb-2">
        How well do you know SASHA?
      </h2>
      <div className="h-0.5 w-16 bg-pastel-purple mx-auto my-6" />

      <div className="text-slate-400 space-y-2 mb-8">
        <p>• 3 questions</p>
        <p>• 30 seconds each</p>
        <p>• 2+ correct = WIN!</p>
      </div>

      <div className="text-lg mb-2">
        <span className="text-slate-400">Cost:</span>{' '}
        <span className="text-coin-gold font-bold">{CONSTANTS.TRIVIA_COST}🪙</span>
      </div>
      <div className="text-lg mb-8">
        <span className="text-slate-400">Reward:</span>{' '}
        <span className="text-status-success font-bold">+{CONSTANTS.TRIVIA_WIN_REWARD}🪙</span>
        <span className="text-slate-500"> or free shot</span>
      </div>

      <Button
        variant="gold"
        size="lg"
        onClick={onStart}
        loading={isLoading}
        disabled={onCooldown || !hasEnoughCoins}
        fullWidth
      >
        🎯 START TRIVIA
      </Button>

      {onCooldown && (
        <p className="text-status-warning text-sm mt-4">
          ⏱️ Cooldown: {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, '0')}
        </p>
      )}

      {!hasEnoughCoins && !onCooldown && (
        <p className="text-status-error text-sm mt-4">
          Not enough coins!
        </p>
      )}
    </div>
  )
}

function QuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  timeLeft,
  selectedAnswer,
  onAnswer,
}) {
  const isCorrect = selectedAnswer !== null && selectedAnswer === question.correctIndex
  const isWrong = selectedAnswer !== null && selectedAnswer !== question.correctIndex

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-slate-400">
          Question {questionNumber}/{totalQuestions}
        </span>
        <Timer seconds={timeLeft} running={selectedAnswer === null} />
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full',
              i < questionNumber - 1 ? 'bg-pastel-purple' :
              i === questionNumber - 1 ? 'bg-pastel-purple-medium' :
              'bg-bg-card'
            )}
          />
        ))}
      </div>

      {/* Question */}
      <h2 className="text-xl font-semibold text-white text-center mb-8">
        {question.question}
      </h2>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = index === question.correctIndex
          const showCorrect = selectedAnswer !== null && isCorrectAnswer
          const showWrong = isSelected && !isCorrectAnswer

          return (
            <Card
              key={index}
              hoverable={selectedAnswer === null}
              onClick={() => selectedAnswer === null && onAnswer(index)}
              className={cn(
                'transition-all',
                showCorrect && 'border-status-success bg-status-success/10',
                showWrong && 'border-status-error bg-status-error/10',
                isSelected && !showWrong && !showCorrect && 'border-pastel-purple'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-pastel-purple-light">
                  {String.fromCharCode(65 + index)})
                </span>
                <span className="text-white">{option}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ResultScreen({ isWin, correctCount, totalQuestions, onPlayAgain, onGoBack }) {
  return (
    <div className="text-center py-12">
      <span className="text-6xl block mb-4">
        {isWin ? '🎉' : '😢'}
      </span>
      <h2 className="text-2xl font-bold text-white mb-2">
        {isWin ? 'YOU WIN!' : 'Better luck next time!'}
      </h2>
      <p className="text-slate-400 text-lg mb-8">
        {correctCount}/{totalQuestions} Correct
      </p>

      {isWin && (
        <div className="bg-coin-gold/20 rounded-xl p-6 mb-8">
          <p className="text-coin-gold text-2xl font-bold">
            +{CONSTANTS.TRIVIA_WIN_REWARD}🪙
          </p>
        </div>
      )}

      {!isWin && (
        <p className="text-slate-400 mb-8">
          Wrong answers = take a sip! 🍺
        </p>
      )}

      <div className="space-y-3">
        <Button variant="primary" fullWidth onClick={onPlayAgain}>
          🔄 Play Again
        </Button>
        <Button variant="ghost" fullWidth onClick={onGoBack}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
