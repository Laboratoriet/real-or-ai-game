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

  // Refs for mobile buttons
  const realButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  // --- Initialization and Reset Logic ---
  const initializeMobileGame = useCallback(() => {
    console.log("[Mobile Init] Initializing mobile game...");
    setMobileLoading(true);
    setMobileError(null);
    try {
      const allImages = getAllUniqueImages();
      if (allImages.length === 0) {
        console.error('[Mobile Init] No unique images found!');
        setMobileError('No images available for the game.');
        setMasterMobileList([]);
        setCurrentMobileImage(null);
      } else {
        console.log(`[Mobile Init] Setting master list with ${allImages.length} images.`);
        setMasterMobileList(allImages);
        setCurrentMobileImage(allImages[0]); // Set the first image
        setMasterMobileIndex(0);
        setUniqueImagesShownCount(0);
      }
    } catch (err) {
        console.error('[Mobile Init] Error getting unique images:', err);
        setMobileError('Failed to load images.');
    }
    setMobileLoading(false);
  }, []);

  // Initialize on mount if mobile
  useEffect(() => {
    if (isMobile) {
      console.log("Effect: isMobile is true, initializing mobile...");
      initializeMobileGame();
    } else {
       // If starting on desktop, generate initial pair ONLY if not already loaded
       console.log("Effect: isMobile is false, checking desktop pair...");
       if (!currentPair) {
         console.log("Effect: Desktop pair not loaded, generating...");
         generateRandomPair();
       } else {
         console.log("Effect: Desktop pair already loaded.");
       }
    }
    // Cleanup ref on unmount
    return () => {
       if (nextActionTimerRef.current) clearTimeout(nextActionTimerRef.current);
       if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    }
    // Dependencies: Run when isMobile changes, or on initial mount for the correct mode logic.
    // initializeMobileGame and generateRandomPair are stable callbacks.
  }, [isMobile, initializeMobileGame, generateRandomPair]); // Removed currentPair

  const handleResetGame = () => {
    console.log("Resetting game...");
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
  const handleImageSelect = (imageId: string) => {
    if (state.selectedImageId || state.showFeedback || isMobile) return;
    selectImage(imageId);
    if (currentPair) {
      const isCorrect = imageId === currentPair.realImage.id;
      showFeedback(isCorrect);
    }
  };

  // --- Mobile Guessing Logic ---
  const handleMobileGuess = (guess: 'real' | 'ai') => {
    if (state.showFeedback || !currentMobileImage || !isMobile || isAdvancing) return;
    const isCorrect = (guess === 'real' && !currentMobileImage.isAI) || (guess === 'ai' && currentMobileImage.isAI);
    showFeedback(isCorrect);

    // Attempt to blur buttons immediately after guess
    realButtonRef.current?.blur();
    aiButtonRef.current?.blur();
  };

  // --- Mobile Advancement Logic --- 
  const advanceMobileImage = useCallback(() => {
    console.log('[Mobile Advance] Advancing...');
    setIsAdvancing(true); // Block interactions START

    let nextIndex = masterMobileIndex + 1;
    let currentList = masterMobileList;
    let newUniqueCount = uniqueImagesShownCount + 1;
    let needsReshuffle = false;

    // Check if we need to reshuffle (either reached target unique count or end of list)
    if (newUniqueCount >= UNIQUE_DISPLAY_COUNT_TARGET || nextIndex >= currentList.length) {
      // Only log reshuffle reason if list has items
      if (currentList.length > 0) {
         console.warn(`[Mobile Advance] Reshuffling master list. Reason: ${newUniqueCount >= UNIQUE_DISPLAY_COUNT_TARGET ? 'Reached unique target' : 'End of list'}. Unique shown: ${newUniqueCount}`);
         needsReshuffle = true;
      } else {
         console.error('[Mobile Advance] Cannot advance, master list is empty.');
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
      console.error('[Mobile Advance] Master list empty after potential reshuffle.');
      setCurrentMobileImage(null);
      return;
    }
    
    // Handle potential infinite loop if list has only 1 item and we reshuffle
    if (currentList.length === 1 && needsReshuffle) {
        console.warn('[Mobile Advance] List has only one item, cannot guarantee different image after reshuffle.');
    }

    setCurrentMobileImage(currentList[nextIndex]);
    setMasterMobileIndex(nextIndex);
    setUniqueImagesShownCount(newUniqueCount);
    console.log(`[Mobile Advance] New index: ${nextIndex}, New unique count: ${newUniqueCount}`);
    
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
      console.log('Setting feedback timer...');
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
    if (state.showFeedback && state.isCorrect && state.correctStreak > 0 && state.correctStreak % 10 === 0) {
      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 5000);
    } else if (!state.showFeedback) {
       // Optional: stop confetti immediately if feedback dismissed early
    }
    return clearConfettiTimer;
  }, [state.isCorrect, state.correctStreak, state.showFeedback]);

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

  // --- Adjusted Keyboard Handler ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === '1' || event.key === '2') {
        event.preventDefault();
      }

      // Simplified Guard
      if (state.showFeedback || isAdvancing) return;

      if (isMobile) {
         if (!currentMobileImage || mobileLoading) return; // Guard against no image or loading
         if (event.key === '1') handleMobileGuess('real');
         else if (event.key === '2') handleMobileGuess('ai');
      } else {
         // Desktop Logic
         if (pairLoading || !currentPair || state.selectedImageId) return;
         const currentShuffledImages = getShuffledImages();
         if (currentShuffledImages.length !== 2) return;
         let selectedImageId: string | null = null;
         if (event.key === 'ArrowLeft') selectedImageId = currentShuffledImages[0].id;
         else if (event.key === 'ArrowRight') selectedImageId = currentShuffledImages[1].id;
         if (selectedImageId) handleImageSelect(selectedImageId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMobile,
    state.showFeedback,
    state.selectedImageId,
    pairLoading,
    mobileLoading,
    currentPair,
    currentMobileImage,
    getShuffledImages,
    handleMobileGuess,
    handleImageSelect,
    isAdvancing,
  ]);

  // --- Motion Values for Drag Animation (Keep) ---
  // const x = useMotionValue(0);
  const threshold = 25;
  const maxDrag = 150;
  const aiOpacity = useTransform(x, [-maxDrag * 0.8, -threshold, 0], [1, 0, 0]);
  const realOpacity = useTransform(x, [0, threshold, maxDrag * 0.8], [0, 0, 1]);
  const rotate = useTransform(x, [-maxDrag * 1.5, maxDrag * 1.5], [-15, 15], { clamp: false });
  const imageOpacity = useTransform(x, [-maxDrag, -maxDrag * 0.5, 0, maxDrag * 0.5, maxDrag], [0.3, 0.7, 1, 0.7, 0.3]);

  // --- Drag End Handler (Keep, simplify swipe direction setting) ---
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number, y: number }, velocity: { x: number, y: number } }) => {
    const dragThreshold = 100;
    const velocityThreshold = 300;
    let direction: 'left' | 'right' | null = null;

    // Add isAdvancing guard here too
    if (isAdvancing || state.showFeedback) {
       // If advancing or showing feedback, just snap back
       animate(x, 0, { type: "spring", stiffness: 350, damping: 35 });
       setSwipeDirectionForExit(null);
       return;
    }

    if (info.offset.x < -dragThreshold || info.velocity.x < -velocityThreshold) direction = 'left'; // Left swipe = AI Guess
    else if (info.offset.x > dragThreshold || info.velocity.x > velocityThreshold) direction = 'right'; // Right swipe = Real Guess

    if (direction) {
        const guess = direction === 'left' ? 'ai' : 'real';
        console.log(`Swipe ${direction} triggered guess: ${guess}`);
        handleMobileGuess(guess);
        setSwipeDirectionForExit(direction); // Set direction for exit animation
    } else {
        animate(x, 0, { type: "spring", stiffness: 350, damping: 35 });
        setSwipeDirectionForExit(null);
    }
  };

  // --- Loading and Error States ---
  const isLoading = isMobile ? mobileLoading : pairLoading;
  const error = isMobile ? mobileError : pairError;

  if (error) {
    return <div className="flex justify-center items-center h-64 text-red-600 text-center">Error: {error}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
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
                    className={`flex-grow basis-0 px-5 py-2 text-gray-700 bg-white rounded-full border-2 border-gray-200 disabled:opacity-50 disabled:bg-white text-base flex items-center justify-center gap-2 ${!state.showFeedback && !isAdvancing ? 'hover:hover:bg-gray-50' : ''}`}>
                    <span className="text-xl">📷</span> Real
                  </motion.button>
                  <motion.button ref={aiButtonRef} key={`ai-button-${buttonResetKey}`} onClick={() => handleMobileGuess('ai')} disabled={state.showFeedback || isAdvancing} animate={{ opacity: state.showFeedback ? (currentMobileImage.isAI ? 1 : 0.3) : 1 }} transition={{ duration: 0.2 }}
                    className={`flex-grow basis-0 px-5 py-2 text-gray-700 bg-white rounded-full border-2 border-gray-200 disabled:opacity-50 disabled:bg-white text-base flex items-center justify-center gap-2 ${!state.showFeedback && !isAdvancing ? 'hover:hover:bg-gray-50' : ''}`}>
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
          <div className="relative w-full mt-8"> {/* Reduced top margin back */} 
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
