import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilterCategory } from '../types';
import { Share2, RefreshCw, Target, Clipboard } from 'lucide-react';

interface SummaryScreenProps {
  score: number;
  totalAttempts: number;
  category: FilterCategory;
  onPlayAgain: () => void;
  onCategoryChange: (category: FilterCategory) => void;
  isMobile?: boolean;
  streak?: number;
  showShareOnly?: boolean; // For desktop right panel
  showButtonsOnly?: boolean; // For mobile buttons only
  isFlipped?: boolean; // For mobile share flip state
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
  showShareOnly = false,
  showButtonsOnly = false,
  isFlipped = false,
}) => {
  const [feedback, setFeedback] = useState<DynamicFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;

  // Generate dynamic feedback based on score
  useEffect(() => {
    const generateFeedback = async () => {
      setLoading(true);
      
      // For now, we'll use static feedback based on score ranges
      // Later we can integrate with an LLM API
      const feedbackData = getStaticFeedback(accuracy);
      setFeedback(feedbackData);
      setLoading(false);
    };

    generateFeedback();
  }, [accuracy]);

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

  const getStaticFeedback = (accuracy: number): DynamicFeedback => {
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

  const defaultShareText = useMemo(() => (
    [
      'Real or AI?',
      'Can you spot the synthetic memories?',
      '',
      `My score: ${score}/${totalAttempts}`,
      `Best streak: ${streak || 0}`,
      `Accuracy: ${Math.round((score / totalAttempts) * 100)}%`,
      '',
      'Play yourself at:',
      'www.alkemist.no',
    ].join('\n')
  ), [score, totalAttempts, streak]);

  const handleCopyShare = async () => {
    const text = textareaRef.current?.value ?? defaultShareText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Generating your results...</p>
      </div>
    );
  }

  if (!feedback) return null;

  // Desktop share-only panel
  if (showShareOnly) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-gray-600" />
          <span className="text-gray-800 font-medium">Share</span>
        </div>
        <div className="flex-1 relative">
          <textarea 
            ref={textareaRef} 
            defaultValue={defaultShareText} 
            className="w-full h-full text-sm text-gray-800 bg-white border border-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            aria-label="Share text"
            placeholder="Edit your share text here"
          />
          <button 
            onClick={handleCopyShare} 
            className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100" 
            aria-label="Copy" 
            title={copied ? 'Copied!' : 'Copy'}
          >
            <Clipboard className="w-4 h-4" />
          </button>
          {copied && (
            <span className="absolute right-2 top-10 text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">Copied</span>
          )}
        </div>
      </div>
    );
  }

  // Mobile buttons only (for positioning below image container)
  if (isMobile && showButtonsOnly) {
    return (
      <div className="flex justify-center gap-4 w-full">
        <button
          onClick={onPlayAgain}
          className="rounded-full px-6 py-3 text-base bg-gray-900 text-white hover:bg-black flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Play again
        </button>
      </div>
    );
  }

  // Mobile layout with flip effect
  if (isMobile) {
    console.log('📱 SummaryScreen mobile render, isFlipped:', isFlipped);
    return (
      <div className="w-full h-full">
        <div className={`relative w-full h-full ${isFlipped ? '[transform:rotateY(180deg)]' : ''} transition-transform duration-500 [transform-style:preserve-3d]`}>
          {/* Front side - Summary */}
          <div className={`absolute inset-0 [backface-visibility:hidden] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            <div className="text-center h-full flex flex-col justify-center px-4">
              <div className="mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">{score}/{totalAttempts}</div>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Target className="w-4 h-4" />
                  <span>{accuracy}% accuracy</span>
                </div>
              </div>
              <p className="text-gray-700 text-base mb-3">{feedback.message}</p>
              <p className="text-gray-500 text-sm mb-6">💡 {feedback.tip}</p>
            </div>
          </div>

          {/* Back side - Share */}
          <div className={`absolute inset-0 [backface-visibility:hidden] ${isFlipped ? '' : '[transform:rotateY(180deg)]'}`}>
            <div className="h-full flex flex-col p-4">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-gray-600" />
                <span className="text-gray-800 font-medium">Share</span>
              </div>
              <div className="flex-1 relative">
                <textarea 
                  ref={textareaRef} 
                  defaultValue={defaultShareText} 
                  className="w-full h-full text-sm text-gray-800 bg-white border border-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                  aria-label="Share text"
                  placeholder="Edit your share text here"
                />
                <button 
                  onClick={handleCopyShare} 
                  className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100" 
                  aria-label="Copy" 
                  title={copied ? 'Copied!' : 'Copy'}
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                {copied && (
                  <span className="absolute right-2 top-10 text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">Copied</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop summary layout
  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-gray-900 mb-2">{score}/{totalAttempts}</div>
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Target className="w-4 h-4" />
          <span>{accuracy}% accuracy</span>
        </div>
      </div>
      
      <p className="text-gray-700 text-base mb-3 text-center">{feedback.message}</p>
      <p className="text-gray-500 text-sm mb-6 text-center">💡 {feedback.tip}</p>

      <div className="flex justify-center mb-6">
        <button
          onClick={onPlayAgain}
          className="rounded-full px-6 py-3 text-base bg-gray-900 text-white hover:bg-black flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Play again
        </button>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-gray-600 text-sm mb-3">Try another category</p>
        <div className="flex flex-wrap justify-center gap-2">
          {['all', 'people', 'nature', 'city', 'interior'].filter(cat => cat !== category).slice(0, 3).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat as FilterCategory)}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SummaryScreen;
