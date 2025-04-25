import React from 'react';
import { ImageIcon } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-100 py-4 px-6">
      <div className="container mx-auto flex items-center justify-between">
        <a href="https://alkemist.no" target="_blank" rel="noopener noreferrer" aria-label="Alkemist Homepage">
          <img src="/alkemist-logo/Alkemist-logo.svg" alt="Alkemist Logo" className="h-6" />
        </a>
        <div className="flex items-center space-x-2">
          <ImageIcon className="h-6 w-6 text-gray-700" />
          <h1 className="text-xl font-medium text-gray-700">Real or AI?</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;