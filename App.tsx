
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

export default function App() {
  const [page, setPage] = useState("Practice");
  const [selected, setSelected] = useState(1);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [duration, setDuration] = useState(3);
  const [target, setTarget] = useState(80);
  const [remaining, setRemaining] = useState(180);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [dark, setDark] = useState(false);

  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const [history, setHistory] = useState<Session[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("steno-history") || "[]");
    } catch {
      return [];
    }
  });

  const passage = passages.find(p => p.id === selected) || passages[0];
  const activeText = page === "Upload PDF" ? pdfText : passage.text;

  const filtered = useMemo(() => passages.filter(p =>
    (category === "All" || p.category === category) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) ||
     p.text.toLowerCase().includes(search.toLowerCase()))
  ), [category, search]);

  const elapsed = Math.max(1, duration * 60 - remaining);
  const correct = [...typed].filter((c, i) => c === activeText[i]).length;
  const errors = typed.length - correct;
  const accuracy = typed.length ? Math.round(correct / typed.length * 100) : 100;
  const wpm = Math.round(correct / 5 / (elapsed / 60));

  const best = history.length ? Math.max(...history.map(s => s.wpm)) : 0;
  const average = history.length
    ? Math.round(history.reduce((sum, s) => sum + s.wpm, 0) / history.length)
    : 0;

  useEffect(() => {
    localStorage.setItem("steno-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      setRemaining(old => Math.max(0, old - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (remaining === 0 && started) finishTest();
  }, [remaining, started]);

  function startTest() {
    if (!activeText.trim()) {
      alert("Please select a passage or upload a PDF first.");
      return;
    }
    setTyped("");
    setRemaining(duration * 60);
    setStarted(true);
  }

  function finishTest() {
    if (typed.length > 0) {
      setHistory(old => [{
        date: new Date().toLocaleString(),
        wpm,
        accuracy,
        duration: elapsed
      }, ...old].slice(0, 100));
    }
    setStarted(false);
  }

  function formatTime(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
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
    setTyped("");
    setPdfLoading(true);
    setStarted(false);
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
        setPdfError("No selectable text was found. This may be a scanned PDF. Please use a text-based PDF.");
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

  const bg = dark ? "#101827" : "#f3f5fa";
  const card = dark ? "#1c293b" : "#ffffff";
  const text = dark ? "#edf2fa" : "#1c2940";
  const muted = dark ? "#a5b2c5" : "#738096";
  const border = dark ? "#34445b" : "#e7eaf1";
  const blue = "#4568d8";

  const button: React.CSSProperties = {
    border: "none",
    borderRadius: 9,
    background: blue,
    color: "white",
    padding: "11px 17px",
    fontWeight: 600,
    cursor: "pointer"
  };

  const panel: React.CSSProperties = {
    background: card,
    border: `1px solid ${border}`,
    borderRadius: 15,
    padding: 20,
    color: text
  };

  const input: React.CSSProperties = {
    background: dark ? "#26364c" : "#f7f8fc",
    color: text,
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: "11px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      color: text,
      fontFamily: "Arial, sans-serif"
    }}>
      <style>{`
        * { box-sizing: border-box; }
        button:disabled { opacity: .5; cursor: not-allowed; }
        .layout { display:flex; min-height:100vh; }
        .sidebar { width:225px; padding:25px 16px; border-right:1px solid ${border}; background:${card}; flex-shrink:0; }
        .content { max-width:1150px; width:100%; margin:auto; padding:28px; }
        .nav { display:block; width:100%; text-align:left; border:0; background:transparent; color:${muted}; padding:13px; border-radius:9px; margin:5px 0; cursor:pointer; }
        .nav.active { background:${dark ? "#30466b" : "#edf1ff"}; color:${dark ? "#fff" : blue}; font-weight:bold; }
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:20px 0; }
        .mainGrid { display:grid; grid-template-columns:1fr 290px; gap:18px; align-items:start; }
        .passageList { max-height:400px; overflow-y:auto; }
        .passageItem { display:block; width:100%; text-align:left; padding:12px; border:1px solid ${border}; border-radius:9px; background:transparent; color:${text}; margin:8px 0; cursor:pointer; }
        .passageItem.selected { border-color:${blue}; background:${dark ? "#263957" : "#f0f3ff"}; }
        @media(max-width:760px) {
          .layout { display:block; }
          .sidebar { width:100%; display:flex; overflow-x:auto; padding:10px; }
          .sidebar h2,.sidebar p { display:none; }
          .nav { width:auto; white-space:nowrap; }
          .content { padding:16px; }
          .stats { grid-template-columns:repeat(2,1fr); }
          .mainGrid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div style={{ padding: "5px 10px 25px" }}>
            <h2 style={{ color: blue, margin: 0 }}>STENO<span style={{ color: text }}>PRO</span></h2>
            <p style={{ fontSize: 11, color: muted }}>TYPING PRACTICE STUDIO</p>
          </div>

          {["Dashboard", "Practice", "Upload PDF", "History"].map(item => (
            <button key={item} className={`nav ${page === item ? "active" : ""}`} onClick={() => {
              if (started) finishTest();
              setPage(item);
              setTyped("");
            }}>
              {item === "Dashboard" ? "▦" : item === "Practice" ? "⌨" : item === "Upload PDF" ? "📄" : "◷"}　{item}
            </button>
          ))}

          <div style={{ marginTop: 30, padding: 10, color: muted, fontSize: 12 }}>
            YOUR TARGET
            <h2 style={{ color: text }}>{target} <small style={{ fontSize: 12 }}>WPM</small></h2>
            <select style={input} value={target} onChange={e => setTarget(Number(e.target.value))}>
              {[40, 60, 80, 100, 120].map(n => <option key={n} value={n}>{n} WPM</option>)}
            </select>
          </div>

          <button className="nav" onClick={() => setDark(!dark)} style={{ marginTop: 25 }}>
            {dark ? "☀ Light mode" : "☾ Dark mode"}
          </button>
        </aside>

        <main className="content">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ color: muted, margin: "0 0 5px", fontSize: 13 }}>YOUR PERSONAL PRACTICE SPACE</p>
              <h1 style={{ margin: 0, fontSize: 27 }}>{page}</h1>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 11, color: muted, fontSize: 13 }}>
              ✦ Daily improvement starts here
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
                <div style={{ color: muted, fontSize: 13 }}>{label}</div>
                <h2 style={{ margin: "12px 0 0", fontSize: 25 }}>{value}</h2>
              </div>
            ))}
          </section>

          {(page === "Practice" || page === "Upload PDF") && (
            <div className="mainGrid">
              <section style={panel}>
                {page === "Upload PDF" ? (
                  <>
                    <h2 style={{ marginTop: 0 }}>Upload your PDF</h2>
                    <p style={{ color: muted, fontSize: 14 }}>
                      Choose a text-based PDF. Its text will be extracted in your browser.
                    </p>
                    <label style={{
                      display: "block",
                      border: `2px dashed ${blue}`,
                      borderRadius: 12,
                      padding: 25,
                      textAlign: "center",
                      cursor: "pointer",
                      background: dark ? "#142237" : "#f5f7fc"
                    }}>
                      <div style={{ fontSize: 35 }}>📄</div>
                      <strong>Select PDF file</strong>
                      <p style={{ color: muted, fontSize: 12 }}>PDF files only</p>
                      <input type="file" accept=".pdf,application/pdf" onChange={uploadPDF} style={{ display: "none" }} />
                    </label>

                    {pdfLoading && <p style={{ color: blue }}>Reading your PDF... Please wait.</p>}
                    {pdfName && <p style={{ color: muted, fontSize: 13 }}>Selected: {pdfName}</p>}
                    {pdfError && <p style={{ color: "#e25b63" }}>{pdfError}</p>}
                    {pdfText && (
                      <p style={{ color: "#24a36b", fontSize: 13 }}>
                        PDF text extracted successfully. {pdfText.length} characters found.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ color: muted, fontSize: 12 }}>PRACTICE SESSION</p>
                    <h2 style={{ marginTop: 0 }}>{passage.title}</h2>
                    <span style={{ color: blue, fontSize: 13 }}>{passage.category}</span>
                  </>
                )}

                {activeText && (
                  <>
                    <div style={{
                      marginTop: 18,
                      padding: 18,
                      borderRadius: 11,
                      background: dark ? "#142237" : "#f5f7fc",
                      lineHeight: 2,
                      fontSize: 16,
                      maxHeight: 350,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap"
                    }}>
                      {activeText.split("").map((char, index) => {
                        const typedChar = typed[index];
                        const right = typedChar === undefined || typedChar === char;
                        return (
                          <span key={index} style={{
                            color: typedChar === undefined ? text : right ? "#24a36b" : "#e24d59",
                            background: typedChar === undefined ? "transparent" : right ? (dark ? "#183e37" : "#e1f6eb") : (dark ? "#512a38" : "#ffe8eb")
                          }}>{char}</span>
                        );
                      })}
                    </div>

                    <textarea
                      value={typed}
                      disabled={!started}
                      maxLength={activeText.length}
                      onChange={e => setTyped(e.target.value)}
                      placeholder={started ? "Start typing the passage here..." : "Press Start Test to begin"}
                      rows={6}
                      style={{ ...input, marginTop: 16, lineHeight: 1.8, resize: "vertical", fontSize: 16 }}
                    />

                    <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                      <button style={button} onClick={startTest}>▶ Start Test</button>
                      <button style={{ ...button, background: "#dc5964" }} onClick={finishTest} disabled={!started}>Finish Test</button>
                      <button style={{ ...button, background: dark ? "#34445b" : "#e8ebf3", color: text }} disabled={started} onClick={() => { setTyped(""); setRemaining(duration * 60); }}>Reset</button>
                    </div>
                  </>
                )}
              </section>

              <aside style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <section style={panel}>
                  <p style={{ color: muted, fontSize: 12 }}>TIME REMAINING</p>
                  <h1 style={{ fontSize: 38, margin: "5px 0 18px", color: blue }}>{formatTime(remaining)}</h1>
                  <label style={{ fontSize: 13, color: muted }}>Test duration</label>
                  <select style={{ ...input, marginTop: 7 }} disabled={started} value={duration} onChange={e => {
                    const value = Number(e.target.value);
                    setDuration(value);
                    setRemaining(value * 60);
                  }}>
                    {[1, 3, 5, 10].map(n => <option key={n} value={n}>{n} minute{n > 1 ? "s" : ""}</option>)}
                  </select>
                </section>

                <section style={panel}>
                  <p style={{ color: muted, fontSize: 12 }}>LIVE PERFORMANCE</p>
                  <p>Speed: <strong style={{ color: blue }}>{wpm} WPM</strong></p>
                  <p>Accuracy: <strong>{accuracy}%</strong></p>
                  <p>Errors: <strong style={{ color: "#e25b63" }}>{errors}</strong></p>
                  <div style={{ height: 8, borderRadius: 10, background: border, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, wpm / target * 100)}%`, height: "100%", background: blue }} />
                  </div>
                  <p style={{ color: muted, fontSize: 12 }}>Target progress: {Math.min(100, Math.round(wpm / target * 100))}%</p>
                </section>
              </aside>
            </div>
          )}

          {page === "Practice" && (
            <section style={{ ...panel, marginTop: 18 }}>
              <h3>Choose your passage</h3>
              <input style={input} placeholder="Search passages..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "13px 0" }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    ...button,
                    background: category === c ? blue : (dark ? "#34445b" : "#edf0f6"),
                    color: category === c ? "white" : text,
                    padding: "8px 12px",
                    fontSize: 12
                  }}>{c}</button>
                ))}
              </div>
              <div className="passageList">
                {filtered.map(p => (
                  <button key={p.id} className={`passageItem ${selected === p.id ? "selected" : ""}`} disabled={started} onClick={() => {
                    setSelected(p.id);
                    setTyped("");
                    setRemaining(duration * 60);
                  }}>
                    <strong>{p.title}</strong>
                    <div style={{ color: muted, fontSize: 12, marginTop: 5 }}>{p.category}</div>
                  </button>
                ))}
                {filtered.length === 0 && <p>No passages found.</p>}
              </div>
            </section>
          )}

          {page === "Dashboard" && (
            <section style={panel}>
              <h2>Your Progress</h2>
              <p>Personal best: <strong>{best} WPM</strong></p>
              <p>Average speed: <strong>{average} WPM</strong></p>
              <p>Completed tests: <strong>{history.length}</strong></p>
              <p>Target speed: <strong>{target} WPM</strong></p>
              <button style={button} onClick={() => setPage("Practice")}>Start practising</button>
            </section>
          )}

          {page === "History" && (
            <section style={panel}>
              <h2>Previous test results</h2>
              {history.length === 0 ? (
                <p style={{ color: muted }}>No tests completed yet.</p>
              ) : history.map((s, i) => (
                <div key={i} style={{ padding: 14, borderBottom: `1px solid ${border}` }}>
                  <strong>{s.wpm} WPM</strong> · {s.accuracy}% accuracy
                  <p style={{ color: muted, fontSize: 12 }}>{s.date}</p>
                </div>
              ))}
              <button style={{ ...button, background: "#dc5964", marginTop: 18 }} onClick={() => {
                if (window.confirm("Delete all practice history?")) setHistory([]);
              }}>Clear history</button>
            </section>
          )}

          <footer style={{ textAlign: "center", color: muted, fontSize: 12, padding: 25 }}>
            STENOPRO · Practice regularly. Improve consistently.
          </footer>
        </main>
      </div>
    </div>
  );
}
