import { useState, useEffect, useRef, useCallback } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const SK = { sessions: "violin_sessions", pieces: "violin_pieces", goals: "violin_goals", reminders: "violin_reminders" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function weekDates() {
  const out = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(d.toISOString().slice(0, 10)); }
  return out;
}
function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date(todayStr()) - new Date(dateStr)) / 86400000);
}
function toDisplay(mins, unit) { return unit === "hrs" ? +(mins / 60).toFixed(2) : mins; }
function toMins(val, unit) { return unit === "hrs" ? Math.round(val * 60) : Math.round(val); }
function unitLabel(unit) { return unit === "hrs" ? "hrs" : "min"; }

async function sGet(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function sSet(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} }

// ── CSS ───────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --cream:#faf6ef;--warm1:#f2e8d5;--warm2:#e8d5b5;
  --rust:#b5541c;--rust-light:#d4703a;
  --brown:#5c3d1e;--brown-mid:#8b5e34;
  --sage:#6b7c5c;--sage-light:#a3b48a;
  --text:#2c1a0e;--text-mid:#6b4a2a;--text-light:#a07850;
  --shadow:rgba(92,61,30,0.15);--radius:14px;
}
body{background:var(--cream);font-family:'Lato',sans-serif;color:var(--text);}
.app{min-height:100vh;background:var(--cream);
  background-image:radial-gradient(ellipse at 10% 20%,rgba(181,84,28,.07) 0%,transparent 50%),
    radial-gradient(ellipse at 90% 80%,rgba(107,124,92,.08) 0%,transparent 50%);}
.header{background:var(--brown);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;
  box-shadow:0 4px 20px rgba(44,26,14,.3);position:sticky;top:0;z-index:100;gap:12px;flex-wrap:wrap;}
.header-title{font-family:'Playfair Display',serif;font-size:1.45rem;color:var(--warm1);letter-spacing:.02em;white-space:nowrap;}
.header-title span{color:var(--rust-light);font-style:italic;}
.nav{display:flex;gap:3px;flex-wrap:wrap;}
.nav-btn{background:none;border:none;padding:6px 11px;border-radius:8px;color:var(--warm2);
  font-family:'Lato',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  cursor:pointer;transition:all .2s;white-space:nowrap;}
