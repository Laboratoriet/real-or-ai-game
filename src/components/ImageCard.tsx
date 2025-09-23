import React, { useState, useEffect } from 'react';
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
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset loaded state when image src changes
    setIsFullImageLoaded(false);

    if (image.src) {
      // Fetch the image and create a blob URL to hide original path
      fetch(image.src)
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setObjectUrl(url);
          setIsFullImageLoaded(true);
        })
        .catch(() => {
          setIsFullImageLoaded(true);
        });
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.src]);

  const displaySrc = image.lqipSrc && !isFullImageLoaded ? image.lqipSrc : (objectUrl || image.src);
  const blurClass = image.lqipSrc && !isFullImageLoaded ? 'blur-md' : '';

  return (
    <div
      className={`relative overflow-hidden rounded-lg transition-all duration-300 ${ 
        'hover:opacity-90'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onSelect(image.id)}
    >
      
      <img
        src={displaySrc}
        alt={`${image.isAI ? 'AI-generated' : 'Real'} ${image.category} image`}
        className={`w-full aspect-square object-cover transition-all duration-300 ${blurClass}`}
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
