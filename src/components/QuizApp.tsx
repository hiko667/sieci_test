import { useState, useEffect, useCallback } from "react";
import { type CSSProperties } from "react";

import quizData from "../../public/pytania.json";


interface Answear {
  text: string;
  valid: boolean;
}

interface Question {
  category: string;
  question: string;
  answears: Answear[];
}

type RevealState = "correct" | "wrong" | "missed";
type RevealMap = Record<number, RevealState>;
type Feedback = "ok" | "fail" | null;


function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

const LABELS = ["A", "B", "C", "D", "E", "F"];


const markerBase: CSSProperties = {
  width: "36px",
  height: "36px",
  minWidth: "36px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 600,
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
  flexShrink: 0,
};

function markerStyle(index: number, answered: boolean, selected: number[], revealMap: RevealMap): CSSProperties {
  if (!answered) {
    return selected.includes(index)
      ? { ...markerBase, background: "#0d6efd", border: "2px solid #0d6efd", color: "#fff" }
      : { ...markerBase, background: "#f8f9fa", border: "2px solid #dee2e6", color: "#6c757d" };
  }
  const state = revealMap[index];
  if (state === "correct") return { ...markerBase, background: "#198754", border: "2px solid #198754", color: "#fff" };
  if (state === "wrong")   return { ...markerBase, background: "#dc3545", border: "2px solid #dc3545", color: "#fff" };
  if (state === "missed")  return { ...markerBase, background: "#20c997", border: "2px solid #20c997", color: "#fff" };
  return { ...markerBase, background: "#f8f9fa", border: "2px solid #dee2e6", color: "#6c757d" };
}

function markerLabel(index: number, answered: boolean, selected: number[], revealMap: RevealMap): string {
  if (!answered) return selected.includes(index) ? "✓" : LABELS[index];
  const state = revealMap[index];
  if (state === "correct" || state === "missed") return "✓";
  if (state === "wrong") return "✗";
  return LABELS[index];
}

function answerBtnClass(
  index: number,
  answered: boolean,
  selected: number[],
  revealMap: RevealMap
): string {
  const base = "btn d-flex align-items-center gap-3 text-start w-100";
  if (!answered) {
    return selected.includes(index)
      ? `${base} btn-primary`
      : `${base} btn-outline-secondary`;
  }
  const state = revealMap[index];
  if (state === "correct") return `${base} btn-success`;
  if (state === "wrong")   return `${base} btn-danger`;
  if (state === "missed")  return `${base} btn-outline-success`;
  return `${base} btn-outline-secondary`;
}


