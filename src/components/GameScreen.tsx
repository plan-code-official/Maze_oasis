import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { DoorOpen, Volume2, Music, Target, Smartphone, RotateCw } from 'lucide-react';
import { MazeCanvas } from './MazeCanvas';
import type { Question } from '../data/questions';
import heartImage from '../assets/heart.png';

interface GameScreenProps {
  questions: Question[];
  currentQuestionIndex: number;
  coins: number;
  lives: number;
  onCorrectAnswer: () => void;
  onWrongAnswer: (word: string) => void;
  onLoseLife: () => void;
  onBackToWelcome: () => void;
}

const MOBILE_PORTRAIT_QUERY = '(any-pointer: coarse) and (orientation: portrait) and (max-width: 600px)';

export const GameScreen: React.FC<GameScreenProps> = ({
  questions,
  currentQuestionIndex,
  lives,
  onCorrectAnswer,
  onWrongAnswer,
  onLoseLife,
  onBackToWelcome,
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const hasQuestionImage = Boolean(currentQuestion?.image);
  const hasQuestionText = Boolean(currentQuestion?.questionText?.trim() && currentQuestion.questionText.trim() !== '.');
  const hasQuestionAudio = Boolean(currentQuestion?.audioUrl);
  const questionLayout = `${hasQuestionImage ? 'image-' : ''}${hasQuestionText ? 'text-' : ''}${hasQuestionAudio ? 'audio' : ''}`.replace(/-$/, '');

  // Distribute correct word + 3 distractors randomly
  // To keep it persistent for this question, we memoize it or generate it once.
  // We can use a simple seeded shuffle based on currentQuestionIndex, or state.
  // Using state is simple: when currentQuestionIndex changes, we generate a shuffled array of words.
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [lastIndex, setLastIndex] = useState<number>(-1);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_PORTRAIT_QUERY).matches
  );
  const [continueInPortrait, setContinueInPortrait] = useState(false);

  useEffect(() => {
    const portraitQuery = window.matchMedia(MOBILE_PORTRAIT_QUERY);
    const updateOrientation = () => {
      setIsMobilePortrait(portraitQuery.matches);
      if (!portraitQuery.matches) setContinueInPortrait(false);
    };

    updateOrientation();
    portraitQuery.addEventListener('change', updateOrientation);
    return () => portraitQuery.removeEventListener('change', updateOrientation);
  }, []);

  // Auto-fit: grow question text to the largest size that still fits its box.
  const questionTextRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = questionTextRef.current;
    if (!el) return;
    const fit = () => {
      let lo = 12;
      let hi = 600;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        el.style.setProperty('font-size', `${mid}px`, 'important');
        if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) lo = mid;
        else hi = mid;
      }
      el.style.setProperty('font-size', `${lo}px`, 'important');
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [currentQuestionIndex, hasQuestionText, hasQuestionImage, hasQuestionAudio]);

  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };

    const handleBlur = () => {
      setIsTabHidden(true);
    };

    const handleFocus = () => {
      if (!document.hidden) {
        setIsTabHidden(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('game-active');
    document.body.classList.add('game-active');

    return () => {
      document.documentElement.classList.remove('game-active');
      document.body.classList.remove('game-active');
    };
  }, []);

  useEffect(() => {
    if (currentQuestion?.audioUrl) {
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIndex, currentQuestion?.audioUrl]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Play prevented:', e));
    }
  };

  // Touch pad external direction input
  const extDir = null;

  if (lastIndex !== currentQuestionIndex && currentQuestion) {
    const allWords = [currentQuestion.word, ...currentQuestion.distractors];
    // Simple random shuffle
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    setShuffledWords(allWords);
    setLastIndex(currentQuestionIndex);
  }

  const triggerNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  const handleWrong = (word: string) => {
    onWrongAnswer(word);
    onLoseLife();
    triggerNotification('خطأ', 'error');
  };

  const handleCorrect = () => {
    triggerNotification('أحسنت', 'success');
    onCorrectAnswer();
  };

  return (
    <div className="game-screen w-full max-w-full lg:max-w-none mx-auto p-3 sm:p-5 lg:p-7 flex flex-col items-center justify-start gap-3 lg:gap-5">

      {/* 1. Header panel */}
      <header className="maze-header glass-panel" dir="ltr">
        <div className="maze-header__main">
          <div className="maze-header__left">
            <div className="maze-header__lives" dir="rtl">
              <span>القلوب</span>
              <div className="maze-header__hearts">
                {Array.from({ length: 3 }, (_, index) => <img key={index} src={heartImage} alt="" className={index < lives ? 'is-active' : 'is-inactive'} />)}
              </div>
            </div>
          </div>
          <div className="maze-header__question" dir="rtl">
            <span>السؤال</span>
            <strong dir="ltr">{Math.min(currentQuestionIndex + 1, questions.length)}/{questions.length}</strong>
          </div>
          <button className="maze-header__exit" type="button" onClick={onBackToWelcome} aria-label="خروج إلى الرئيسية">
            <DoorOpen aria-hidden="true" />
          </button>
        </div>
        <div className="maze-header__progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={currentQuestionIndex}>
          <span style={{ width: `${questions.length ? (Math.min(currentQuestionIndex + 1, questions.length) / questions.length) * 100 : 0}%` }} />
        </div>
      </header>

      {/* 2. Main layout */}
      <div className="game-main flex-1 w-full min-h-0 flex flex-col lg:flex-row items-stretch justify-center gap-4 lg:gap-8 pb-2">

        {/* Left Side (Actually Right in RTL): Question Display */}
        <div className="question-panel glass-panel w-full lg:w-[320px] p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-0 flex-shrink-0 border border-[#00f0ff]/20 shadow-lg rounded-2xl relative overflow-hidden">
          {/* Question Text and/or Image */}
          {currentQuestion && (
            <div className={`question-content question-content--${questionLayout || 'empty'} relative z-10 w-full h-full flex flex-col items-center justify-center gap-2 sm:gap-3`}>
              <Target className="question-decoration absolute text-[#00f0ff] opacity-5 filter blur-sm" aria-hidden="true" />

              {currentQuestion.image && (
                <div className="question-image-wrap w-full min-h-0 flex items-center justify-center relative z-10">
                  <img
                    src={currentQuestion.image}
                    alt="صورة السؤال"
                    className="question-image max-w-full max-h-full object-contain drop-shadow-lg cursor-zoom-in"
                    onClick={() => setZoomedImage(currentQuestion.image)}
                  />
                </div>
              )}

              {hasQuestionText && (
                <div
                  ref={questionTextRef}
                  className="question-text text-white font-black text-center w-full relative z-10"
                  style={{
                    overflowWrap: 'normal',
                    wordBreak: 'keep-all',
                    hyphens: 'none'
                  }}
                >
                  {currentQuestion.questionText}
                </div>
              )}

              {/* Optional Audio */}
              {currentQuestion.audioUrl && (
                <div className="question-audio w-full shrink-0 flex items-center justify-center">
                  <audio
                    ref={audioRef}
                    src={currentQuestion.audioUrl}
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                  <button
                    onClick={toggleAudio}
                    style={{ background: 'transparent', border: 'none', outline: 'none' }}
                    aria-label={isPlayingAudio ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                    className={`appearance-none bg-transparent border-none outline-none focus:outline-none shadow-none transition-transform duration-300 active:scale-95 hover:scale-105 ${isPlayingAudio ? 'opacity-90' : 'question-audio-float'
                      }`}
                  >
                    <div className={`filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-transform ${isPlayingAudio ? 'animate-pulse text-[#39ff14]' : 'text-[#ff007f]'}`}>
                      {isPlayingAudio ? (
                        <Music className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20" />
                      ) : (
                        <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Maze Board */}
        <div className="maze-column relative flex-1 flex flex-col items-center justify-center w-full h-full min-h-0 min-w-0 flex-shrink-0">
          {/* Toast Notification overlay */}
          {notification && (
            <div className={`answer-feedback-card answer-feedback-card--inline ${notification.type === 'success' ? 'answer-feedback-card--success' : 'answer-feedback-card--wrong'}`} dir="rtl">
              <svg className="answer-feedback__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {notification.type === 'success' ? <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></> : <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>}
              </svg><span className="answer-feedback__text">{notification.text}</span>
            </div>
          )}

          <MazeCanvas
            level={currentQuestionIndex + 1}
            words={shuffledWords}
            correctWord={currentQuestion?.word}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            onLoseLife={onLoseLife}
            lives={lives}
            isPaused={Boolean(zoomedImage) || isTabHidden || (isMobilePortrait && !continueInPortrait)}
            externalDirection={extDir}
          />
        </div>

      </div>

      {zoomedImage && (
        <div className="question-image-modal" role="dialog" aria-modal="true" onClick={() => setZoomedImage(null)}>
          <div className="question-image-modal__content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="question-image-modal__close" onClick={() => setZoomedImage(null)} aria-label="إغلاق الصورة">×</button>
            <img src={zoomedImage} alt="صورة السؤال مكبرة" />
          </div>
        </div>
      )}

      {isMobilePortrait && !continueInPortrait && (
        <div className="mobile-orientation-guide" role="dialog" aria-modal="true" aria-labelledby="orientation-guide-title" dir="rtl">
          <div className="mobile-orientation-guide__card">
            <div className="mobile-orientation-guide__icon" aria-hidden="true">
              <Smartphone />
              <RotateCw />
            </div>
            <h2 id="orientation-guide-title">أدر هاتفك أفقياً</h2>
            <p>اللعبة أوضح وأسهل في الوضع الأفقي.</p>
            <button type="button" onClick={() => setContinueInPortrait(true)}>
              المتابعة في الوضع الرأسي
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
