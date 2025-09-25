import React from 'react';
import { RefreshCwIcon } from 'lucide-react';

interface ScoreDisplayProps {
  score: number;
  totalAttempts: number;
  onReset: () => void;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, totalAttempts, onReset }) => {
  const percentage = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;
  
  return (
    <div className="flex items-center justify-center gap-6 md:gap-8 py-3 px-4">
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-medium text-gray-900">{score}/10</div>
        <div className="text-sm md:text-base text-gray-600 font-medium">Correct</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-medium text-gray-900">{percentage}%</div>
        <div className="text-sm md:text-base text-gray-600 font-medium">Accuracy</div>
      </div>
      
      <button
        onClick={onReset}
        className="text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Reset score"
      >
        <RefreshCwIcon className="h-6 w-6" />
      </button>
    </div>
  );
};

export default ScoreDisplay;