export default function QuizApp() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent]     = useState<number>(0);
  const [okCount, setOkCount]     = useState<number>(0);
  const [failCount, setFailCount] = useState<number>(0);
  const [answered, setAnswered]   = useState<boolean>(false);
  const [selected, setSelected]   = useState<number[]>([]);
  const [feedback, setFeedback]   = useState<Feedback>(null);
  const [revealMap, setRevealMap] = useState<RevealMap>({});
  const [finished, setFinished]   = useState<boolean>(false);

  const init = useCallback((data: Question[]) => {
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
    init(quizData as Question[]);
  }, [init]);

  const q = questions[current];
  const isMultiple: boolean = q?.question?.toLowerCase().includes("wielokrotna") ?? false;
  const correctIndices: number[] =
    q?.answears.map((a, i) => (a.valid ? i : -1)).filter((i) => i !== -1) ?? [];

  function reveal(chosenSet: Set<number>, correct: boolean): void {
    const map: RevealMap = {};
    q.answears.forEach((a, i) => {
      if (a.valid && chosenSet.has(i))       map[i] = "correct";
      else if (!a.valid && chosenSet.has(i)) map[i] = "wrong";
      else if (a.valid && !chosenSet.has(i)) map[i] = "missed";
    });
    setRevealMap(map);
    setAnswered(true);
    setFeedback(correct ? "ok" : "fail");
    if (correct) setOkCount((c) => c + 1);
    else         setFailCount((c) => c + 1);
  }

  function handleSingle(i: number): void {
    if (answered) return;
    reveal(new Set([i]), q.answears[i].valid);
  }

  function handleMultiToggle(i: number): void {
    if (answered) return;
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  function handleMultiSubmit(): void {
    if (answered || selected.length === 0) return;
    const chosenSet = new Set(selected);
    const allCorrect =
      correctIndices.length === selected.length &&
      correctIndices.every((j) => chosenSet.has(j));
    reveal(chosenSet, allCorrect);
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
    <div className="container-sm py-3 px-3" style={{ maxWidth: "680px" }}>

      <div className="d-flex gap-2 mb-3">
        <div className="card flex-fill text-center py-2 px-1">
          <div className="text-muted" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            ✓ Poprawne
          </div>
          <div className="text-success fw-medium" style={{ fontSize: "1.75rem", lineHeight: 1.2 }}>
            {okCount}
          </div>
        </div>
        <div className="card flex-fill text-center py-2 px-1">
          <div className="text-muted" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            ✗ Błędne
          </div>
          <div className="text-danger fw-medium" style={{ fontSize: "1.75rem", lineHeight: 1.2 }}>
            {failCount}
          </div>
        </div>
        <div className="card flex-fill text-center py-2 px-1">
          <div className="text-muted" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Postęp
          </div>
          <div className="text-secondary fw-medium" style={{ fontSize: "1.75rem", lineHeight: 1.2 }}>
            {finished ? questions.length : current}/{questions.length}
          </div>
        </div>
      </div>

      <div className="progress mb-4" style={{ height: "5px" }}>
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
          {/* Licznik pytań + category */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="text-muted small">Question {current + 1} z {questions.length} </span>
            <span className="badge bg-primary-subtle text-primary">{q.category}</span>
          </div>

          {/* Treść pytania */}
          <p style={{ fontSize: "17px", fontWeight: 500, lineHeight: 1.6, marginBottom: "1rem" }}>
            {q.question}
          </p>

          {/* Podpowiedź dla wielokrotnej */}
          {isMultiple && !answered && (
            <p className="text-muted small mb-2">
              Zaznacz wszystkie poprawne odpowiedzi, następnie kliknij „Zatwierdź".
            </p>
          )}

          <div className="d-flex flex-column gap-2 mb-3">
            {q.answears.map((ans, i) => (
              <button
                key={i}
                className={answerBtnClass(i, answered, selected, revealMap)}
                style={{ minHeight: "52px", fontSize: "15px", padding: "10px 14px" }}
                disabled={answered && !isMultiple}
                onClick={() => isMultiple ? handleMultiToggle(i) : handleSingle(i)}
                aria-pressed={selected.includes(i)}
              >
                <span style={markerStyle(i, answered, selected, revealMap)}>
                  {markerLabel(i, answered, selected, revealMap)}
                </span>
                <span>{ans.text}</span>
              </button>
            ))}
          </div>

          {isMultiple && !answered && (
            <button
              className="btn btn-primary w-100 mb-2"
              style={{ minHeight: "48px", fontSize: "15px" }}
              disabled={selected.length === 0}
              onClick={handleMultiSubmit}
            >
              Zatwierdź odpowiedź
            </button>
          )}

          {feedback && (
            <div
              className={`alert py-2 mb-2 ${feedback === "ok" ? "alert-success" : "alert-danger"}`}
              role="alert"
            >
              {feedback === "ok"
                ? "✓ Poprawna odpowiedź!"
                : `✗ Błędna odpowiedź. Poprawne: ${correctIndices.map((j) => q.answears[j].text).join(", ")}.`}
            </div>
          )}

          {answered && (
            <button
              className="btn btn-outline-secondary w-100"
              style={{ minHeight: "48px", fontSize: "15px" }}
              onClick={handleNext}
            >
              {current + 1 < questions.length ? "Następne Pytabie →" : "Zobacz wyniki"}
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <h2 className="mb-1">Koniec quizu!</h2>
          <p className="text-muted mb-3">
            Uzyskałeś {okCount} z {total} punktów ({pct}%).
          </p>
          <div className="progress mb-4" style={{ height: "10px" }}>
            <div
              className={`progress-bar ${pct >= 60 ? "bg-success" : "bg-danger"}`}
              style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <button
            className="btn btn-outline-secondary"
            style={{ minHeight: "48px", fontSize: "15px", padding: "10px 28px" }}
            onClick={handleRestart}
          >
            ↺ Zacznij od nowa
          </button>
        </div>
      )}
    </div>
  );
}
