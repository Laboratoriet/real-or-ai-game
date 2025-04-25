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
// Removed MOBILE_HISTORY_LENGTH
const PREFETCH_THRESHOLD = 5; // When unseen images drop below this, fetch more
const FETCH_COUNT = 4; // How many pairs to fetch when needed


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
  // Use Set for efficient tracking of all seen image IDs this session
  const [seenMobileImageIds, setSeenMobileImageIds] = useState<Set<string>>(new Set());
  const [needsMobileAdvance, setNeedsMobileAdvance] = useState<boolean>(false); // State to trigger advancement
  // Removed updateHistory hook


  // Reset seen images on game reset
  const handleResetGame = () => {
    console.log("Resetting game and seen images...");
    resetGame();
    setSeenMobileImageIds(new Set());
    setMobileImageList([]); // Clear list to force refetch
    setCurrentMobileIndex(0);
    setIsInitialMobileLoad(true);
    // Immediately fetch initial pair after reset
    generateRandomPair();
  };

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

  // Function to add new pair images to the mobile list (if not already present) and shuffle
  const updateMobileList = useCallback((newReal: Image, newAi: Image) => {
    setMobileImageList(prevList => {
      console.log(`[updateMobileList] Attempting to add: Real ID=${newReal.id}, AI ID=${newAi.id}. Current list size: ${prevList.length}`);
      const existingIds = new Set(prevList.map(img => img.id));
      const newList = [...prevList];
      let added = false;

      if (!existingIds.has(newReal.id)) {
        newList.push(newReal);
        added = true;
      }
      if (!existingIds.has(newAi.id)) {
        newList.push(newAi);
        added = true;
      }

      // Check if the list actually grew before shuffling
      if (added) {
        console.log(`[updateMobileList] Added new images. Shuffling. New list size: ${newList.length}`);
        return shuffleArray(newList); // Shuffle only if list grew
      }
      console.log(`[updateMobileList] No new images added (already exist). List size remains: ${prevList.length}`);
      return prevList; // Return previous list if no change
    });
  // Dependency array is empty as it relies on args and setMobileImageList
  }, []);

  // Effect to populate mobile list when a new pair is loaded
  useEffect(() => {
    if (currentPair && isMobile) { // Only populate if mobile
      updateMobileList(currentPair.realImage, currentPair.aiImage);
       // Update initial load flag only after list is potentially populated
       if (isInitialMobileLoad && mobileImageList.length > 0) {
        setIsInitialMobileLoad(false);
      }
    }
  // Added isMobile and length dependency, ensure updateMobileList is stable
  }, [currentPair, updateMobileList, isInitialMobileLoad, isMobile, mobileImageList.length]);

  // --- Motion Values for Drag Animation ---
  const x = useMotionValue(0);

  const threshold = 25;
  const maxDrag = 130;

  // Opacity mapping: AI Left, Real Right (Reverted)
  const aiOpacity = useTransform(x, [-maxDrag, -threshold, 0], [1, 0, 0]); // AI fades on LEFT drag
  const realOpacity = useTransform(x, [0, threshold, maxDrag], [0, 0, 1]); // Real fades on RIGHT drag
  const rotate = useTransform(x, [-maxDrag * 1.5, maxDrag * 1.5], [-15, 15], { clamp: false });
  const imageOpacity = useTransform(x, [-maxDrag, 0, maxDrag], [0.6, 1, 0.6]); // Image fades towards edges (subtler)


  // Function to handle drag end
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number, y: number }, velocity: { x: number, y: number } }) => {
    const dragThreshold = 100;
    const velocityThreshold = 300;
    let direction: 'left' | 'right' | null = null;

    // Reverted direction assignment
    if (info.offset.x < -dragThreshold || info.velocity.x < -velocityThreshold) {
        direction = 'left'; // Left swipe = AI Guess
    } else if (info.offset.x > dragThreshold || info.velocity.x > velocityThreshold) {
        direction = 'right'; // Right swipe = Real Guess
    }

    if (direction) {
        // Logic based on direction's meaning (Left=AI, Right=Real)
        const guess = direction === 'left' ? 'ai' : 'real';
        console.log(`Swipe ${direction} triggered guess: ${guess}`);
        handleMobileGuess(guess);
        setSwipeDirectionForExit(direction);
        // Reset x smoothly - Framer Motion handles this if not exited
        // queueMicrotask(() => x.set(0)); // Not needed?
    } else {
        // Animate back to center if swipe wasn't strong enough
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
        setSwipeDirectionForExit(null);
    }
  };

  // Effect for feedback timeout
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
      }, 750); // Reduced from 1500ms
    }

    return clearExistingTimer;
  // Reduced dependencies - relies on advancement effect for index logic
  }, [state.showFeedback, handleNextPair, isMobile, nextPair]);


  // Effect to handle mobile advancement when flag is set
  useEffect(() => {
    // Ensure this runs only when needed and possible
    if (!needsMobileAdvance || !isMobile || mobileImageList.length === 0) return;

    console.log('[Advancement Effect] Flag is true. Calculating next mobile index...');
    setSwipeDirectionForExit(null); // Reset swipe for mobile here

    // Get the ID of the image that was just shown
    const shownImageId = mobileImageList[currentMobileIndex]?.id;
    let nextSeenIds = seenMobileImageIds; // Start with current seen set

    if (shownImageId) {
       // Calculate the next state of seen IDs *before* filtering
       nextSeenIds = new Set(seenMobileImageIds).add(shownImageId);
       console.log(`[Advancement Effect] ID just shown: ${shownImageId}. Next seen count: ${nextSeenIds.size}`);
    } else {
        console.warn('[Advancement Effect] Could not get ID of current mobile image to add to seen set.');
    }

    // --- Mobile Advancement Logic (using nextSeenIds for filtering) ---
    let chosenNextIndex = -1;

    // Filter OUT seen images using the *calculated* next set
    const availableImages = mobileImageList.filter(img => !nextSeenIds.has(img.id));

    console.log(`[Advancement Effect] Filtered List Size (excluding next seen): ${availableImages.length} (Original: ${mobileImageList.length}, Next Seen: ${nextSeenIds.size})`);

    // Update the seen IDs state *after* calculating available images
    if (shownImageId) {
       setSeenMobileImageIds(nextSeenIds);
    }

    if (availableImages.length > 0) {
      const nextImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      const nextIndex = mobileImageList.findIndex(img => img.id === nextImage.id);

      if (nextIndex !== -1) {
        chosenNextIndex = nextIndex;
        console.log(`[Advancement Effect] Selected next mobile index ${chosenNextIndex} (ID: ${nextImage.id}).`);

         // Proactive prefetching if unseen pool is low
        if (availableImages.length <= PREFETCH_THRESHOLD) {
            console.log(`[Advancement Effect] Unseen image pool (${availableImages.length}) low. Fetching ${FETCH_COUNT} more pairs.`);
            for (let i = 0; i < FETCH_COUNT; i++) {
                generateRandomPair(); // Fire and forget
            }
        }

      } else {
        // This case should theoretically not happen if filter/findIndex logic is correct
        console.error('[Advancement Effect] Selected available image not found in original list?');
        // Fallback: Try showing the first image overall?
        chosenNextIndex = 0;
      }
    } else {
      console.warn('[Advancement Effect] No unseen images available in the current mobile list. Fetching more...');
       // Aggressively fetch more images
      for (let i = 0; i < FETCH_COUNT; i++) {
          generateRandomPair(); // Fire and forget
      }
       // Don't advance index yet, wait for new images to load via useEffect [currentPair]
       // If generateRandomPair consistently fails to provide new unique images,
       // we might get stuck showing the last image until reset.
    }

    // Set the calculated index state only if a valid one was found
    // If no unseen images were found, index remains unchanged until new ones load.
    if (chosenNextIndex !== -1) {
         setCurrentMobileIndex(chosenNextIndex);
    }

    // Clear feedback state and reset the flag regardless of finding a new image
    nextPair();
    setNeedsMobileAdvance(false);
    console.log('[Advancement Effect] Advancement attempt complete. Flag reset.');

  // Dependencies need to cover state reads inside the effect and function calls
  }, [needsMobileAdvance, isMobile, mobileImageList, currentMobileIndex, seenMobileImageIds, generateRandomPair, nextPair]);

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
    } else if (!state.showFeedback) { // Stop confetti if feedback disappears before timer
        // setShowConfetti(false); // Maybe not necessary if timer is short
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
      // Use getCurrentMobileImage for mobile check
      if (state.showFeedback || loading || (!currentPair && !getCurrentMobileImage())) {
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
          handleImageSelect(selectedImageId); // Re-use existing function
          // Feedback and next pair handled by handleImageSelect/handleNextPair
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  // Ensure dependencies are correct
  }, [
    isMobile,
    state.showFeedback,
    state.selectedImageId,
    loading,
    currentPair,
    // mobileImageList, // Use getCurrentMobileImage instead
    // currentMobileIndex, // Use getCurrentMobileImage instead
    getShuffledImages,
    // selectImage, // Included via handleImageSelect
    // showFeedback, // Included via handleMobileGuess/handleImageSelect
    handleNextPair, // Still needed for desktop timeout? No, handleImageSelect does it.
    handleMobileGuess,
    handleImageSelect,
    // state.isCorrect // Not directly needed here
  ]);

  // Helper function to get the current image avoiding unnecessary checks later
  const getCurrentMobileImage = useCallback(() => {
    if (isMobile && mobileImageList.length > 0 && currentMobileIndex >= 0 && currentMobileIndex < mobileImageList.length) {
        return mobileImageList[currentMobileIndex];
    }
    return null;
  }, [isMobile, mobileImageList, currentMobileIndex]); // Dependencies for the callback


  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600 text-center">
        Error: {error}
      </div>
    );
  }

  // Show loading only on very first load for mobile OR if list becomes empty while not showing feedback
  const showMobileLoader = isMobile && (loading || mobileImageList.length === 0) && isInitialMobileLoad;
  // const showMobileLoader = isMobile && loading && mobileImageList.length === 0; // Simpler loader condition?


  if (showMobileLoader) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const shuffledImages = getShuffledImages();

  // Mobile image to display - use the memoized helper
  const currentMobileImage = getCurrentMobileImage();

  // Updated Animation variants with custom exit
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
    <div className="max-w-4xl mx-auto relative p-4 flex flex-col overflow-hidden h-full"> {/* Ensure parent takes height */}
      {/* Update Confetti props */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={400} // Increased pieces
          style={{ zIndex: 9999 }} // Ensure it's on top
          gravity={0.15} // Make confetti fall slower
        />
      )}

      {/* Header Text Area - Adjusted Padding */}
      <div className="mb-2 pt-2"> {/* Reduced pt-4 to pt-2 */}
        <h2 className="text-2xl font-medium text-center text-gray-900 mb-1">
          {isMobile ? 'Is this photo Real or AI?' : 'Which is the real photo?'}
        </h2>
        {/* Updated Mobile Instructions - Adjusted Padding */}
        <p className="text-center text-gray-500 mb-4"> {/* Increased mb-3 to mb-4 */}
          {isMobile
            ? 'Swipe or click buttons below'
            : 'Click on the image you think is real.'}
        </p>
      </div>

      {/* Main Content Flex Container */}
      {/* Ensure this container fills remaining space */}
      <div className="flex-grow flex flex-col items-center mb-0 relative min-h-0">
        {isMobile ? (
          // ------------- MOBILE VIEW -------------
          // Ensure this inner container also allows flex-grow for image area
          <div className="flex flex-col items-center flex-grow relative w-full min-h-0">
            {/* Card Stack Area - Removed flex-grow/min-h-0 */}
            <div className="relative w-full max-w-sm aspect-square flex justify-center items-center mb-1"> {/* Removed flex-grow min-h-0 */}
              <AnimatePresence mode="wait" custom={swipeDirectionForExit}>
                {currentMobileImage ? ( // Check if image exists before rendering card
                  <motion.div
                    key={currentMobileImage.id}
                    className="absolute w-full h-full z-10 cursor-grab overflow-hidden rounded-lg" // Removed shadow-md
                    drag="x"
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    style={{ x, rotate, opacity: imageOpacity }} // Apply imageOpacity here
                    onDragEnd={handleDragEnd}
                    variants={imageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={swipeDirectionForExit}
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
                  </motion.div>
                 ) : (
                   // Optional: Placeholder or loader if no image but not initial load
                   !loading && <div className="text-gray-500">Loading image...</div>
                 )}
              </AnimatePresence>

              {/* Interactive Drag Overlays - MOVED OUTSIDE & ABOVE draggable div */}
              <motion.div 
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none rounded-lg"
                style={{ opacity: aiOpacity }} // AI overlay uses aiOpacity (triggered by left drag)
              >
                  <span className="text-white text-5xl font-bold flex flex-col items-center">🤖<span className="text-2xl mt-1">AI?</span></span>
              </motion.div>
              <motion.div 
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-none rounded-lg"
                style={{ opacity: realOpacity }} // Real overlay uses realOpacity (triggered by right drag)
              >
                <span className="text-white text-5xl font-bold flex flex-col items-center">📷<span className="text-2xl mt-1">Real?</span></span>
              </motion.div>

              {/* NEW: AnimatePresence for Inline Feedback Emoji (already correctly positioned) */}
              <AnimatePresence>
                {state.showFeedback && currentMobileImage && ( // Only show feedback if there's an image
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

             {/* Loader - Show only during initial load (handled above) */}
             {/* {(loading && !currentMobileImage && !state.showFeedback && isInitialMobileLoad) && (
                <div className="absolute inset-0 flex justify-center items-center z-40 bg-white/50">
                   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
                </div>
             )} */}

            {/* Mobile Buttons Container - Highlight Correct on Feedback */}
            {/* Ensure buttons don't take unnecessary space initially */}
            <div className="flex-shrink-0 w-full"> {/* Prevent buttons from growing */}
              {currentMobileImage && ( // Only show buttons if there's an image
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }} // Just fade in initially
                  transition={{ duration: 0.2, delay: 0.5 }} // Keep initial delay
                  // Reduced margins
                  className="flex justify-center gap-4 w-full max-w-md mx-auto px-4 mt-2 mb-1" // Added mx-auto
                >
                  {/* Left Button = REAL - Conditionally Fade */}
                  <motion.button
                    onClick={() => handleMobileGuess('real')}
                    disabled={state.showFeedback}
                    animate={{ opacity: state.showFeedback ? (currentMobileImage.isAI ? 0.3 : 1) : 1 }} // Fade if incorrect (AI was correct)
                    transition={{ duration: 0.2 }}
                    // Removed transition duration-150
                    className="flex-grow basis-0 px-5 py-2 text-gray-700 rounded-full border-2 border-gray-200 disabled:opacity-50 text-base flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <span className="text-xl">📷</span> Real
                  </motion.button>
                  {/* Right Button = AI - Conditionally Fade */}
                  <motion.button
                    onClick={() => handleMobileGuess('ai')}
                    disabled={state.showFeedback}
                    animate={{ opacity: state.showFeedback ? (currentMobileImage.isAI ? 1 : 0.3) : 1 }} // Fade if incorrect (Real was correct)
                    transition={{ duration: 0.2 }}
                    // Removed transition duration-150
                    className="flex-grow basis-0 px-5 py-2 text-gray-700 rounded-full border-2 border-gray-200 disabled:opacity-50 text-base flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <span className="text-xl">🤖</span> AI
                  </motion.button>
                </motion.div>
              )}
            </div>

            {/* Score Display (Positioned after buttons) - Reduced Margins */}
            {/* Ensure score display doesn't take unnecessary space */}
             <div className="w-full flex justify-center mt-1 mb-0 flex-shrink-0"> {/* Prevent score from growing */}
                <ScoreDisplay
                  score={state.score}
                  totalAttempts={state.totalAttempts}
                  onReset={handleResetGame} // Use the new reset handler
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
                    onSelect={() => handleImageSelect(image.id)} // Use handleImageSelect
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
                  onReset={handleResetGame} // Use new reset handler
                />
              </div>
          </div>
        )}
      </div>

      {/* Feedback Button Area - HIDE on Mobile */}
      {/* Ensure this doesn't take space on mobile */}
      <div className={`w-full flex justify-center ${isMobile ? 'flex-shrink-0' : ''}`}>
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