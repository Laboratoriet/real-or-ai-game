import { Category, Image } from '../types';

// Use Vite's import.meta.glob to find all image files at build time
// Now only looking for .jpg files in the main category/type directories.
const allImageFiles = import.meta.glob('/public/images/*/*/*.jpg');

// Object to cache generated image lists by category
const categoryImageCache: Partial<Record<Category, { real: Image[], ai: Image[] }>> = {};

// Determine available categories and populate cache simultaneously
const availableCategoriesSet = new Set<Category>();

for (const path in allImageFiles) {
  // Example path could be: /public/images/people/real/1.jpg
  // OR it could incorrectly pick up /public/images/people/real/lqip/1.jpg if not filtered

  const parts = path.split('/');
  // parts for /public/images/people/real/1.jpg => ['', 'public', 'images', 'people', 'real', '1.jpg'] (length 6)
  // parts for /public/images/people/real/lqip/1.jpg => ['', 'public', 'images', 'people', 'real', 'lqip', '1.jpg'] (length 7)

  // Filter out paths that are within an 'lqip' subfolder
  if (parts.length > 6 && parts[parts.length - 2].toLowerCase() === 'lqip') {
    // This is an LQIP file itself, skip it as a main image
    continue;
  }

  if (parts.length >= 6) { // Should be true for main images like /public/images/category/type/filename.jpg
    const category = parts[3] as Category;
    const type = parts[4]; // 'real' or 'ai'

    // Initialize cache for this category if first time seeing it
    if (!categoryImageCache[category]) {
      categoryImageCache[category] = { real: [], ai: [] };
    }

    // Now we know categoryImageCache[category] is defined
    const cacheEntry = categoryImageCache[category]!;

    const filenameWithExtension = path.split('/').pop();
    let index: number | string | undefined = undefined;
    let lqipSrc: string | undefined = undefined;

    if (filenameWithExtension) {
        // Original filename is now always .jpg
        const filenameWithoutExtension = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf('.'));
        
        // Construct LQIP source path, e.g., /images/category/type/lqip/filename.jpg
        const basePathForLqip = path.substring(0, path.lastIndexOf('/') + 1).replace('/public', '');
        lqipSrc = `${basePathForLqip}lqip/${filenameWithoutExtension}.jpg`;

        const fileIndexMatch = filenameWithoutExtension.match(/^(\d+)$/); // Match if filename IS a number
        if (fileIndexMatch && fileIndexMatch[1]) {
             index = parseInt(fileIndexMatch[1], 10);
        } else {
            // Fallback if no numeric prefix is found, use the filename without extension
            index = filenameWithoutExtension;
        }
    } else {
        // Fallback if filename couldn't be extracted (shouldn't happen with glob pattern)
        index = 'unknown';
    }

    const image: Image = {
      id: `${type}-${category}-${index}`,
      src: path.replace('/public', ''),
      lqipSrc: lqipSrc,
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

// --- NEW FUNCTION ---
// Helper to shuffle an array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

/**
 * Gathers all unique images from all categories stored in the cache.
 * @returns A shuffled array of unique Image objects.
 */
export const getAllUniqueImages = (): Image[] => {
  const allImages: Image[] = [];
  const seenIds = new Set<string>();

  for (const category in categoryImageCache) {
    const entry = categoryImageCache[category as Category];
    if (entry) {
      // Add real images, checking for duplicates
      entry.real.forEach(image => {
        if (!seenIds.has(image.id)) {
          allImages.push(image);
          seenIds.add(image.id);
        }
      });
      // Add AI images, checking for duplicates
      entry.ai.forEach(image => {
        if (!seenIds.has(image.id)) {
          allImages.push(image);
          seenIds.add(image.id);
        }
      });
    }
  }
  console.log(`[getAllUniqueImages] Found ${allImages.length} unique images across all categories.`);
  return shuffleArray(allImages);
};