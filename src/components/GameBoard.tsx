import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useImagePair } from '../hooks/useImagePair';
import { useGameState } from '../hooks/useGameState';
// import CategorySelector from './CategorySelector'; // Removed
import ImageCard from './ImageCard';
import Feedback from './Feedback';
import ScoreDisplay from './ScoreDisplay';
import Confetti from 'react-confetti';
import { Image } from '../types'; // Use Image type

const MOBILE_BREAKPOINT = 768; // Define a breakpoint
const MOBILE_HISTORY_LENGTH = 15; // Max number of recent images to track for non-repetition

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

// Helper function to shuffle an array
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
    nextPair,
    resetGame,
  } = useGameState();
  
  const {
    currentPair,
    loading,
    error,
    generateRandomPair,
    getShuffledImages,
  } = useImagePair();
  
  const nextPairTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { width, height } = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

  // State for mobile view
  const [mobileImageList, setMobileImageList] = useState<Image[]>([]);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [isInitialMobileLoad, setIsInitialMobileLoad] = useState(true); // Track initial load for mobile
  const [swipeDirectionForExit, setSwipeDirectionForExit] = useState<'left' | 'right' | null>(null); // State for exit animation
  const [recentMobileImageIds, setRecentMobileImageIds] = useState<string[]>([]); // Track recent IDs
  const [needsMobileAdvance, setNeedsMobileAdvance] = useState<boolean>(false); // State to trigger advancement

  // Helper to update recent image history
  const updateHistory = useCallback((newImageId: string) => {
    setRecentMobileImageIds(prev => {
      const updatedHistory = [newImageId, ...prev.filter(id => id !== newImageId)];
      return updatedHistory.slice(0, MOBILE_HISTORY_LENGTH);
    });
  }, []);

  const handleImageSelect = (imageId: string) => {
    if (state.selectedImageId || state.showFeedback) return;
    
    selectImage(imageId);
    
    if (currentPair) {
      const isCorrect = imageId === currentPair.realImage.id;
      showFeedback(isCorrect);
    }
  };
  
  const handleNextPair = useCallback(() => {
    if (nextPairTimerRef.current) {
      clearTimeout(nextPairTimerRef.current);
      nextPairTimerRef.current = null;
    }
    nextPair();
    generateRandomPair();
  }, [nextPair, generateRandomPair]);

  // Mobile: Handle guessing via buttons
  const handleMobileGuess = (guess: 'real' | 'ai') => {
    if (state.showFeedback || !mobileImageList[currentMobileIndex]) return;

    const currentImage = mobileImageList[currentMobileIndex];
    const isCorrect = (guess === 'real' && !currentImage.isAI) || (guess === 'ai' && currentImage.isAI);

    // Use game state's feedback mechanism
    showFeedback(isCorrect);
  };

  // Function to add new pair images to the mobile list and shuffle
  const updateMobileList = useCallback((newReal: Image, newAi: Image) => {
    setMobileImageList(prevList => {
      console.log(`[updateMobileList] Attempting to add: Real ID=${newReal.id}, AI ID=${newAi.id}. Current list size: ${prevList.length}`);
      const existingIds = new Set(prevList.map(img => img.id));
      const newList = [...prevList];
      let addedReal = false;
      let addedAi = false;

      if (!existingIds.has(newReal.id)) {
        newList.push(newReal);
        addedReal = true;
      }
      if (!existingIds.has(newAi.id)) {
        newList.push(newAi);
        addedAi = true;
      }
      const imagesAddedCount = (addedReal ? 1 : 0) + (addedAi ? 1 : 0);

      // Check if the list actually grew before shuffling
      if (newList.length > prevList.length) {
        console.log(`[updateMobileList] Added ${imagesAddedCount} new images. Shuffling. New list size: ${newList.length}`);
        return shuffleArray(newList); // Shuffle only if list grew
      }
      console.log(`[updateMobileList] No new images added (already exist). List size remains: ${prevList.length}`);
      return prevList;
    });
  }, []);

  // Effect to populate mobile list when a new pair is loaded
  useEffect(() => {
    if (currentPair) {
      updateMobileList(currentPair.realImage, currentPair.aiImage);
      if (isInitialMobileLoad) {
        setIsInitialMobileLoad(false);
      }
    }
  }, [currentPair, updateMobileList, isInitialMobileLoad]);

  // --- Motion Values for Drag Animation --- 
  const x = useMotionValue(0); 

  const threshold = 25; 
  const maxDrag = 130; 
  
  // REVERSE Opacity mapping AGAIN: AI Right, Real Left
  const aiOpacity = useTransform(x, [0, threshold, maxDrag], [0, 0, 1]); // AI fades on RIGHT drag
  const realOpacity = useTransform(x, [-maxDrag, -threshold, 0], [1, 0, 0]); // Real fades on LEFT drag
  const rotate = useTransform(x, [-maxDrag * 1.5, maxDrag * 1.5], [-15, 15], { clamp: false });

  // Function to handle drag end
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number, y: number }, velocity: { x: number, y: number } }) => {
    const dragThreshold = 100;
    const velocityThreshold = 300;
    let direction: 'left' | 'right' | null = null;

    // REVERSE direction assignment AGAIN
    if (info.offset.x < -dragThreshold || info.velocity.x < -velocityThreshold) {
        direction = 'right'; // Left swipe = Real Guess
    } else if (info.offset.x > dragThreshold || info.velocity.x > velocityThreshold) {
        direction = 'left'; // Right swipe = AI Guess
    }

    if (direction) {
        // Logic based on direction's NEW meaning
        const guess = direction === 'left' ? 'ai' : 'real'; 
        console.log(`Swipe ${direction === 'left' ? 'RIGHT' : 'LEFT'} triggered guess: ${guess}`);
        handleMobileGuess(guess); 
        setSwipeDirectionForExit(direction); 
        queueMicrotask(() => x.set(0)); 
    } else {
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
        setSwipeDirectionForExit(null);
    }
  };

  // Effect for feedback timeout & ADVANCEMENT
  useEffect(() => {
    const clearExistingTimer = () => {
      if (nextPairTimerRef.current) {
        clearTimeout(nextPairTimerRef.current);
        nextPairTimerRef.current = null;
      }
    };
  
    if (state.showFeedback) {
      clearExistingTimer();
      console.log('Setting feedback timer...');
      nextPairTimerRef.current = setTimeout(() => {
        // Reset swipe direction regardless of mode
        if (isMobile) {
          console.log('Feedback timer expired (Mobile). Setting flag to advance.');
          setNeedsMobileAdvance(true); // Set flag instead of calculating here
        } else {
          // --- Desktop Advancement Logic ---
          console.log('Feedback timeout on desktop, calling handleNextPair');
          setSwipeDirectionForExit(null); // Reset swipe for desktop here
          handleNextPair();
        }
      }, 1500); // 1.5s feedback display
    }
  
    return clearExistingTimer;
  // Added mobileImageList to dependencies again
  // Removed direct advancement logic dependencies, only needs showFeedback now?
  }, [state.showFeedback, handleNextPair, isMobile, currentMobileIndex, mobileImageList, mobileImageList.length, nextPair, recentMobileImageIds, updateHistory]);

  // Effect to handle mobile advancement when flag is set
  useEffect(() => {
    if (needsMobileAdvance && isMobile) {
      console.log('[Advancement Effect] Flag is true. Calculating next mobile index...');
      setSwipeDirectionForExit(null); // Reset swipe for mobile here

      console.log('[Advancement Effect] Current History:', recentMobileImageIds);

      // --- Mobile Advancement Logic (moved here) ---
      let chosenNextIndex = -1;
      let chosenNextImageId: string | null = null;

      // Filter out recently shown images (using latest state)
      let availableImages = mobileImageList.filter(img => !recentMobileImageIds.includes(img.id));

      console.log(`[Advancement Effect] Filtered List Size (excluding history): ${availableImages.length} (Original: ${mobileImageList.length})`);

      // Fallback
      if (availableImages.length === 0 && mobileImageList.length > 0) {
        console.warn('[Advancement Effect] All images in mobile list are in recent history. Falling back to full list.');
        availableImages = mobileImageList;
      }

      if (availableImages.length > 0) {
        const nextImage = availableImages[Math.floor(Math.random() * availableImages.length)];
        const nextIndex = mobileImageList.findIndex(img => img.id === nextImage.id);

        if (nextIndex !== -1) {
          chosenNextIndex = nextIndex;
          chosenNextImageId = nextImage.id;
          console.log(`[Advancement Effect] Selected next mobile index ${chosenNextIndex} (ID: ${chosenNextImageId}).`);
          updateHistory(nextImage.id); // Update history
        } else {
          console.error('[Advancement Effect] Selected available image not found in original list?');
          if (mobileImageList.length > 0) {
            chosenNextIndex = 0;
            chosenNextImageId = mobileImageList[0].id;
            updateHistory(mobileImageList[0].id);
          }
        }
      } else {
        console.warn('[Advancement Effect] Mobile image list is empty, cannot advance index.');
        chosenNextIndex = 0;
      }

      // Set the calculated index state
      if (chosenNextIndex !== -1) {
        setCurrentMobileIndex(chosenNextIndex);
      }

      // Aggressively fetch more images if the list is small
      const FETCH_THRESHOLD = MOBILE_HISTORY_LENGTH * 2;
      const FETCH_COUNT = 4;
      if (mobileImageList.length < FETCH_THRESHOLD) {
          console.log(`[Advancement Effect] Mobile list size (${mobileImageList.length}) below threshold (${FETCH_THRESHOLD}). Fetching ${FETCH_COUNT} more pairs.`);
          for (let i = 0; i < FETCH_COUNT; i++) {
              generateRandomPair();
          }
      }

      // Clear feedback state
      nextPair();

      // Reset the flag
      setNeedsMobileAdvance(false);
      console.log('[Advancement Effect] Advancement complete. Flag reset.');
    }
  }, [needsMobileAdvance, isMobile, mobileImageList, recentMobileImageIds, updateHistory, generateRandomPair, nextPair]); // Dependencies for the advancement logic

  useEffect(() => {
    const clearConfettiTimer = () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    };

    if (state.showFeedback && state.isCorrect && state.correctStreak > 0 && state.correctStreak % 10 === 0) {
      console.log(`[Confetti Effect] Triggering for streak ${state.correctStreak}`);
      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = setTimeout(() => {
        console.log('[Confetti Effect] Stopping after 5 seconds');
        setShowConfetti(false);
      }, 5000);
    }

    return clearConfettiTimer;
  }, [state.isCorrect, state.correctStreak, state.showFeedback]);

  // Effect to handle keyboard input (modified for mobile)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default browser scroll for arrow keys we handle
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === '1' || event.key === '2') {
        event.preventDefault();
      }

      // Guard: Do nothing further if feedback is showing, an image is selected (desktop), or images aren't loaded
      if (state.showFeedback || loading || (!currentPair && mobileImageList.length === 0)) {
        return;
      }

      if (isMobile) {
        // Mobile: Handle '1' for Real, '2' for AI
        if (event.key === '1') { // '1' key for Real
          handleMobileGuess('real');
        } else if (event.key === '2') { // '2' key for AI
          handleMobileGuess('ai');
        }
      } else {
        // Desktop: Handle Arrow Keys
        if (state.selectedImageId) return; 
        const currentShuffledImages = getShuffledImages();
        if (currentShuffledImages.length !== 2) return;

        let selectedImageId: string | null = null;
        if (event.key === 'ArrowLeft') {
          selectedImageId = currentShuffledImages[0].id;
        } else if (event.key === 'ArrowRight') {
          selectedImageId = currentShuffledImages[1].id;
        }

        if (selectedImageId) {
          // Desktop selection logic
          selectImage(selectedImageId);
          const isCorrect = selectedImageId === currentPair?.realImage.id;
          console.log('Desktop keyboard select. Showing feedback and queuing next pair (500ms delay).');
          showFeedback(isCorrect);
          // Use a timeout for faster (but not instant) advancement vs mouse click
          setTimeout(() => {
            handleNextPair();
          }, 500); // 500ms delay
          // The feedback useEffect timer will likely be cleared by handleNextPair before it fires.
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isMobile,
    state.showFeedback,
    state.selectedImageId,
    loading,
    currentPair,
    mobileImageList,
    currentMobileIndex,
    getShuffledImages,
    selectImage,
    showFeedback,
    handleNextPair,
    handleMobileGuess,
    state.isCorrect
  ]);

  // Helper function to get the current image avoiding unnecessary checks later
  const getCurrentMobileImage = () => {
    if (isMobile && mobileImageList.length > 0 && currentMobileIndex >= 0 && currentMobileIndex < mobileImageList.length) {
        return mobileImageList[currentMobileIndex];
    }
    return null;
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600 text-center">
        Error: {error}
      </div>
    );
  }
  
  if (loading && isInitialMobileLoad && mobileImageList.length === 0) { // Show loading only on very first load for mobile
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  const shuffledImages = getShuffledImages();
  
  // Mobile image to display
  const currentMobileImage = getCurrentMobileImage();

  // Updated Animation variants with custom exit
  const imageVariants = {
      hidden: { opacity: 0, scale: 0.9, x: 0, rotate: 0 },
      visible: { opacity: 1, scale: 1, x: 0, rotate: 0 },
      exit: (direction: 'left' | 'right' | null) => ({ 
          x: direction === 'left' ? 300 : direction === 'right' ? -300 : 0, // AI (left dir) flies right, Real (right dir) flies left
          opacity: 0,
          scale: 0.8,
          rotate: direction === 'left' ? 15 : direction === 'right' ? -15 : 0,
          transition: { duration: 0.3 }
      })
  };

  // Define new variants for inline emoji feedback
  const feedbackInlineVariants = {
      hidden: { opacity: 0, scale: 0.7 },
      visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, scale: 0.7, transition: { duration: 0.2 } }
  };

  return (
    <div className="max-w-4xl mx-auto relative p-4 flex flex-col overflow-hidden">
      {/* Update Confetti props */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={400} // Increased pieces
          style={{ zIndex: 9999 }} // Ensure it's on top
        />
      )}
      
      {/* Header Text Area */}
      <div className="mb-2"> 
        <h2 className="text-xl font-medium text-center text-gray-900 mb-1"> 
          {isMobile ? 'Is this photo Real or AI?' : 'Which is the real photo?'}
        </h2>
        {/* Updated Mobile Instructions */}
        <p className="text-center text-gray-500 mb-3"> 
          {isMobile
            ? 'Swipe or click buttons below' 
            : 'Click on the image you think is real.'}
        </p>
      </div>
      
      {/* Main Content Flex Container */}
      <div className="flex-grow flex flex-col items-center mb-0 relative"> 
        {isMobile ? (
          // ------------- MOBILE VIEW -------------
          <div className="flex flex-col items-center flex-grow relative w-full"> {/* Removed max-w-md */} 
            {/* Card Stack Area */}
            <div className="relative w-full max-w-md aspect-square flex justify-center items-center mb-1"> {/* Re-add aspect-square, add max-w-md back */} 
              <AnimatePresence mode="wait" custom={swipeDirectionForExit}>
                {currentMobileImage && (
                  <motion.div
                    key={currentMobileImage.id} 
                    className="absolute w-full h-full z-10 cursor-grab overflow-hidden rounded-lg" 
                    drag="x"
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} 
                    style={{ x, rotate }} 
                    onDragEnd={handleDragEnd}
                    variants={imageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={swipeDirectionForExit} 
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <ImageCard
                      image={currentMobileImage}
                      index={0} 
                      selected={false} 
                      showResult={false} 
                      isCorrect={null} 
                      onSelect={() => {}} 
                      disabled={false}
                      isMobileView={true}
                    />
                    
                    {/* Interactive Drag Overlays - REVERTED */}
                    <motion.div 
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none rounded-lg"
                      style={{ opacity: realOpacity }} // REAL overlay uses realOpacity (triggered by left drag)
                    >
                       <span className="text-white text-5xl font-bold flex flex-col items-center">📷<span className="text-2xl mt-1">Real?</span></span>
                    </motion.div>
                    <motion.div 
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none rounded-lg"
                      style={{ opacity: aiOpacity }} // AI overlay uses aiOpacity (triggered by right drag)
                    >
                      <span className="text-white text-5xl font-bold flex flex-col items-center">🤖<span className="text-2xl mt-1">AI?</span></span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* NEW: AnimatePresence for Inline Feedback Emoji */}
              <AnimatePresence>
                {state.showFeedback && (
                    <motion.div
                        key="feedback-emoji-inline" // Unique key
                        className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 rounded-lg pointer-events-none" // Overlay styling
                        variants={feedbackInlineVariants} // Use new variants
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <span className="text-7xl">
                            {state.isCorrect ? '✅' : '❌'}
                        </span>
                    </motion.div>
                )}
             </AnimatePresence>
            </div>

            {/* Loader - Keep hidden during feedback */}
            {(loading && !currentMobileImage && !state.showFeedback && isInitialMobileLoad) && (
               <div className="absolute inset-0 flex justify-center items-center z-40 bg-white/50"> {/* Ensure loader is above inline feedback bg */}
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
               </div>
            )}
            
            {/* Mobile Buttons Container - Lighter Border */}
            {!state.showFeedback && currentMobileImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }} 
                // Increased top margin, use justify-center
                className="flex justify-center gap-4 w-full max-w-md px-4 mt-4 mb-2" 
              >
                {/* Left Button = REAL - Lighter Border */}
                <button
                  onClick={() => handleMobileGuess('real')}
                  disabled={state.showFeedback}
                  // Changed border-gray-300 to border-gray-200
                  className="flex-grow basis-0 px-5 py-2 text-gray-700 rounded-full border-2 border-gray-200 transition duration-150 disabled:opacity-50 text-base flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  <span className="text-xl">📷</span> Real
                </button>
                {/* Right Button = AI - Lighter Border */}
                <button
                  onClick={() => handleMobileGuess('ai')} 
                  disabled={state.showFeedback}
                  // Changed border-gray-300 to border-gray-200
                  className="flex-grow basis-0 px-5 py-2 text-gray-700 rounded-full border-2 border-gray-200 transition duration-150 disabled:opacity-50 text-base flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                   <span className="text-xl">🤖</span> AI
                </button>
              </motion.div>
            )}

            {/* Score Display (Positioned after buttons) */}
            <div className="w-full flex justify-center mt-2 mb-1"> {/* Add top margin, small bottom margin */} 
              <ScoreDisplay
                score={state.score}
                totalAttempts={state.totalAttempts}
                onReset={resetGame}
              />
            </div>
          </div>
        ) : (
          // ------------- DESKTOP VIEW -------------
          <div className="relative w-full mt-6"> 
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2"> {/* Reduce bottom margin */} 
               {shuffledImages.map((image, index) => (
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
             
             {/* Score Display (Positioned after grid) */} 
             <div className="w-full flex justify-center mt-2 mb-1"> {/* Add top margin, small bottom margin */} 
                <ScoreDisplay
                  score={state.score}
                  totalAttempts={state.totalAttempts}
                  onReset={resetGame}
                />
              </div>
          </div>
        )}
      </div>
      
      {/* Feedback Button Area - HIDE on Mobile */}
      <div className="w-full flex justify-center"> 
          { !isMobile && state.showFeedback && (
            <div className="mt-0"> 
              <Feedback isCorrect={state.isCorrect} onNext={handleNextPair} />
            </div>
          )}
      </div>
    </div>
  );
};

export default GameBoard;