import React, { useState, useEffect } from 'react';

interface FeedbackProps {
  isCorrect: boolean | null;
  onNext: () => void;
}

const Feedback: React.FC<FeedbackProps> = ({ isCorrect, onNext }) => {
  const [animate, setAnimate] = useState(false);

  // Trigger animation slightly after mount to ensure transition works
  useEffect(() => {
    if (isCorrect !== null) {
      // Use a tiny timeout to allow the element to render before starting transition
      const timer = setTimeout(() => setAnimate(true), 10); 
      return () => {
        clearTimeout(timer);
        setAnimate(false); // Reset animation state on cleanup/hide
      };
    } else {
      setAnimate(false);
    }
  }, [isCorrect]);

  if (isCorrect === null) return null;

  return (
    <div className="text-center">
      <button
        onClick={onNext} // Allow manual click, which now also clears the timer via handleNextPair
        className="relative px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors overflow-hidden"
        // Ensure button is relative and clips the animation
      >
        {/* Animated background */}
        <div
          className={`absolute top-0 left-0 h-full bg-gray-600 transition-width duration-[3000ms] ease-linear ${
            animate ? 'w-full' : 'w-0' // Animate width based on state
          }`}
        />
        {/* Button Text (ensure it's above the animation) */}
        <span className="relative z-10">Next Pair</span>
      </button>
    </div>
  );
};

export default Feedback;