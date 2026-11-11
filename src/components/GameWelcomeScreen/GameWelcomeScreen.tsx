import React from 'react';
import './GameWelcomeScreen.css';
import { DoorOpen, Play } from 'lucide-react';
import { handleExitSite as defaultExitSite } from '../../utils/navigation';

interface GameWelcomeScreenProps {
  backgroundImage?: string;
  descriptionImage: string;
  onStart: () => void;
  onExit?: () => void;
  isLoading?: boolean;
  isReady?: boolean;
}

export default function GameWelcomeScreen({
  backgroundImage,
  descriptionImage,
  onStart,
  onExit,
  isLoading = false,
  isReady = true,
}: GameWelcomeScreenProps) {
  const handleExit = onExit || defaultExitSite;

  const startDisabled = isLoading || !isReady;

  return (
    <div
      className="gws-screen"
      dir="rtl"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      <main className="gws-main">
        <div className="gws-stage">
          <div className="gws-body">
            <img
              className="gws-description-art"
              src={descriptionImage}
              alt="شرح طريقة اللعب"
            />
          </div>

          <footer className="gws-footer">
            <div className="gws-footer-buttons">
              <button className="gws-button gws-button--exit" type="button" onClick={handleExit}>
                <DoorOpen aria-hidden="true" />
                <span>خروج</span>
              </button>
              <button
                className="gws-button gws-button--start"
                type="button"
                onClick={onStart}
                disabled={startDisabled}
              >
                <Play aria-hidden="true" />
                <span>{isLoading ? 'جارٍ التحميل' : 'ابدأ اللعبة'}</span>
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
