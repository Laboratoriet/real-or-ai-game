import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilterCategory } from '../types';

interface SummaryScreenProps {
  score: number;
  totalAttempts: number;
  category: FilterCategory;
  onPlayAgain: () => void;
  onCategoryChange: (category: FilterCategory) => void;
  isMobile?: boolean;
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
}) => {
  const [feedback, setFeedback] = useState<DynamicFeedback | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleShare = async () => {
    const shareText = `I just scored ${score}/${totalAttempts} (${accuracy}%) on Real or AI? Can you beat my score? 🎯`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Real or AI? Game',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert('Score copied to clipboard!');
      } catch (err) {
        console.log('Error copying to clipboard:', err);
      }
    }
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
    <div className="w-full h-full flex flex-col justify-between p-8">
      {/* Logo */}
      <div className="flex justify-center">
        <a href="https://alkemist.no/realorai" target="_blank" rel="noopener noreferrer">
          <img src="/realorai.svg" alt="Real or AI Logo" className="h-8 w-auto" />
        </a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl mx-auto text-center"
      >
      {/* Score Display */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{feedback.title}</h1>
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {score}/{totalAttempts}
        </div>
        <div className="text-xl text-gray-600">
          {accuracy}% Accuracy
        </div>
      </div>

      {/* Feedback Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          {feedback.message}
        </p>
        <p className="text-base text-gray-600 italic">
          💡 {feedback.tip}
        </p>
      </motion.div>

      {/* Category Suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Try a different category:
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {otherCategories.slice(0, 3).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={handleShare}
          className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          Share Score
        </button>
      </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="flex justify-center">
        <p className="text-sm text-gray-500">
          Made with ❤️ by <a href="https://alkemist.no" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900">Alkemist</a>
        </p>
      </div>
    </div>
  );
};

export default SummaryScreen;
