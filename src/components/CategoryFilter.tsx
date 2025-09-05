import React from 'react';
import { motion } from 'framer-motion';
import { FilterCategory } from '../types';

interface CategoryFilterProps {
  selectedCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  isMobile?: boolean;
}

const categoryLabels: Record<FilterCategory, { label: string; emoji: string }> = {
  all: { label: 'All', emoji: '🎯' },
  people: { label: 'People', emoji: '👥' },
  nature: { label: 'Nature', emoji: '🌿' },
  city: { label: 'City', emoji: '🏙️' },
  interior: { label: 'Interior', emoji: '🏠' },
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  isMobile = false,
}) => {
  const categories: FilterCategory[] = ['all', 'people', 'nature', 'city', 'interior'];

  if (isMobile) {
    return (
      <div className="w-full max-w-md mx-auto px-4 mb-4">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <motion.button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.95 }}
                initial={false}
                animate={{
                  scale: isSelected ? 1.02 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <span className="mr-2">{categoryLabels[category].emoji}</span>
                {categoryLabels[category].label}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <motion.button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-6 py-3 rounded-full text-base font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={false}
              animate={{
                scale: isSelected ? 1.05 : 1,
                boxShadow: isSelected ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              }}
              transition={{ duration: 0.2 }}
            >
              <span className="mr-2">{categoryLabels[category].emoji}</span>
              {categoryLabels[category].label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
