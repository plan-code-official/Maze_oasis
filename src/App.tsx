import { useState, useEffect, useRef } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GameScreen } from './components/GameScreen';
import { VictoryModal } from './components/VictoryModal';
import { ErrorScreen } from './components/ErrorScreen';
import { QUESTIONS, type Question } from './data/questions';
import { gameAudio } from './utils/audio';
import { handleExitSite } from './utils/navigation';
 
type ViewType = 'welcome' | 'playing' | 'gameover' | 'victory';

const requestMobileGameplayPresentation = () => {
  if (!window.matchMedia('(any-pointer: coarse) and (max-width: 1024px)').matches) return;

  const enterPresentationMode = async () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.info('Fullscreen is unavailable; continuing with the browser viewport.', error);
      }
    }

    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      try {
        await screen.orientation.lock('landscape');
      } catch (error) {
        console.info('Landscape orientation lock is unavailable; the game remains playable.', error);
      }
    }
  };

  void enterPresentationMode();
};

function normalizeOptionArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return normalizeOptionArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') {
    const option = value as Record<string, unknown>;
    if ('text' in option || 'imageUrl' in option || 'audioUrl' in option) return [option];
    return Object.values(option);
  }
  return [];
}

function App() {
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('view') as ViewType;
      if (v) return v;
    }
    return 'welcome';
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(80);
  const [lives, setLives] = useState(3);

  const [apiQuestions, setApiQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session / Token State
  const latestTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (apiQuestions.length > 0) {
      apiQuestions.forEach((q) => {
        if (q.image) {
          const img = new Image();
          img.src = q.image;
        }
      });
    }
  }, [apiQuestions]);

  const getUrlToken = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || params.get('accesstoken');
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const currentToken = latestTokenRef.current || getUrlToken();
    const headers = new Headers(options.headers);
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
  const [answersList, setAnswersList] = useState<any[]>([]);
  const answersRef = useRef<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [victoryData, setVictoryData] = useState<any>(null);
  const isSubmittingRef = useRef(false);

  const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://oasis-eduline.onrender.com';

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const assessmentId = urlParams.get('assessmentID') || urlParams.get('assessmentId') || urlParams.get('lessonId');
        const isDemo = urlParams.get('demo') === 'true';
        const urlToken = getUrlToken();

        if (urlToken) {
          latestTokenRef.current = urlToken;
        }

        // 1. Check for Assessment / Lesson ID
        if (!assessmentId) {
          if (isDemo) {
            setApiQuestions(QUESTIONS);
          } else {
            console.warn('Missing assessmentId/lessonId parameter in URL.');
            setError('عذراً، الرابط غير مكتمل. يرجى التأكد من وجود رقم التقييم ورمز المرور.');
          }
          setIsLoading(false);
          return;
        }

        // 2. Fetch Questions from Assessment Game Choice Endpoint
        const response = await apiFetch(`${getBaseUrl()}/api/v1/student/assessments/${assessmentId}/game/choice`);

        if (!response.ok) {
          throw new Error('فشل في جلب البيانات من الخادم.');
        }

        const resData = await response.json();

        let fetched: any[] = [];
        if (resData && resData.data && Array.isArray(resData.data.questions)) {
          fetched = resData.data.questions;
        } else if (resData && resData.data && Array.isArray(resData.data.answers)) {
          fetched = resData.data.answers;
        } else if (resData && resData.data && Array.isArray(resData.data)) {
          fetched = resData.data;
        } else if (Array.isArray(resData)) {
          fetched = resData;
        }

        if (fetched.length > 0) {
          const mapped = fetched.map((q: any, idx: number) => {
            // Determine format
            const isOptionsFormat = q.question !== undefined && q.options !== undefined;
            const isAnswerFormat = q.questionTitle !== undefined && q.choices !== undefined;
            const hasChoiceDetails = q.choiceDetails !== undefined;

            let questionText = 'بدون سؤال';
            let choicesArr: any[] = [];
            let word = 'إجابة';
            let distractors: string[] = [];
            let image = null;
            let audio = null;

            if (isOptionsFormat) {
              questionText = q.question || 'بدون سؤال';
              choicesArr = normalizeOptionArray(q.options);
              word = q.correctAnswer || 'إجابة';
              image = q.imageUrl || q.image || choicesArr.find((option: any) => option?.imageUrl)?.imageUrl || null;
              audio = q.audioUrl || choicesArr.find((option: any) => option?.audioUrl)?.audioUrl || null;

              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');
              distractors = mappedChoices.filter((t: string) => t !== word);
            } else if (isAnswerFormat) {
              questionText = q.questionTitle || 'بدون سؤال';
              choicesArr = normalizeOptionArray(q.choices);
              word = q.correctAnswer || 'إجابة';
              image = q.image || null;

              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');
              distractors = mappedChoices.filter((t: string) => t !== word);
            } else if (hasChoiceDetails) {
              const details = q.choiceDetails || {};
              questionText = details.title || 'بدون سؤال';
              choicesArr = normalizeOptionArray(details.choices);
              image = q.image || details.image || null;
              audio = q.audioUrl || details.audioUrl || null;

              const correctIndex = details.correctAnswer !== undefined ? Number(details.correctAnswer) : 0;
              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');

              word = mappedChoices[correctIndex] || 'إجابة';
              distractors = mappedChoices.filter((_: any, i: number) => i !== correctIndex);
            }

            // Keep maximum of 3 distractors so total words is never more than 4
            distractors = distractors.slice(0, 3);

            return {
              id: q.id || q.questionId || q.choiceDetails?.questionId || idx,
              questionText: questionText,
              image: image,
              audioUrl: audio,
              word: word,
              distractors: distractors
            };
          });
          setApiQuestions(mapped);
        } else {
          setError('لا توجد أسئلة متاحة في هذا التقييم.');
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError('حدث خطأ أثناء جلب الأسئلة. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleStartGame = () => {
    requestMobileGameplayPresentation();
    setScore(0);
    setLives(3);
    setCurrentQuestionIndex(0);
    setAnswersList([]);
    answersRef.current = [];
    setVictoryData(null);
    setQuestionStartTime(Date.now());
    setView('playing');
  };

  const handleRetry = () => {
    isSubmittingRef.current = false;
    handleStartGame();
  };

  const submitGameSession = (finalAnswers: any[]) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Ensure every question that was not solved is calculated as wrong too
    const answeredQIds = new Set(finalAnswers.map((a: any) => a.questionId));
    let answersToSend = [...finalAnswers];

    if (apiQuestions && apiQuestions.length > 0) {
      apiQuestions.forEach((q) => {
        if (!answeredQIds.has(q.id)) {
          answersToSend.push({
            questionId: q.id,
            selectedAnswer: q.distractors?.[0] || 'لم تتم الإجابة',
            isCorrect: false,
            timeTaken: 1,
            pointsEarned: 0
          });
        }
      });
    } else if (answersToSend.length === 0) {
      answersToSend = [{
        questionId: 1,
        selectedAnswer: 'لم تتم الإجابة',
        isCorrect: false,
        timeTaken: 1,
        pointsEarned: 0
      }];
    }

    answersRef.current = answersToSend;
    setAnswersList(answersToSend);
    setView('victory');
    isSubmittingRef.current = false;
  };

  const handleCorrectAnswer = () => {
    const timeTaken = Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000));
    const currentQ = apiQuestions[currentQuestionIndex];
    if (!currentQ || answersRef.current.some((answer) => answer.questionId === currentQ.id && answer.isCorrect)) return;

    const answerRecord = {
      questionId: currentQ.id,
      selectedAnswer: currentQ.word,
      isCorrect: true,
      timeTaken: timeTaken,
      pointsEarned: 10
    };

    const newAnswers = [...answersRef.current, answerRecord];
    answersRef.current = newAnswers;
    setAnswersList(newAnswers);

    if (currentQuestionIndex + 1 < apiQuestions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      submitGameSession(newAnswers);
    }

    setScore((prev) => prev + 10);
  };

  const handleWrongAnswer = (wrongWord: string) => {
    const timeTaken = Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000));
    const currentQ = apiQuestions[currentQuestionIndex];

    const answerRecord = {
      questionId: currentQ.id,
      selectedAnswer: wrongWord,
      isCorrect: false,
      timeTaken: timeTaken,
      pointsEarned: 0
    };
    const newAnswers = [...answersRef.current, answerRecord];
    answersRef.current = newAnswers;
    setAnswersList(newAnswers);

    setScore((prev) => Math.max(0, prev - 5));
  };

  const handleLoseLife = () => {
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        gameAudio.playGameOver();
        // The game is completely finished, submit answers while showing spinner
        submitGameSession(answersRef.current);
      }
      return nextLives;
    });
  };

  if (error || (!isLoading && apiQuestions.length === 0)) {
    return <ErrorScreen onExit={handleExitSite} />;
  }

  if (isLoading) {
    return (
      <div className="game-loading w-screen min-h-screen flex items-center justify-center text-2xl font-bold" dir="rtl">
        تحميل
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen overflow-x-hidden flex items-center justify-center">
      {view === 'welcome' && (
        <WelcomeScreen 
          onStart={handleStartGame} 
          onExit={handleExitSite}
          totalQuestions={apiQuestions.length}
          isLoading={isLoading}
          error={error}
        />
      )}

      {view === 'playing' && (
        <GameScreen
          questions={apiQuestions}
          currentQuestionIndex={currentQuestionIndex}
          coins={answersList.filter((answer) => answer.isCorrect).length}
          lives={lives}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onLoseLife={handleLoseLife}
          onBackToWelcome={handleExitSite}
        />
      )}

      {view === 'victory' && (() => {
        const totalQuestions = apiQuestions.length || answersList.length || 11;
        const correctAnswers = answersList.filter((a) => a.isCorrect).length;
        // All unsolved questions are calculated as wrong too
        const wrongAnswers = Math.max(0, totalQuestions - correctAnswers);

        return (
          <VictoryModal
            score={score}
            totalQuestions={totalQuestions}
            correctAnswers={correctAnswers}
            wrongAnswers={wrongAnswers}
            victoryData={victoryData || { score: Math.round((correctAnswers / totalQuestions) * 100), earnedCoins: correctAnswers }}
            onRestart={handleRetry}
            onHome={handleExitSite}
          />
        );
      })()}
    </div>
  );
}

export default App;
