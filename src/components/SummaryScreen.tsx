import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FilterCategory } from '../types';
import { Share2, RefreshCw, Target, History, Download, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import domtoimage from 'dom-to-image-more';

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
  const [flipped, setFlipped] = useState(false);
  const prefersReduced = useReducedMotion();

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

  const handleWebShare = async () => {
    const text = `I scored ${score}/${totalAttempts} (${accuracy}%) in Real or AI?`; 
    const shareUrl = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Real or AI?", text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        alert("Link copied to clipboard ✨");
      }
    } catch (_) {}
  };

  const downloadShareImage = async () => {
    const node = document.getElementById("share-card");
    if (!node) return;
    
    // Create a temporary container to capture the card without the 180deg rotation
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = node.offsetWidth + 'px';
    tempContainer.style.height = node.offsetHeight + 'px';
    tempContainer.style.background = '#0b1021';
    tempContainer.style.borderRadius = '24px';
    
    // Clone the card content without the rotation transform
    const clonedCard = node.cloneNode(true) as HTMLElement;
    clonedCard.style.transform = 'none'; // Remove the 180deg rotation
    clonedCard.style.position = 'relative';
    clonedCard.style.width = '100%';
    clonedCard.style.height = '100%';
    clonedCard.style.border = 'none'; // Remove border
    clonedCard.style.boxShadow = 'none'; // Remove shadow
    
    // Remove borders from all child elements
    const allElements = clonedCard.querySelectorAll('*');
    allElements.forEach((el: any) => {
      el.style.border = 'none';
      el.style.outline = 'none';
    });
    
    tempContainer.appendChild(clonedCard);
    document.body.appendChild(tempContainer);
    
    try {
      const dataUrl = await domtoimage.toPng(tempContainer, { 
        quality: 1, 
        bgcolor: "#0b1021",
        width: node.offsetWidth,
        height: node.offsetHeight,
        style: {
          borderRadius: '24px'
        }
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `realorai_${score}-${totalAttempts}.png`;
      a.click();
    } finally {
      document.body.removeChild(tempContainer);
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
    <div className="min-h-[100svh] w-full relative overflow-hidden text-white flex items-center justify-center px-6">
      {/* Calm, fluid background (very slow, low opacity) */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[#0b1021]"
      />
      {![true, undefined].includes(prefersReduced) && (
        <>
          <motion.div
            aria-hidden
            className="absolute -z-10 w-[70vmax] h-[70vmax] rounded-full blur-3xl opacity-25"
            style={{ background: "radial-gradient(circle at 20% 30%, #9aa7ff, transparent 60%)" }}
            initial={{ x: "-15%", y: "-20%" }}
            animate={{ x: ["-15%", "-5%", "-12%"], y: ["-20%", "-10%", "-20%"] }}
            transition={{ duration: 90, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -z-10 w-[60vmax] h-[60vmax] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(circle at 80% 20%, #78f0d6, transparent 60%)" }}
            initial={{ x: "20%", y: "-10%" }}
            animate={{ x: ["20%", "12%", "22%"], y: ["-10%", "0%", "-10%"] }}
            transition={{ duration: 100, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -z-10 w-[80vmax] h-[80vmax] rounded-full blur-3xl opacity-15"
            style={{ background: "radial-gradient(circle at 65% 85%, #f6e08a, transparent 60%)" }}
            initial={{ x: "10%", y: "30%" }}
            animate={{ x: ["10%", "5%", "12%"], y: ["30%", "40%", "30%"] }}
            transition={{ duration: 110, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {/* Vignette for readability */}
      <div className="pointer-events-none absolute inset-0 -z-5 bg-[radial-gradient(120%_120%_at_50%_40%,transparent_45%,#0b1021_92%)]" />

      {/* Center column */}
      <div className="w-full max-w-xl">
        {/* Brand logo - only show when not flipped */}
        {!flipped && (
          <div className="flex items-center justify-center mb-6">
            <img src="/realorai-white.svg" alt="Real or AI" className="h-8 md:h-9 opacity-90" />
          </div>
        )}

        {/* Flip container */}
        <div style={{ perspective: "1600px" }} className="relative">
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative will-change-transform"
          >
            {/* FRONT: Results */}
            <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }} className="rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-3xl shadow-[0_30px_120px_-25px_rgba(0,0,0,0.65)]">
              <div className="p-8 md:p-10">
                <div className="flex flex-col items-center text-center">
                  {/* Progress ring */}
                  <div className="relative mb-6">
                    <div
                      className="w-40 h-40 md:w-48 md:h-48 rounded-full grid place-items-center"
                      style={{
                        background: `conic-gradient(#6366f1 ${accuracy * 3.6}deg, rgba(255,255,255,0.12) 0deg)`
                      }}
                    >
                      <div className="w-[85%] h-[85%] rounded-full bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 grid place-items-center">
                        <div className="flex flex-col items-center">
                          <div className="text-4xl font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{score}/{totalAttempts}</div>
                          <div className="flex items-center gap-1 text-sm text-white/80 mt-1">
                            <Target className="w-4 h-4"/>
                            <span>{accuracy}% accuracy</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-white/95 text-lg md:text-xl leading-snug max-w-md mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{feedback.message}</p>
                  <p className="text-white/80 text-sm max-w-lg mb-8 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                    💡 {feedback.tip}
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-wrap justify-center gap-3 mb-6">
                    <button
                      onClick={onPlayAgain}
                      className="rounded-xl px-5 py-6 text-base md:text-lg font-medium shadow-lg shadow-indigo-600/30 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 inline"/> Play again
                    </button>
                    <button 
                      onClick={() => setFlipped(true)} 
                      className="rounded-xl px-5 py-6 text-base md:text-lg border border-white/25 bg-transparent text-white hover:bg-white/10"
                    >
                      <Share2 className="w-4 h-4 mr-2 inline"/> Share score
                    </button>
                    <button className="rounded-xl px-5 py-6 text-base md:text-lg text-white/80 hover:text-white hover:bg-white/10 bg-transparent">
                      <History className="w-4 h-4 mr-2 inline"/> Review mistakes
                    </button>
                  </div>

                  {/* Category chips */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {otherCategories.slice(0, 3).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => onCategoryChange(cat)}
                        className="px-4 py-2 rounded-full text-sm font-medium text-gray-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md"
                      >
                        <span className="mr-1">
                          {cat === 'nature' ? '🌿' : cat === 'city' ? '🏙️' : cat === 'people' ? '👥' : cat === 'interior' ? '🏠' : '✨'}
                        </span>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* BACK: Shareable card */}
            <div 
              id="share-card" 
              style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }} 
              className={`rounded-3xl border border-white/15 bg-slate-900/70 backdrop-blur-3xl shadow-[0_30px_120px_-25px_rgba(0,0,0,0.65)] absolute inset-0 ${flipped ? "" : "pointer-events-none"}`}
            >
              <div className="p-8 md:p-10 flex flex-col items-center text-center gap-8">
                <img src="/realorai-white.svg" alt="Real or AI" className="h-7 opacity-90" />

                <div className="relative">
                  <div
                    className="w-44 h-44 md:w-56 md:h-56 rounded-full grid place-items-center"
                    style={{
                      background: `conic-gradient(#6366f1 ${accuracy * 3.6}deg, rgba(255,255,255,0.12) 0deg)`
                    }}
                  >
                    <div className="w-[85%] h-[85%] rounded-full bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 grid place-items-center">
                      <div className="flex flex-col items-center">
                        <div className="text-5xl font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{score}/{totalAttempts}</div>
                        <div className="text-sm text-white/80 mt-1">{accuracy}% accuracy</div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 blur-2xl rounded-full bg-indigo-400/20 -z-10" />
                </div>

                <div className="space-y-3">
                  <div className="text-white/90 text-lg">Can you beat my score?</div>
                  <div className="text-white/60 text-sm">Play at {window.location.origin.replace("https://", "")} </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    onClick={handleWebShare} 
                    className="rounded-xl px-5 py-6 text-base border border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    <Share2 className="w-4 h-4 mr-2 inline"/> Share link
                  </button>
                  <button 
                    onClick={downloadShareImage} 
                    className="rounded-xl px-5 py-6 text-base bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white"
                  >
                    <Download className="w-4 h-4 mr-2 inline"/> Download image
                  </button>
                </div>

                <div className="flex items-center gap-1 text-white/50 text-xs">
                  <LinkIcon className="w-3 h-3"/>
                  <span>{window.location.origin}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Back button - only show when flipped */}
        {flipped && (
          <div className="mt-6 flex justify-center">
            <button 
              onClick={() => setFlipped(false)} 
              className="rounded-xl px-6 py-3 text-base text-white/80 hover:text-white hover:bg-white/10 bg-transparent border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2 inline"/> Back to results
            </button>
          </div>
        )}

        <div className="mt-8 text-gray-400 text-sm text-center">
          Made with ❤️ by <a href="https://alkemist.no" className="underline decoration-white/30 hover:decoration-white">Alkemist</a>
        </div>
      </div>
    </div>
  );
};

export default SummaryScreen;
