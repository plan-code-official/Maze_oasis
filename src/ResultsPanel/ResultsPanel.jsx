import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import './ResultsPanel.css';

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export default function ResultsPanel({
  correctAnswers,
  wrongAnswers,
  totalQuestions,
  onRetry,
  onBack,
}) {
  const correct = numberValue(correctAnswers);
  const wrong = numberValue(wrongAnswers);
  const questionCount = numberValue(totalQuestions) || correct + wrong;
  const correctPercent = questionCount ? Math.round((correct / questionCount) * 100) : 0;
  const isSuccess = questionCount > 0 && correctPercent >= 50;

  return (
    <div className="results-overlay">
      <section
        className={`results-screen${isSuccess ? ' results-screen--success' : ' results-screen--retry'}`}
        aria-labelledby="results-title"
        dir="rtl"
      >
        <header className="results-header">
          <span className="results-header__ornament" aria-hidden="true" />
          <p className="results-eyebrow">رحلتك في الواحة</p>
          <h1 className="results-title" id="results-title">
            {isSuccess ? 'أحسنت!' : 'حاول مرة أخرى!'}
          </h1>
          <span className="results-header__rule" aria-hidden="true" />
        </header>

        <section className="results-score" aria-label="النتيجة">
          <span className="results-score__label">النتيجة</span>
          <strong className="results-score__value" dir="ltr">
            {correctPercent}<span>/</span>100
          </strong>
          <span className="results-score__caption">إجابات صحيحة</span>
        </section>

        <div className="results-stats" aria-label="ملخص النتائج">
          <article className="results-stat results-stat--correct">
            <span className="results-stat__icon" aria-hidden="true"><Check /></span>
            <strong className="results-stat__value">{correct}</strong>
            <span className="results-stat__label">إجابات صحيحة</span>
          </article>
          <article className="results-stat results-stat--wrong">
            <span className="results-stat__icon" aria-hidden="true"><X /></span>
            <strong className="results-stat__value">{wrong}</strong>
            <span className="results-stat__label">إجابات خاطئة</span>
          </article>
        </div>

        <div className="results-actions">
          <button className="results-button results-button--retry" type="button" onClick={onRetry}>
            <RotateCcw aria-hidden="true" />
            <span>إعادة المحاولة</span>
          </button>
          <button className="results-button results-button--back" type="button" onClick={onBack}>
            <ArrowRight aria-hidden="true" />
            <span>العودة</span>
          </button>
        </div>

        <p className="results-sr">
          {`الدرجة ${correctPercent} من 100. إجابات صحيحة ${correct}. إجابات خاطئة ${wrong}.`}
        </p>
      </section>
    </div>
  );
}
