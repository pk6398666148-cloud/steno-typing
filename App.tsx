
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./App.css";
import { passages, categories, makeChallenge, type Passage, type Session } from "./data";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Mode = "Timed" | "Word Count" | "Passage";
type Page = "Dashboard" | "Practice" | "Saved Passages" | "History";

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [mode, setMode] = useState<Mode>("Word Count");
  const [duration, setDuration] = useState(20);
  const [wordGoal, setWordGoal] = useState(500);
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(1);

  const [history, setHistory] = useState<Session[]>(() =>
    readStorage("steno-history", [])
  );
  const [saved, setSaved] = useState<Passage[]>(() =>
    readStorage("steno-saved-passages", [])
  );

  const [customTitle, setCustomTitle] = useState("");
  const [customText, setCustomText] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [usingPdf, setUsingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");

  const [typed, setTyped] = useState("");
  const typedRef = useRef("");
  const startTime = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [result, setResult] = useState<Session | null>(null);

  const allPassages = useMemo(() => [...passages, ...saved], [saved]);

  const selectedPassage =
    allPassages.find(p => p.id === selectedId) ?? passages[0];

  const activeText = usingPdf
    ? pdfText
    : mode === "Word Count"
      ? makeChallenge(wordGoal)
      : mode === "Timed"
        ? makeChallenge(3000)
        : selectedPassage.text;

  const typedWords = typed.trim() ? typed.trim().split(/\s+/).length : 0;

  const correctChars = [...typed].filter(
    (char, index) => char === activeText[index]
  ).length;

  const accuracy = typed.length
    ? Math.round((correctChars / typed.length) * 100)
    : 100;

  const elapsedMinutes = startTime.current
    ? Math.max((Date.now() - startTime.current) / 60000, 1 / 60)
    : 0;

  const currentWpm = elapsedMinutes
    ? Math.round((correctChars / 5) / elapsedMinutes)
    : 0;

  useEffect(() => {
    localStorage.setItem("steno-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("steno-saved-passages", JSON.stringify(saved));
  }, [saved]);

  function resetTest() {
    setRunning(false);
    setFinished(false);
    setTyped("");
    typedRef.current = "";
    setResult(null);
    startTime.current = null;
    finishedRef.current = false;
    setSecondsLeft((mode === "Word Count" ? 20 : duration) * 60);
  }

  function startTest() {
    resetTest();
    startTime.current = Date.now();
    setRunning(true);
  }

  function finishTest() {
    if (finishedRef.current) return;

    finishedRef.current = true;
    setRunning(false);
    setFinished(true);

    const finalTyped = typedRef.current;
    const correct = [...finalTyped].filter(
      (char, index) => char === activeText[index]
    ).length;

    const elapsed = startTime.current
      ? Math.max((Date.now() - startTime.current) / 60000, 1 / 60)
      : 1 / 60;

    const words = finalTyped.trim()
      ? finalTyped.trim().split(/\s+/).length
      : 0;

    const session: Session = {
      date: new Date().toLocaleString(),
      wpm: Math.round((correct / 5) / elapsed),
      accuracy: finalTyped.length
        ? Math.round((correct / finalTyped.length) * 100)
        : 0,
      duration: Math.round(elapsed * 60),
      words
    };

    setResult(session);
    setHistory(previous => [session, ...previous]);
  }

  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      setSecondsLeft(previous => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0) finishTest();
  }, [secondsLeft, running]);

  useEffect(() => {
    if (
      running &&
      mode === "Word Count" &&
      typedWords >= wordGoal
    ) {
      finishTest();
    }
  }, [typedWords, wordGoal, mode, running]);

  function handleTyping(value: string) {
    if (!running) return;

    const limitedValue = value.slice(0, activeText.length);
    typedRef.current = limitedValue;
    setTyped(limitedValue);
  }

  async function handlePdfUpload(file?: File) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setPdfMessage("Please select a PDF file.");
      return;
    }

    try {
      setPdfMessage("Reading your PDF...");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const document = await pdfjs.getDocument({ data: bytes }).promise;

      let extracted = "";

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const pageData = await document.getPage(pageNumber);
        const content = await pageData.getTextContent();
        extracted += content.items
          .map((item: any) => item.str ?? "")
          .join(" ") + " ";
      }

      if (!extracted.trim()) {
        setPdfMessage("No selectable text found in this PDF.");
        return;
      }

      setPdfText(extracted.trim());
      setUsingPdf(true);
      setMode("Passage");
      setPdfMessage("PDF text loaded successfully!");
      resetTest();
    } catch {
      setPdfMessage("Could not read this PDF. Please try another file.");
    }
  }

  function saveCustomPassage() {
    if (!customTitle.trim() || !customText.trim()) {
      alert("Please enter both a title and passage.");
      return;
    }

    const newPassage: Passage = {
      id: Date.now(),
      title: customTitle.trim(),
      category: "My Passages",
      text: customText.trim()
    };

    setSaved(previous => [...previous, newPassage]);
    setCustomTitle("");
    setCustomText("");
    alert("Your passage has been saved!");
  }

  function choosePassage(id: number) {
    setSelectedId(id);
    setUsingPdf(false);
    setPdfMessage("");
    resetTest();
  }

  const bestWpm = history.length
    ? Math.max(...history.map(item => item.wpm))
    : 0;

  const averageAccuracy = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.accuracy, 0) / history.length)
    : 0;

  const achievements = [
    { name: "First Practice", unlocked: history.length >= 1 },
    { name: "5 Sessions", unlocked: history.length >= 5 },
    { name: "10 Sessions", unlocked: history.length >= 10 },
    { name: "95% Accuracy", unlocked: history.some(item => item.accuracy >= 95) },
    { name: "20 WPM", unlocked: bestWpm >= 20 },
    { name: "30 WPM", unlocked: bestWpm >= 30 },
    { name: "40 WPM", unlocked: bestWpm >= 40 },
    { name: "50 WPM", unlocked: bestWpm >= 50 },
    { name: "60 WPM", unlocked: bestWpm >= 60 }
  ];

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">STENO TYPING</div>

        <nav className="nav-links">
          {(["Dashboard", "Practice", "Saved Passages", "History"] as Page[]).map(item => (
            <button
              key={item}
              className={page === item ? "active" : ""}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">

        {page === "Dashboard" && (
          <>
            <section className="hero">
              <h1>Improve Your Typing Speed</h1>
              <p>
                Build accuracy, improve speed and prepare confidently
                for your SSC stenography examinations.
              </p>
              <button className="primary-btn" onClick={() => setPage("Practice")}>
                Start Practising
              </button>
            </section>

            <h2 className="section-title">Your Performance</h2>

            <div className="grid">
              <div className="card">
                <p className="muted">Total Sessions</p>
                <div className="stat-value">{history.length}</div>
              </div>
              <div className="card">
                <p className="muted">Best WPM</p>
                <div className="stat-value">{bestWpm}</div>
              </div>
              <div className="card">
                <p className="muted">Average Accuracy</p>
                <div className="stat-value">{averageAccuracy}%</div>
              </div>
              <div className="card">
                <p className="muted">Saved Passages</p>
                <div className="stat-value">{saved.length}</div>
              </div>
            </div>

            <h2 className="section-title">Achievements</h2>
            <div className="card">
              {achievements.map(item => (
                <span className="badge" key={item.name}>
                  {item.unlocked ? "✓ " : "🔒 "}
                  {item.name}
                </span>
              ))}
            </div>
          </>
        )}

        {page === "Practice" && (
          <>
            <h1 className="section-title">Typing Practice</h1>

            <div className="card">
              <div className="field">
                <label>Practice Mode</label>
                <select
                  value={mode}
                  onChange={e => {
                    setMode(e.target.value as Mode);
                    setUsingPdf(false);
                    setPdfMessage("");
                    resetTest();
                  }}
                >
                  <option>Word Count</option>
                  <option>Timed</option>
                  <option>Passage</option>
                </select>
              </div>

              {mode === "Timed" && (
                <div className="field">
                  <label>Test Duration</label>
                  <select
                    value={duration}
                    onChange={e => {
                      setDuration(Number(e.target.value));
                      resetTest();
                    }}
                  >
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                  </select>
                </div>
              )}

              {mode === "Word Count" && (
                <div className="field">
                  <label>Word Count Challenge</label>
                  <select
                    value={wordGoal}
                    onChange={e => {
                      setWordGoal(Number(e.target.value));
                      resetTest();
                    }}
                  >
                    <option value={100}>100 Words</option>
                    <option value={250}>250 Words</option>
                    <option value={500}>500 Words</option>
                    <option value={1000}>1000 Words</option>
                  </select>
                  <p className="muted">Target speed: 30 WPM</p>
                </div>
              )}

              {mode === "Passage" && (
                <>
                  <div className="field">
                    <label>Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      {categories.map(item => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Select Passage</label>
                    <select
                      value={selectedId}
                      onChange={e => choosePassage(Number(e.target.value))}
                    >
                      {allPassages
                        .filter(p => category === "All" || p.category === category)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div className="field">
                <label>Upload Your PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={running}
                  onChange={e => handlePdfUpload(e.target.files?.[0])}
                />
                <p className="muted">{pdfMessage}</p>
                {usingPdf && (
                  <button className="secondary-btn" onClick={() => {
                    setUsingPdf(false);
                    setPdfMessage("");
                    resetTest();
                  }}>
                    Use Regular Passage Instead
                  </button>
                )}
              </div>
            </div>

            <div className="grid" style={{ marginTop: 18 }}>
              <div className="card">
                <p className="muted">Time Remaining</p>
                <div className="timer">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
              </div>
              <div className="card">
                <p className="muted">Current WPM</p>
                <div className="stat-value">{currentWpm}</div>
              </div>
              <div className="card">
                <p className="muted">Accuracy</p>
                <div className="stat-value">{accuracy}%</div>
              </div>
              <div className="card">
                <p className="muted">Words Typed</p>
                <div className="stat-value">{typedWords}</div>
              </div>
            </div>

            <h2 className="section-title">
              {usingPdf ? "Your PDF Passage" : mode === "Word Count" ? `${wordGoal}-Word Challenge` : selectedPassage.title}
            </h2>

            <div className="passage">{activeText}</div>

            <textarea
              className="typing-area"
              placeholder={running ? "Start typing here..." : "Press Start Practice to begin..."}
              value={typed}
              onChange={e => handleTyping(e.target.value)}
              disabled={!running || finished}
              spellCheck={false}
            />

            {mode === "Word Count" && (
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.min((typedWords / wordGoal) * 100, 100)}%` }}
                />
              </div>
            )}

            <div style={{ marginTop: 15 }}>
              {!running && !finished && (
                <button className="primary-btn" onClick={startTest}>
                  Start Practice
                </button>
              )}

              {running && (
                <button className="danger-btn" onClick={finishTest}>
                  Finish Test
                </button>
              )}

              {finished && (
                <button className="primary-btn" onClick={resetTest}>
                  Try Again
                </button>
              )}
            </div>

            {result && (
              <div className="card" style={{ marginTop: 20 }}>
                <h2>Practice Completed!</h2>
                <div className="grid">
                  <div>
                    <p className="muted">Final WPM</p>
                    <div className="stat-value">{result.wpm}</div>
                  </div>
                  <div>
                    <p className="muted">Accuracy</p>
                    <div className="stat-value">{result.accuracy}%</div>
                  </div>
                  <div>
                    <p className="muted">Words Typed</p>
                    <div className="stat-value">{result.words}</div>
                  </div>
                </div>
                <p className="muted">Your result has been saved in History.</p>
              </div>
            )}
          </>
        )}

        {page === "Saved Passages" && (
          <>
            <h1 className="section-title">My Saved Passages</h1>

            <div className="card">
              <h2>Add Your Own Passage</h2>
              <div className="field">
                <label>Passage Title</label>
                <input
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Enter passage title"
                />
              </div>

              <div className="field">
                <label>Passage Text</label>
                <textarea
                  className="typing-area"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder="Paste or type your passage here..."
                />
              </div>

              <button className="primary-btn" onClick={saveCustomPassage}>
                Save Passage
              </button>
            </div>

            <h2 className="section-title">Your Collection</h2>

            {saved.length === 0 ? (
              <div className="card empty">You haven't saved any passages yet.</div>
            ) : saved.map(item => (
              <div className="card list-item" key={item.id}>
                <h3>{item.title}</h3>
                <p className="muted">{item.text.slice(0, 160)}...</p>
                <button className="secondary-btn" onClick={() => {
                  setSelectedId(item.id);
                  setUsingPdf(false);
                  setMode("Passage");
                  setPage("Practice");
                  resetTest();
                }}>
                  Practise This Passage
                </button>
                <button className="danger-btn" onClick={() =>
                  setSaved(previous => previous.filter(p => p.id !== item.id))
                }>
                  Delete
                </button>
              </div>
            ))}
          </>
        )}

        {page === "History" && (
          <>
            <h1 className="section-title">Practice History</h1>

            {history.length === 0 ? (
              <div className="card empty">Your completed practice sessions will appear here.</div>
            ) : (
              <div className="card">
                {history.map((item, index) => (
                  <div className="list-item" key={`${item.date}-${index}`}>
                    <h3>Session {history.length - index}</h3>
                    <p className="muted">{item.date}</p>
                    <div className="grid">
                      <p><strong>{item.wpm} WPM</strong><br /><span className="muted">Speed</span></p>
                      <p><strong>{item.accuracy}%</strong><br /><span className="muted">Accuracy</span></p>
                      <p><strong>{item.words}</strong><br /><span className="muted">Words</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        STENO TYPING · Practice Consistently. Improve Every Day.
      </footer>
    </div>
  );
}
