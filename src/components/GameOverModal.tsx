import React from 'react';
import { RotateCcw, AlertTriangle, Home } from 'lucide-react';
import { gameAudio } from '../utils/audio';

interface GameOverModalProps {
  score: number;
  level: number;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  level,
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

  return (
    <div className="game-over-overlay fixed inset-0 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="game-over-panel glass-panel w-full max-w-md p-8 text-center relative overflow-hidden short:scale-80">
        <div className="absolute -top-10 -left-10 w-20 h-20 rounded-full filter blur-xl opacity-25 animate-pulse"></div>

        <AlertTriangle className="game-over-icon w-16 h-16 mx-auto mb-4" />

        <h2 className="text-3xl font-black mb-2">
          انتهت اللعبة!
        </h2>
        <p className="game-over-description mb-6">لقد أمسكت بك الوحوش ونفدت محاولاتك.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="game-over-stat p-4 rounded-xl">
            <span className="text-sm block mb-1">المستوى المحرز</span>
            <span className="game-over-stat__value text-2xl font-black">{level}</span>
          </div>
          <div className="game-over-stat p-4 rounded-xl">
            <span className="text-sm block mb-1">النتيجة النهائية</span>
            <span className="game-over-stat__value text-2xl font-black">{score}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRestart}
            className="game-btn w-full flex items-center justify-center gap-2 py-3 text-lg font-bold"
          >
            <RotateCcw className="w-5 h-5" />
            حاول مرة أخرى
          </button>
          
          <button
            onClick={handleHome}
            className="game-over-home w-full font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-5 h-5" />
            الشاشة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};
