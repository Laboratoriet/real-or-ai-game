import { Category, Image } from '../types';

// Use Vite's import.meta.glob to find all image files at build time
// Include common image extensions. Add others if needed.
const allImageFiles = import.meta.glob('/public/images/*/*/*.{jpg,jpeg,png,webp,gif}');

// Object to cache generated image lists by category
const categoryImageCache: Partial<Record<Category, { real: Image[], ai: Image[] }>> = {};

// Determine available categories and populate cache simultaneously
const availableCategoriesSet = new Set<Category>();

for (const path in allImageFiles) {
  // Example path: /public/images/people/real/1.jpg
  const parts = path.split('/');
  if (parts.length >= 6) {
    const category = parts[3] as Category;
    const type = parts[4]; // 'real' or 'ai'

    // Initialize cache for this category if first time seeing it
    if (!categoryImageCache[category]) {
      categoryImageCache[category] = { real: [], ai: [] };
    }

    // Now we know categoryImageCache[category] is defined
    const cacheEntry = categoryImageCache[category]!;

    const filename = path.split('/').pop(); // Get the filename like "1.jpg"
    let index: number | string | undefined = undefined;

    if (filename) {
        const fileIndexMatch = filename.match(/^(\\d+)\\./); // Match digits at the start of the filename
        if (fileIndexMatch && fileIndexMatch[1]) {
             index = parseInt(fileIndexMatch[1], 10);
        } else {
            // Fallback if no numeric prefix is found, use the filename without extension
            index = filename.substring(0, filename.lastIndexOf('.')) || filename;
        }
    } else {
        // Fallback if filename couldn't be extracted (shouldn't happen with glob pattern)
        index = 'unknown';
    }

    const image: Image = {
      id: `${type}-${category}-${index}`, // Use the extracted index or fallback string
      src: path.replace('/public', ''),
      category: category,
      isAI: type === 'ai',
    };

    if (type === 'real') {
      cacheEntry.real.push(image);
    } else if (type === 'ai') {
      cacheEntry.ai.push(image);
    }
  }
}

// Now determine available categories based on the populated cache
for (const cat in categoryImageCache) {
  const category = cat as Category;
  const entry = categoryImageCache[category]; // Get the entry
  // Check if the entry exists and has both real and AI images
  if (entry && entry.real.length > 0 && entry.ai.length > 0) {
    availableCategoriesSet.add(category);
  }
}

export const availableCategories: Category[] = Array.from(availableCategoriesSet);

// getCategoryImages now simply returns the cached & dynamically generated lists
export const getCategoryImages = (category: Category): { real: Image[], ai: Image[] } => {
  if (availableCategories.includes(category) && categoryImageCache[category]) {
    return categoryImageCache[category];
  } else {
    console.warn(`getCategoryImages called for unavailable or empty category: ${category}`);
    return { real: [], ai: [] }; // Return empty arrays if category not truly available
  }
};