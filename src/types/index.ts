export type Category = 'people' | 'nature' | 'city' | 'interior';
export type FilterCategory = Category | 'all';

export interface Image {
  id: string;
  src: string;
  lqipSrc?: string; // Low-Quality Image Placeholder
  category: Category;
  isAI: boolean;
}

export interface ImagePair {
  realImage: Image;
  aiImage: Image;
  category: Category;
}

export interface GameState {
  score: number;
  totalAttempts: number;
  selectedImageId: string | null;
  isCorrect: boolean | null;
  showFeedback: boolean;
  correctStreak: number;
  selectedCategory: FilterCategory;
  showSummary: boolean;
}

export type GameAction =
  | { type: 'SELECT_IMAGE'; payload: string }
  | { type: 'SHOW_FEEDBACK'; payload: boolean }
  | { type: 'NEXT_PAIR' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_CATEGORY'; payload: FilterCategory }
  | { type: 'SHOW_SUMMARY' }
  | { type: 'HIDE_SUMMARY' };
