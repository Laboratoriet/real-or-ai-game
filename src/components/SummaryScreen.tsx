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
  inline?: boolean;
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
  inline = true,
}) => {
  const [feedback, setFeedback] = useState<DynamicFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
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
      `My score: ${score}/${totalAttempts}`,
      `Streak: ${streak ?? 0}`,
      '',
      'Play yourself at:',
      'www.aikemist.no',
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


  const categories: FilterCategory[] = ['all', 'people', 'nature', 'city', 'interior'];
  const otherCategories = categories.filter(cat => cat !== category);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Generating your results...</p>
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className={`${inline ? 'w-full h-full' : 'min-h-[100svh] w-full bg-white px-6'} text-gray-900 flex items-center justify-center`}>
      <div className={`${isMobile ? 'w-full max-w-sm' : 'w-full max-w-xl'}`}>
        <div className={`relative rounded-lg ${isMobile ? '' : 'overflow-hidden'}`}>
          <div className={`${isMobile ? 'relative [perspective:1200px] h-full' : ''}`}>
            <div className={`${isMobile ? 'relative h-full [transform-style:preserve-3d] transition-transform duration-300 ' + (isFlipped ? '[transform:rotateY(180deg)]' : '') : ''}`}>
              <div className={`${isMobile ? 'absolute inset-0 [backface-visibility:hidden] rounded-lg' : ''}`}>
                <div className={`text-center ${isMobile ? 'px-3 py-3' : 'px-4 py-6'}`}>
                  <div className="mb-4">
                    <div className={`${isMobile ? 'text-5xl' : 'text-6xl'} font-semibold`}>{score}/{totalAttempts}</div>
                    <div className="mt-2 inline-flex items-center gap-2 text-gray-700">
                      <Target className="w-4 h-4" />
                      <span>{accuracy}% accuracy</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-base mb-2">{feedback.message}</p>
                  <p className="text-gray-500 text-sm mb-4">💡 {feedback.tip}</p>

                  {!isMobile && (
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={onPlayAgain}
                        className="rounded-full px-5 py-2 text-base bg-gray-900 text-white hover:bg-black"
                      >
                        <RefreshCw className="w-4 h-4 mr-2 inline"/> Play again
                      </button>
                      <button
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="rounded-full px-5 py-2 text-base border border-gray-300 text-gray-800 hover:bg-gray-50"
                      >
                        <Share2 className="w-4 h-4 mr-2 inline"/> Share
                      </button>
                    </div>
                  )}

                  {!isMobile && (
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-gray-600 text-sm mb-2">Try another category</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {otherCategories.slice(0, 3).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => onCategoryChange(cat)}
                            className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200"
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${isMobile ? 'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg' : ''}`}>
                <div className={`relative border border-gray-200 rounded-lg ${isMobile ? 'p-3 bg-white' : 'p-4 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-700">Edit share text</div>
                    <div className="flex items-center gap-2">
                      <button onClick={async () => { await handleCopyShare(); }} className="p-2 rounded hover:bg-gray-100" aria-label="Copy" title={copied ? 'Copied!' : 'Copy'}>
                        <Clipboard className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {copied && (
                    <span className="absolute right-2 -top-2 text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">Copied</span>
                  )}
                  <textarea aria-label="Share text" ref={textareaRef} defaultValue={defaultShareText} className="w-full min-h-[140px] text-sm text-gray-800 bg-white border border-gray-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-gray-300" />
                </div>
              </div>

            </div>
          </div>
        </div>
        {/* Mobile persistent buttons below card */}
        {isMobile && (
          <div className="mt-3 flex justify-center gap-3">
            <button
              onClick={onPlayAgain}
              className="rounded-full px-5 py-2 text-base bg-gray-900 text-white hover:bg-black"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline"/> Play again
            </button>
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="rounded-full px-5 py-2 text-base border border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              {isFlipped ? 'Back' : (<><Share2 className="w-4 h-4 mr-2 inline"/> Share</>)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryScreen;
