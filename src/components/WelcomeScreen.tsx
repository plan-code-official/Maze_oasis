import React from 'react';
import GameWelcomeScreen from './GameWelcomeScreen/GameWelcomeScreen';

import DescriptionImg from '../assets/description.png';
import { gameAudio } from '../utils/audio';

interface WelcomeScreenProps {
  totalQuestions: number;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onExit?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  totalQuestions,
  isLoading,
  error,
  onStart,
  onExit,
}) => {
  const handleStart = () => {
    gameAudio.playCorrect();
    onStart();
  };

  const isReady = totalQuestions > 0 && !error;

  return (
    <GameWelcomeScreen
      descriptionImage={DescriptionImg}
      onStart={handleStart}
      onExit={onExit}
      isLoading={isLoading}
      isReady={isReady}
    />
  );
};

export default WelcomeScreen;
