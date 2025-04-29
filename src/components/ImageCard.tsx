import React from 'react';
import { Image } from '../types';

interface ImageCardProps {
  image: Image;
  index: number;
  selected: boolean;
  showResult: boolean;
  isCorrect: boolean | null;
  onSelect: (id: string) => void;
  disabled: boolean;
  isMobileView?: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  index,
  selected,
  showResult,
  isCorrect,
  onSelect,
  disabled,
  isMobileView,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg transition-all duration-300 ${ 
        'hover:opacity-90'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onSelect(image.id)}
    >
      {!isMobileView && (
        <div className="absolute top-3 left-3 bg-white text-gray-900 font-medium text-sm px-3 py-1 rounded-full shadow-sm z-10">
          {index === 0 ? 'A' : 'B'}
        </div>
      )}
      
      <img
        src={image.src}
        alt={`${image.isAI ? 'AI-generated' : 'Real'} ${image.category} image`}
        className="w-full aspect-square object-cover"
        loading="lazy"
      />
      
      {showResult && selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-4xl">
          {isCorrect ? '✅' : '❌'}
        </div>
      )}
      
      {showResult && !selected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 text-gray-800 opacity-80 p-2">
          {image.isAI ? (
            <>
              <span className="text-3xl">🤖</span>
              <span className="text-sm font-medium mt-1">AI</span>
            </>
          ) : (
            <span className="text-lg font-medium">Real</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageCard;