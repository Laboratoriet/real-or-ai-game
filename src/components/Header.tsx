import React, { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

function useWindowSize() {
  const [size, setSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : MOBILE_BREAKPOINT, height: typeof window !== 'undefined' ? window.innerHeight : 800 });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

const Header: React.FC = () => {
  const { width } = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

  if (isMobile) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-100 py-2 px-6">
      <div className="container mx-auto flex items-center justify-between">
        <a href="https://alkemist.no" target="_blank" rel="noopener noreferrer" aria-label="Alkemist Homepage">
          <img src="/alkemist-logo/Alkemist-logo.svg" alt="Alkemist Logo" className="h-4" />
        </a>
        <div className="flex items-center space-x-1.5">
          <img src="/realorai.png" alt="Icon" className="h-6 w-auto" />
          <h1 className="text-lg font-medium text-gray-700">Real or AI?</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
