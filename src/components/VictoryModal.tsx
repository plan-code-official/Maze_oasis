import React from 'react';
import ResultsPanel from '../ResultsPanel/ResultsPanel';
import { gameAudio } from '../utils/audio';

interface VictoryModalProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  victoryData?: any;
  onRestart: () => void;
  onHome: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  victoryData,
  onRestart,
  onHome,
}) => {
  const handleRestart = () => {
    gameAudio.playCorrect();
    onRestart();
  };

  const handleHome = () => {
    gameAudio.playCorrect();
    onHome();
  };

  const finalScore = victoryData?.score ?? score;
  const totalScore = totalQuestions * 10;
  // Ensure any question that was not solved is also counted as wrong
  const computedWrong = Math.max(wrongAnswers, totalQuestions - correctAnswers);
  // Coins come from the top-level `data.coins` of the session-complete response
  // (not from `data.reward.coins`). Fall back to local count only if unavailable.
  const coins = typeof victoryData?.coins === 'number' ? victoryData.coins : correctAnswers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <ResultsPanel
        score={finalScore}
        totalScore={totalScore}
        correctAnswers={correctAnswers}
        wrongAnswers={computedWrong}
        coins={coins}
        totalQuestions={totalQuestions}
        onRetry={handleRestart}
        onBack={handleHome}
      />
    </div>
  );
};
