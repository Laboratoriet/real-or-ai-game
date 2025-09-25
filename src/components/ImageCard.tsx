import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn } from 'lucide-react';
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
  const [showLightbox, setShowLightbox] = useState(false);
  const imgFullRef = useRef<HTMLImageElement>(null);

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

  // Lock body scroll when lightbox is shown
  useEffect(() => {
    const original = document.body.style.overflow;
    if (showLightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = original;
    }
    return () => { document.body.style.overflow = original; };
  }, [showLightbox]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg transition-all duration-300 ${ 
        'hover:opacity-90'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={(e) => {
        if (showLightbox) return; // ignore clicks when lightbox open
        if ((e.target as HTMLElement).closest('[data-zoom-button]')) return; // ignore when clicking zoom button
        if (!disabled) onSelect(image.id);
      }}
    >
      
      <img
        src={displaySrc}
        alt="Game image"
        className={`w-full aspect-square object-cover transition-all duration-300 ${blurClass}`}
        loading="lazy"
      />

      {/* Zoom button */}
      <button
        type="button"
        data-zoom-button
        onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
        className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full bg-white/85 backdrop-blur border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white shadow-sm"
        aria-label="Open fullscreen"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      
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

      {/* Lightbox fullscreen overlay */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <img ref={imgFullRef} src={image.src} alt="Full image" className="max-h-[95vh] max-w-[95vw] object-contain" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            className="absolute top-4 right-4 text-white/90 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageCard;
