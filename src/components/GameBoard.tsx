import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useImagePair } from '../hooks/useImagePair';
import { useGameState } from '../hooks/useGameState';
import { getAllUniqueImages } from '../data/images'; // Import the new function
import ImageCard from './ImageCard';
import Feedback from './Feedback';
import ScoreDisplay from './ScoreDisplay';
import Confetti from 'react-confetti';
import { Image } from '../types'; // Use Image type

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
  } = useGameState();

  // Desktop view still uses useImagePair
  const {
    currentPair,
    loading: pairLoading, // Rename to avoid conflict
    error: pairError,
    generateRandomPair,
    getShuffledImages,
  } = useImagePair();

  const nextActionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { width, height } = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

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
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-10, 10]);
  const imageOpacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const aiOpacity = useTransform(x, [-100, -25, 0], [1, 0, 0]);
  const realOpacity = useTransform(x, [0, 25, 100], [0, 0, 1]);

  // Refs for mobile buttons
  const realButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  // --- Initialization and Reset Logic ---
  const initializeMobileGame = useCallback(() => {
    setMobileLoading(true);
    setMobileError(null);
    try {
      const allImages = getAllUniqueImages();
      if (allImages.length === 0) {
        setMobileError('No images available for the game.');
        setMasterMobileList([]);
        setCurrentMobileImage(null);
      } else {
        setMasterMobileList(allImages);
        setCurrentMobileImage(allImages[0]); // Set the first image
        setMasterMobileIndex(0);
        setUniqueImagesShownCount(0);
      }
    } catch {
        setMobileError('Failed to load images.');
    }
    setMobileLoading(false);
  }, []);

  // Initialize on mount if mobile
  useEffect(() => {
    if (isMobile) {
      initializeMobileGame();
    } else {
       // If starting on desktop, generate initial pair ONLY if not already loaded
       if (!currentPair) {
         generateRandomPair();
       }
    }
    // Cleanup ref on unmount
    return () => {
       if (nextActionTimerRef.current) clearTimeout(nextActionTimerRef.current);
       if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    }
    // dependencies: Run when isMobile changes, or on initial mount for the correct mode logic.
    // initializeMobileGame and generateRandomPair are stable callbacks.
  }, [isMobile, initializeMobileGame, generateRandomPair, currentPair]);

  const handleResetGame = () => {
    resetGame(); // Reset score, streak etc.
    // Clear confetti if showing
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    setShowConfetti(false);

    if (isMobile) {
      initializeMobileGame(); // Re-initialize mobile state
    } else {
      generateRandomPair(); // Fetch new pair for desktop
    }
  };

  // --- Desktop Image Selection ---
  const handleImageSelect = useCallback((imageId: string) => {
    if (state.selectedImageId || state.showFeedback || isMobile) return;
    selectImage(imageId);
    if (currentPair) {
      const isCorrect = imageId === currentPair.realImage.id;
      showFeedback(isCorrect);
    }
  }, [state.selectedImageId, state.showFeedback, isMobile, currentPair, selectImage, showFeedback]);

  // --- Mobile Guessing Logic ---
  const handleMobileGuess = useCallback((guess: 'real' | 'ai') => {
    if (state.showFeedback || !currentMobileImage || !isMobile || isAdvancing) return;
    const isCorrect = (guess === 'real' && !currentMobileImage.isAI) || (guess === 'ai' && currentMobileImage.isAI);
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
    x.set(0);
    
    // Reset feedback state using game state hook
    nextPair();

    // Blur buttons to try and remove sticky hover/focus states
    realButtonRef.current?.blur();
    aiButtonRef.current?.blur();

    setIsAdvancing(false); // Unblock interactions END
    setButtonResetKey(prevKey => prevKey + 1); // Increment key to reset buttons

  }, [masterMobileList, masterMobileIndex, uniqueImagesShownCount, nextPair, x]);

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
          generateRandomPair();
        }
      }, 750);
    }

    return clearExistingTimer;
  }, [state.showFeedback, isMobile, advanceMobileImage, nextPair, generateRandomPair]);

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

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number, y: number }, velocity: { x: number, y: number } }) => {
    if (!isMobile || isAdvancing || state.showFeedback) return;

    const swipeThreshold = width / 4; // Swipe 1/4 of the screen to trigger a guess
    const swipeVelocityThreshold = 400; // Velocity threshold for a flick

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > swipeThreshold || velocity > swipeVelocityThreshold) {
      // Swiped Right ("AI")
      setSwipeDirectionForExit('right');
      handleMobileGuess('ai');
    } else if (offset < -swipeThreshold || velocity < -swipeVelocityThreshold) {
      // Swiped Left ("Real")
      setSwipeDirectionForExit('left');
      handleMobileGuess('real');
    } else {
      // Didn't swipe far enough, animate back to center
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

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
          x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0, // AI (left dir) flies LEFT, Real (right dir) flies RIGHT
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
      <div className="mb-6 pt-2 flex flex-col items-center"> 
        {isMobile ? (
          // --- Mobile Header: Just the linked Logo ---
          <a href="https://alkemist.no/realorai" target="_blank" rel="noopener noreferrer" className="mb-4">
            <img src="/realorai.svg" alt="Real or AI Logo" className="h-6 w-auto" /> {/* Reduced height */} 
          </a>
        ) : (
          // --- Desktop Header: Logo + Instruction Text ---
          <>
            <a href="https://alkemist.no/realorai" target="_blank" rel="noopener noreferrer" className="mb-6">
              <img src="/realorai.svg" alt="Real or AI Logo" className="h-8 w-auto" /> {/* Reduced height */} 
            </a>
            <p className="text-gray-600 text-center sm:text-base lg:text-lg mb-2">
              Click on the image you think is <strong>real</strong>.
            </p>
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
                {currentMobileImage ? (
                  <motion.div
                    key={currentMobileImage.id} // Keyed by image ID for animation
                    className="absolute w-full h-full z-10 cursor-grab overflow-hidden rounded-lg"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    style={{ x, rotate, opacity: imageOpacity, touchAction: 'pan-y' }}
                    onDragEnd={handleDragEnd}
                    variants={imageVariants} // Use existing variants
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={swipeDirectionForExit}
                  >
                    <ImageCard
                      image={currentMobileImage}
                      // Props simplified for mobile card display
                      index={0} 
                      selected={false}
                      showResult={false}
                      isCorrect={null}
                      onSelect={() => {}} // No selection needed
                      disabled={false} // Can always swipe/button press before feedback
                      isMobileView={true}
                    />
                  </motion.div>
                 ) : (
                   <div className="text-gray-500">No image available.</div>
                 )}
              </AnimatePresence>

              {/* ... Drag Overlays ... */} 
              <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 pointer-events-none rounded-lg" style={{ opacity: aiOpacity }}>
                  <span className="text-gray-800 text-5xl font-bold flex flex-col items-center">🤖<span className="text-2xl mt-1">AI?</span></span>
              </motion.div>
              <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 pointer-events-none rounded-lg" style={{ opacity: realOpacity }}>
                <span className="text-gray-800 text-5xl font-bold flex flex-col items-center">📷<span className="text-2xl mt-1">Real?</span></span>
              </motion.div>

              {/* ... Inline Feedback Emoji ... */} 
              <AnimatePresence>
                {state.showFeedback && currentMobileImage && (
                  <motion.div key="feedback-emoji-inline" className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 rounded-lg pointer-events-none" variants={feedbackInlineVariants} initial="hidden" animate="visible" exit="exit">
                    <span className="text-7xl">{state.isCorrect ? '✅' : '❌'}</span>
                  </motion.div>
                )}
             </AnimatePresence>
            </div>

            {/* ... Mobile Buttons ... */} 
            <div className="flex-shrink-0 w-full">
              {currentMobileImage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.5 }} className="flex justify-center gap-4 w-full max-w-md mx-auto px-4 mt-2 mb-1">
                  <motion.button ref={realButtonRef} key={`real-button-${buttonResetKey}`} onClick={() => handleMobileGuess('real')} disabled={state.showFeedback || isAdvancing} animate={{ opacity: state.showFeedback ? (currentMobileImage.isAI ? 0.3 : 1) : 1 }} transition={{ duration: 0.2 }}
                    className={`flex-grow basis-0 px-5 py-2 text-gray-700 bg-white rounded-full border-2 border-gray-200 disabled:opacity-50 disabled:bg-white text-base flex items-center justify-center gap-2 ${!state.showFeedback && !isAdvancing ? 'md:hover:bg-gray-50' : ''}`}>
                    <span className="text-xl">📷</span> Real
                  </motion.button>
                  <motion.button ref={aiButtonRef} key={`ai-button-${buttonResetKey}`} onClick={() => handleMobileGuess('ai')} disabled={state.showFeedback || isAdvancing} animate={{ opacity: state.showFeedback ? (currentMobileImage.isAI ? 1 : 0.3) : 1 }} transition={{ duration: 0.2 }}
                    className={`flex-grow basis-0 px-5 py-2 text-gray-700 bg-white rounded-full border-2 border-gray-200 disabled:opacity-50 disabled:bg-white text-base flex items-center justify-center gap-2 ${!state.showFeedback && !isAdvancing ? 'md:hover:bg-gray-50' : ''}`}>
                    <span className="text-xl">🤖</span> AI
                  </motion.button>
                </motion.div>
              )}
            </div>

            {/* ... Score Display ... */} 
             <div className="w-full flex justify-center mt-1 mb-0 flex-shrink-0">
                <ScoreDisplay score={state.score} totalAttempts={state.totalAttempts} onReset={handleResetGame} />
              </div>
          </div>

        ) : (
          // ------------- DESKTOP VIEW (Largely Unchanged) -------------
          <div className="relative w-full mt-8 min-h-0"> {/* Add min-h-0 here */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"> {/* Reduced bottom margin back */} 
               {shuffledDesktopImages.map((image, index) => (
                 <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    selected={state.selectedImageId === image.id}
                    showResult={state.showFeedback && state.selectedImageId === image.id}
                    isCorrect={state.isCorrect ?? false}
                    onSelect={() => handleImageSelect(image.id)}
                    disabled={state.showFeedback || !!state.selectedImageId}
                    isMobileView={false}
                 />
               ))}
             </div>
             {/* ... Desktop Score Display ... */}
             <div className="w-full flex justify-center mt-4 mb-1"> {/* Reduced top margin back */} 
                <ScoreDisplay score={state.score} totalAttempts={state.totalAttempts} onReset={handleResetGame} />
              </div>
          </div>
        )}
      </div>

      {/* ... Desktop Feedback Button ... */}
      <div className={`w-full flex justify-center ${isMobile ? 'flex-shrink-0' : ''}`}>
          { !isMobile && state.showFeedback && (
            <div className="mt-2"><Feedback isCorrect={state.isCorrect} onNext={() => { nextPair(); generateRandomPair(); }} /></div>
          )}
      </div>
    </div>
  );
};

export default GameBoard;
