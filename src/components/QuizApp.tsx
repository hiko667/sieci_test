import { useState, useEffect, useCallback } from "react";
import { type CSSProperties } from "react";

// Podmień na właściwą ścieżkę do pliku JSON
import quizData from "../../public/pytania.json";

// ─── Typy ────────────────────────────────────────────────────────────────────

interface Odpowiedz {
  tekst: string;
  prawidlowa: boolean;
}

interface Pytanie {
  kategoria: string;
  pytanie: string;
  odpowiedzi: Odpowiedz[];
}

type RevealState = "correct" | "wrong" | "missed";
type RevealMap = Record<number, RevealState>;
type Feedback = "ok" | "fail" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

// ─── Style inline (nie zależą od Tailwinda) ───────────────────────────────────

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex",
    gap: "1.5rem",
    padding: "1.5rem",
    maxWidth: "860px",
    margin: "0 auto",
  },
  sidebar: {
    width: "140px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  statCard: {
    textAlign: "center",
    padding: "1rem 0.75rem",
  },
  statLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.4rem",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: 500,
    lineHeight: 1,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  categoryBadge: {
    display: "inline-block",
    marginBottom: "0.75rem",
    fontSize: "12px",
  },
  questionText: {
    fontSize: "17px",
    fontWeight: 500,
    lineHeight: 1.6,
    marginBottom: "1.25rem",
  },
  answerList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  markerBase: {
    width: "28px",
    height: "28px",
    minWidth: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 500,
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
  },
  finishBox: {
    textAlign: "center",
    padding: "3rem 0",
  },
};

// ─── Kolor markera w zależności od stanu ──────────────────────────────────────

function markerStyle(
  index: number,
  answered: boolean,
  selected: number[],
  revealMap: RevealMap
): CSSProperties {
  const base = styles.markerBase;
  if (!answered) {
    const sel = selected.includes(index);
    return sel
      ? { ...base, background: "#6c757d", border: "2px solid #6c757d", color: "#fff" }
      : { ...base, background: "#f8f9fa", border: "2px solid #dee2e6", color: "#6c757d" };
  }
  const state = revealMap[index];
  if (state === "correct") return { ...base, background: "#198754", border: "2px solid #198754", color: "#fff" };
  if (state === "wrong")   return { ...base, background: "#dc3545", border: "2px solid #dc3545", color: "#fff" };
  if (state === "missed")  return { ...base, background: "#20c997", border: "2px solid #20c997", color: "#fff" };
  return { ...base, background: "#f8f9fa", border: "2px solid #dee2e6", color: "#6c757d" };
}

// Klasy Bootstrap dla przycisku odpowiedzi
function answerBtnClass(
  index: number,
  answered: boolean,
  selected: number[],
  revealMap: RevealMap
): string {
  const base = "btn d-flex align-items-center gap-3 text-start w-100 border";
  if (!answered) {
    return selected.includes(index)
      ? `${base} btn-secondary`
      : `${base} btn-outline-secondary`;
  }
  const state = revealMap[index];
  if (state === "correct") return `${base} btn-success`;
  if (state === "wrong")   return `${base} btn-danger`;
  if (state === "missed")  return `${base} btn-outline-success opacity-75`;
  return `${base} btn-outline-secondary`;
}

function markerLabel(
  index: number,
  answered: boolean,
  selected: number[],
  revealMap: RevealMap
): string {
  if (!answered) return selected.includes(index) ? "●" : LABELS[index];
  const state = revealMap[index];
  if (state === "correct" || state === "missed") return "✓";
  if (state === "wrong") return "✗";
  return LABELS[index];
}

// ─── Komponent główny ─────────────────────────────────────────────────────────

