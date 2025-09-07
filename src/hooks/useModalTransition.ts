import { useState, useEffect, useCallback } from 'react';

interface UseModalTransitionProps {
  isOpen: boolean;
  onClose: () => void;
  transitionDuration?: number;
}

/**
 * Hook for managing modal transition states
 * Allows for smooth opening and closing animations
 */
export const useModalTransition = ({ 
  isOpen, 
  onClose, 
  transitionDuration = 200 
}: UseModalTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Handle initial mount and open state
  useEffect(() => {
    if (isOpen && !isVisible) {
      setIsVisible(true);
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, transitionDuration);
      return () => clearTimeout(timer);
    }
    
    if (!isOpen && isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, transitionDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible, transitionDuration]);

  // Close handler with animation
  const handleClose = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      onClose();
    }, transitionDuration);
  }, [onClose, transitionDuration]);
  
  return {
    isVisible,
    isAnimating,
    handleClose
  };
};

export default useModalTransition;
