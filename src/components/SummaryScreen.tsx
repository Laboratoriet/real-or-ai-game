import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilterCategory } from '../types';

interface SummaryScreenProps {
  score: number;
  totalAttempts: number;
  category: FilterCategory;
  onPlayAgain: () => void;
  onCategoryChange: (category: FilterCategory) => void;
  isMobile?: boolean;
}

interface DynamicFeedback {
  title: string;
  message: string;
  tip: string;
  emoji: string;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({
  score,
  totalAttempts,
  category,
  onPlayAgain,
  onCategoryChange,
  isMobile = false,
}) => {
  const [feedback, setFeedback] = useState<DynamicFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCardPreview, setShowCardPreview] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [generatedCardBlob, setGeneratedCardBlob] = useState<Blob | null>(null);

  const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;

  // Generate dynamic feedback based on score
  useEffect(() => {
    const generateFeedback = async () => {
      setLoading(true);
      
      // For now, we'll use static feedback based on score ranges
      // Later we can integrate with an LLM API
      const feedbackData = getStaticFeedback(accuracy, category);
      setFeedback(feedbackData);
      setLoading(false);
    };

    generateFeedback();
  }, [accuracy, category]);

  const getStaticFeedback = (accuracy: number, category: FilterCategory): DynamicFeedback => {
    if (accuracy >= 90) {
      return {
        title: "AI Detection Master! 🎯",
        message: "You're practically a human lie detector! Your ability to spot AI-generated content is exceptional.",
        tip: "Try switching to a different category to test your skills across various image types.",
        emoji: "🏆"
      };
    } else if (accuracy >= 80) {
      return {
        title: "Sharp Eye! 👁️",
        message: "Great job! You have a keen eye for spotting the subtle differences between real and AI-generated images.",
        tip: "Challenge yourself with a new category to expand your detection skills.",
        emoji: "🎉"
      };
    } else if (accuracy >= 70) {
      return {
        title: "Getting There! 📈",
        message: "Not bad! You're developing a good sense for AI-generated content, but there's room to improve.",
        tip: "Pay attention to lighting inconsistencies and unnatural details in AI images.",
        emoji: "👍"
      };
    } else if (accuracy >= 60) {
      return {
        title: "Learning! 🧠",
        message: "You're on the right track! AI detection takes practice - keep observing the details.",
        tip: "Look for overly perfect compositions and unnatural textures in AI-generated images.",
        emoji: "💡"
      };
    } else {
      return {
        title: "Keep Practicing! 🌱",
        message: "Don't worry, AI detection is tricky! The more you practice, the better you'll get.",
        tip: "Focus on facial features, hand details, and background consistency - these are often AI giveaways.",
        emoji: "🌱"
      };
    }
  };

