import { useState, useEffect, useRef, useCallback } from 'react';
import { ImagePair, Image, Category } from '../types';
import { getCategoryImages, availableCategories } from '../data/images';

const RECENT_HISTORY_LENGTH = 50; // Keep history length

export const useImagePair = () => {
  const [currentPair, setCurrentPair] = useState<ImagePair | null>(null);
  const [loading, setLoading] = useState(true);
  const [shuffledImages, setShuffledImages] = useState<Image[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Use a single ref for combined history
  const recentlyUsedIds = useRef<string[]>([]);

  // --- Wrap generateRandomPair in useCallback ---
  const generateRandomPair = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Check for available categories (dependency)
    if (availableCategories.length === 0) {
      console.error('No categories with images found in public/images/');
      setError('No image categories available. Add images to public/images/');
      setLoading(false);
      setCurrentPair(null);
      setShuffledImages([]);
      return;
    }
    
    // --- Select a category, biasing towards 'people' ---
    let chosenCategory: Category;
    const peopleWeight = 3; // How many extra times to weigh 'people'
    
    // Depends on availableCategories
    if (availableCategories.includes('people') && availableCategories.length > 1) {
      const weightedList = availableCategories.reduce((acc, category) => {
        const weight = (category === 'people') ? peopleWeight : 1;
        for (let i = 0; i < weight; i++) {
          acc.push(category);
        }
        return acc;
      }, [] as Category[]);
      chosenCategory = weightedList[Math.floor(Math.random() * weightedList.length)];
    } else {
      chosenCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    }
    
    console.log('[Category Choice] Chosen:', chosenCategory);

    // Depends on getCategoryImages (stable import) and chosenCategory
    const { real, ai } = getCategoryImages(chosenCategory);
    
    if (real.length === 0 || ai.length === 0) {
      console.error('Data mismatch: No images found via getCategoryImages for available category:', chosenCategory);
      setError('Error fetching image data.');
      setLoading(false);
      return;
    }
    
    // --- Select random real image, avoiding recent ones --- 
    let randomRealImage: Image;
    let attempts = 0;
    const maxAttempts = 20; 
    do {
      randomRealImage = real[Math.floor(Math.random() * real.length)];
      attempts++;
    } while (
      recentlyUsedIds.current.includes(randomRealImage.id) && 
      attempts < maxAttempts 
    );

    // --- Select random AI image, avoiding recent ones --- 
    let randomAiImage: Image;
    attempts = 0; 
    do {
      randomAiImage = ai[Math.floor(Math.random() * ai.length)];
      attempts++;
    } while (
      recentlyUsedIds.current.includes(randomAiImage.id) || 
      (randomAiImage.id === randomRealImage.id && ai.length > 1) && 
      attempts < maxAttempts
    );
    
    const pair: ImagePair = {
      realImage: randomRealImage,
      aiImage: randomAiImage,
      category: chosenCategory,
    };
    
    setCurrentPair(pair);
    setShuffledImages([pair.realImage, pair.aiImage].sort(() => Math.random() - 0.5));

    // Update combined history ref
    recentlyUsedIds.current = 
        [pair.realImage.id, pair.aiImage.id, ...recentlyUsedIds.current]
        .slice(0, RECENT_HISTORY_LENGTH);

    console.log('[History] Combined:', recentlyUsedIds.current);

    setLoading(false);
  // Dependencies: availableCategories is stable after module load, getCategoryImages is stable.
  // State setters are stable. useRef is stable. Logic depends only on these.
  }, []); 

  useEffect(() => {
    // generateRandomPair is now stable
    generateRandomPair();
  }, [generateRandomPair]); // Dependency array includes the stable callback

  // --- Wrap getShuffledImages in useCallback ---
  const getShuffledImages = useCallback((): Image[] => {
    return shuffledImages;
  }, [shuffledImages]); // Depends on shuffledImages state

  return {
    currentPair,
    loading,
    error,
    generateRandomPair,
    getShuffledImages,
  };
};