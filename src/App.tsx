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

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);

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
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const latestTokenRef = useRef<string | null>(null);

  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const refreshEndpointRef = useRef<string | null>(null);

  const doRefresh = async (): Promise<string | null> => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const endpoints = ['/api/v1/student/refresh', '/api/v1/auth/refresh'];
      // Use only the endpoint that worked last time to avoid duplicate calls
      const order = refreshEndpointRef.current ? [refreshEndpointRef.current] : endpoints;

      let refreshRes: Response | null = null;
      let usedEndpoint: string | null = null;
      for (const ep of order) {
        refreshRes = await fetch(`${baseUrl}${ep}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: "{}",
          credentials: 'include',
        });
        usedEndpoint = ep;
        if (refreshRes.ok) break;
      }

      if (refreshRes && refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData?.data?.accessToken || refreshData?.data?.token || refreshData?.accessToken || refreshData?.token;
        if (newToken) {
          console.log("Token refreshed successfully.");
          refreshEndpointRef.current = usedEndpoint;
          setSessionToken(newToken);
          latestTokenRef.current = newToken;
          return newToken;
        }
      } else {
        refreshEndpointRef.current = null;
        console.error("Token refresh failed with status", refreshRes?.status);
      }
    } catch (err) {
      console.error("Error during token refresh", err);
    }
    return null;
  };

  // Concurrent callers (StrictMode double effects, parallel 401s) share one request
  const refreshAccessToken = () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = doRefresh().finally(() => {
        refreshPromiseRef.current = null;
      });
    }
    return refreshPromiseRef.current;
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    let currentToken = latestTokenRef.current;
    if (!currentToken) {
      currentToken = await refreshAccessToken();
    }
    
    const fetchOptions = { ...options };
    if (currentToken) {
      fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${currentToken}` };
    }

    let res = await fetch(url, fetchOptions);

    if (res.status === 401) {
      console.warn("401 Unauthorized encountered. Attempting to refresh token...");
      const newToken = await refreshAccessToken();
      if (newToken) {
        fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${newToken}` };
        res = await fetch(url, fetchOptions);
      } else {
        setError('تعذر تجديد رمز الدخول.');
      }
    }
    
    return res;
  };
  const [answersList, setAnswersList] = useState<any[]>([]);
  const answersRef = useRef<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [victoryData, setVictoryData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const submissionIdRef = useRef(0);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const lessonId = urlParams.get('lessonId');
        const isDemo = urlParams.get('demo') === 'true';

        // 1. Check for Lesson ID
        if (!lessonId && !isDemo) {
          console.warn('Missing lessonId parameter in URL.');
          setError('Missing lessonId in URL parameters.');
          setIsLoading(false);
          return;
        }

        if (isDemo && !lessonId) {
          setApiQuestions(QUESTIONS);
          setIsLoading(false);
          return;
        }

        // 2. Check for Token / Refresh Endpoint Error
        if (!isDemo) {
          const token = await refreshAccessToken();
          if (!token) {
            console.warn('Failed to obtain authentication token via refresh endpoint.');
            setError('تعذر الحصول على رمز الدخول.');
            setIsLoading(false);
            return;
          }
        }

        const baseUrl = import.meta.env.VITE_API_BASE_URL;

        // 3. Create Session
        try {
          const sessionRes = await apiFetch(`${baseUrl}/api/v1/student/games/1/sessions?lessonId=${lessonId}`, {
            method: 'POST',
          });
          if (sessionRes.ok) {
            const sData = await sessionRes.json();
            if (sData?.data?.id) {
              setSessionId(sData.data.id);
            }
          }
        } catch (e) {
          console.error("Failed to create session", e);
        }

        // 4. Fetch Questions (Check Question Endpoint)
        const response = await apiFetch(`${baseUrl}/api/v1/student/games/1/questions?lessonId=${lessonId}`);

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
              image = details.image || null;

              const correctIndex = details.correctAnswer !== undefined ? details.correctAnswer : 0;
              const mappedChoices = choicesArr.map((c: any) => typeof c === 'string' ? c : c?.text).filter((t: any) => typeof t === 'string' && t.trim() !== '');

              word = mappedChoices[correctIndex] || 'إجابة';
              distractors = mappedChoices.filter((_: any, i: number) => i !== correctIndex);
            }

            // Keep maximum of 3 distractors so total words is never more than 4
            distractors = distractors.slice(0, 3);

            return {
              id: q.id || q.questionId || idx,
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
    submissionIdRef.current += 1;
    setScore(0);
    setLives(3);
    setCurrentQuestionIndex(0);
    setAnswersList([]);
    answersRef.current = [];
    setVictoryData(null);
    setQuestionStartTime(Date.now());
    setView('playing');
  };

  // Retry from the results panel: create a brand-new session, then reset everything.
  const handleRetry = async () => {
    if (isRestarting) return;
    setIsRestarting(true);

    // Drop the old (already completed) session so nothing is submitted to it
    setSessionId(null);

    const lessonId = new URLSearchParams(window.location.search).get('lessonId');
    if (lessonId) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const sessionRes = await apiFetch(`${baseUrl}/api/v1/student/games/1/sessions?lessonId=${lessonId}`, {
          method: 'POST',
        });
        if (sessionRes.ok) {
          const sData = await sessionRes.json();
          if (sData?.data?.id) {
            setSessionId(sData.data.id);
          }
        }
      } catch (e) {
        console.error("Failed to create session on retry", e);
      }
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;
    handleStartGame();
    setIsRestarting(false);
  };

  const submitGameSession = async (finalAnswers: any[], showResultsImmediately = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const submissionId = ++submissionIdRef.current;

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

    if (!sessionId || !sessionToken) {
      setView('victory');
      isSubmittingRef.current = false;
      return;
    }

    if (showResultsImmediately) setView('victory');
    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      if (answersToSend.length > 0) {
        await apiFetch(`${baseUrl}/api/v1/student/games/sessions/${sessionId}/submit-answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers: answersToSend })
        });
      }

      // Complete Session
      const completeRes = await apiFetch(`${baseUrl}/api/v1/student/games/sessions/${sessionId}/complete`, {
        method: 'POST',
      });

      if (completeRes.ok) {
        const cData = await completeRes.json();
        if (cData?.data && submissionIdRef.current === submissionId) {
          setVictoryData(cData.data);
        }
      }
    } catch (e) {
      console.error("Error submitting session:", e);
    } finally {
      if (submissionIdRef.current === submissionId) {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        if (!showResultsImmediately) setView('victory');
      }
    }
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
      submitGameSession(newAnswers, true);
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

      {isSubmitting && view !== 'victory' && (
        <div className="submitting-overlay" aria-busy="true">
          <div className="submitting-spinner" />
        </div>
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
