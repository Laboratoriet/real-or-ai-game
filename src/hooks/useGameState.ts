import { useReducer } from 'react';
import { GameState, GameAction, FilterCategory } from '../types';

const initialState: Omit<GameState, 'currentCategory'> = {
  score: 0,
  totalAttempts: 0,
  selectedImageId: null,
  isCorrect: null,
  showFeedback: false,
  correctStreak: 0,
  selectedCategory: 'people',
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SELECT_IMAGE':
      return {
        ...state,
        selectedImageId: action.payload,
      };
    case 'SHOW_FEEDBACK': {
      const isCorrect = action.payload;
      const newStreak = isCorrect ? state.correctStreak + 1 : 0;
      return {
        ...state,
        showFeedback: true,
        isCorrect: isCorrect,
        score: isCorrect ? state.score + 1 : state.score,
        totalAttempts: state.totalAttempts + 1,
        correctStreak: newStreak,
      };
    }
    case 'NEXT_PAIR':
      return {
        ...state,
        selectedImageId: null,
        showFeedback: false,
        isCorrect: null,
      };
    case 'RESET_GAME':
      return {
        ...initialState,
        correctStreak: 0,
      } as GameState;
    case 'SET_CATEGORY':
      return {
        ...state,
        selectedCategory: action.payload,
      };
    default:
      return state;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState as GameState);

  const selectImage = (imageId: string) => {
    dispatch({ type: 'SELECT_IMAGE', payload: imageId });
  };

  const showFeedback = (isCorrect: boolean) => {
    dispatch({ type: 'SHOW_FEEDBACK', payload: isCorrect });
  };

  const nextPair = () => {
    dispatch({ type: 'NEXT_PAIR' });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const setCategory = (category: FilterCategory) => {
    dispatch({ type: 'SET_CATEGORY', payload: category });
  };

  return {
    state,
    selectImage,
    showFeedback,
    nextPair,
    resetGame,
    setCategory,
  };
};