  const generateShareableCard = async () => {
    try {
      // Create a canvas element for the shareable card
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fallbackShare();
        return;
      }

      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;

      // Get a random AI image
      const aiImages = [
        '/images/people/ai/1.jpg', '/images/people/ai/2.jpg', '/images/people/ai/3.jpg',
        '/images/nature/ai/1.jpg', '/images/nature/ai/2.jpg', '/images/nature/ai/3.jpg',
        '/images/city/ai/1.jpg', '/images/city/ai/2.jpg', '/images/city/ai/3.jpg',
        '/images/interior/ai/1.jpg', '/images/interior/ai/2.jpg', '/images/interior/ai/3.jpg'
      ];
      const randomImage = aiImages[Math.floor(Math.random() * aiImages.length)];

      // Load the background image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = randomImage;
      });

      // Draw the background image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Add dark overlay for better text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add glassmorphism card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
      
      // Add border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      // Load and draw the logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = '/realorai.svg';
      });

      // Draw logo at the top
      const logoSize = 60;
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = 80;
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

      // Add text with improved font sizes
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      
      // Title (smaller, more elegant)
      ctx.font = 'bold 32px Arial';
      ctx.fillText('Real or AI?', canvas.width / 2, 180);
      
      // Score (larger, more prominent)
      ctx.font = 'bold 84px Arial';
      ctx.fillText(`${score}/${totalAttempts}`, canvas.width / 2, 280);
      
      // Accuracy (medium size)
      ctx.font = '42px Arial';
      ctx.fillText(`${accuracy}% Accuracy`, canvas.width / 2, 330);
      
      // Feedback (smaller, more readable)
      ctx.font = 'bold 28px Arial';
      ctx.fillText(feedback.title.replace(feedback.emoji, '').trim(), canvas.width / 2, 380);
      
      // Challenge text (smaller)
      ctx.font = '22px Arial';
      ctx.fillText('Can you beat my score?', canvas.width / 2, 420);
      
      // URL (smaller)
      ctx.font = '18px Arial';
      ctx.fillText('alkemist.no/realorai', canvas.width / 2, 480);

      // Convert to blob and share
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'real-or-ai-score.png', { type: 'image/png' });
          
          // Check if we can share files (mobile)
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'My Real or AI Score!',
                text: `I scored ${score}/${totalAttempts} (${accuracy}%) on Real or AI? Can you beat my score? 🎯`,
                files: [file],
              });
              return;
            } catch (err) {
              console.log('Error sharing image:', err);
            }
          }
          
          // For desktop, just download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'real-or-ai-score.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          fallbackShare();
        }
      }, 'image/png');
    } catch (error) {
      console.log('Error generating shareable card:', error);
      fallbackShare();
    }
  };

  const fallbackShare = async () => {
    const shareText = `I just scored ${score}/${totalAttempts} (${accuracy}%) on Real or AI? Can you beat my score? 🎯`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Real or AI? Game',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert('Score copied to clipboard!');
      } catch (err) {
        console.log('Error copying to clipboard:', err);
      }
    }
  };

  const handleShare = async () => {
    // First generate and show the card preview
    await generateCardPreview();
    // Then proceed with sharing
    await generateShareableCard();
  };

  const shareToPlatform = async (platform: string) => {
    if (!generatedCardBlob) return;

    const shareText = `I scored ${score}/${totalAttempts} (${accuracy}%) on Real or AI? Can you beat my score? 🎯`;
    const shareUrl = window.location.origin;

    switch (platform) {
      case 'link':
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          alert('Link copied to clipboard!');
        } catch (err) {
          console.log('Error copying to clipboard:', err);
        }
        break;
      
      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
        break;
      
      case 'pinterest':
        const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}`;
        window.open(pinterestUrl, '_blank');
        break;
      
      case 'facebook':
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(facebookUrl, '_blank');
        break;
      
      case 'linkedin':
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Real or AI? Game')}&summary=${encodeURIComponent(shareText)}`;
        window.open(linkedinUrl, '_blank');
        break;
      
      case 'download':
        const url = URL.createObjectURL(generatedCardBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'real-or-ai-score.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
    }
  };

  const generateCardPreview = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 800;
      canvas.height = 600;

      // Get a random AI image
      const aiImages = [
        '/images/people/ai/1.jpg', '/images/people/ai/2.jpg', '/images/people/ai/3.jpg',
        '/images/nature/ai/1.jpg', '/images/nature/ai/2.jpg', '/images/nature/ai/3.jpg',
        '/images/city/ai/1.jpg', '/images/city/ai/2.jpg', '/images/city/ai/3.jpg',
        '/images/interior/ai/1.jpg', '/images/interior/ai/2.jpg', '/images/interior/ai/3.jpg'
      ];
      const randomImage = aiImages[Math.floor(Math.random() * aiImages.length)];

      // Load the background image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = randomImage;
      });

      // Draw the background image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Add dark overlay for better text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add glassmorphism card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
      
      // Add border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      // Load and draw the logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = '/realorai.svg';
      });

      // Draw logo at the top
      const logoSize = 60;
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = 80;
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

      // Add text with improved font sizes
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      
      // Title (smaller, more elegant)
      ctx.font = 'bold 32px Arial';
      ctx.fillText('Real or AI?', canvas.width / 2, 180);
      
      // Score (larger, more prominent)
      ctx.font = 'bold 84px Arial';
      ctx.fillText(`${score}/${totalAttempts}`, canvas.width / 2, 280);
      
      // Accuracy (medium size)
      ctx.font = '42px Arial';
      ctx.fillText(`${accuracy}% Accuracy`, canvas.width / 2, 330);
      
      // Feedback (smaller, more readable)
      ctx.font = 'bold 28px Arial';
      ctx.fillText(feedback?.title.replace(feedback?.emoji, '').trim() || '', canvas.width / 2, 380);
      
      // Challenge text (smaller)
      ctx.font = '22px Arial';
      ctx.fillText('Can you beat my score?', canvas.width / 2, 420);
      
      // URL (smaller)
      ctx.font = '18px Arial';
      ctx.fillText('alkemist.no/realorai', canvas.width / 2, 480);

      // Convert to data URL for preview and blob for sharing
      const dataUrl = canvas.toDataURL('image/png');
      canvas.toBlob((blob) => {
        if (blob) {
          setGeneratedCardBlob(blob);
        }
      }, 'image/png');
      setCardImageUrl(dataUrl);
      setShowCardPreview(true);
    } catch (error) {
      console.log('Error generating card preview:', error);
    }
  };

  const categories: FilterCategory[] = ['all', 'people', 'nature', 'city', 'interior'];
  const otherCategories = categories.filter(cat => cat !== category);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Generating your results...</p>
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className="w-full h-full flex flex-col justify-between p-8">
      {/* Logo */}
      <div className="flex justify-center">
        <a href="https://alkemist.no/realorai" target="_blank" rel="noopener noreferrer">
          <img src="/realorai.svg" alt="Real or AI Logo" className="h-8 w-auto" />
        </a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl mx-auto text-center"
      >
      {/* Score Display */}
      <div className="mb-8">
        <div className="text-6xl mb-4">{feedback.emoji}</div>
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {score}/{totalAttempts}
        </div>
        <div className="text-xl text-gray-600 mb-4">
          {accuracy}% Accuracy
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{feedback.title.replace(feedback.emoji, '').trim()}</h1>
      </div>

      {/* Feedback Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          {feedback.message}
        </p>
        <p className="text-base text-gray-600 italic">
          💡 {feedback.tip}
        </p>
      </motion.div>

      {/* Category Suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Try a different category:
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {otherCategories.slice(0, 3).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={handleShare}
          className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          Share Score
        </button>
      </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="flex justify-center">
        <p className="text-sm text-gray-500">
          Made with ❤️ by <a href="https://alkemist.no" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900">Alkemist</a>
        </p>
      </div>

      {/* Card Preview Modal */}
      {showCardPreview && cardImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">🎉 Your Epic Score Card!</h3>
              <button
                onClick={() => setShowCardPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-6">
              <img 
                src={cardImageUrl} 
                alt="Shareable score card" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Look at this beauty! 🎨 Share your AI detection skills with the world!
            </p>
            
            {/* Platform Sharing Icons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => shareToPlatform('link')}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs text-gray-600">Link</span>
              </button>
              
              <button
                onClick={() => shareToPlatform('twitter')}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-xs text-gray-600">X</span>
              </button>
              
              <button
                onClick={() => shareToPlatform('pinterest')}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                </svg>
                <span className="text-xs text-gray-600">Pinterest</span>
              </button>
              
              <button
                onClick={() => shareToPlatform('facebook')}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs text-gray-600">Facebook</span>
              </button>
              
              <button
                onClick={() => shareToPlatform('linkedin')}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-xs text-gray-600">LinkedIn</span>
              </button>
              
              <button
                onClick={() => shareToPlatform('download')}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-gray-600">Download</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowCardPreview(false)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryScreen;
