
import React, { useEffect, useState } from "react";

const passages = [
  {
    title: "English Practice",
    text: "Education is the foundation of success. Every student should develop good habits, improve knowledge and work regularly towards achieving their goals. Consistent practice helps us become confident and successful."
  },
  {
    title: "SSC Practice",
    text: "The government plays an important role in the development of the country. It provides education, healthcare, transportation and other essential services to citizens. Every citizen should perform their duties honestly."
  },
  {
    title: "Office Practice",
    text: "A good employee should be punctual, disciplined and responsible. Effective communication and teamwork are important qualities in every workplace. Regular practice helps improve typing speed and accuracy."
  }
];

type Session = {
  date: string;
  wpm: number;
  accuracy: number;
};

export default function App() {
  const [passageIndex, setPassageIndex] = useState(0);
  const [duration, setDuration] = useState(3);
  const [remaining, setRemaining] = useState(180);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<Session[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("steno-history") || "[]");
    } catch {
      return [];
    }
  });

  const passage = passages[passageIndex].text;
  const elapsed = Math.max(1, duration * 60 - remaining);

  const correct = [...typed].filter(
    (char, index) => char === passage[index]
  ).length;

  const errors = typed.length - correct;
  const accuracy = typed.length
    ? Math.round((correct / typed.length) * 100)
    : 100;

  const wpm = Math.round(correct / 5 / (elapsed / 60));

  useEffect(() => {
    if (!started) return;

    const timer = window.setInterval(() => {
      setRemaining((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (remaining === 0) {
      setStarted(false);
    }
  }, [remaining]);

  useEffect(() => {
    localStorage.setItem("steno-history", JSON.stringify(history));
  }, [history]);

  function startPractice() {
    setTyped("");
    setRemaining(duration * 60);
    setStarted(true);
  }

  function finishPractice() {
    if (typed.length === 0) {
      setStarted(false);
      return;
    }

    const session: Session = {
      date: new Date().toLocaleString(),
      wpm,
      accuracy
    };

    setHistory((previous) => [session, ...previous].slice(0, 10));
    setStarted(false);
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f3f5f9",
    padding: "30px 16px",
    fontFamily: "Arial, sans-serif",
    color: "#202938"
  };

  const cardStyle: React.CSSProperties = {
    background: "white",
    padding: "22px",
    borderRadius: "14px",
    marginBottom: "18px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.05)"
  };

  return (
    <div style={pageStyle}>
      <main style={{ maxWidth: "900px", margin: "auto" }}>
        <header style={{ marginBottom: "25px" }}>
          <h1 style={{ color: "#243b70", marginBottom: "8px" }}>
            STENO TYPING
          </h1>
          <p>Improve your typing speed and accuracy every day.</p>
        </header>

        <section style={cardStyle}>
          <h2>Practice Settings</h2>

          <label>Choose passage: </label>
          <select
            value={passageIndex}
            disabled={started}
            onChange={(e) => setPassageIndex(Number(e.target.value))}
            style={{ padding: "10px", margin: "10px", borderRadius: "6px" }}
          >
            {passages.map((item, index) => (
              <option value={index} key={index}>
                {item.title}
              </option>
            ))}
          </select>

          <br />

          <label>Practice duration: </label>
          <select
            value={duration}
            disabled={started}
            onChange={(e) => {
              const value = Number(e.target.value);
              setDuration(value);
              setRemaining(value * 60);
            }}
            style={{ padding: "10px", margin: "10px", borderRadius: "6px" }}
          >
            <option value={1}>1 Minute</option>
            <option value={3}>3 Minutes</option>
            <option value={5}>5 Minutes</option>
            <option value={10}>10 Minutes</option>
          </select>

          <div style={{ marginTop: "15px" }}>
            <button onClick={startPractice} style={buttonStyle}>
              Start Practice
            </button>

            <button
              onClick={finishPractice}
              disabled={!started}
              style={{ ...buttonStyle, background: "#dc5555", marginLeft: "10px" }}
            >
              Finish Practice
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Typing Test</h2>

          <div style={{
            background: "#edf2ff",
            padding: "18px",
            borderRadius: "10px",
            lineHeight: 1.9,
            fontSize: "17px"
          }}>
            {passage}
          </div>

          <textarea
            value={typed}
            disabled={!started}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Click Start Practice, then type the passage here..."
            rows={7}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "15px",
              marginTop: "18px",
              borderRadius: "9px",
              border: "1px solid #cbd2df",
              fontSize: "16px",
              lineHeight: 1.7
            }}
          />
        </section>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "18px"
        }}>
          {[
            ["Time Left", formatTime(remaining)],
            ["Speed", `${wpm} WPM`],
            ["Accuracy", `${accuracy}%`],
            ["Errors", String(errors)]
          ].map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <p style={{ color: "#667085" }}>{label}</p>
              <h2 style={{ color: "#243b70" }}>{value}</h2>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2>Practice History</h2>

          {history.length === 0 ? (
            <p>No practice sessions yet. Complete your first test!</p>
          ) : (
            history.map((session, index) => (
              <div
                key={index}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #eee"
                }}
              >
                <strong>{session.wpm} WPM</strong>
                {" | "}
                {session.accuracy}% accuracy
                <p style={{ color: "#777", fontSize: "13px" }}>
                  {session.date}
                </p>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#294b91",
  color: "white",
  border: "none",
  padding: "12px 20px",
  borderRadius: "7px",
  cursor: "pointer"
};
