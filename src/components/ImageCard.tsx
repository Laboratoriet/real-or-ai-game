import React, { useState, useEffect, useRef } from 'react';
import { Image } from '../types';

interface ImageCardProps {
  image: Image;
  selected: boolean;
  showResult: boolean;
  isCorrect: boolean | null;
  onSelect: (id: string) => void;
  disabled: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  selected,
  showResult,
  isCorrect,
  onSelect,
  disabled,
}) => {
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset loaded state when image src changes
    setIsFullImageLoaded(false);

    if (image.src) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      fetch(image.src)
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          setObjectUrl(url);
          setIsFullImageLoaded(true);
        })
        .catch(() => {
          setIsFullImageLoaded(true);
        });
    }
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [image.src]);

  const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const placeholderSrc = image.lqipSrc || transparentPlaceholder;
  const displaySrc = objectUrl || placeholderSrc;
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
        alt="Game image"
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