.nav-btn:hover{background:rgba(255,255,255,.1);color:white;}
.nav-btn.active{background:var(--rust);color:white;}
.main{max-width:960px;margin:0 auto;padding:24px 18px;}
.card{background:white;border-radius:var(--radius);padding:20px;box-shadow:0 2px 12px var(--shadow);border:1px solid var(--warm2);}
.card-title{font-family:'Playfair Display',serif;font-size:1.05rem;color:var(--brown);margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
input,textarea,select{width:100%;padding:8px 11px;border:1.5px solid var(--warm2);border-radius:8px;
  font-family:'Lato',sans-serif;font-size:.88rem;color:var(--text);background:var(--cream);outline:none;transition:border .2s;}
input:focus,textarea:focus,select:focus{border-color:var(--rust);}
label{font-size:.78rem;font-weight:700;color:var(--text-mid);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px;}
.field{margin-bottom:12px;}
.btn{padding:8px 18px;border-radius:9px;border:none;cursor:pointer;font-family:'Lato',sans-serif;font-weight:700;font-size:.85rem;letter-spacing:.04em;transition:all .2s;}
.btn-primary{background:var(--rust);color:white;}
.btn-primary:hover{background:var(--rust-light);transform:translateY(-1px);box-shadow:0 4px 12px rgba(181,84,28,.3);}
.btn-ghost{background:var(--warm1);color:var(--brown);}
.btn-ghost:hover{background:var(--warm2);}
.btn-danger{background:#fee;color:#c0392b;border:1.5px solid #f5c6c6;}
.btn-danger:hover{background:#c0392b;color:white;}
.btn-sm{padding:4px 11px;font-size:.78rem;}
.stars{display:flex;gap:3px;}
.star{cursor:pointer;font-size:1.15rem;transition:transform .15s;}
.star:hover{transform:scale(1.2);}
.session-item{display:flex;align-items:flex-start;gap:12px;padding:11px 14px;border-radius:10px;background:var(--cream);border:1px solid var(--warm2);margin-bottom:7px;transition:box-shadow .2s;}
.session-item:hover{box-shadow:0 2px 10px var(--shadow);}
.session-date{font-size:.76rem;color:var(--text-light);min-width:64px;}
.session-info{flex:1;}
.session-dur{font-weight:700;color:var(--rust);font-size:.92rem;}
.session-tags{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;}
.tag{background:var(--warm1);color:var(--brown-mid);padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:700;}
.streak-grid{display:flex;gap:4px;flex-wrap:wrap;}
.streak-day{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;color:var(--text-light);background:var(--warm1);border:1.5px solid var(--warm2);flex-direction:column;}
.streak-day.practiced{background:var(--rust);color:white;border-color:var(--rust);}
.streak-day.today{border-color:var(--brown);}
.progress-bar{background:var(--warm2);border-radius:20px;height:9px;overflow:hidden;}
.progress-fill{height:100%;border-radius:20px;background:linear-gradient(90deg,var(--rust),var(--rust-light));transition:width .5s;}
.status-badge{padding:2px 9px;border-radius:20px;font-size:.72rem;font-weight:700;}
.status-learning{background:#fde9d9;color:var(--rust);}
.status-polishing{background:#e4ede0;color:var(--sage);}
.status-ready{background:#d9f0e4;color:#2e7d52;}
.status-wishlist{background:var(--warm1);color:var(--text-light);}
.warn-badge{background:#fff3cd;color:#856404;padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700;}
.overdue-badge{background:#fde9d9;color:var(--rust);padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700;}
.metro-display{font-family:'Playfair Display',serif;font-size:3.8rem;font-weight:700;color:var(--brown);line-height:1;}
.metro-bpm{font-size:.9rem;font-family:'Lato',sans-serif;color:var(--text-light);font-weight:700;text-transform:uppercase;letter-spacing:.1em;}
.metro-pendulum{width:5px;height:72px;background:var(--rust);border-radius:3px;margin:10px auto;transform-origin:top center;transition:transform .1s;}
.metro-pendulum.tick{transform:rotate(22deg);}
.metro-pendulum.tock{transform:rotate(-22deg);}
.metro-controls{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:10px;}
.metro-slider{-webkit-appearance:none;width:180px;height:5px;border-radius:3px;background:var(--warm2);outline:none;}
.metro-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--rust);cursor:pointer;}
.stat-box{text-align:center;padding:14px;background:var(--cream);border-radius:10px;border:1px solid var(--warm2);}
.stat-num{font-family:'Playfair Display',serif;font-size:1.75rem;font-weight:700;color:var(--rust);}
.stat-label{font-size:.7rem;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;}
.bar-chart{display:flex;align-items:flex-end;gap:4px;height:120px;}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;}
.bar{width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--rust-light),var(--rust));transition:height .4s;min-height:2px;}
.bar-label{font-size:.63rem;color:var(--text-light);font-weight:700;margin-top:3px;}
.delete-btn{width:22px;height:22px;border-radius:50%;background:#fff0f0;border:1.5px solid #e8b4b4;color:#c0392b;font-size:.85rem;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.delete-btn:hover{background:#c0392b;border-color:#c0392b;color:white;transform:scale(1.1);}
.edit-btn{width:22px;height:22px;border-radius:50%;background:#f0f4ff;border:1.5px solid #b4c8e8;color:#2563eb;font-size:.8rem;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.edit-btn:hover{background:#2563eb;border-color:#2563eb;color:white;}
.modal-overlay{position:fixed;inset:0;background:rgba(44,26,14,.45);display:flex;align-items:center;justify-content:center;z-index:999;padding:16px;}
.modal{background:white;border-radius:var(--radius);padding:26px;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(44,26,14,.25);}
.modal-title{font-family:'Playfair Display',serif;font-size:1.15rem;color:var(--brown);margin-bottom:10px;}
.modal-body{font-size:.87rem;color:var(--text-mid);margin-bottom:20px;line-height:1.55;}
.modal-actions{display:flex;gap:10px;justify-content:flex-end;}
.reminder-item{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:9px;background:var(--cream);border:1px solid var(--warm2);margin-bottom:7px;}
.reminder-active{border-color:var(--rust);background:#fff8f5;}
.donut-wrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.unit-toggle{display:flex;align-items:center;background:rgba(255,255,255,.12);border-radius:8px;overflow:hidden;border:1.5px solid rgba(255,255,255,.18);}
.unit-btn{padding:4px 10px;border:none;cursor:pointer;font-family:'Lato',sans-serif;font-weight:700;font-size:.76rem;letter-spacing:.07em;text-transform:uppercase;transition:all .18s;}
.empty-state{text-align:center;padding:28px;color:var(--text-light);font-style:italic;}
.reset-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--warm2);}
.reset-label{font-weight:700;color:var(--text);font-size:.9rem;}
.reset-sub{font-size:.78rem;color:var(--text-light);margin-top:2px;}
@media(max-width:640px){.grid2,.grid3,.grid4{grid-template-columns:1fr;}.header{flex-direction:column;}.nav{justify-content:center;}}
`;

// ── Small reusable components ─────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="star"
          style={{ color: i <= (hover || value) ? "#b5541c" : "#e8d5b5" }}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}>★</span>
      ))}
    </div>
  );
}
function DeleteBtn({ onClick }) { return <button className="delete-btn" onClick={onClick} title="Delete">✕</button>; }
function EditBtn({ onClick }) { return <button className="edit-btn" onClick={onClick} title="Edit">✎</button>; }
function UnitToggle({ unit, setUnit }) {
  return (
    <div className="unit-toggle">
      {["min","hrs"].map(u => (
        <button key={u} className="unit-btn" onClick={() => setUnit(u)}
          style={{ background: unit === u ? "var(--rust-light)" : "transparent", color: unit === u ? "white" : "var(--warm2)" }}>{u}</button>
      ))}
    </div>
  );
}
function ConfirmModal({ title, body, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{body}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── METRONOME ─────────────────────────────────────────────────────────────────
function Metronome() {
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentBar, setCurrentBar] = useState(0);
  const [rampEnabled, setRampEnabled] = useState(false);
  const [rampEveryBars, setRampEveryBars] = useState(2);
  const [rampAmount, setRampAmount] = useState(5);
  const [rampMax, setRampMax] = useState(160);
  const bpmRef = useRef(bpm);
  const bpbRef = useRef(beatsPerBar);
  const beatIdxRef = useRef(0);
  const barCountRef = useRef(0);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rampRef = useRef({ enabled: false, everyBars: 2, amount: 5, max: 160 });
  const tickRef = useRef(null);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { bpbRef.current = beatsPerBar; }, [beatsPerBar]);
  useEffect(() => { rampRef.current = { enabled: rampEnabled, everyBars: rampEveryBars, amount: rampAmount, max: rampMax }; }, [rampEnabled, rampEveryBars, rampAmount, rampMax]);

  const playClick = useCallback((isAccent) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = isAccent ? 1320 : 880;
    gain.gain.setValueAtTime(isAccent ? 0.5 : 0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isAccent ? 0.12 : 0.07));
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
  }, []);

  tickRef.current = () => {
    const beatInBar = beatIdxRef.current % bpbRef.current;
    playClick(beatInBar === 0);
    setCurrentBeat(beatInBar);
    beatIdxRef.current += 1;
    if (beatInBar === bpbRef.current - 1) {
      barCountRef.current += 1;
      setCurrentBar(barCountRef.current);
      const r = rampRef.current;
      if (r.enabled && barCountRef.current % r.everyBars === 0) {
        const newBpm = Math.min(r.max, bpmRef.current + r.amount);
        bpmRef.current = newBpm; setBpm(newBpm);
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => tickRef.current(), (60 / newBpm) * 1000);
      }
    }
  };

  const stop = () => { clearInterval(intervalRef.current); setRunning(false); setCurrentBeat(-1); setCurrentBar(0); beatIdxRef.current = 0; barCountRef.current = 0; };
  const start = () => { beatIdxRef.current = 0; barCountRef.current = 0; setCurrentBar(0); tickRef.current(); intervalRef.current = setInterval(() => tickRef.current(), (60 / bpmRef.current) * 1000); setRunning(true); };
  const handleBpm = (val) => { const c = Math.max(20, Math.min(240, val)); setBpm(c); bpmRef.current = c; if (running) { clearInterval(intervalRef.current); intervalRef.current = setInterval(() => tickRef.current(), (60 / c) * 1000); } };
  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="card" style={{ textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
      <div className="card-title" style={{ justifyContent: "center" }}>🎵 Metronome</div>
      <div className="metro-display">{bpm}</div>
      <div className="metro-bpm">BPM</div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className={`metro-pendulum ${running ? (currentBeat % 2 === 0 ? "tick" : "tock") : ""}`} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 7, margin: "10px 0 4px" }}>
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", transition: "background .06s", boxShadow: currentBeat === i ? "0 0 8px rgba(181,84,28,.5)" : "none", background: currentBeat === i ? (i === 0 ? "var(--rust)" : "var(--brown-mid)") : "var(--warm2)", border: `2px solid ${i === 0 ? "var(--rust)" : "var(--warm2)"}` }} />
        ))}
      </div>
      {running && <div style={{ fontSize: ".72rem", color: "var(--text-light)", marginBottom: 6 }}>Bar {currentBar + 1}</div>}
      <div className="metro-controls">
        <button className="btn btn-ghost btn-sm" onClick={() => handleBpm(bpm - 5)}>−5</button>
        <input type="range" className="metro-slider" min={20} max={240} value={bpm} onChange={e => handleBpm(Number(e.target.value))} />
        <button className="btn btn-ghost btn-sm" onClick={() => handleBpm(bpm + 5)}>+5</button>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
        {[40,60,80,100,120,160].map(b => <button key={b} className="btn btn-ghost btn-sm" onClick={() => handleBpm(b)} style={{ minWidth: 38 }}>{b}</button>)}
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-primary" style={{ minWidth: 110 }} onClick={running ? stop : start}>{running ? "⏹ Stop" : "▶ Start"}</button>
      </div>
      <div style={{ borderTop: "1px solid var(--warm2)", margin: "16px 0 12px" }} />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Beats per Bar</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
          {[2,3,4,5,6,7,8].map(n => (
            <button key={n} className="btn btn-ghost btn-sm" onClick={() => { setBeatsPerBar(n); bpbRef.current = n; if (running) stop(); }}
              style={{ minWidth: 32, background: beatsPerBar === n ? "var(--rust)" : undefined, color: beatsPerBar === n ? "white" : undefined }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{ background: "var(--cream)", borderRadius: 10, padding: "12px 14px", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rampEnabled ? 12 : 0 }}>
          <span style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".06em" }}>Auto BPM Increase</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setRampEnabled(r => !r)} style={{ background: rampEnabled ? "var(--rust)" : undefined, color: rampEnabled ? "white" : undefined }}>{rampEnabled ? "On" : "Off"}</button>
        </div>
        {rampEnabled && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div><label style={{ fontSize: ".7rem" }}>Every (bars)</label><input type="number" min={1} max={32} value={rampEveryBars} onChange={e => setRampEveryBars(Math.max(1, Number(e.target.value)))} style={{ padding: "4px 7px", fontSize: ".82rem" }} /></div>
            <div><label style={{ fontSize: ".7rem" }}>Increase (BPM)</label><input type="number" min={1} max={20} value={rampAmount} onChange={e => setRampAmount(Math.max(1, Number(e.target.value)))} style={{ padding: "4px 7px", fontSize: ".82rem" }} /></div>
            <div><label style={{ fontSize: ".7rem" }}>Max BPM</label><input type="number" min={bpm} max={240} value={rampMax} onChange={e => setRampMax(Math.max(bpm, Number(e.target.value)))} style={{ padding: "4px 7px", fontSize: ".82rem" }} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ sessions, pieces, goals, setGoals, unit }) {
  const today = todayStr();
  const week = weekDates();
  const practicedDays = new Set(sessions.map(s => s.date));
  const thisWeekMins = sessions.filter(s => week.includes(s.date)).reduce((a, s) => a + (s.duration || 0), 0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [draftTarget, setDraftTarget] = useState("");

  let streak = 0;
  { const d = new Date(); while (true) { const ds = d.toISOString().slice(0,10); if (practicedDays.has(ds)) { streak++; d.setDate(d.getDate()-1); } else break; } }

  const weeklyGoal = goals.find(g => g.type === "weekly_minutes");
  const weekTarget = weeklyGoal ? weeklyGoal.target : 300;
  const weekPct = Math.min(100, Math.round((thisWeekMins / weekTarget) * 100));

  const saveWeeklyGoal = async () => {
    const val = toMins(Number(draftTarget), unit); if (!val) return;
    const updated = weeklyGoal ? goals.map(g => g.type === "weekly_minutes" ? { ...g, target: val } : g)
      : [{ id: Date.now(), label: "Weekly practice time", type: "weekly_minutes", target: val, progress: 0, created: today }, ...goals];
    setGoals(updated); await sSet(SK.goals, updated); setEditingGoal(false);
  };

  const barData = week.map(dt => ({ label: new Date(dt+"T12:00:00").toLocaleDateString("en",{weekday:"short"}), mins: sessions.filter(s=>s.date===dt).reduce((a,s)=>a+(s.duration||0),0) }));
  const maxBar = Math.max(...barData.map(b => b.mins), 1);

  const overduePieces = pieces.filter(p => {
    if (p.status === "wishlist") return false;
    const d = daysSince(p.lastPracticed); return d === null || d > 7;
  });

  return (
    <div>
      <div className="grid3" style={{ marginBottom: 16 }}>
        <div className="stat-box"><div className="stat-num">{streak}</div><div className="stat-label">Streak 🔥</div></div>
        <div className="stat-box"><div className="stat-num">{toDisplay(thisWeekMins, unit)}{unitLabel(unit)}</div><div className="stat-label">This Week</div></div>
        <div className="stat-box"><div className="stat-num">{sessions.length}</div><div className="stat-label">Total Sessions</div></div>
      </div>
      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">📅 Weekly Practice</div>
          <div className="bar-chart">
            {barData.map(b => (
              <div key={b.label} className="bar-col">
                {b.mins > 0 && <div style={{ fontSize: ".62rem", fontWeight: 700, color: "var(--rust)", marginBottom: 2, lineHeight: 1 }}>{toDisplay(b.mins,unit)}{unitLabel(unit)}</div>}
                <div className="bar" style={{ height: `${Math.round((b.mins/maxBar)*78)}px` }} />
                <div className="bar-label" style={{ marginTop: 3 }}>{b.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: ".8rem", color: "var(--text-mid)", fontWeight: 700 }}>Weekly Goal</span>
              {!editingGoal ? (
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: ".8rem", color: "var(--rust)", fontWeight: 700 }}>{toDisplay(thisWeekMins,unit)}{unitLabel(unit)} / {toDisplay(weekTarget,unit)}{unitLabel(unit)}</span>
                  <button onClick={() => { setDraftTarget(toDisplay(weekTarget,unit)); setEditingGoal(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".78rem", color: "var(--text-light)" }}>✏️</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input type="number" value={draftTarget} onChange={e => setDraftTarget(e.target.value)} style={{ width: 65, padding: "3px 7px", fontSize: ".8rem" }} />
                  <span style={{ fontSize: ".76rem", color: "var(--text-light)" }}>{unitLabel(unit)}</span>
                  <button className="btn btn-primary btn-sm" onClick={saveWeeklyGoal}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingGoal(false)}>×</button>
                </div>
              )}
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${weekPct}%` }} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">🗓 This Week</div>
          <div className="streak-grid">
            {week.map(dt => { const d = new Date(dt+"T12:00:00"); return (
              <div key={dt} className={`streak-day ${practicedDays.has(dt)?"practiced":""} ${dt===today?"today":""}`}>
                <span>{d.toLocaleDateString("en",{weekday:"short"}).slice(0,1)}</span><span>{d.getDate()}</span>
              </div>
            ); })}
          </div>
          {overduePieces.length > 0 && (
            <div style={{ marginTop: 12, background: "#fff8f5", borderRadius: 9, padding: "10px 12px", border: "1px solid #f5d5c5" }}>
              <div style={{ fontSize: ".76rem", fontWeight: 700, color: "var(--rust)", marginBottom: 6 }}>⚠️ Pieces needing attention</div>
              {overduePieces.slice(0,3).map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: ".82rem" }}>{p.title}</span>
                  <span className="overdue-badge">{p.lastPracticed ? `${daysSince(p.lastPracticed)}d ago` : "Never"}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--brown)", marginBottom: 7 }}>🎼 Active Pieces</div>
            {pieces.filter(p => p.status==="learning"||p.status==="polishing").slice(0,4).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: ".84rem" }}>{p.title}</span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {p.lastPracticed && daysSince(p.lastPracticed) > 7 && <span className="warn-badge">{daysSince(p.lastPracticed)}d</span>}
                  <span className={`status-badge status-${p.status}`}>{p.status}</span>
                </div>
              </div>
            ))}
            {pieces.filter(p=>p.status==="learning"||p.status==="polishing").length===0&&<div style={{fontSize:".8rem",color:"var(--text-light)",fontStyle:"italic"}}>No active pieces</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LOG SESSION ───────────────────────────────────────────────────────────────
const TAG_OPTIONS = ["Scales","Etudes","Repertoire","Bowing","Intonation","Sight-reading","Theory","Vibrato"];
const BLANK_FORM = () => ({ date: todayStr(), duration: "", rating: 3, notes: "", tags: [], piece: "" });

function LogSession({ sessions, setSessions, unit }) {
  const [form, setForm] = useState(BLANK_FORM());
  const [saved, setSaved] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const toggleTag = t => setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x=>x!==t) : [...f.tags,t] }));

  const submit = async () => {
    if (!form.duration) return;
    const durationMins = toMins(Number(form.duration), unit);
    let updated;
    if (editId) {
      updated = sessions.map(s => s.id === editId ? { ...form, id: editId, duration: durationMins } : s);
      setEditId(null);
    } else {
      updated = [{ ...form, id: Date.now(), duration: durationMins }, ...sessions];
    }
    setSessions(updated); await sSet(SK.sessions, updated);
    setForm(BLANK_FORM());
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const startEdit = (s) => {
    setForm({ date: s.date, duration: toDisplay(s.duration, unit), rating: s.rating, notes: s.notes||"", tags: s.tags||[], piece: s.piece||"" });
    setEditId(s.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditId(null); setForm(BLANK_FORM()); };

  const deleteSession = async (id) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated); await sSet(SK.sessions, updated); setConfirmId(null);
  };

  const filtered = sessions.filter(s => {
    const matchSearch = !search || (s.piece||"").toLowerCase().includes(search.toLowerCase()) || (s.notes||"").toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || (s.tags||[]).includes(filterTag);
    return matchSearch && matchTag;
  });

  return (
    <>
      {confirmId && <ConfirmModal title="Delete this session?" body="This entry will be permanently removed." onConfirm={() => deleteSession(confirmId)} onCancel={() => setConfirmId(null)} />}
      <div className="grid2">
        <div className="card">
          <div className="card-title">{editId ? "✎ Edit Session" : "✍️ Log Practice Session"}</div>
          <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></div>
          <div className="field"><label>Duration ({unitLabel(unit)})</label><input type="number" placeholder={unit==="hrs"?"e.g. 0.75":"e.g. 45"} step={unit==="hrs"?"0.05":"1"} value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} /></div>
          <div className="field"><label>Piece / Focus</label><input type="text" placeholder="e.g. Bach Chaconne, Scales in D" value={form.piece} onChange={e=>setForm(f=>({...f,piece:e.target.value}))} /></div>
          <div className="field"><label>Rating</label><StarRating value={form.rating} onChange={r=>setForm(f=>({...f,rating:r}))} /></div>
          <div className="field">
            <label>Focus Areas</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginTop:4 }}>
              {TAG_OPTIONS.map(t => <button key={t} onClick={()=>toggleTag(t)} className="btn btn-ghost btn-sm" style={{ background:form.tags.includes(t)?"var(--rust)":undefined,color:form.tags.includes(t)?"white":undefined }}>{t}</button>)}
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={3} placeholder="How did it go?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          <div style={{ display:"flex",gap:8 }}>
            <button className="btn btn-primary" onClick={submit} style={{ flex:1 }}>{editId ? "Save Changes" : saved ? "✓ Logged!" : "Log Session"}</button>
            {editId && <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>
        </div>
        <div className="card">
          <div className="card-title">📋 Practice Log</div>
          <div style={{ display:"flex",gap:8,marginBottom:12 }}>
            <input placeholder="🔍 Search piece or notes…" value={search} onChange={e=>setSearch(e.target.value)} />
            <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} style={{ width:130,flex:"none" }}>
              <option value="">All tags</option>
              {TAG_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {filtered.length===0 && <div className="empty-state">{sessions.length===0?"No sessions yet!":"No sessions match your search."}</div>}
          <div style={{ maxHeight:480,overflowY:"auto" }}>
            {filtered.slice(0,50).map(s => (
              <div key={s.id} className="session-item">
                <div className="session-date">{new Date(s.date+"T12:00:00").toLocaleDateString("en",{month:"short",day:"numeric"})}</div>
                <div className="session-info">
                  <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                    <span className="session-dur">{toDisplay(s.duration,unit)}{unitLabel(unit)}</span>
                    <span style={{ color:"#b5541c",fontSize:".85rem" }}>{"★".repeat(s.rating)}</span>
                  </div>
                  {s.piece && <div style={{ fontSize:".8rem",color:"var(--text-mid)",marginTop:2 }}>{s.piece}</div>}
                  <div className="session-tags">{(s.tags||[]).map(t=><span key={t} className="tag">{t}</span>)}</div>
                  {s.notes && <div style={{ fontSize:".76rem",color:"var(--text-light)",marginTop:2,fontStyle:"italic" }}>{s.notes.slice(0,80)}{s.notes.length>80?"…":""}</div>}
                </div>
                <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                  <EditBtn onClick={()=>startEdit(s)} />
                  <DeleteBtn onClick={()=>setConfirmId(s.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── REPERTOIRE ────────────────────────────────────────────────────────────────
function Pieces({ pieces, setPieces, sessions }) {
  const [form, setForm] = useState({ title:"",composer:"",status:"wishlist",difficulty:3,notes:"" });
  const [saved, setSaved] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editId, setEditId] = useState(null);

  const lastPracticedMap = {};
  sessions.forEach(s => { if (s.piece) { const key = s.piece.toLowerCase().trim(); if (!lastPracticedMap[key] || s.date > lastPracticedMap[key]) lastPracticedMap[key] = s.date; }});

  const getPieceLP = (p) => p.lastPracticed || lastPracticedMap[p.title?.toLowerCase().trim()] || null;

  const savePiece = async () => {
    if (!form.title) return;
    let updated;
    if (editId) { updated = pieces.map(p => p.id===editId ? { ...p, ...form } : p); setEditId(null); }
    else { updated = [{ ...form, id: Date.now(), added: todayStr(), lastPracticed: null }, ...pieces]; }
    setPieces(updated); await sSet(SK.pieces, updated);
    setForm({ title:"",composer:"",status:"wishlist",difficulty:3,notes:"" });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const deletePiece = async (id) => { const u=pieces.filter(p=>p.id!==id); setPieces(u); await sSet(SK.pieces,u); setConfirmId(null); };
  const updateStatus = async (id, status) => { const u=pieces.map(p=>p.id===id?{...p,status}:p); setPieces(u); await sSet(SK.pieces,u); };
  const markPracticed = async (id) => { const u=pieces.map(p=>p.id===id?{...p,lastPracticed:todayStr()}:p); setPieces(u); await sSet(SK.pieces,u); };
  const startEdit = (p) => { setForm({ title:p.title,composer:p.composer||"",status:p.status,difficulty:p.difficulty,notes:p.notes||"" }); setEditId(p.id); };

  const statusOrder = ["learning","polishing","ready","wishlist"];
  const statusLabel = { learning:"🎻 Learning", polishing:"✨ Polishing", ready:"🏆 Ready", wishlist:"🎯 Wish List" };
  const grouped = statusOrder.reduce((acc,s)=>({...acc,[s]:pieces.filter(p=>p.status===s)}),{});

  return (
    <>
      {confirmId && <ConfirmModal title="Remove this piece?" body="It will be permanently removed from your repertoire." onConfirm={()=>deletePiece(confirmId)} onCancel={()=>setConfirmId(null)} />}
      <div className="grid2">
        <div className="card">
          <div className="card-title">{editId?"✎ Edit Piece":"➕ Add Piece"}</div>
          <div className="field"><label>Title</label><input placeholder="e.g. Violin Sonata No.1" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
          <div className="field"><label>Composer</label><input placeholder="e.g. Bach" value={form.composer} onChange={e=>setForm(f=>({...f,composer:e.target.value}))} /></div>
          <div className="field"><label>Status</label>
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="wishlist">Wish List</option><option value="learning">Learning</option>
              <option value="polishing">Polishing</option><option value="ready">Performance Ready</option>
            </select>
          </div>
          <div className="field"><label>Difficulty (1–5)</label>
            <input type="range" min={1} max={5} value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:Number(e.target.value)}))} />
            <span style={{ fontSize:".85rem",color:"var(--rust)",fontWeight:700 }}>{"★".repeat(form.difficulty)}</span>
          </div>
          <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          <div style={{ display:"flex",gap:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={savePiece}>{editId?"Save Changes":saved?"✓ Added!":"Add to Repertoire"}</button>
            {editId && <button className="btn btn-ghost" onClick={()=>{setEditId(null);setForm({title:"",composer:"",status:"wishlist",difficulty:3,notes:""});}}>Cancel</button>}
          </div>
        </div>
        <div className="card" style={{ maxHeight:580,overflowY:"auto" }}>
          <div className="card-title">🎼 Repertoire</div>
          {statusOrder.map(s => grouped[s].length>0 && (
            <div key={s} style={{ marginBottom:14 }}>
              <div style={{ fontSize:".75rem",fontWeight:700,color:"var(--text-mid)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:7 }}>{statusLabel[s]}</div>
              {grouped[s].map(p => {
                const lp = getPieceLP(p);
                const ds = daysSince(lp);
                const isOverdue = s!=="wishlist" && (ds===null||ds>7);
                const isWarning = s!=="wishlist" && ds!==null && ds>3 && ds<=7;
                return (
                  <div key={p.id} className="session-item" style={{ flexDirection:"column",alignItems:"flex-start" }}>
                    <div style={{ display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center" }}>
                      <div>
                        <span style={{ fontWeight:700 }}>{p.title}</span>
                        {p.composer && <span style={{ color:"var(--text-light)",fontSize:".8rem" }}> — {p.composer}</span>}
                        <span style={{ marginLeft:6,color:"#b5541c",fontSize:".76rem" }}>{"★".repeat(p.difficulty)}</span>
                      </div>
                      <div style={{ display:"flex",gap:4 }}>
                        <EditBtn onClick={()=>startEdit(p)} />
                        <DeleteBtn onClick={()=>setConfirmId(p.id)} />
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:5,alignItems:"center",marginTop:6,flexWrap:"wrap" }}>
                      <span className={`status-badge status-${p.status}`}>{p.status}</span>
                      {isOverdue && <span className="overdue-badge">{lp?`${ds}d ago`:"Never practiced"}</span>}
                      {isWarning && <span className="warn-badge">{ds}d ago</span>}
                      {!isOverdue&&!isWarning&&lp&&<span style={{fontSize:".72rem",color:"var(--text-light)"}}>Last: {new Date(lp+"T12:00:00").toLocaleDateString("en",{month:"short",day:"numeric"})}</span>}
                      {!lp&&s!=="wishlist"&&<span style={{fontSize:".72rem",color:"var(--text-light)"}}>Not yet practiced</span>}
                    </div>
                    <div style={{ display:"flex",gap:4,marginTop:7,flexWrap:"wrap" }}>
                      {statusOrder.filter(st=>st!==p.status).map(st=><button key={st} className="btn btn-ghost btn-sm" onClick={()=>updateStatus(p.id,st)} style={{fontSize:".7rem"}}>→ {st}</button>)}
                      {s!=="wishlist"&&<button className="btn btn-ghost btn-sm" onClick={()=>markPracticed(p.id)} style={{fontSize:".7rem",color:"var(--sage)"}}>✓ Today</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {pieces.length===0&&<div className="empty-state">No pieces yet.</div>}
        </div>
      </div>
    </>
  );
}

// ── GOALS ─────────────────────────────────────────────────────────────────────
function Goals({ goals, setGoals, sessions, unit }) {
  const [form, setForm] = useState({ label:"",type:"weekly_minutes",target:"" });
  const [saved, setSaved] = useState(false);
  const week = weekDates();
  const thisWeekMins = sessions.filter(s=>week.includes(s.date)).reduce((a,s)=>a+(s.duration||0),0);
  const totalSessions = sessions.length;

  const getProgress = g => {
    if (g.type==="weekly_minutes") return Math.min(100,Math.round((thisWeekMins/g.target)*100));
    if (g.type==="total_sessions") return Math.min(100,Math.round((totalSessions/g.target)*100));
    return g.progress||0;
  };
  const getProgressVal = g => {
    if (g.type==="weekly_minutes") return `${toDisplay(thisWeekMins,unit)}${unitLabel(unit)} / ${toDisplay(g.target,unit)}${unitLabel(unit)}`;
    if (g.type==="total_sessions") return `${totalSessions} / ${g.target} sessions`;
    return `${g.progress||0}%`;
  };

  const addGoal = async () => {
    if (!form.label||!form.target) return;
    const targetMins = form.type==="weekly_minutes" ? toMins(Number(form.target),unit) : Number(form.target);
    const updated = [{ ...form,target:targetMins,id:Date.now(),progress:0,created:todayStr() },...goals];
    setGoals(updated); await sSet(SK.goals,updated);
    setForm({ label:"",type:"weekly_minutes",target:"" });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const removeGoal = async id => { const u=goals.filter(g=>g.id!==id); setGoals(u); await sSet(SK.goals,u); };
  const updateCustomProgress = async (id,val) => {
    const c=Math.min(100,Math.max(0,val));
    const u=goals.map(g=>g.id===id?{...g,progress:c}:g); setGoals(u); await sSet(SK.goals,u);
  };

  return (
    <div className="grid2">
      <div className="card">
        <div className="card-title">🎯 Add Goal</div>
        <div className="field"><label>Description</label><input placeholder="e.g. Practice every day this week" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} /></div>
        <div className="field"><label>Type</label>
          <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            <option value="weekly_minutes">Weekly Practice Time</option>
            <option value="total_sessions">Total Sessions Milestone</option>
            <option value="custom">Custom (manual)</option>
          </select>
        </div>
        <div className="field">
          <label>Target {form.type==="weekly_minutes"?`(${unitLabel(unit)}/week)`:form.type==="total_sessions"?"(sessions)":"(%)"}</label>
          <input type="number" placeholder={form.type==="weekly_minutes"?(unit==="hrs"?"e.g. 5":"e.g. 300"):form.type==="total_sessions"?"e.g. 50":"e.g. 100"}
            step={form.type==="weekly_minutes"&&unit==="hrs"?"0.25":"1"} value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} />
        </div>
        {form.type==="custom"&&<div style={{background:"var(--warm1)",borderRadius:8,padding:"8px 11px",marginBottom:12,fontSize:".8rem",color:"var(--text-mid)"}}>💡 Use the slider to update progress manually.</div>}
        <button className="btn btn-primary" onClick={addGoal} style={{ width:"100%" }}>{saved?"✓ Added!":"Add Goal"}</button>
      </div>
      <div className="card">
        <div className="card-title">📈 My Goals</div>
        {goals.length===0&&<div className="empty-state">No goals yet.</div>}
        {goals.map(g => {
          const pct=getProgress(g); const isCustom=g.type==="custom";
          return (
            <div key={g.id} style={{ marginBottom:18,paddingBottom:14,borderBottom:"1px solid var(--warm2)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                <span style={{ fontWeight:700,fontSize:".88rem" }}>{g.label}</span>
                <DeleteBtn onClick={()=>removeGoal(g.id)} />
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                <span style={{ fontSize:".76rem",color:"var(--text-light)" }}>{getProgressVal(g)}</span>
                <span style={{ fontSize:".76rem",fontWeight:700,color:pct>=100?"#2e7d52":"var(--rust)" }}>{pct}%{pct>=100?" ✓":""}</span>
              </div>
              <div className="progress-bar" style={{ marginBottom:isCustom?8:0 }}>
                <div className="progress-fill" style={{ width:`${pct}%`,background:pct>=100?"linear-gradient(90deg,#56c47a,#2e7d52)":undefined }} />
              </div>
              {isCustom&&(
                <div style={{ display:"flex",alignItems:"center",gap:7,marginTop:7 }}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>updateCustomProgress(g.id,(g.progress||0)-5)}>−5%</button>
                  <input type="range" min={0} max={100} value={g.progress||0} onChange={e=>updateCustomProgress(g.id,Number(e.target.value))} className="metro-slider" style={{ flex:1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={()=>updateCustomProgress(g.id,(g.progress||0)+5)}>+5%</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function Stats({ sessions, unit }) {
  const totalMins = sessions.reduce((a,s) => a+(s.duration||0), 0);
  const bestSession = sessions.reduce((best,s) => s.duration>(best?.duration||0) ? s : best, null);

  // Build last 12 months
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    months.push(d.toISOString().slice(0,7));
  }
  const monthMap = {};
  sessions.forEach(s => { const m = s.date.slice(0,7); monthMap[m] = (monthMap[m]||0) + (s.duration||0); });
  const monthData = months.map(m => ({
    label: new Date(m+"-15").toLocaleDateString("en",{month:"short"}),
    fullLabel: new Date(m+"-15").toLocaleDateString("en",{month:"long",year:"numeric"}),
    mins: monthMap[m]||0,
    key: m,
  }));
  const maxMonth = Math.max(...monthData.map(b => b.mins), 1);

  // Monthly session counts
  const monthSessionCount = {};
  sessions.forEach(s => { const m = s.date.slice(0,7); monthSessionCount[m] = (monthSessionCount[m]||0)+1; });

  // Day of week totals (all time)
  const dowMap = [0,0,0,0,0,0,0];
  sessions.forEach(s => { const d = new Date(s.date+"T12:00:00"); dowMap[d.getDay()] += (s.duration||0); });
  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const maxDow = Math.max(...dowMap, 1);

  // Focus area totals per month (last 6 months)
  const last6 = months.slice(6);
  const tagMap = {};
  sessions.filter(s => last6.includes(s.date.slice(0,7))).forEach(s =>
    (s.tags||[]).forEach(t => { tagMap[t] = (tagMap[t]||0) + (s.duration||0); })
  );
  const topTags = Object.entries(tagMap).sort((a,b) => b[1]-a[1]);
  const tagTotal = topTags.reduce((a,[,v]) => a+v, 0);
  const tagColors = [
    "linear-gradient(90deg,var(--rust),var(--rust-light))",
    "linear-gradient(90deg,var(--sage),var(--sage-light))",
    "linear-gradient(90deg,var(--brown-mid),var(--brown))",
    "linear-gradient(90deg,#c9a87c,#e8d5b5)",
    "linear-gradient(90deg,#6b7c5c,#a3b48a)",
    "linear-gradient(90deg,#d4703a,#b5541c)",
  ];

  // Best and current month
  const thisMonth = new Date().toISOString().slice(0,7);
  const thisMonthMins = monthMap[thisMonth] || 0;
  const thisMonthSessions = monthSessionCount[thisMonth] || 0;
  const bestMonth = monthData.reduce((b,m) => m.mins > b.mins ? m : b, { mins: 0, fullLabel: "—" });

  if (sessions.length === 0) return <div className="empty-state" style={{ marginTop: 60 }}>Log some sessions to see your statistics here.</div>;

  return (
    <div>
      {/* Top summary stats */}
      <div className="grid3" style={{ marginBottom: 16 }}>
        <div className="stat-box"><div className="stat-num">{toDisplay(totalMins,unit)}{unitLabel(unit)}</div><div className="stat-label">All-Time</div></div>
        <div className="stat-box"><div className="stat-num">{toDisplay(thisMonthMins,unit)}{unitLabel(unit)}</div><div className="stat-label">This Month</div></div>
        <div className="stat-box"><div className="stat-num">{thisMonthSessions}</div><div className="stat-label">Sessions This Month</div></div>
      </div>

      {/* Monthly bar chart — 12 months */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📊 Monthly Practice — Last 12 Months</div>
        <div style={{ display:"flex",alignItems:"flex-end",gap:5,height:130,marginBottom:4 }}>
          {monthData.map(b => (
            <div key={b.key} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end" }}>
              {b.mins > 0 && <div style={{ fontSize:".6rem",fontWeight:700,color:"var(--sage)",marginBottom:2,lineHeight:1,textAlign:"center" }}>{toDisplay(b.mins,unit)}{unitLabel(unit)}</div>}
              <div style={{
                width:"100%", borderRadius:"4px 4px 0 0", minHeight:2,
                height:`${Math.round((b.mins/maxMonth)*95)}px`,
                background: b.key===thisMonth ? "linear-gradient(180deg,var(--rust-light),var(--rust))" : "linear-gradient(180deg,var(--sage-light),var(--sage))",
              }} />
              <div style={{ fontSize:".62rem",color:"var(--text-light)",fontWeight:700,marginTop:3 }}>{b.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:".76rem",color:"var(--text-light)",marginTop:6 }}>
          <span style={{ color:"var(--rust)",fontWeight:700 }}>■</span> Current month &nbsp;
          <span style={{ color:"var(--sage)",fontWeight:700 }}>■</span> Previous months
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: 16 }}>
        {/* Monthly session counts */}
        <div className="card">
          <div className="card-title">📋 Sessions per Month</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {monthData.filter(m => m.mins > 0).slice(-6).reverse().map(m => {
              const count = monthSessionCount[m.key] || 0;
              const maxCount = Math.max(...Object.values(monthSessionCount), 1);
              const pct = Math.round((count/maxCount)*100);
              return (
                <div key={m.key}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                    <span style={{ fontSize:".82rem",fontWeight:700,color:"var(--text)" }}>{m.fullLabel}</span>
                    <span style={{ fontSize:".8rem",color:"var(--rust)",fontWeight:700 }}>{count} session{count!==1?"s":""}</span>
                  </div>
                  <div className="progress-bar" style={{ height:7 }}>
                    <div className="progress-fill" style={{ width:`${pct}%`, background:"linear-gradient(90deg,var(--brown-mid),var(--brown))" }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(monthSessionCount).length === 0 && <div style={{ fontSize:".82rem",color:"var(--text-light)",fontStyle:"italic" }}>No data yet</div>}
          </div>
        </div>

        {/* Day of week */}
        <div className="card">
          <div className="card-title">📅 Practice by Day of Week</div>
          <div className="bar-chart">
            {dowLabels.map((l,i) => (
              <div key={l} className="bar-col">
                {dowMap[i]>0 && <div style={{ fontSize:".6rem",fontWeight:700,color:"var(--brown-mid)",marginBottom:2,lineHeight:1 }}>{toDisplay(dowMap[i],unit)}{unitLabel(unit)}</div>}
                <div className="bar" style={{ height:`${Math.round((dowMap[i]/maxDow)*78)}px`,background:"linear-gradient(180deg,var(--brown-mid),var(--brown))" }} />
                <div className="bar-label" style={{ marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
          {bestSession && (
            <div style={{ marginTop:12,padding:"10px 12px",background:"var(--cream)",borderRadius:8,border:"1px solid var(--warm2)" }}>
              <div style={{ fontSize:".74rem",fontWeight:700,color:"var(--text-mid)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:3 }}>🏆 Best Session</div>
              <span style={{ fontWeight:700,color:"var(--rust)" }}>{toDisplay(bestSession.duration,unit)}{unitLabel(unit)}</span>
              <span style={{ fontSize:".8rem",color:"var(--text-light)",marginLeft:6 }}>
                {new Date(bestSession.date+"T12:00:00").toLocaleDateString("en",{month:"long",day:"numeric",year:"numeric"})}
                {bestSession.piece ? ` · ${bestSession.piece}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}


// ── REMINDERS ─────────────────────────────────────────────────────────────────
function Reminders({ reminders, setReminders }) {
  const [form, setForm] = useState({ label:"Daily practice", time:"09:00", days:[1,2,3,4,5], enabled:true });
  const [saved, setSaved] = useState(false);
  const [permState, setPermState] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const toggleDay = d => setForm(f=>({...f,days:f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d].sort()}));

  const requestPerm = async () => {
    if (!("Notification" in window)) { alert("Notifications not supported in this browser."); return; }
    const r = await Notification.requestPermission(); setPermState(r);
  };

  const addReminder = async () => {
    if (!form.label||form.days.length===0) return;
    const updated = [{ ...form, id: Date.now() }, ...reminders];
    setReminders(updated); await sSet(SK.reminders, updated);
    setForm({ label:"Daily practice",time:"09:00",days:[1,2,3,4,5],enabled:true });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const toggleEnabled = async (id) => { const u=reminders.map(r=>r.id===id?{...r,enabled:!r.enabled}:r); setReminders(u); await sSet(SK.reminders,u); };
  const deleteReminder = async (id) => { const u=reminders.filter(r=>r.id!==id); setReminders(u); await sSet(SK.reminders,u); };

  useEffect(() => {
    if (permState !== "granted") return;
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const dow = now.getDay();
      reminders.forEach(r => { if (r.enabled && r.time===hhmm && r.days.includes(dow)) new Notification("🎻 Practice Reminder", { body: r.label }); });
    };
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [reminders, permState]);

  return (
    <div className="grid2">
      <div className="card">
        <div className="card-title">🔔 Add Reminder</div>
        {permState !== "granted" && (
          <div style={{background:"var(--warm1)",borderRadius:9,padding:"11px 13px",marginBottom:14,fontSize:".83rem",color:"var(--text-mid)"}}>
            <strong>Enable notifications</strong> to receive practice reminders while this tab is open.
            <br/><button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={requestPerm}>Enable Notifications</button>
          </div>
        )}
        {permState==="granted"&&<div style={{background:"#d9f0e4",borderRadius:9,padding:"8px 12px",marginBottom:14,fontSize:".8rem",color:"#2e7d52",fontWeight:700}}>✓ Notifications enabled</div>}
        {permState==="denied"&&<div style={{background:"#fde9d9",borderRadius:9,padding:"8px 12px",marginBottom:14,fontSize:".8rem",color:"var(--rust)",fontWeight:700}}>⚠ Notifications blocked. Please enable them in your browser settings.</div>}
        <div className="field"><label>Label</label><input placeholder="e.g. Morning practice session" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} /></div>
        <div className="field"><label>Time</label><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} /></div>
        <div className="field">
          <label>Days</label>
          <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
            {dayNames.map((d,i)=>(
              <button key={d} className="btn btn-ghost btn-sm" onClick={()=>toggleDay(i)}
                style={{background:form.days.includes(i)?"var(--rust)":undefined,color:form.days.includes(i)?"white":undefined,minWidth:38}}>{d}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={addReminder} style={{width:"100%"}}>{saved?"✓ Saved!":"Add Reminder"}</button>
        <p style={{fontSize:".74rem",color:"var(--text-light)",marginTop:10,lineHeight:1.5}}>Reminders fire while this tab is open. Tip: pin this tab in your browser for reliable reminders.</p>
      </div>
      <div className="card">
        <div className="card-title">📋 My Reminders</div>
        {reminders.length===0&&<div className="empty-state">No reminders yet.</div>}
        {reminders.map(r=>(
          <div key={r.id} className={`reminder-item ${r.enabled?"reminder-active":""}`}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:".88rem"}}>{r.label}</div>
              <div style={{fontSize:".76rem",color:"var(--text-light)",marginTop:2}}>{r.time} · {r.days.map(d=>dayNames[d]).join(", ")}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>toggleEnabled(r.id)}
              style={{background:r.enabled?"var(--rust)":undefined,color:r.enabled?"white":undefined,minWidth:40}}>{r.enabled?"On":"Off"}</button>
            <DeleteBtn onClick={()=>deleteReminder(r.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
function Export({ sessions, pieces, goals, unit }) {
  const exportCSV = () => {
    const rows = [["Date","Duration","Piece/Focus","Rating","Tags","Notes"]];
    sessions.forEach(s => rows.push([s.date,`${toDisplay(s.duration,unit)}${unitLabel(unit)}`,s.piece||"",s.rating||"",(s.tags||[]).join(";"),(s.notes||"").replace(/"/g,"'")]));
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="violin_practice_log.csv"; a.click();
  };

  const exportPDF = () => {
    const totalMins = sessions.reduce((a,s)=>a+(s.duration||0),0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Violin Practice Log</title>
<style>
body{font-family:Georgia,serif;max-width:780px;margin:40px auto;color:#2c1a0e;padding:0 24px;}
h1{color:#5c3d1e;border-bottom:2px solid #b5541c;padding-bottom:8px;font-size:1.8rem;}
h2{color:#8b5e34;margin:24px 0 10px;font-size:1.1rem;}
.stats{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0;}
.stat{background:#f2e8d5;border-radius:8px;padding:10px 20px;text-align:center;}
.stat-num{font-size:1.5rem;font-weight:bold;color:#b5541c;}
.stat-label{font-size:.72rem;color:#a07850;text-transform:uppercase;letter-spacing:.05em;}
table{width:100%;border-collapse:collapse;font-size:.85rem;}
th{background:#f2e8d5;color:#6b4a2a;text-align:left;padding:7px 10px;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;}
td{padding:7px 10px;border-bottom:1px solid #e8d5b5;}
tr:nth-child(even){background:#faf6ef;}
.footer{margin-top:32px;font-size:.8rem;color:#a07850;border-top:1px solid #e8d5b5;padding-top:12px;}
</style></head><body>
<h1>🎻 Violin Practice Journal</h1>
<p style="color:#a07850">Exported ${new Date().toLocaleDateString("en",{year:"numeric",month:"long",day:"numeric"})}</p>
<h2>Summary</h2>
<div class="stats">
<div class="stat"><div class="stat-num">${sessions.length}</div><div class="stat-label">Sessions</div></div>
<div class="stat"><div class="stat-num">${toDisplay(totalMins,unit)}${unitLabel(unit)}</div><div class="stat-label">Total Practice</div></div>
<div class="stat"><div class="stat-num">${pieces.filter(p=>p.status==="ready").length}</div><div class="stat-label">Pieces Ready</div></div>
<div class="stat"><div class="stat-num">${goals.length}</div><div class="stat-label">Active Goals</div></div>
</div>
<h2>Practice Log</h2>
<table><thead><tr><th>Date</th><th>Duration</th><th>Piece / Focus</th><th>Rating</th><th>Tags</th><th>Notes</th></tr></thead>
<tbody>${sessions.map(s=>`<tr><td>${s.date}</td><td>${toDisplay(s.duration,unit)}${unitLabel(unit)}</td><td>${s.piece||""}</td><td>${"★".repeat(s.rating||0)}</td><td>${(s.tags||[]).join(", ")}</td><td>${s.notes||""}</td></tr>`).join("")}</tbody></table>
<h2>Repertoire</h2>
<table><thead><tr><th>Title</th><th>Composer</th><th>Status</th><th>Difficulty</th><th>Last Practiced</th><th>Notes</th></tr></thead>
<tbody>${pieces.map(p=>`<tr><td>${p.title}</td><td>${p.composer||""}</td><td>${p.status}</td><td>${"★".repeat(p.difficulty||0)}</td><td>${p.lastPracticed||"—"}</td><td>${p.notes||""}</td></tr>`).join("")}</tbody></table>
<div class="footer">Generated by Violin Practice Journal</div>
</body></html>`;
    const w = window.open("","_blank"); if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }
  };

  return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div className="card">
        <div className="card-title">📤 Export Practice Data</div>
        <p style={{fontSize:".85rem",color:"var(--text-mid)",marginBottom:20,lineHeight:1.55}}>Export your practice log to share with your teacher or keep as a backup.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--warm2)"}}>
            <div>
              <div style={{fontWeight:700}}>CSV Spreadsheet</div>
              <div style={{fontSize:".78rem",color:"var(--text-light)",marginTop:2}}>Open in Excel, Sheets, or Numbers. {sessions.length} sessions.</div>
            </div>
            <button className="btn btn-primary" onClick={exportCSV}>⬇ CSV</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--warm2)"}}>
            <div>
              <div style={{fontWeight:700}}>PDF / Print Report</div>
              <div style={{fontSize:".78rem",color:"var(--text-light)",marginTop:2}}>Formatted report with stats, full log and repertoire.</div>
            </div>
            <button className="btn btn-ghost" onClick={exportPDF}>🖨 PDF</button>
          </div>
        </div>
        <div style={{marginTop:18,padding:"11px 14px",background:"var(--warm1)",borderRadius:9,fontSize:".8rem",color:"var(--text-mid)"}}>
          💡 <strong>Tip:</strong> Share the PDF with your violin teacher before each lesson.
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function Settings({ sessions, setSessions, pieces, setPieces, goals, setGoals, reminders, setReminders }) {
  const [confirm, setConfirm] = useState(null);
  const resetSessions = async () => { setSessions([]); await sSet(SK.sessions,[]); setConfirm(null); };
  const resetPieces = async () => { setPieces([]); await sSet(SK.pieces,[]); setConfirm(null); };
  const resetGoals = async () => { setGoals([]); await sSet(SK.goals,[]); setConfirm(null); };
  const resetAll = async () => { setSessions([]); setPieces([]); setGoals([]); setReminders([]); await Promise.all([sSet(SK.sessions,[]),sSet(SK.pieces,[]),sSet(SK.goals,[]),sSet(SK.reminders,[])]); setConfirm(null); };
  const rows = [
    {label:"Practice Logs",sub:`${sessions.length} session(s)`,fn:()=>setConfirm({title:"Clear all practice logs?",body:"All sessions permanently deleted.",action:resetSessions})},
    {label:"Repertoire",sub:`${pieces.length} piece(s)`,fn:()=>setConfirm({title:"Clear repertoire?",body:"All pieces removed.",action:resetPieces})},
    {label:"Goals",sub:`${goals.length} goal(s)`,fn:()=>setConfirm({title:"Clear all goals?",body:"All goals deleted.",action:resetGoals})},
    {label:"Everything",sub:"Wipe all data",danger:true,fn:()=>setConfirm({title:"Reset everything?",body:"All data permanently deleted. Cannot be undone.",action:resetAll})},
  ];
  return (
    <>
      {confirm&&<ConfirmModal title={confirm.title} body={confirm.body} onConfirm={confirm.action} onCancel={()=>setConfirm(null)} />}
      <div style={{maxWidth:520,margin:"0 auto"}}>
        <div className="card">
          <div className="card-title">⚙️ Data & Reset</div>
          {rows.map(r=>(
            <div key={r.label} className="reset-row">
              <div><div className="reset-label">{r.label}</div><div className="reset-sub">{r.sub}</div></div>
              <button className={`btn btn-sm ${r.danger?"btn-danger":"btn-ghost"}`} onClick={r.fn}>Clear {r.label}</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
const TABS = ["Dashboard","Log","Repertoire","Goals","Statistics","Reminders","Export","Metronome","Settings"];

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [sessions, setSessions] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [unit, setUnit] = useState("min");

  useEffect(() => {
    (async () => {
      const [s,p,g,r] = await Promise.all([sGet(SK.sessions),sGet(SK.pieces),sGet(SK.goals),sGet(SK.reminders)]);
      if (s) setSessions(s); if (p) setPieces(p); if (g) setGoals(g); if (r) setReminders(r);
      setLoaded(true);
    })();
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <div className="header">
          <div className="header-title">🎻 Violin <span>Practice Journal</span></div>
          <nav className="nav">
            {TABS.map(t=><button key={t} className={`nav-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>)}
          </nav>
          <UnitToggle unit={unit} setUnit={setUnit} />
        </div>
        <div className="main">
          {!loaded&&<div className="empty-state">Loading your practice data…</div>}
          {loaded&&tab==="Dashboard"&&<Dashboard sessions={sessions} pieces={pieces} goals={goals} setGoals={setGoals} unit={unit} />}
          {loaded&&tab==="Log"&&<LogSession sessions={sessions} setSessions={setSessions} unit={unit} />}
          {loaded&&tab==="Repertoire"&&<Pieces pieces={pieces} setPieces={setPieces} sessions={sessions} />}
          {loaded&&tab==="Goals"&&<Goals goals={goals} setGoals={setGoals} sessions={sessions} unit={unit} />}
          {loaded&&tab==="Statistics"&&<Stats sessions={sessions} unit={unit} />}
          {loaded&&tab==="Reminders"&&<Reminders reminders={reminders} setReminders={setReminders} />}
          {loaded&&tab==="Export"&&<Export sessions={sessions} pieces={pieces} goals={goals} unit={unit} />}
          {loaded&&tab==="Metronome"&&<Metronome />}
          {loaded&&tab==="Settings"&&<Settings sessions={sessions} setSessions={setSessions} pieces={pieces} setPieces={setPieces} goals={goals} setGoals={setGoals} reminders={reminders} setReminders={setReminders} />}
        </div>
      </div>
    </>
  );
}
