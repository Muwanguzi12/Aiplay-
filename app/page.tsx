"use client";

import { useState } from "react";

const starters = [
  { title: "Music video", detail: "Turn a track into a visual story", icon: "♫" },
  { title: "Social clip", detail: "Create a vertical short for your audience", icon: "▣" },
  { title: "Story scene", detail: "Bring a single scene to life", icon: "✳" }
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("9:16");
  const [notice, setNotice] = useState("");

  function startProject() {
    if (!prompt.trim()) {
      setNotice("Add an idea first — even one sentence is enough.");
      return;
    }
    setNotice("Studio foundation is ready. Generation will be connected in the next build step.");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Riplay home"><span className="brand-mark">R</span><span>riplay</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-item active"><span>◈</span> Create</button>
        <button className="nav-item" onClick={() => setNotice("Your projects library is coming next.")}><span>▤</span> My projects</button>
        <button className="nav-item" onClick={() => setNotice("The creator marketplace is on the roadmap.")}><span>◇</span> Discover</button>
        <div className="sidebar-bottom">
          <div className="engine-status"><span className="status-dot" /> Aiplay engine <small>Foundation</small></div>
          <div className="profile"><div className="avatar">R</div><div><strong>Creator workspace</strong><small>Local preview</small></div><span className="more">···</span></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Create</b></div><div className="top-actions"><span className="plan">EARLY ACCESS</span><button className="help" onClick={() => setNotice("Riplay help and documentation are being prepared.")}>Help ↗</button></div></header>
        <div className="content">
          <div className="eyebrow"><span className="spark">✳</span> YOUR CREATIVE SPACE</div>
          <h1>Make something<br /><em>worth watching.</em></h1>
          <p className="intro">One idea can become a soundtrack, a story and a video.<br className="desktop-break" /> Start with a thought. Shape it into your next creation.</p>

          <section className="prompt-card">
            <div className="card-heading"><div><span className="step">01</span><strong>Describe your idea</strong></div><span className="ai-label">AIPLAY · VIDEO ENGINE</span></div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A cinematic music video set in Kampala at golden hour, with boda bodas moving through the city..." rows={4} />
            <div className="prompt-footer"><span>Be vivid. Describe the mood, setting and story.</span><span>{prompt.length}/600</span></div>
            <div className="settings-row"><div><label>VIDEO FORMAT</label><div className="format-options">{["9:16", "16:9", "1:1"].map((f) => <button key={f} className={format === f ? "format selected" : "format"} onClick={() => setFormat(f)}>{f}</button>)}</div></div><div className="duration"><label>FIRST CUT</label><strong>15–30 sec <span>⌄</span></strong></div></div>
            <button className="create-button" onClick={startProject}>Build my story <span>→</span></button>
            {notice && <p className="notice" role="status">{notice}</p>}
            <p className="fine-print">Your idea stays in this browser preview. No media is uploaded or generated yet.</p>
          </section>

          <div className="section-head"><div><span className="step">02</span><strong>Start with a format</strong></div><span>CHOOSE A CREATIVE DIRECTION</span></div>
          <div className="starter-grid">{starters.map((item) => <button className="starter" key={item.title} onClick={() => { setPrompt(item.detail + ". "); setNotice(""); }}><span className="starter-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><b>↗</b></button>)}</div>
          <footer className="footer-note"><span>✳ Made for every kind of creator.</span><span>RIPLAY STUDIO · 0.1.0</span></footer>
        </div>
      </section>
    </main>
  );
}
