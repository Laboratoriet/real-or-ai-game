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
    <div className="flex items-center justify-center gap-8 py-4">
      <div className="text-center">
        <div className="text-3xl font-medium text-gray-900">{score}</div>
        <div className="text-sm text-gray-500">Correct</div>
      </div>
      
      <div className="text-center">
        <div className="text-3xl font-medium text-gray-900">{percentage}%</div>
        <div className="text-sm text-gray-500">Accuracy</div>
      </div>
      
      <button
        onClick={onReset}
        className="text-gray-500 hover:text-gray-700"
        aria-label="Reset score"
      >
        <RefreshCwIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ScoreDisplay;