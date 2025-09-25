import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterCategory } from '../types';

interface CategoryFilterProps {
  selectedCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  isMobile?: boolean;
}

const categoryLabels: Record<FilterCategory, string> = {
  all: 'All',
  people: 'People',
  nature: 'Nature',
  city: 'City',
  interior: 'Interior',
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  isMobile = false,
}) => {
  const categories: FilterCategory[] = ['all', 'people', 'nature', 'city', 'interior'];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (isMobile) {
    return (
      <div className="w-full max-w-xs mx-auto mb-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-3 py-2 text-sm text-gray-700 bg-transparent focus:outline-none flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {/* simple grid icon */}
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="font-medium">{categoryLabels[selectedCategory]}</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      onCategoryChange(category);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md ${
                      selectedCategory === category ? 'font-bold text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {category === 'all' && (<svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/></svg>)}
                      {category === 'people' && (<svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3"/><path d="M2 21c1.5-4 6-6 10-4"/></svg>)}
                      {category === 'nature' && (<svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20"/><path d="M7 12c3-2 7-2 10 0"/></svg>)}
                      {category === 'city' && (<svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="7" width="6" height="13"/><rect x="13" y="3" width="8" height="17"/></svg>)}
                      {category === 'interior' && (<svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18"/><rect x="4" y="10" width="16" height="7"/></svg>)}
                      <span>{categoryLabels[category]}</span>
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto mb-6">
      <div className="flex justify-center gap-6">
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => { onCategoryChange(category); }}
              className={`text-sm transition-all duration-200 hover:text-gray-900 ${
                isSelected
                  ? 'font-bold text-gray-900 underline decoration-2 underline-offset-2'
                  : 'text-gray-500'
              }`}
            >
              {categoryLabels[category]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
