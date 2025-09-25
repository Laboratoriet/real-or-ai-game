import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, Users, Leaf, Building, Armchair } from 'lucide-react';
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
              {selectedCategory === 'all' && (<Grid className="w-4 h-4 text-gray-500" />)}
              {selectedCategory === 'people' && (<Users className="w-4 h-4 text-gray-500" />)}
              {selectedCategory === 'nature' && (<Leaf className="w-4 h-4 text-gray-500" />)}
              {selectedCategory === 'city' && (<Building className="w-4 h-4 text-gray-500" />)}
              {selectedCategory === 'interior' && (<Armchair className="w-4 h-4 text-gray-500" />)}
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
                      {category === 'all' && (<Grid className="w-4 h-4 text-gray-500" />)}
                      {category === 'people' && (<Users className="w-4 h-4 text-gray-500" />)}
                      {category === 'nature' && (<Leaf className="w-4 h-4 text-gray-500" />)}
                      {category === 'city' && (<Building className="w-4 h-4 text-gray-500" />)}
                      {category === 'interior' && (<Armchair className="w-4 h-4 text-gray-500" />)}
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
