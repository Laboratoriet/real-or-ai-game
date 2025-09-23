import React, { useState, useEffect } from 'react';
import { FilterCategory } from '../types';
import { Share2, RefreshCw, Target } from 'lucide-react';

interface SummaryScreenProps {
  score: number;
  totalAttempts: number;
  category: FilterCategory;
  onPlayAgain: () => void;
  onCategoryChange: (category: FilterCategory) => void;
  isMobile?: boolean;
  streak?: number;
}

interface DynamicFeedback {
  title: string;
  message: string;
  tip: string;
  emoji: string;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({
  score,
  totalAttempts,
  category,
  onPlayAgain,
  onCategoryChange,
  isMobile = false,
  streak,
}) => {
  const [feedback, setFeedback] = useState<DynamicFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;

  // Generate dynamic feedback based on score
  useEffect(() => {
    const generateFeedback = async () => {
      setLoading(true);
      
      // For now, we'll use static feedback based on score ranges
      // Later we can integrate with an LLM API
      const feedbackData = getStaticFeedback(accuracy, category);
      setFeedback(feedbackData);
      setLoading(false);
    };

    generateFeedback();
  }, [accuracy, category]);

  // Disable keyboard navigation on summary screen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Disable arrow keys and space/enter to prevent accidental navigation
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const getStaticFeedback = (accuracy: number, category: FilterCategory): DynamicFeedback => {
    if (accuracy >= 90) {
      return {
        title: "AI Detection Master! 🎯",
        message: "You're practically a human lie detector! Your ability to spot AI-generated content is exceptional.",
        tip: "Try switching to a different category to test your skills across various image types.",
        emoji: "🏆"
      };
    } else if (accuracy >= 80) {
      return {
        title: "Sharp Eye! 👁️",
        message: "Great job! You have a keen eye for spotting the subtle differences between real and AI-generated images.",
        tip: "Challenge yourself with a new category to expand your detection skills.",
        emoji: "🎉"
      };
    } else if (accuracy >= 70) {
      return {
        title: "Getting There! 📈",
        message: "Not bad! You're developing a good sense for AI-generated content, but there's room to improve.",
        tip: "Pay attention to lighting inconsistencies and unnatural details in AI images.",
        emoji: "👍"
      };
    } else if (accuracy >= 60) {
      return {
        title: "Learning! 🧠",
        message: "You're on the right track! AI detection takes practice - keep observing the details.",
        tip: "Look for overly perfect compositions and unnatural textures in AI-generated images.",
        emoji: "💡"
      };
    } else {
      return {
        title: "Keep Practicing! 🌱",
        message: "Don't worry, AI detection is tricky! The more you practice, the better you'll get.",
        tip: "Focus on facial features, hand details, and background consistency - these are often AI giveaways.",
        emoji: "🌱"
      };
    }
  };

  const handleCopyShare = async () => {
    const lines = [
      'Real or AI?',
      `My score: ${score}/${totalAttempts}`,
      `Streak: ${streak ?? 0}`,
      '',
      'Play yourself at:',
      'www.aikemist.no',
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };


  const categories: FilterCategory[] = ['all', 'people', 'nature', 'city', 'interior'];
  const otherCategories = categories.filter(cat => cat !== category);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Generating your results...</p>
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className="min-h-[100svh] w-full bg-white text-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="flex items-center justify-center mb-6">
          <img src="/realorai.svg" alt="Real or AI" className="h-8 w-auto" />
        </div>
        <div className="mb-6">
          <div className="text-5xl font-semibold">{score}/{totalAttempts}</div>
          <div className="mt-2 inline-flex items-center gap-2 text-gray-700">
            <Target className="w-4 h-4" />
            <span>{accuracy}% accuracy</span>
          </div>
        </div>
        <p className="text-gray-700 text-base mb-2">{feedback.message}</p>
        <p className="text-gray-500 text-sm mb-8">💡 {feedback.tip}</p>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={onPlayAgain}
            className="rounded-md px-5 py-3 text-base bg-gray-900 text-white hover:bg-black"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline"/> Play again
          </button>
          <button
            onClick={handleCopyShare}
            className="rounded-md px-5 py-3 text-base border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            <Share2 className="w-4 h-4 mr-2 inline"/> {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        <div className="mt-2 flex flex-col items-center">
          <p className="text-gray-600 text-sm mb-3">Try another category</p>
          <div className="flex flex-wrap justify-center gap-2">
            {otherCategories.slice(0, 3).map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200"
              >
                <span className="mr-1">
                  {cat === 'nature' ? '🌿' : cat === 'city' ? '🏙️' : cat === 'people' ? '👥' : cat === 'interior' ? '🏠' : '✨'}
                </span>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 text-gray-400 text-sm text-center">
          Made with ❤️ by <a href="https://alkemist.no" className="underline">Alkemist</a>
        </div>
      </div>
    </div>
  );
};

export default SummaryScreen;