export default function QuizApp() {
  const [questions, setQuestions] = useState<Pytanie[]>([]);
  const [current, setCurrent]     = useState<number>(0);
  const [okCount, setOkCount]     = useState<number>(0);
  const [failCount, setFailCount] = useState<number>(0);
  const [answered, setAnswered]   = useState<boolean>(false);
  const [selected, setSelected]   = useState<number[]>([]);
  const [feedback, setFeedback]   = useState<Feedback>(null);
  const [revealMap, setRevealMap] = useState<RevealMap>({});
  const [finished, setFinished]   = useState<boolean>(false);

  const init = useCallback((data: Pytanie[]) => {
    setQuestions(shuffle(data));
    setCurrent(0);
    setOkCount(0);
    setFailCount(0);
    setAnswered(false);
    setSelected([]);
    setFeedback(null);
    setRevealMap({});
    setFinished(false);
  }, []);

  useEffect(() => {
    init(quizData as Pytanie[]);
  }, [init]);

  const q = questions[current];
  const isMultiple = q?.pytanie?.toLowerCase().includes("wielokrotna") ?? false;
  const correctIndices: number[] =
    q?.odpowiedzi.map((a, i) => (a.prawidlowa ? i : -1)).filter((i) => i !== -1) ?? [];

  function reveal(chosenSet: Set<number>, correct: boolean): void {
    const map: RevealMap = {};
    q.odpowiedzi.forEach((a, i) => {
      if (a.prawidlowa && chosenSet.has(i))  map[i] = "correct";
      else if (!a.prawidlowa && chosenSet.has(i)) map[i] = "wrong";
      else if (a.prawidlowa && !chosenSet.has(i)) map[i] = "missed";
    });
    setRevealMap(map);
    setAnswered(true);
    setFeedback(correct ? "ok" : "fail");
    if (correct) setOkCount((c) => c + 1);
    else         setFailCount((c) => c + 1);
  }

  function handleSingle(i: number): void {
    if (answered) return;
    reveal(new Set([i]), q.odpowiedzi[i].prawidlowa);
  }

  function handleMultiToggle(i: number): void {
    if (answered) return;
    setSelected((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      if (next.length === correctIndices.length) {
        const chosenSet = new Set(next);
        const allCorrect = correctIndices.every((j) => chosenSet.has(j));
        setTimeout(() => reveal(chosenSet, allCorrect), 80);
      }
      return next;
    });
  }

  function handleNext(): void {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setAnswered(false);
      setSelected([]);
      setFeedback(null);
      setRevealMap({});
    }
  }

  function handleRestart(): void {
    init(questions);
  }

  const progress = questions.length
    ? Math.round(((finished ? questions.length : current) / questions.length) * 100)
    : 0;

  const total = okCount + failCount;
  const pct = total > 0 ? Math.round((okCount / total) * 100) : 0;

  if (!q && !finished) {
    return <div className="p-4 text-muted">Ładowanie pytań...</div>;
  }

  return (
    <div style={styles.wrapper}>
      {/* ── Sidebar z licznikami ── */}
      <div style={styles.sidebar}>
        <div className="card text-center" style={styles.statCard}>
          <div className="text-muted" style={styles.statLabel}>✓ Poprawne</div>
          <div className="text-success" style={styles.statValue}>{okCount}</div>
        </div>
        <div className="card text-center" style={styles.statCard}>
          <div className="text-muted" style={styles.statLabel}>✗ Błędne</div>
          <div className="text-danger" style={styles.statValue}>{failCount}</div>
        </div>
      </div>

      {/* ── Główna zawartość ── */}
      <div style={styles.main}>
        {/* Pasek postępu */}
        <div className="progress mb-3" style={{ height: "4px" }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${progress}%`, transition: "width 0.5s ease" }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {!finished ? (
          <>
            {/* Licznik pytań */}
            <p className="text-muted small mb-3">
              Pytanie {current + 1} z {questions.length}
            </p>

            {/* Kategoria */}
            <span className="badge bg-primary-subtle text-primary mb-3" style={styles.categoryBadge}>
              {q.kategoria}
            </span>

            {/* Treść pytania */}
            <p style={styles.questionText}>{q.pytanie}</p>

            {/* Odpowiedzi */}
            <div style={styles.answerList}>
              {q.odpowiedzi.map((ans, i) => (
                <button
                  key={i}
                  className={answerBtnClass(i, answered, selected, revealMap)}
                  disabled={answered && !isMultiple}
                  onClick={() => (isMultiple ? handleMultiToggle(i) : handleSingle(i))}
                >
                  <span style={markerStyle(i, answered, selected, revealMap)}>
                    {markerLabel(i, answered, selected, revealMap)}
                  </span>
                  {ans.tekst}
                </button>
              ))}
            </div>

            {/* Informacja zwrotna */}
            {feedback && (
              <div
                className={`alert mt-3 py-2 ${feedback === "ok" ? "alert-success" : "alert-danger"}`}
                role="alert"
              >
                {feedback === "ok" ? "✓ Poprawna odpowiedź!" : "✗ Błędna odpowiedź."}
              </div>
            )}

            {/* Przycisk dalej */}
            {answered && (
              <button className="btn btn-outline-secondary mt-3" onClick={handleNext}>
                {current + 1 < questions.length ? "Następne pytanie →" : "Zobacz wyniki"}
              </button>
            )}
          </>
        ) : (
          /* Ekran końcowy */
          <div style={styles.finishBox}>
            <h2 className="mb-2">Koniec quizu!</h2>
            <p className="text-muted mb-4">
              Uzyskałeś {okCount} z {total} punktów ({pct}%).
            </p>
            <div className="progress mb-4" style={{ height: "8px" }}>
              <div
                className="progress-bar bg-success"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <button className="btn btn-outline-secondary" onClick={handleRestart}>
              ↺ Zacznij od nowa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
