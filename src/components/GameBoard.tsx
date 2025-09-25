import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useImagePair } from '../hooks/useImagePair';
import { useGameState } from '../hooks/useGameState';
import { getFilteredImages } from '../data/images'; // Import the new function
import ImageCard from './ImageCard';
import Feedback from './Feedback';
import ScoreDisplay from './ScoreDisplay';
import CategoryFilter from './CategoryFilter';
import SummaryScreen from './SummaryScreen';
import Confetti from 'react-confetti';
import { Image } from '../types'; // Use Image type
import { RefreshCw, Share2 } from 'lucide-react';

const MOBILE_BREAKPOINT = 768; // Define a breakpoint
// const FETCH_COUNT = 4; // How many pairs to fetch when needed - Might not be needed for mobile now
const UNIQUE_DISPLAY_COUNT_TARGET = 50; // How many unique images to guarantee

// Simple hook to get window size
function useWindowSize() {
  const [size, setSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : MOBILE_BREAKPOINT, height: typeof window !== 'undefined' ? window.innerHeight : 800 });
  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// Helper function to shuffle an array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

const GameBoard: React.FC = () => {
  const {
    state,
    selectImage,
    showFeedback,
    nextPair, // Still needed for resetting feedback state
    resetGame,
    setCategory,
    showSummary,
    hideSummary,
  } = useGameState();

  // Desktop view still uses useImagePair
  const {
    currentPair,
    loading: pairLoading,
    error: pairError,
    generateRandomPair,
    getShuffledImages,
  } = useImagePair(state.selectedCategory);

  const nextActionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { width, height } = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

  // Debug: Monitor selectedCategory changes
  useEffect(() => {
    console.log('selectedCategory state changed to:', state.selectedCategory);
  }, [state.selectedCategory]);

  // --- Mobile State --- 
  const [masterMobileList, setMasterMobileList] = useState<Image[]>([]);
  const [currentMobileImage, setCurrentMobileImage] = useState<Image | null>(null);
  const [masterMobileIndex, setMasterMobileIndex] = useState(0);
  const [uniqueImagesShownCount, setUniqueImagesShownCount] = useState(0);
  const [mobileLoading, setMobileLoading] = useState(true);
  const [mobileError, setMobileError] = useState<string | null>(null);
  // State to block interactions during mobile advancement
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [buttonResetKey, setButtonResetKey] = useState(0); // Added for button reset

  // State for swipe/exit animation (used by both)
  const [swipeDirectionForExit, setSwipeDirectionForExit] = useState<'left' | 'right' | null>(null);
  // Ref for drag position (used by mobile)
  // Swipe interactions removed for mobile; keep minimal animation only

  // Refs for mobile buttons
  const realButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  // Mobile share state
  const [mobileShareFlipped, setMobileShareFlipped] = useState(false);

  // Mobile share handlers
  const handleMobileShareFlip = useCallback(() => {
    setMobileShareFlipped(!mobileShareFlipped);
  }, [mobileShareFlipped]);


  // --- Initialization and Reset Logic ---
  const initializeMobileGame = useCallback((filterCategory = state.selectedCategory) => {
    // Ensure any pending timers/advancement state are cleared when (re)initializing
    if (nextActionTimerRef.current) {
      clearTimeout(nextActionTimerRef.current);
      nextActionTimerRef.current = null;
    }
    setIsAdvancing(false);
    setMobileLoading(true);
    setMobileError(null);
    try {
      const filteredImages = getFilteredImages(filterCategory);
      if (filteredImages.length === 0) {
        setMobileError('No images available for the selected category.');
        setMasterMobileList([]);
        setCurrentMobileImage(null);
      } else {
        setMasterMobileList(filteredImages);
        setCurrentMobileImage(filteredImages[0]); // Set the first image
        setMasterMobileIndex(0);
        setUniqueImagesShownCount(0);
      }
    } catch {
        setMobileError('Failed to load images.');
    }
    setMobileLoading(false);
  }, [state.selectedCategory]);

  // Initialize on mount if mobile
  useEffect(() => {
    if (isMobile) {
      initializeMobileGame();
    } else {
       // If starting on desktop, generate initial pair ONLY if not already loaded
       if (!currentPair) {
         generateRandomPair(state.selectedCategory);
       }
    }
    // Cleanup ref on unmount
    return () => {
       if (nextActionTimerRef.current) clearTimeout(nextActionTimerRef.current);
       if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    }
    // dependencies: Run when isMobile changes, or on initial mount for the correct mode logic.
    // initializeMobileGame and generateRandomPair are stable callbacks.
  }, [isMobile, initializeMobileGame, generateRandomPair, currentPair, state.selectedCategory]);

  const handleResetGame = () => {
    resetGame(); // Reset score, streak etc.
    // Clear confetti if showing
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    setShowConfetti(false);
    // Ensure mobile advancing state is cleared
    setIsAdvancing(false);

    if (isMobile) {
      initializeMobileGame(); // Re-initialize mobile state
    } else {
      generateRandomPair(state.selectedCategory);
    }
  };

  const handleCategoryChange = (category: 'all' | 'people' | 'nature' | 'city' | 'interior') => {
    console.log('handleCategoryChange called with:', category);
    console.log('Current state.selectedCategory before change:', state.selectedCategory);
    setCategory(category);
    console.log('setCategory called, new category should be:', category);
    resetGame(); // Reset score and game state when changing category
    hideSummary(); // Hide summary when changing category
    // Clear any pending auto-advance and unblock interactions
    if (nextActionTimerRef.current) {
      clearTimeout(nextActionTimerRef.current);
      nextActionTimerRef.current = null;
    }
    setIsAdvancing(false);
    
    if (isMobile) {
      console.log('Initializing mobile game with category:', category);
      initializeMobileGame(category);
    } else {
      console.log('Generating random pair with category:', category);
      generateRandomPair(category);
    }
  };

  const handlePlayAgain = () => {
    hideSummary();
    resetGame();
    // Unblock any stuck state from previous round
    if (nextActionTimerRef.current) {
      clearTimeout(nextActionTimerRef.current);
      nextActionTimerRef.current = null;
    }
    setIsAdvancing(false);
    
    if (isMobile) {
      initializeMobileGame();
    } else {
      generateRandomPair(state.selectedCategory);
    }
  };

  // --- Desktop Image Selection ---
  const handleImageSelect = useCallback((imageId: string) => {
    if (state.selectedImageId || state.showFeedback || isMobile) return;
    selectImage(imageId);
    if (currentPair) {
      const isCorrect = imageId === currentPair.aiImage.id;
      showFeedback(isCorrect);
      
    }
  }, [state.selectedImageId, state.showFeedback, isMobile, currentPair, selectImage, showFeedback]);

  // --- Mobile Guessing Logic ---
  const handleMobileGuess = useCallback((guess: 'real' | 'ai') => {
    if (state.showFeedback || !currentMobileImage || !isMobile || isAdvancing) return;
    // Logic: you get a point if you correctly identify what the image actually is
    // - Tap "AI" if you think it's AI-generated (correct if image.isAI is true)
    // - Tap "Real" if you think it's real (correct if image.isAI is false)
    const isCorrect = (guess === 'ai' && currentMobileImage.isAI) || (guess === 'real' && !currentMobileImage.isAI);
    showFeedback(isCorrect);


    // Attempt to blur buttons immediately after guess
    realButtonRef.current?.blur();
    aiButtonRef.current?.blur();
  }, [state.showFeedback, currentMobileImage, isMobile, isAdvancing, showFeedback]);

  // --- Mobile Advancement Logic --- 
  const advanceMobileImage = useCallback(() => {
    setIsAdvancing(true); // Block interactions START

    let nextIndex = masterMobileIndex + 1;
    let currentList = masterMobileList;
    let newUniqueCount = uniqueImagesShownCount + 1;
    let needsReshuffle = false;

    // Check if we need to reshuffle (either reached target unique count or end of list)
    if (newUniqueCount >= UNIQUE_DISPLAY_COUNT_TARGET || nextIndex >= currentList.length) {
      // Only log reshuffle reason if list has items
      if (currentList.length > 0) {
         needsReshuffle = true;
      } else {
         setCurrentMobileImage(null); // No image to show
         return;
      }
      
      currentList = shuffleArray([...currentList]); // Reshuffle the list
      setMasterMobileList(currentList); // Update state with shuffled list
      nextIndex = 0; // Reset index to the start of the shuffled list
      // Reset unique count *only if* reshuffling because target was met
      if (newUniqueCount >= UNIQUE_DISPLAY_COUNT_TARGET) {
          newUniqueCount = 0;
      }
    }

    // Ensure the list is not empty after potential shuffle
    if (currentList.length === 0) {
      setCurrentMobileImage(null);
      return;
    }
    
    // Handle potential infinite loop if list has only 1 item and we reshuffle
    if (currentList.length === 1 && needsReshuffle) {
        // This is a rare edge case, but good to handle.
    }

    setCurrentMobileImage(currentList[nextIndex]);
    setMasterMobileIndex(nextIndex);
    setUniqueImagesShownCount(newUniqueCount);
    
    // Reset swipe animation state
    setSwipeDirectionForExit(null);
    // swipe state reset removed
    
    // Reset feedback state using game state hook
    nextPair();

    // Blur buttons to try and remove sticky hover/focus states
    realButtonRef.current?.blur();
    aiButtonRef.current?.blur();

    setIsAdvancing(false); // Unblock interactions END
    setButtonResetKey(prevKey => prevKey + 1); // Increment key to reset buttons

  }, [masterMobileList, masterMobileIndex, uniqueImagesShownCount, nextPair]);

  // --- Feedback Timer --- (Simplified)
  useEffect(() => {
    const clearExistingTimer = () => {
      if (nextActionTimerRef.current) {
        clearTimeout(nextActionTimerRef.current);
        nextActionTimerRef.current = null;
      }
    };

    if (state.showFeedback) {
      clearExistingTimer();
      nextActionTimerRef.current = setTimeout(() => {
        if (isMobile) {
          advanceMobileImage();
        } else {
          // Desktop: Reset feedback and fetch next pair
          nextPair();
          generateRandomPair(state.selectedCategory);
        }
      }, 750);
    }

    return clearExistingTimer;
  }, [state.showFeedback, isMobile, advanceMobileImage, nextPair, generateRandomPair, state.selectedCategory]);

  // --- Game End Check ---
  useEffect(() => {
    if (state.totalAttempts >= 10 && state.showFeedback) {
      setTimeout(() => {
        showSummary();
      }, 1000); // Show summary after feedback
    }
  }, [state.totalAttempts, state.showFeedback, showSummary]);

  // --- Confetti Effect (Keep) ---
   useEffect(() => {
    const clearConfettiTimer = () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    };
    if (state.isCorrect && state.showFeedback) {
      // Perfect score logic
      if (state.correctStreak > 0 && state.correctStreak % 5 === 0) {
        setShowConfetti(true);
        clearConfettiTimer(); // Clear any existing timer
        confettiTimerRef.current = setTimeout(() => {
          setShowConfetti(false);
        }, 4000); // Confetti lasts for 4 seconds
      }
    } else if (!state.isCorrect && state.showFeedback) {
       // Stop confetti immediately on incorrect answer
       setShowConfetti(false);
       clearConfettiTimer();
    }
    
    // Cleanup on unmount
    return () => clearConfettiTimer();
  }, [state.isCorrect, state.showFeedback, state.correctStreak]);

  // Disable body scroll on mobile for better swipe experience
  useEffect(() => {
    const mainScrollContainer = document.getElementById('main-scroll-container');
    let originalOverflowY = '';
    if (mainScrollContainer) {
      originalOverflowY = mainScrollContainer.style.overflowY;
    }

    if (isMobile) {
      if (mainScrollContainer) {
        mainScrollContainer.style.overflowY = 'hidden';
      }
    } else {
      if (mainScrollContainer) {
        mainScrollContainer.style.overflowY = originalOverflowY || 'auto'; // Restore or default to auto
      }
    }

    return () => {
      if (mainScrollContainer) {
        mainScrollContainer.style.overflowY = originalOverflowY || 'auto'; // Restore on unmount
      }
    };
  }, [isMobile]);

  // --- Keyboard & Drag handlers ---
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If feedback is showing, don't allow key presses
    if (state.showFeedback) {
      return;
    }

    // On desktop, allow left/right arrow keys to select image
    if (!isMobile && currentPair) {
      if (event.key === 'ArrowLeft') {
        const currentShuffled = getShuffledImages();
        if (currentShuffled.length > 0) handleImageSelect(currentShuffled[0].id);
      } else if (event.key === 'ArrowRight') {
        const currentShuffled = getShuffledImages();
        if (currentShuffled.length > 1) handleImageSelect(currentShuffled[1].id);
      }
    }
    // On mobile, allow left/right arrow keys for "Real" or "AI"
    else if (isMobile && currentMobileImage) {
      if (event.key === 'ArrowLeft') {
        handleMobileGuess('real');
      } else if (event.key === 'ArrowRight') {
        handleMobileGuess('ai');
      }
    }
  }, [state.showFeedback, isMobile, currentPair, getShuffledImages, handleImageSelect, currentMobileImage, handleMobileGuess]);

   // Effect to add and remove event listener
   useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Dependency array is important

  // Drag handler removed (no swipe on mobile)

  // --- Loading and Error States ---
  const isLoading = isMobile ? mobileLoading : pairLoading;
  const error = isMobile ? mobileError : pairError;

  if (error) {
    return <div className="game-board-container"><div className="error-message">Error: {error}</div></div>;
  }

  if (isLoading) {
    return <div className="game-board-container"><div className="loading-spinner"></div></div>;
  }

  // --- Render Logic ---
  const shuffledDesktopImages = getShuffledImages(); // Desktop only

  // Animation variants (Keep)
  const imageVariants = {
      hidden: { opacity: 0, scale: 0.9, x: 0, rotate: 0 },
      visible: { opacity: 1, scale: 1, x: 0, rotate: 0 },
      exit: (direction: 'left' | 'right' | null) => ({
          x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0, // A "Real" guess (swipe left) flies LEFT, an "AI" guess (swipe right) flies RIGHT.
          opacity: 0,
          scale: 0.8,
          rotate: direction === 'left' ? -15 : direction === 'right' ? 15 : 0,
          transition: { duration: 0.3 }
      })
  };

  // Define new variants for inline emoji feedback
  const feedbackInlineVariants = {
      hidden: { opacity: 0, scale: 0.7 },
      visible: { opacity: 1, scale: 1, transition: { duration: 0.05 } }, // Reduced duration from 0.2 to 0.05
      exit: { opacity: 0, scale: 0.7, transition: { duration: 0.2 } }
  };

  return (
    <div className="max-w-5xl mx-auto relative p-4 flex flex-col overflow-hidden h-full">
      {/* ... Confetti ... */} 
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} style={{ zIndex: 9999 }} gravity={0.15} />}

      {/* --- Header Section (Refactored) --- */}
      <div className="mb-4 pt-2 flex flex-col items-center"> 
        {isMobile ? (
          // --- Mobile Header: Logo + Category Filter ---
          <>
            <a href="https://alkemist.no/realorai" target="_blank" rel="noopener noreferrer" className="mb-4">
              <img src="/realorai.svg" alt="Real or AI Logo" className="h-6 w-auto" /> {/* Reduced height */} 
            </a>
            <CategoryFilter 
              selectedCategory={state.selectedCategory}
              onCategoryChange={handleCategoryChange}
              isMobile={true}
            />
          </>
        ) : (
          // --- Desktop Header: Logo + Category Filter ---
          <>
            <a href="https://alkemist.no/realorai" target="_blank" rel="noopener noreferrer" className="mb-6">
              <img src="/realorai.svg" alt="Real or AI Logo" className="h-8 w-auto" /> {/* Reduced height */} 
            </a>
            <CategoryFilter 
              selectedCategory={state.selectedCategory}
              onCategoryChange={handleCategoryChange}
              isMobile={false}
            />
          </>
        )}
      </div>

      <div className="flex-grow flex flex-col items-center mb-0 relative min-h-0">
        {isMobile ? (
          // ------------- MOBILE VIEW (Refactored) -------------
          <div className="flex flex-col items-center flex-grow relative w-full min-h-0">
            {/* --- Updated Mobile Image Container --- */}
            <div className="relative w-[98%] mx-auto aspect-square flex justify-center items-center mb-1"> {/* Use 98% width */} 
              <AnimatePresence mode="wait" custom={swipeDirectionForExit}>
                {!state.showSummary && currentMobileImage ? (
                  <motion.div
                    key={currentMobileImage.id}
                  className="absolute w-full h-full z-10 overflow-hidden rounded-lg"
                    style={{ touchAction: 'pan-y' }}
                    variants={imageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={swipeDirectionForExit}
                  >
                    <ImageCard
                      image={currentMobileImage}
                      selected={false}
                      showResult={false}
                      isCorrect={null}
                      onSelect={() => {}}
                      disabled={false}
                    />
                  </motion.div>
                 ) : (
                   <div className="absolute w-full h-full z-20 rounded-lg bg-white">
                     <SummaryScreen
                       score={state.score}
                       totalAttempts={state.totalAttempts}
                       category={state.selectedCategory}
                       onPlayAgain={handlePlayAgain}
                       onCategoryChange={handleCategoryChange}
                       isMobile={true}
                       streak={state.correctStreak}
                       isFlipped={mobileShareFlipped}
                       onShareFlip={handleMobileShareFlip}
                     />
                   </div>
                 )}
              </AnimatePresence>

              {/* Swipe overlays removed */}

              {/* ... Inline Feedback Emoji ... */} 
              <AnimatePresence>
                {state.showFeedback && currentMobileImage && !state.showSummary && (
                  <motion.div key="feedback-emoji-inline" className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 rounded-lg pointer-events-none" variants={feedbackInlineVariants} initial="hidden" animate="visible" exit="exit">
                    <span className="text-7xl">{state.isCorrect ? '✅' : '❌'}</span>
                  </motion.div>
                )}
             </AnimatePresence>
            </div>

            {/* ... Mobile Buttons ... */} 
            <div className="flex-shrink-0 w-full">
              {currentMobileImage && !state.showSummary && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.5 }} className="flex justify-center gap-4 w-full max-w-md mx-auto px-4 mt-2 mb-3">
                  <motion.button ref={realButtonRef} key={`real-button-${buttonResetKey}`} onClick={() => handleMobileGuess('real')} disabled={state.showFeedback || isAdvancing} animate={{ opacity: state.showFeedback ? 0.3 : 1 }} transition={{ duration: 0.2 }}
                    className={`flex-grow basis-0 px-5 py-2 text-gray-700 bg-white rounded-full border-2 border-gray-200 disabled:opacity-50 disabled:bg-white text-base flex items-center justify-center gap-2 ${!state.showFeedback && !isAdvancing ? 'md:hover:bg-gray-50' : ''}`}>
                    <span className="text-xl">📷</span> Real
                  </motion.button>
                  <motion.button ref={aiButtonRef} key={`ai-button-${buttonResetKey}`} onClick={() => handleMobileGuess('ai')} disabled={state.showFeedback || isAdvancing} animate={{ opacity: state.showFeedback ? (currentMobileImage.isAI ? 1 : 0.3) : 1 }} transition={{ duration: 0.2 }}
                    className={`flex-grow basis-0 px-5 py-2 text-gray-700 bg-white rounded-full border-2 border-gray-200 disabled:opacity-50 disabled:bg-white text-base flex items-center justify-center gap-2 ${!state.showFeedback && !isAdvancing ? 'md:hover:bg-gray-50' : ''}`}>
                    <span className="text-xl">🤖</span> AI
                  </motion.button>
                </motion.div>
              )}
              {state.showSummary && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.5 }} className="flex justify-center gap-4 w-full max-w-md mx-auto px-4 mt-2 mb-3">
                  <button
                    onClick={handlePlayAgain}
                    className="rounded-full px-6 py-3 text-base bg-gray-900 text-white hover:bg-black flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Play again
                  </button>
                  <button
                    onClick={handleMobileShareFlip}
                    className="rounded-full px-6 py-3 text-base border border-gray-300 text-gray-800 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {mobileShareFlipped ? (
                      <>Back</>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>

            {/* --- Score Display (Moved below buttons) --- */}
            {!state.showSummary && (
              <div className="w-full flex justify-center mb-4 flex-shrink-0">
                  <ScoreDisplay score={state.score} totalAttempts={state.totalAttempts} onReset={handleResetGame} />
              </div>
            )}
          </div>

        ) : (
          // ------------- DESKTOP VIEW (Largely Unchanged) -------------
          <div className="flex-grow flex flex-col min-h-0 w-full">
            <div className="relative w-full mt-2"> {/* Reduced top margin */}
              {!state.showSummary ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 md:px-4 2xl:px-0">
                    {shuffledDesktopImages.map((image) => (
                      <ImageCard
                        key={image.id}
                        image={image}
                        selected={state.selectedImageId === image.id}
                        showResult={state.showFeedback && state.selectedImageId === image.id}
                        isCorrect={state.isCorrect ?? false}
                        onSelect={() => handleImageSelect(image.id)}
                        disabled={state.showFeedback || !!state.selectedImageId}
                      />
                    ))}
                  </div>
                  <div className="w-full flex justify-center mt-6 mb-3 md:mt-4 md:mb-2">
                    <p className="text-gray-600 text-center text-base md:text-sm lg:text-base">
                      Click on the image you think is <strong>AI-generated</strong>.
                    </p>
                  </div>
                  <div className="w-full flex justify-center mt-2 mb-1 md:mt-2">
                    <ScoreDisplay score={state.score} totalAttempts={state.totalAttempts} onReset={handleResetGame} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 md:px-4 2xl:px-0">
                  <div className="rounded-lg bg-white p-6 flex items-center justify-center">
                    <SummaryScreen
                      score={state.score}
                      totalAttempts={state.totalAttempts}
                      category={state.selectedCategory}
                      onPlayAgain={handlePlayAgain}
                      onCategoryChange={handleCategoryChange}
                      isMobile={false}
                      streak={state.correctStreak}
                    />
                  </div>
                  <div className="rounded-lg bg-white p-6 flex items-stretch">
                    <SummaryScreen
                      score={state.score}
                      totalAttempts={state.totalAttempts}
                      category={state.selectedCategory}
                      onPlayAgain={handlePlayAgain}
                      onCategoryChange={handleCategoryChange}
                      isMobile={false}
                      streak={state.correctStreak}
                      showShareOnly={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ... Desktop Feedback Button ... */}
      <div className={`w-full flex justify-center ${isMobile ? 'flex-shrink-0' : ''}`}>
          { !isMobile && state.showFeedback && (
            <div className="mt-2"><Feedback isCorrect={state.isCorrect} onNext={() => { nextPair(); generateRandomPair(state.selectedCategory); }} /></div>
          )}
      </div>

      {/* Summary is embedded per-view above */}
    </div>
  );
};

export default GameBoard;
