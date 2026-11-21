import React, { useEffect, useMemo, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Passage = {
  id: number;
  title: string;
  category: string;
  text: string;
};

type Session = {
  date: string;
  wpm: number;
  accuracy: number;
  duration: number;
  words: number;
};

const topics = [
  ["SSC English", "Education", "Education gives people the knowledge and confidence to build a better future. Students should develop discipline, read regularly and practise their skills. Hard work and determination help them achieve their goals."],
  ["SSC English", "Discipline", "Discipline is an important quality in every person's life. It teaches us to respect time, follow rules and complete our responsibilities. A disciplined person can overcome difficulties through patience and regular effort."],
  ["Government", "Public Service", "Public service is an important responsibility of the government. Public institutions work to provide essential facilities, maintain public welfare and support the development of society."],
  ["Government", "Indian Democracy", "Democracy gives citizens the right to participate in the government of their country. Every eligible voter should understand the importance of elections. A strong democracy depends on awareness and equality."],
  ["Current Affairs", "Technology", "Technology has changed the way people communicate, learn and work. Digital services make information more accessible and help organisations improve their efficiency."],
  ["Current Affairs", "Environment", "Environmental protection is necessary for a healthy future. Air pollution, water pollution and deforestation affect people, animals and plants. Everyone can contribute by saving resources."],
  ["General English", "Time Management", "Time management helps people complete important tasks in an organised manner. A clear schedule reduces confusion and improves productivity."],
  ["General English", "Communication", "Good communication is essential in personal and professional life. A clear message helps people understand one another and work together."],
  ["News Practice", "National Development", "The development of a nation depends on education, infrastructure, healthcare and employment opportunities. Public participation and effective policies can improve living standards."],
  ["News Practice", "Economic Growth", "Economic growth creates opportunities for businesses and workers. Investment, innovation and skill development support productivity."]
];

const variations = [
  "Regular practice improves knowledge and develops confidence. People should remain focused, learn from experience and continue making progress.",
  "It is important to understand challenges and find practical solutions. Cooperation, planning and dedication help individuals complete their responsibilities.",
  "Modern society requires people to remain informed and adaptable. New opportunities appear when individuals develop useful skills.",
  "A responsible approach creates positive results for individuals and society. Everyone should respect the rights of others and contribute to common goals.",
  "The future depends on the decisions we make today. We should use our time wisely, respect our responsibilities and work towards improvement."
];

const passages: Passage[] = topics.flatMap((topic, i) =>
  variations.map((variation, j) => ({
    id: i * 5 + j + 1,
    category: topic[0],
    title: `${topic[1]} - Practice ${j + 1}`,
    text: `${topic[2]} ${variation}`
  }))
);

const categories = ["All", ...Array.from(new Set(passages.map(p => p.category)))];

const challengeParagraphs = [
  "Education plays an important role in the progress of individuals and society. It provides knowledge, develops confidence and prepares people to face different situations. Students should build good habits, manage their time carefully and remain interested in learning. Regular reading improves vocabulary and helps people express their thoughts clearly. Practical knowledge is also important because it allows learners to apply ideas in everyday situations.",
  "A successful society depends on responsible citizens and effective public institutions. Government departments provide essential services, maintain public facilities and work for the welfare of people. Citizens can support development by following rules, protecting public property and participating in community activities. Awareness and cooperation help solve common problems. Every person can make a positive contribution through honesty, patience and responsible behaviour.",
  "Technology has changed communication, education, transport and business. Digital tools allow people to access information quickly and complete many tasks efficiently. However, technology should be used carefully and responsibly. People should protect personal information, verify online information and maintain a healthy balance between digital activities and other responsibilities. Learning new skills helps individuals adapt to changes and benefit from new opportunities.",
  "Time management is an essential skill for students and working professionals. A clear plan helps people identify important tasks and use their available time wisely. Large tasks can be divided into smaller activities that are easier to complete. Regular practice, short breaks and proper revision can improve performance. Progress may take time, but consistent effort helps people develop confidence and achieve meaningful goals.",
  "Environmental protection is a shared responsibility. Clean air, safe drinking water and healthy natural resources are necessary for every community. People can help protect the environment by reducing waste, saving electricity and using resources carefully. Public awareness and community participation are important for long-term improvement. Development should consider both present needs and the well-being of future generations.",
  "Good communication makes cooperation easier. A clear speaker organises ideas, chooses suitable words and listens carefully to others. Reading, writing and regular conversation can improve communication skills. In professional situations, people should present information politely and accurately. Listening is just as important as speaking because it helps people understand different opinions and find practical solutions."
];

function makeChallenge(count: number) {
  const words = challengeParagraphs.join(" ").split(/\s+/);
  const result: string[] = [];

  while (result.length < count) {
    result.push(...words);
  }

  return result.slice(0, count).join(" ");
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [mode, setMode] = useState("words");
  const [wordGoal, setWordGoal] = useState(500);
  const [duration, setDuration] = useState(20);
  const [target, setTarget] = useState(30);
  const [selected, setSelected] = useState(1);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(1200);
  const [elapsed, setElapsed] = useState(0);

  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const [customTitle, setCustomTitle] = useState("");
  const [customText, setCustomText] = useState("");
  const [savedPassages, setSavedPassages] = useState<Passage[]>(
    () => readStorage("steno-saved-passages", [])
  );
  const [activeSaved, setActiveSaved] = useState<Passage | null>(null);

  const [history, setHistory] = useState<Session[]>(
    () => readStorage("steno-history", [])
  );

  const passage = passages.find(p => p.id === selected) || passages[0];

  const filtered = useMemo(() => passages.filter(p =>
    (category === "All" || p.category === category) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.text.toLowerCase().includes(search.toLowerCase()))
  ), [category, search]);

  const challengeText = useMemo(() => makeChallenge(wordGoal), [wordGoal]);

  const activeText = page === "Upload PDF"
    ? pdfText
    : activeSaved
      ? activeSaved.text
      : mode === "words"
        ? challengeText
        : passage.text;

  const correct = [...typed].filter((c, i) => c === activeText[i]).length;
  const errors = typed.length - correct;
  const accuracy = typed.length ? Math.round(correct / typed.length * 100) : 100;
  const wpm = elapsed > 0
    ? Math.round(correct / 5 / (elapsed / 60))
    : 0;

  const best = history.length ? Math.max(...history.map(s => s.wpm)) : 0;
  const average = history.length
    ? Math.round(history.reduce((sum, s) => sum + s.wpm, 0) / history.length)
    : 0;

  const completedWords = typed.trim()
    ? typed.trim().split(/\s+/).length
    : 0;

  const wordProgress = Math.min(
    100,
    Math.round((typed.length / Math.max(activeText.length, 1)) * 100)
  );

  useEffect(() => {
    localStorage.setItem("steno-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("steno-saved-passages", JSON.stringify(savedPassages));
  }, [savedPassages]);

  useEffect(() => {
    if (!started) return;

    const timer = window.setInterval(() => {
      setElapsed(old => old + 1);

      if (mode === "time") {
        setRemaining(old => Math.max(0, old - 1));
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, mode]);

  useEffect(() => {
    if (started && mode === "time" && remaining === 0) {
      finishTest();
    }
  }, [remaining, started, mode]);

  useEffect(() => {
    if (started && mode === "words" && typed.length >= activeText.length) {
      finishTest();
    }
  }, [typed, started, mode, activeText.length]);

  function formatTime(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function startTest() {
    if (!activeText.trim()) {
      alert("Please select a passage or upload a PDF first.");
      return;
    }

    setTyped("");
    setElapsed(0);
    setRemaining(duration * 60);
    setStarted(true);
  }

  function finishTest() {
    if (!started) return;

    const finalCorrect = [...typed].filter((c, i) => c === activeText[i]).length;
    const finalAccuracy = typed.length
      ? Math.round(finalCorrect / typed.length * 100)
      : 100;
    const finalWpm = elapsed > 0
      ? Math.round(finalCorrect / 5 / (elapsed / 60))
      : 0;

    if (typed.length > 0) {
      setHistory(old => [{
        date: new Date().toLocaleString(),
        wpm: finalWpm,
        accuracy: finalAccuracy,
        duration: elapsed,
        words: completedWords
      }, ...old].slice(0, 200));
    }

    setStarted(false);
  }

  function resetTest() {
    setStarted(false);
    setTyped("");
    setElapsed(0);
    setRemaining(duration * 60);
  }

  function savePassage() {
    if (!customTitle.trim() || !customText.trim()) {
      alert("Enter both a passage title and passage text.");
      return;
    }

    const newPassage: Passage = {
      id: Date.now(),
      title: customTitle.trim(),
      category: "My Passages",
      text: customText.trim()
    };

    setSavedPassages(old => [newPassage, ...old]);
    setCustomTitle("");
    setCustomText("");
    alert("Your passage has been saved.");
  }

  async function uploadPDF(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please select a PDF file.");
      return;
    }

    setPdfError("");
    setPdfText("");
    setPdfLoading(true);
    setStarted(false);
    setTyped("");
    setActiveSaved(null);
    setPdfName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({
        data: new Uint8Array(buffer)
      }).promise;

      let extracted = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const pageData = await pdf.getPage(pageNumber);
        const content = await pageData.getTextContent();

        const pageText = content.items
          .map(item => "str" in item ? item.str : "")
          .filter(Boolean)
          .join(" ");

        extracted += pageText + "\n\n";
      }

      extracted = extracted.replace(/[ \t]+/g, " ").trim();

      if (!extracted) {
        setPdfError("No selectable text was found. This may be a scanned PDF.");
      } else {
        setPdfText(extracted);
      }
    } catch {
      setPdfError("Unable to read this PDF. Please try another PDF file.");
    } finally {
      setPdfLoading(false);
      event.target.value = "";
    }
  }

  const blue = "#315fce";
  const navy = "#172b4d";
  const muted = "#718096";
  const border = "#e5eaf2";
  const panel: React.CSSProperties = {
    background: "#ffffff",
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 22,
    boxShadow: "0 3px 14px rgba(26, 45, 80, 0.04)"
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: 12,
    borderRadius: 9,
    border: `1px solid ${border}`,
    background: "#ffffff",
    color: navy,
    fontSize: 14
  };

  const button: React.CSSProperties = {
    background: blue,
    color: "#ffffff",
    border: 0,
    borderRadius: 9,
    padding: "11px 17px",
    fontWeight: 600,
    cursor: "pointer"
  };

  const navItems = [
    ["Dashboard", "▦"],
    ["Practice", "⌨"],
    ["Upload PDF", "▤"],
    ["My Passages", "▣"],
    ["Milestones", "✦"],
    ["History", "◷"]
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f7fb",
      color: navy,
      fontFamily: "Inter, Arial, sans-serif"
    }}>
      <style>{`
        * { box-sizing:border-box; }
        button:disabled { opacity:.5; cursor:not-allowed; }
        .layout { display:flex; min-height:100vh; }
        .sidebar { width:245px; flex-shrink:0; background:#fff; border-right:1px solid ${border}; padding:25px 16px; }
        .content { max-width:1250px; width:100%; margin:auto; padding:30px; }
        .nav { width:100%; display:block; text-align:left; border:0; background:transparent; color:#65748b; padding:13px; border-radius:9px; margin:4px 0; cursor:pointer; font-size:14px; }
        .nav.active { color:${blue}; background:#edf3ff; font-weight:700; }
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:15px; margin:22px 0; }
        .mainGrid { display:grid; grid-template-columns:minmax(0,1fr) 290px; gap:18px; align-items:start; }
        .passageList { max-height:350px; overflow-y:auto; }
        .passageItem { display:block; width:100%; text-align:left; padding:13px; border:1px solid ${border}; border-radius:10px; background:#fff; color:${navy}; margin:7px 0; cursor:pointer; }
        .passageItem.selected { border-color:${blue}; background:#f1f5ff; }
        .progress { height:9px; background:#e8edf5; border-radius:20px; overflow:hidden; }
        .progress > div { height:100%; background:${blue}; border-radius:20px; }
        @media(max-width:800px) {
          .layout { display:block; }
          .sidebar { width:100%; padding:10px; display:flex; overflow-x:auto; align-items:center; }
          .brand { display:none; }
          .nav { width:auto; white-space:nowrap; }
          .content { padding:16px; }
          .stats { grid-template-columns:repeat(2,1fr); }
          .mainGrid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="brand" style={{ padding: "4px 10px 25px" }}>
            <h2 style={{ color: blue, margin: 0, letterSpacing: -0.8 }}>
              STENO <span style={{ color: navy }}>TYPING</span>
            </h2>
            <p style={{ fontSize: 10, color: muted, letterSpacing: 1.5 }}>
              PROFESSIONAL PRACTICE STUDIO
            </p>
          </div>

          {navItems.map(([item, symbol]) => (
            <button
              key={item}
              className={`nav ${page === item ? "active" : ""}`}
              onClick={() => {
                if (started) finishTest();
                setPage(item);
                setTyped("");
              }}
            >
              <span style={{ display: "inline-block", width: 25 }}>{symbol}</span>
              {item}
            </button>
          ))}

          <div className="brand" style={{ marginTop: 30, padding: 10 }}>
            <p style={{ fontSize: 11, color: muted, fontWeight: 700 }}>YOUR TARGET</p>
            <h2 style={{ margin: "5px 0", color: navy }}>{target} WPM</h2>
            <select style={input} value={target} onChange={e => setTarget(Number(e.target.value))}>
              {[20, 30, 40, 50, 60, 80, 100].map(n =>
                <option key={n} value={n}>{n} WPM</option>
              )}
            </select>
          </div>
        </aside>

        <main className="content">
          <header style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap"
          }}>
            <div>
              <p style={{ color: muted, margin: "0 0 5px", fontSize: 12, letterSpacing: 1 }}>
                YOUR PERSONAL PRACTICE SPACE
              </p>
              <h1 style={{ margin: 0, fontSize: 28 }}>{page}</h1>
            </div>
            <div style={{
              background: "#fff",
              border: `1px solid ${border}`,
              padding: "11px 15px",
              borderRadius: 10,
              color: muted,
              fontSize: 13
            }}>
              Consistency creates progress.
            </div>
          </header>

          <section className="stats">
            {[
              ["Personal Best", `${best} WPM`],
              ["Average Speed", `${average} WPM`],
              ["Tests Completed", String(history.length)],
              ["Current Accuracy", `${accuracy}%`]
            ].map(([label, value]) => (
              <div key={label} style={panel}>
                <div style={{ color: muted, fontSize: 12 }}>{label}</div>
                <h2 style={{ margin: "12px 0 0", fontSize: 26 }}>{value}</h2>
              </div>
            ))}
          </section>

          {page === "Dashboard" && (
            <>
              <section style={{ ...panel, marginBottom: 18 }}>
                <p style={{ color: blue, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                  FEATURED CHALLENGE
                </p>
                <h2 style={{ fontSize: 25, margin: "5px 0" }}>500-Word Typing Challenge</h2>
                <p style={{ color: muted, lineHeight: 1.7 }}>
                  Build your typing consistency with a 500-word practice passage and a target speed of 30 WPM.
                </p>
                <div style={{ display: "flex", gap: 25, flexWrap: "wrap", margin: "18px 0" }}>
                  <div><strong>500</strong><div style={{ color: muted, fontSize: 12 }}>Words</div></div>
                  <div><strong>30 WPM</strong><div style={{ color: muted, fontSize: 12 }}>Target speed</div></div>
                  <div><strong>16:40</strong><div style={{ color: muted, fontSize: 12 }}>Estimated time</div></div>
                </div>
                <button style={button} onClick={() => {
                  setMode("words");
                  setWordGoal(500);
                  setTarget(30);
                  setActiveSaved(null);
                  setPage("Practice");
                }}>
                  Start 500-word challenge →
                </button>
              </section>

              <section style={panel}>
                <h3 style={{ marginTop: 0 }}>Quick Practice</h3>
                <p style={{ color: muted, fontSize: 14 }}>Choose a practice mode to begin.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={button} onClick={() => {
                    setMode("time");
                    setDuration(20);
                    setRemaining(1200);
                    setPage("Practice");
                  }}>20-minute practice</button>
                  <button style={{ ...button, background: "#eaf0ff", color: blue }} onClick={() => {
                    setMode("words");
                    setWordGoal(500);
                    setPage("Practice");
                  }}>Word-count practice</button>
                </div>
              </section>
            </>
          )}

          {page === "Practice" && (
            <>
              <div className="mainGrid">
                <section style={panel}>
                  <p style={{ color: blue, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                    TYPING WORKSPACE
                  </p>
                  <h2 style={{ marginTop: 5 }}>Practice session</h2>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
                    {[
                      ["words", "Word challenge"],
                      ["time", "Timed practice"],
                      ["passage", "Passage practice"]
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        disabled={started}
                        onClick={() => {
                          setMode(value);
                          setActiveSaved(null);
                          setTyped("");
                          setElapsed(0);
                          setRemaining(duration * 60);
                        }}
                        style={{
                          ...button,
                          background: mode === value ? blue : "#edf1f8",
                          color: mode === value ? "#fff" : navy,
                          padding: "9px 12px",
                          fontSize: 12
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {mode === "words" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, color: muted }}>Choose word count</label>
                      <select
                        style={{ ...input, marginTop: 7 }}
                        disabled={started}
                        value={wordGoal}
                        onChange={e => {
                          setWordGoal(Number(e.target.value));
                          setTyped("");
                          setActiveSaved(null);
                        }}
                      >
                        {[100, 250, 500, 1000].map(n =>
                          <option key={n} value={n}>{n} words</option>
                        )}
                      </select>
                    </div>
                  )}

                  {mode === "time" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, color: muted }}>Choose duration</label>
                      <select
                        style={{ ...input, marginTop: 7 }}
                        disabled={started}
                        value={duration}
                        onChange={e => {
                          const value = Number(e.target.value);
                          setDuration(value);
                          setRemaining(value * 60);
                        }}
                      >
                        {[5, 10, 20, 30].map(n =>
                          <option key={n} value={n}>{n} minutes</option>
                        )}
                      </select>
                    </div>
                  )}

                  {mode === "passage" && (
                    <div style={{ marginBottom: 16 }}>
                      <strong>{activeSaved?.title || passage.title}</strong>
                      <p style={{ color: muted, fontSize: 12 }}>
                        {activeSaved ? "Your saved passage" : passage.category}
                      </p>
                    </div>
                  )}

                  <div style={{
                    padding: 18,
                    borderRadius: 12,
                    background: "#f5f7fb",
                    border: `1px solid ${border}`,
                    lineHeight: 2,
                    fontSize: 16,
                    maxHeight: 350,
                    overflowY: "auto",
                    whiteSpace: "pre-wrap"
                  }}>
                    {activeText.split("").map((char, index) => {
                      const typedChar = typed[index];
                      const isCorrect = typedChar === char;
                      return (
                        <span key={index} style={{
                          color: typedChar === undefined ? "#263955" : isCorrect ? "#159568" : "#d94355",
                          background: typedChar === undefined
                            ? "transparent"
                            : isCorrect ? "#dff5e9" : "#ffe4e8"
                        }}>
                          {char}
                        </span>
                      );
                    })}
                  </div>

                  <textarea
                    value={typed}
                    disabled={!started}
                    maxLength={activeText.length}
                    onChange={e => setTyped(e.target.value)}
                    placeholder={started ? "Start typing here..." : "Press Start Test to begin typing"}
                    rows={6}
                    style={{
                      ...input,
                      marginTop: 15,
                      lineHeight: 1.8,
                      resize: "vertical",
                      fontSize: 16
                    }}
                  />

                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 14 }}>
                    <button style={button} onClick={startTest} disabled={started}>
                      ▶ Start Test
                    </button>
                    <button
                      style={{ ...button, background: "#d94e5d" }}
                      onClick={finishTest}
                      disabled={!started}
                    >
                      Finish Test
                    </button>
                    <button
                      style={{ ...button, background: "#edf1f8", color: navy }}
                      onClick={resetTest}
                    >
                      Reset
                    </button>
                  </div>
                </section>

                <aside style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  <section style={panel}>
                    <p style={{ color: muted, fontSize: 11, fontWeight: 700 }}>TIME REMAINING</p>
                    <h1 style={{ fontSize: 38, color: blue, margin: "5px 0" }}>
                      {mode === "time" ? formatTime(remaining) : formatTime(elapsed)}
                    </h1>
                    <p style={{ color: muted, fontSize: 12 }}>
                      {mode === "time" ? "Countdown timer" : "Elapsed practice time"}
                    </p>
                  </section>

                  <section style={panel}>
                    <p style={{ color: muted, fontSize: 11, fontWeight: 700 }}>LIVE PERFORMANCE</p>
                    <h2 style={{ color: blue, fontSize: 32, margin: "8px 0" }}>{wpm} WPM</h2>
                    <p>Accuracy: <strong>{accuracy}%</strong></p>
                    <p>Errors: <strong style={{ color: "#d94355" }}>{errors}</strong></p>
                    <p>Words typed: <strong>{completedWords}</strong></p>
                    <div className="progress">
                      <div style={{ width: `${mode === "words" ? wordProgress : Math.min(100, wpm / target * 100)}%` }} />
                    </div>
                    <p style={{ color: muted, fontSize: 12 }}>
                      {mode === "words"
                        ? `${wordProgress}% of passage completed`
                        : `Target: ${target} WPM`}
                    </p>
                  </section>

                  <section style={panel}>
                    <p style={{ color: muted, fontSize: 11, fontWeight: 700 }}>YOUR TARGET</p>
                    <select
                      style={input}
                      value={target}
                      disabled={started}
                      onChange={e => setTarget(Number(e.target.value))}
                    >
                      {[20, 30, 40, 50, 60, 80, 100].map(n =>
                        <option key={n} value={n}>{n} WPM</option>
                      )}
                    </select>
                  </section>
                </aside>
              </div>

              <section style={{ ...panel, marginTop: 18 }}>
                <h3>Passage library</h3>
                <input
                  style={input}
                  placeholder="Search passages..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "13px 0" }}>
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        ...button,
                        background: category === c ? blue : "#edf1f8",
                        color: category === c ? "#fff" : navy,
                        padding: "8px 11px",
                        fontSize: 12
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="passageList">
                  {filtered.map(p => (
                    <button
                      key={p.id}
                      className={`passageItem ${selected === p.id && mode === "passage" ? "selected" : ""}`}
                      disabled={started}
                      onClick={() => {
                        setSelected(p.id);
                        setMode("passage");
                        setActiveSaved(null);
                        setTyped("");
                      }}
                    >
                      <strong>{p.title}</strong>
                      <div style={{ color: muted, fontSize: 12, marginTop: 5 }}>{p.category}</div>
                    </button>
                  ))}
                  {filtered.length === 0 && <p>No passages found.</p>}
                </div>
              </section>
            </>
          )}

          {page === "Upload PDF" && (
            <section style={panel}>
              <h2>Upload your PDF</h2>
              <p style={{ color: muted, fontSize: 14 }}>
                Select a text-based PDF. Text extraction happens in your browser.
              </p>
              <label style={{
                display: "block",
                border: `2px dashed ${blue}`,
                borderRadius: 12,
                padding: 30,
                textAlign: "center",
                cursor: "pointer",
                background: "#f5f8ff"
              }}>
                <div style={{ fontSize: 35 }}>▤</div>
                <strong>Select PDF file</strong>
                <p style={{ color: muted, fontSize: 12 }}>PDF files only</p>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={uploadPDF}
                  style={{ display: "none" }}
                />
              </label>
              {pdfLoading && <p style={{ color: blue }}>Reading your PDF. Please wait...</p>}
              {pdfName && <p style={{ color: muted, fontSize: 13 }}>Selected: {pdfName}</p>}
              {pdfError && <p style={{ color: "#d94355" }}>{pdfError}</p>}
              {pdfText && (
                <>
                  <p style={{ color: "#159568", fontSize: 13 }}>
                    PDF text extracted successfully. {pdfText.length} characters found.
                  </p>
                  <div style={{
                    padding: 16,
                    background: "#f5f7fb",
                    borderRadius: 10,
                    maxHeight: 250,
                    overflow: "auto",
                    lineHeight: 1.8
                  }}>
                    {pdfText.slice(0, 1500)}
                    {pdfText.length > 1500 ? "..." : ""}
                  </div>
                  <button style={{ ...button, marginTop: 15 }} onClick={() => {
                    setPage("Practice");
                    setMode("passage");
                    setActiveSaved(null);
                  }}>
                    Practise this PDF →
                  </button>
                </>
              )}
            </section>
          )}

          {page === "My Passages" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
              <section style={panel}>
                <h2 style={{ marginTop: 0 }}>Create a passage</h2>
                <p style={{ color: muted, fontSize: 13 }}>Save your own material for future practice.</p>
                <label style={{ fontSize: 13 }}>Passage title</label>
                <input
                  style={{ ...input, margin: "7px 0 14px" }}
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Enter a title"
                />
                <label style={{ fontSize: 13 }}>Passage text</label>
                <textarea
                  style={{ ...input, marginTop: 7, lineHeight: 1.7 }}
                  rows={9}
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder="Paste or type your passage here..."
                />
                <button style={{ ...button, marginTop: 13 }} onClick={savePassage}>
                  Save passage
                </button>
              </section>

              <section style={panel}>
                <h2 style={{ marginTop: 0 }}>Saved passages</h2>
                {savedPassages.length === 0 && (
                  <p style={{ color: muted }}>You haven't saved any passages yet.</p>
                )}
                {savedPassages.map(p => (
                  <div key={p.id} style={{
                    padding: 12,
                    borderBottom: `1px solid ${border}`
                  }}>
                    <strong>{p.title}</strong>
                    <p style={{ color: muted, fontSize: 12 }}>
                      {p.text.split(/\s+/).length} words
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ ...button, padding: "8px 11px", fontSize: 12 }} onClick={() => {
                        setActiveSaved(p);
                        setMode("passage");
                        setPage("Practice");
                        setTyped("");
                      }}>
                        Practise
                      </button>
                      <button
                        style={{ ...button, padding: "8px 11px", fontSize: 12, background: "#fff0f1", color: "#c63f50" }}
                        onClick={() => setSavedPassages(old => old.filter(item => item.id !== p.id))}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}

          {page === "Milestones" && (
            <section style={panel}>
              <h2 style={{ marginTop: 0 }}>Typing milestones</h2>
              <p style={{ color: muted, fontSize: 14 }}>
                Your achievements are based on completed practice sessions.
              </p>
              {[
                { name: "First Steps", detail: "Complete your first test", done: history.length >= 1 },
                { name: "Practice Regularly", detail: "Complete 5 tests", done: history.length >= 5 },
                { name: "Dedicated Learner", detail: "Complete 10 tests", done: history.length >= 10 },
                { name: "Accuracy Champion", detail: "Reach 95% accuracy in a test", done: history.some(s => s.accuracy >= 95) },
                { name: "20-Minute Finisher", detail: "Complete a 20-minute practice", done: history.some(s => s.duration >= 1200) },
                { name: "20 WPM Club", detail: "Reach 20 WPM", done: best >= 20 },
                { name: "30 WPM Club", detail: "Reach 30 WPM", done: best >= 30 },
                { name: "40 WPM Club", detail: "Reach 40 WPM", done: best >= 40 },
                { name: "50 WPM Club", detail: "Reach 50 WPM", done: best >= 50 },
                { name: "60 WPM Club", detail: "Reach 60 WPM", done: best >= 60 }
              ].map(m => (
                <div key={m.name} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: 15,
                  borderBottom: `1px solid ${border}`
                }}>
                  <div>
                    <strong>{m.name}</strong>
                    <p style={{ color: muted, fontSize: 12, margin: "5px 0 0" }}>{m.detail}</p>
                  </div>
                  <span style={{
                    color: m.done ? "#159568" : muted,
                    fontSize: 13,
                    fontWeight: 700
                  }}>
                    {m.done ? "✓ Achieved" : "Locked"}
                  </span>
                </div>
              ))}
            </section>
          )}

          {page === "History" && (
            <section style={panel}>
              <h2 style={{ marginTop: 0 }}>Practice history</h2>
              {history.length === 0 ? (
                <p style={{ color: muted }}>No tests completed yet. Start practising to build your history.</p>
              ) : (
                history.map((s, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: 14,
                    borderBottom: `1px solid ${border}`
                  }}>
                    <div>
                      <strong>{s.wpm} WPM</strong>
                      <p style={{ color: muted, fontSize: 12, margin: "5px 0" }}>{s.date}</p>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 13 }}>
                      <strong>{s.accuracy}% accuracy</strong>
                      <p style={{ color: muted, margin: "5px 0" }}>{formatTime(s.duration)} · {s.words} words</p>
                    </div>
                  </div>
                ))
              )}
              <button
                style={{ ...button, background: "#fff0f1", color: "#c63f50", marginTop: 18 }}
                onClick={() => {
                  if (window.confirm("Delete all practice history?")) setHistory([]);
                }}
              >
                Clear history
              </button>
            </section>
          )}

          <footer style={{
            textAlign: "center",
            color: muted,
            fontSize: 12,
            padding: 28
          }}>
            STENO TYPING · Practice regularly. Improve consistently.
          </footer>
        </main>
      </div>
    </div>
  );
}
