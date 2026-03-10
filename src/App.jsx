import { useState, useEffect, useRef, useCallback } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const SK = { sessions: "violin_sessions", pieces: "violin_pieces", goals: "violin_goals", reminders: "violin_reminders", focusAreas: "violin_focus_areas" };

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
.header{background:var(--brown);padding:14px 22px;padding-top:calc(14px + env(safe-area-inset-top));display:flex;align-items:center;justify-content:space-between;
  box-shadow:0 4px 20px rgba(44,26,14,.3);position:sticky;top:0;z-index:100;gap:12px;flex-wrap:wrap;}
.header-title{font-family:'Playfair Display',serif;font-size:1.45rem;color:var(--warm1);letter-spacing:.02em;white-space:nowrap;}
.header-title span{color:var(--rust-light);font-style:italic;}
.nav{display:flex;gap:3px;flex-wrap:wrap;}
.nav-btn{background:none;border:none;padding:6px 11px;border-radius:8px;color:var(--warm2);
  font-family:'Lato',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  cursor:pointer;transition:all .2s;white-space:nowrap;}
.nav-btn:hover{background:rgba(255,255,255,.1);color:white;}
.nav-btn.active{background:var(--rust);color:white;}
.main{max-width:960px;margin:0 auto;padding:24px 18px;padding-bottom:calc(24px + env(safe-area-inset-bottom));padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
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

  // All scheduler state lives in refs — never stale inside the scheduler loop
  const audioCtxRef = useRef(null);
  const schedulerTimerRef = useRef(null);
  const nextBeatTimeRef = useRef(0);   // audioCtx time of the next beat to schedule
  const beatIdxRef = useRef(0);        // global beat counter
  const barCountRef = useRef(0);

  // Mirrored refs so scheduler always reads latest values without re-closures
  const bpmRef = useRef(bpm);
  const bpbRef = useRef(beatsPerBar);
  const rampRef = useRef({ enabled: false, everyBars: 2, amount: 5, max: 160 });

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { bpbRef.current = beatsPerBar; }, [beatsPerBar]);
  useEffect(() => { rampRef.current = { enabled: rampEnabled, everyBars: rampEveryBars, amount: rampAmount, max: rampMax }; }, [rampEnabled, rampEveryBars, rampAmount, rampMax]);

  // Schedule a single click at a precise audio time
  const scheduleClick = useCallback((isAccent, atTime) => {
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = isAccent ? 1320 : 880;
    gain.gain.setValueAtTime(isAccent ? 0.5 : 0.28, atTime);
    gain.gain.exponentialRampToValueAtTime(0.001, atTime + (isAccent ? 0.12 : 0.07));
    osc.start(atTime);
    osc.stop(atTime + 0.15);
  }, []);

  // The lookahead scheduler — runs every 25ms, schedules beats up to 100ms ahead
  // This means timing is driven by the audio clock, not the JS event loop
  const LOOKAHEAD_MS = 25;       // how often scheduler runs (ms)
  const SCHEDULE_AHEAD_S = 0.1;  // how far ahead to schedule (seconds)

  const schedulerLoop = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    while (nextBeatTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const beatInBar = beatIdxRef.current % bpbRef.current;

      // Schedule the audio click at the precise future time
      scheduleClick(beatInBar === 0, nextBeatTimeRef.current);

      // Schedule a UI update ~10ms before the beat fires so visuals feel in sync
      const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000 - 10);
      const capturedBeat = beatInBar;
      setTimeout(() => {
        setCurrentBeat(capturedBeat);
      }, delay);

      // Advance counters
      beatIdxRef.current += 1;

      if (beatInBar === bpbRef.current - 1) {
        barCountRef.current += 1;
        const capturedBar = barCountRef.current;
        setTimeout(() => setCurrentBar(capturedBar), delay);

        // Auto BPM ramp
        const r = rampRef.current;
        if (r.enabled && barCountRef.current % r.everyBars === 0) {
          const newBpm = Math.min(r.max, bpmRef.current + r.amount);
          bpmRef.current = newBpm;
          setBpm(newBpm);
        }
      }

      // Advance next beat time using current bpm ref (may have been ramped)
      nextBeatTimeRef.current += 60 / bpmRef.current;
    }
  }, [scheduleClick]);

  const stop = useCallback(() => {
    clearInterval(schedulerTimerRef.current);
    setRunning(false);
    setCurrentBeat(-1);
    setCurrentBar(0);
    beatIdxRef.current = 0;
    barCountRef.current = 0;
  }, []);

  const start = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();

    beatIdxRef.current = 0;
    barCountRef.current = 0;
    setCurrentBar(0);

    // Start scheduling from slightly ahead of now so first beat isn't clipped
    nextBeatTimeRef.current = audioCtxRef.current.currentTime + 0.05;

    schedulerTimerRef.current = setInterval(schedulerLoop, LOOKAHEAD_MS);
    setRunning(true);
  }, [schedulerLoop]);

  const handleBpm = (val) => {
    const c = Math.max(20, Math.min(240, val));
    setBpm(c);
    bpmRef.current = c;
    // No need to restart — scheduler reads bpmRef on each loop iteration
  };

  useEffect(() => () => clearInterval(schedulerTimerRef.current), []);

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
const VIOLIN_COMPOSERS = [
  "Bach, J.S.","Bartók, Béla","Beethoven, Ludwig van","Berg, Alban",
  "Brahms, Johannes","Bruch, Max","Chausson, Ernest","Corelli, Arcangelo",
  "Dvořák, Antonín","Elgar, Edward","Franck, César","Glazunov, Alexander",
  "Grieg, Edvard","Handel, G.F.","Haydn, Joseph","Kreisler, Fritz",
  "Lalo, Édouard","Mendelssohn, Felix","Mozart, W.A.","Paganini, Niccolò",
  "Prokofiev, Sergei","Ravel, Maurice","Saint-Saëns, Camille","Schubert, Franz",
  "Shostakovich, Dmitri","Sibelius, Jean","Spohr, Louis","Strauss, Richard",
  "Szymanowski, Karol","Tartini, Giuseppe","Tchaikovsky, Pyotr","Telemann, G.P.",
  "Vieuxtemps, Henri","Viotti, Giovanni","Vivaldi, Antonio","Wieniawski, Henryk",
];
const DEFAULT_FOCUS_AREAS = ["Scales","Etudes","Repertoire","Bowing","Intonation","Sight-reading","Theory","Vibrato","General Practice"];
const BLANK_FORM = () => ({ date: todayStr(), duration: "", rating: 3, notes: "", tags: [], piece: "", linkedGoals: [], linkedPiece: null, composer: "" });

function LogSession({ sessions, setSessions, unit, goals, focusAreas, pieces, setPieces }) {
  const [form, setForm] = useState(BLANK_FORM());
  const [saved, setSaved] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null); // wall-clock time when timer was last started

  // Load persisted timer on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("violin_timer");
        if (r) {
          const saved = JSON.parse(r.value);
          if (saved.running && saved.startedAt) {
            // Timer was running when app closed — calculate elapsed time
            const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
            const total = (saved.seconds || 0) + elapsed;
            setTimerSeconds(total);
            setTimerRunning(true);
            startTimeRef.current = Date.now();
            intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
          } else {
            setTimerSeconds(saved.seconds || 0);
          }
        }
      } catch {}
    })();
    return () => clearInterval(intervalRef.current);
  }, []);

  const persistTimer = async (seconds, running, startedAt = null) => {
    try { await window.storage.set("violin_timer", JSON.stringify({ seconds, running, startedAt })); } catch {}
  };

  const timerStart = () => {
    if (timerRunning) return;
    const now = Date.now();
    startTimeRef.current = now;
    setTimerRunning(true);
    intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    persistTimer(timerSeconds, true, now);
  };
  const timerPause = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    persistTimer(timerSeconds, false);
  };
  const timerStop = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    if (timerSeconds === 0) return;
    const totalMins = timerSeconds / 60;
    const display = unit === "hrs"
      ? +((totalMins / 60).toFixed(2))
      : +(totalMins.toFixed(1));
    setForm(f => ({ ...f, duration: String(display) }));
    persistTimer(0, false);
    setTimerSeconds(0);
  };
  const timerReset = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimerSeconds(0);
    persistTimer(0, false);
  };

  // Keep persisted seconds in sync while running
  useEffect(() => {
    if (timerRunning) {
      persistTimer(timerSeconds, true, startTimeRef.current);
    }
  }, [timerSeconds, timerRunning]);

  const fmtTimer = s => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const toggleTag = t => setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x=>x!==t) : [...f.tags,t] }));
  const toggleGoalLink = id => {
    setForm(f => {
      const already = (f.linkedGoals||[]).includes(id);
      if (already) return { ...f, linkedGoals: f.linkedGoals.filter(x=>x!==id) };
      // Auto-fill from goal when linking
      const goal = goals.find(g => g.id === id);
      const updates = { linkedGoals: [...(f.linkedGoals||[]), id] };
      if (goal) {
        // Fill piece/focus from goal label if not already filled
        if (!f.piece && goal.label) updates.piece = goal.label;
        // Fill tags from goal label if none set
        if ((!f.tags || f.tags.length === 0) && goal.label) updates.tags = [goal.label];
        // Fill target duration if duration empty (convert goal target to display unit)
        if (!f.duration && goal.type === "weekly_minutes" && goal.target) {
          const dailySuggestion = Math.round(goal.target / 5); // suggest 1/5th of weekly target
          updates.duration = String(toDisplay(dailySuggestion, unit));
        }
      }
      return { ...f, ...updates };
    });
  };

  const togglePieceLink = id => {
    setForm(f => {
      if (f.linkedPiece === id) return { ...f, linkedPiece: null };
      const p = pieces.find(x => x.id === id);
      const updates = { linkedPiece: id };
      if (p) {
        if (!f.piece) updates.piece = p.title;
        if (!f.composer && p.composer) updates.composer = p.composer;
      }
      return { ...f, ...updates };
    });
  };

  const [customTags, setCustomTags] = useState([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const submitNewTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !focusAreas.includes(trimmed) && !customTags.includes(trimmed)) {
      setCustomTags(t => [...t, trimmed]);
      setForm(f => ({ ...f, tags: [...f.tags, trimmed] }));
    }
    setNewTagInput("");
    setAddingTag(false);
  };

  // Only show linkable goals (not custom/manual ones which have their own slider)
  const linkableGoals = goals.filter(g => g.type !== "custom");

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
    // Update lastPracticed on linked piece
    if (form.linkedPiece) {
      const updatedPieces = pieces.map(p => p.id === form.linkedPiece ? { ...p, lastPracticed: form.date } : p);
      setPieces(updatedPieces); await sSet(SK.pieces, updatedPieces);
    }
    setForm(BLANK_FORM());
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const startEdit = (s) => {
    setForm({ date: s.date, duration: toDisplay(s.duration, unit), rating: s.rating, notes: s.notes||"", tags: s.tags||[], piece: s.piece||"", linkedGoals: s.linkedGoals||[], linkedPiece: s.linkedPiece||null, composer: s.composer||"" });
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

          {/* ── Timer ── */}
          <div style={{ background:"var(--cream)", border:"1.5px solid var(--warm2)", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:".72rem", fontWeight:700, color:"var(--text-mid)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>⏱ Practice Timer</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, color: timerRunning ? "var(--rust)" : timerSeconds > 0 ? "var(--brown)" : "var(--text-light)", letterSpacing:".04em", minWidth:90 }}>
                {fmtTimer(timerSeconds)}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {!timerRunning ? (
                  <button className="btn btn-primary btn-sm" onClick={timerStart} style={{ minWidth:56 }}>
                    {timerSeconds === 0 ? "▶ Start" : "▶ Resume"}
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={timerPause} style={{ minWidth:56 }}>⏸ Pause</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={timerStop} disabled={timerSeconds === 0}
                  style={{ minWidth:52, opacity: timerSeconds === 0 ? 0.4 : 1 }} title="Stop and fill duration">
                  ⏹ Stop
                </button>
                <button className="btn btn-ghost btn-sm" onClick={timerReset} disabled={timerSeconds === 0}
                  style={{ minWidth:56, opacity: timerSeconds === 0 ? 0.4 : 1 }}>
                  ↺ Reset
                </button>
              </div>
            </div>
            {timerSeconds > 0 && !timerRunning && (
              <div style={{ fontSize:".74rem", color:"var(--text-light)", marginTop:6, fontStyle:"italic" }}>
                Timer paused — will resume from here even if you navigate away.
              </div>
            )}
          </div>

          <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></div>
          <div className="field"><label>Duration ({unitLabel(unit)})</label><input type="number" placeholder={unit==="hrs"?"e.g. 0.75":"e.g. 45"} step={unit==="hrs"?"0.05":"1"} value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} /></div>
          <div className="field">
            <label>Composer</label>
            <select
              value={VIOLIN_COMPOSERS.includes(form.composer) || form.composer === "" ? form.composer : "__custom__"}
              onChange={e => setForm(f=>({...f, composer: e.target.value === "__custom__" ? "" : e.target.value}))}>
              <option value="__custom__">— Custom —</option>
              {VIOLIN_COMPOSERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {!VIOLIN_COMPOSERS.includes(form.composer) && (
              <input
                type="text"
                placeholder="Type composer name…"
                value={form.composer}
                onChange={e => setForm(f=>({...f, composer: e.target.value}))}
                style={{ marginTop: 6 }}
                autoFocus
              />
            )}
          </div>
          <div className="field"><label>Piece / Focus</label><input type="text" placeholder="e.g. Chaconne, Sonata No.1, Scales in D" value={form.piece} onChange={e=>setForm(f=>({...f,piece:e.target.value}))} /></div>
          <div className="field"><label>Rating</label><StarRating value={form.rating} onChange={r=>setForm(f=>({...f,rating:r}))} /></div>
          <div className="field">
            <label>Focus Areas</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginTop:4 }}>
              {[...focusAreas, ...customTags].map(t => (
                <button key={t} onClick={()=>toggleTag(t)} className="btn btn-ghost btn-sm"
                  style={{ background:form.tags.includes(t)?"var(--rust)":undefined, color:form.tags.includes(t)?"white":undefined }}>
                  {t}
                </button>
              ))}
              {addingTag ? (
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <input
                    autoFocus
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter") submitNewTag(); if (e.key==="Escape") { setAddingTag(false); setNewTagInput(""); } }}
                    placeholder="New focus area…"
                    style={{ width:130, padding:"3px 8px", fontSize:".78rem" }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={submitNewTag}>Add</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{ setAddingTag(false); setNewTagInput(""); }}>×</button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={()=>setAddingTag(true)}
                  style={{ border:"1.5px dashed var(--warm2)", color:"var(--text-light)" }}>
                  + Add New
                </button>
              )}
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={3} placeholder="How did it go?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          {pieces.filter(p => p.status !== "wishlist").length > 0 && (
            <div className="field">
              <label>Link to Piece</label>
              <div style={{ display:"flex",flexDirection:"column",gap:5,marginTop:4 }}>
                {pieces.filter(p => p.status !== "wishlist").map(p => {
                  const linked = form.linkedPiece === p.id;
                  return (
                    <button key={p.id} onClick={()=>togglePieceLink(p.id)}
                      style={{
                        display:"flex", alignItems:"center", gap:8, padding:"7px 11px",
                        borderRadius:8, border:`1.5px solid ${linked?"var(--sage)":"var(--warm2)"}`,
                        background: linked?"#f0f5ee":"var(--cream)", cursor:"pointer",
                        textAlign:"left", width:"100%", transition:"all .15s",
                      }}>
                      <div style={{
                        width:16, height:16, borderRadius:4, flexShrink:0,
                        border:`2px solid ${linked?"var(--sage)":"var(--warm2)"}`,
                        background: linked?"var(--sage)":"transparent",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        {linked && <span style={{color:"white",fontSize:".65rem",fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{fontSize:".82rem",color:"var(--text)",fontWeight:linked?700:400,flex:1}}>{p.title}</span>
                      {p.composer && <span style={{fontSize:".74rem",color:"var(--text-light)",fontStyle:"italic"}}>{p.composer}</span>}
                      <span className={`status-badge status-${p.status}`} style={{fontSize:".68rem"}}>{p.status}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{fontSize:".74rem",color:"var(--text-light)",marginTop:6}}>💡 Linking a piece auto-fills the title & composer, and updates its "last practiced" date when you save.</div>
            </div>
          )}
          {linkableGoals.length > 0 && (
            <div className="field">
              <label>Link to Goals</label>
              <div style={{ display:"flex",flexDirection:"column",gap:5,marginTop:4 }}>
                {linkableGoals.map(g => {
                  const linked = (form.linkedGoals||[]).includes(g.id);
                  return (
                    <button key={g.id} onClick={()=>toggleGoalLink(g.id)}
                      style={{
                        display:"flex", alignItems:"center", gap:8, padding:"7px 11px",
                        borderRadius:8, border:`1.5px solid ${linked?"var(--rust)":"var(--warm2)"}`,
                        background: linked?"#fff5f0":"var(--cream)", cursor:"pointer",
                        textAlign:"left", width:"100%", transition:"all .15s",
                      }}>
                      <div style={{
                        width:16, height:16, borderRadius:4, flexShrink:0,
                        border:`2px solid ${linked?"var(--rust)":"var(--warm2)"}`,
                        background: linked?"var(--rust)":"transparent",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        {linked && <span style={{color:"white",fontSize:".65rem",fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{fontSize:".82rem",color:"var(--text)",fontWeight:linked?700:400}}>{g.label}</span>
                      <span style={{fontSize:".72rem",color:"var(--text-light)",marginLeft:"auto"}}>{linked ? "✓ auto-filled" : `${toDisplay(g.target,unit)}${unitLabel(unit)} goal`}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{fontSize:".74rem",color:"var(--text-light)",marginTop:6}}>💡 Ticking a goal auto-fills the piece and duration. Just add the date and time to save.</div>
            </div>
          )}
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
              {focusAreas.map(t=><option key={t} value={t}>{t}</option>)}
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
                  {(s.composer || s.piece) && (
                    <div style={{ fontSize:".8rem",color:"var(--text-mid)",marginTop:2 }}>
                      {s.composer && <span style={{fontStyle:"italic"}}>{s.composer}{s.piece ? " — " : ""}</span>}
                      {s.piece && <span>{s.piece}</span>}
                    </div>
                  )}
                  <div className="session-tags">{(s.tags||[]).map(t=><span key={t} className="tag">{t}</span>)}</div>
                  {(s.linkedGoals||[]).length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
                      {(s.linkedGoals||[]).map(gid => {
                        const g = goals.find(x=>x.id===gid);
                        return g ? <span key={gid} style={{background:"#fff0e8",color:"var(--rust)",padding:"1px 7px",borderRadius:20,fontSize:".7rem",fontWeight:700,border:"1px solid #f5d5c5"}}>🎯 {g.label}</span> : null;
                      })}
                    </div>
                  )}
                  {s.linkedPiece && (()=>{ const p=pieces.find(x=>x.id===s.linkedPiece); return p ? <div style={{marginTop:3}}><span style={{background:"#eef4ec",color:"var(--sage)",padding:"1px 7px",borderRadius:20,fontSize:".7rem",fontWeight:700,border:"1px solid #c5d9bf"}}>🎼 {p.title}</span></div> : null; })()}
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
  const totalSessions = sessions.length;

  // For a given goal, sum only sessions explicitly linked to it
  const linkedMinsForGoal = g => sessions
    .filter(s => (s.linkedGoals||[]).includes(g.id))
    .reduce((a,s) => a+(s.duration||0), 0);

  // Weekly_minutes goals: count linked sessions within this week only
  const linkedWeekMinsForGoal = g => sessions
    .filter(s => (s.linkedGoals||[]).includes(g.id) && week.includes(s.date))
    .reduce((a,s) => a+(s.duration||0), 0);

  // Total_sessions goals: count linked sessions
  const linkedSessionsForGoal = g => sessions
    .filter(s => (s.linkedGoals||[]).includes(g.id)).length;

  const hasAnyLinks = g => sessions.some(s => (s.linkedGoals||[]).includes(g.id));

  const getProgress = g => {
    if (g.type==="weekly_minutes") {
      if (!hasAnyLinks(g)) return 0;
      return Math.min(100, Math.round((linkedWeekMinsForGoal(g)/g.target)*100));
    }
    if (g.type==="total_sessions") {
      if (!hasAnyLinks(g)) return 0;
      return Math.min(100, Math.round((linkedSessionsForGoal(g)/g.target)*100));
    }
    return g.progress||0;
  };

  const getProgressVal = g => {
    if (g.type==="weekly_minutes") {
      const mins = hasAnyLinks(g) ? linkedWeekMinsForGoal(g) : 0;
      return `${toDisplay(mins,unit)}${unitLabel(unit)} / ${toDisplay(g.target,unit)}${unitLabel(unit)}${hasAnyLinks(g)?" (linked)":""}`;
    }
    if (g.type==="total_sessions") {
      const count = hasAnyLinks(g) ? linkedSessionsForGoal(g) : 0;
      return `${count} / ${g.target} sessions${hasAnyLinks(g)?" (linked)":""}`;
    }
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
function Reminders({ reminders, setReminders, focusAreas }) {
  const [form, setForm] = useState({ label: focusAreas[0]||"Scales", time:"09:00", days:[1,2,3,4,5], enabled:true });
  const [labelMode, setLabelMode] = useState("preset");
  const [customLabel, setCustomLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [permState, setPermState] = useState("unknown"); // unknown | granted | denied
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const focusOptions = [...focusAreas, "Custom…"];

  // Check permission on mount
  useEffect(() => {
    (async () => {
      if (isCapacitor()) {
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const status = await LocalNotifications.checkPermissions();
          setPermState(status.display === "granted" ? "granted" : "default");
        } catch { setPermState("default"); }
      } else {
        if (typeof Notification !== "undefined") {
          setPermState(Notification.permission);
        } else {
          setPermState("unsupported");
        }
      }
    })();
  }, []);

  const requestPerm = async () => {
    if (isCapacitor()) {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const result = await LocalNotifications.requestPermissions();
        setPermState(result.display === "granted" ? "granted" : "denied");
      } catch { setPermState("denied"); }
    } else {
      if (typeof Notification === "undefined") { setPermState("unsupported"); return; }
      const r = await Notification.requestPermission();
      setPermState(r);
    }
  };

  const handleLabelSelect = val => {
    if (val === "Custom…") { setLabelMode("custom"); setForm(f=>({...f,label:customLabel})); }
    else { setLabelMode("preset"); setForm(f=>({...f,label:val})); }
  };

  const effectiveLabel = labelMode === "custom" ? customLabel : form.label;
  const toggleDay = d => setForm(f=>({...f,days:f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d].sort()}));

  // Schedule Capacitor local notifications for a reminder
  const scheduleCapacitorReminder = async (reminder) => {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      // Cancel existing notifications for this reminder first
      const existingIds = reminder.days.map((d, i) => ({ id: reminder.id + i }));
      await LocalNotifications.cancel({ notifications: existingIds }).catch(()=>{});

      if (!reminder.enabled) return;

      const [hours, minutes] = reminder.time.split(":").map(Number);
      const notifications = reminder.days.map((dayOfWeek, i) => {
        // Find next occurrence of this day
        const now = new Date();
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
        if (daysUntil === 0 && next <= now) next.setDate(next.getDate() + 7);
        else next.setDate(next.getDate() + daysUntil);

        return {
          id: reminder.id + i,
          title: "🎻 Practice Reminder",
          body: reminder.label,
          schedule: {
            at: next,
            repeats: true,
            every: "week",
          },
          sound: null,
          smallIcon: "ic_stat_icon_config_sample",
        };
      });
      await LocalNotifications.schedule({ notifications });
    } catch (e) { console.error("Scheduling failed", e); }
  };

  const addReminder = async () => {
    if (!effectiveLabel || form.days.length===0) return;
    const newReminder = { ...form, label: effectiveLabel, id: Date.now() };
    const updated = [newReminder, ...reminders];
    setReminders(updated); await sSet(SK.reminders, updated);
    if (isCapacitor() && permState === "granted") await scheduleCapacitorReminder(newReminder);
    setForm({ label: focusAreas[0]||"Scales", time:"09:00", days:[1,2,3,4,5], enabled:true });
    setLabelMode("preset"); setCustomLabel("");
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  };

  const toggleEnabled = async (id) => {
    const updated = reminders.map(r => r.id===id ? {...r, enabled:!r.enabled} : r);
    setReminders(updated); await sSet(SK.reminders, updated);
    if (isCapacitor()) {
      const r = updated.find(x => x.id===id);
      if (r) await scheduleCapacitorReminder(r);
    }
  };

  const deleteReminder = async (id) => {
    if (isCapacitor()) {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const r = reminders.find(x => x.id===id);
        if (r) await LocalNotifications.cancel({ notifications: r.days.map((_,i)=>({ id: r.id+i })) });
      } catch {}
    }
    const updated = reminders.filter(r => r.id!==id);
    setReminders(updated); await sSet(SK.reminders, updated);
  };

  // Web-only: poll every minute and fire browser notifications
  useEffect(() => {
    if (isCapacitor() || permState !== "granted") return;
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const dow = now.getDay();
      reminders.forEach(r => { if (r.enabled && r.time===hhmm && r.days.includes(dow)) new Notification("🎻 Practice Reminder", { body: r.label }); });
    };
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [reminders, permState]);

  const permGranted = permState === "granted";
  const permDenied = permState === "denied";
  const permUnsupported = permState === "unsupported";

  return (
    <div className="grid2">
      <div className="card">
        <div className="card-title">🔔 Add Reminder</div>

        {!permGranted && !permDenied && !permUnsupported && (
          <div style={{background:"var(--warm1)",borderRadius:9,padding:"11px 13px",marginBottom:14,fontSize:".83rem",color:"var(--text-mid)"}}>
            <strong>Enable notifications</strong> to receive practice reminders.
            {!isCapacitor() && <span> Reminders fire while this tab is open.</span>}
            <br/><button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={requestPerm}>Enable Notifications</button>
          </div>
        )}
        {permGranted && <div style={{background:"#d9f0e4",borderRadius:9,padding:"8px 12px",marginBottom:14,fontSize:".8rem",color:"#2e7d52",fontWeight:700}}>✓ Notifications enabled</div>}
        {permDenied && <div style={{background:"#fde9d9",borderRadius:9,padding:"8px 12px",marginBottom:14,fontSize:".8rem",color:"var(--rust)",fontWeight:700}}>⚠ Notifications blocked. Please enable them in your {isCapacitor()?"Android app settings":"browser settings"}.</div>}
        {permUnsupported && <div style={{background:"#fde9d9",borderRadius:9,padding:"8px 12px",marginBottom:14,fontSize:".8rem",color:"var(--rust)",fontWeight:700}}>⚠ Notifications not supported in this environment.</div>}

        <div className="field">
          <label>Focus Area</label>
          <select value={labelMode==="custom"?"Custom…":form.label} onChange={e=>handleLabelSelect(e.target.value)}>
            {focusOptions.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {labelMode==="custom"&&(
          <div className="field">
            <label>Custom Label</label>
            <input placeholder="e.g. Morning warm-up routine" value={customLabel} onChange={e=>setCustomLabel(e.target.value)} autoFocus />
          </div>
        )}
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
        <p style={{fontSize:".74rem",color:"var(--text-light)",marginTop:10,lineHeight:1.5}}>
          {isCapacitor() ? "Reminders will fire even when the app is closed." : "Reminders fire while this tab is open. Tip: pin this tab for reliable reminders."}
        </p>
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
const isCapacitor = () => typeof window !== "undefined" && !!(window.Capacitor?.isNativePlatform?.());

function Export({ sessions, pieces, goals, unit }) {
  const [pdfStatus, setPdfStatus] = useState("idle");
  const [pkgName, setPkgName] = useState("");
  const [pkgTutorName, setPkgTutorName] = useState("");
  const [pkgDescription, setPkgDescription] = useState("");
  const [pkgGoals, setPkgGoals] = useState([]);
  const [pkgPieces, setPkgPieces] = useState([]);
  const [pkgFocusAreas, setPkgFocusAreas] = useState([]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const togglePkgFocus = fa => setPkgFocusAreas(f => f.includes(fa) ? f.filter(x=>x!==fa) : [...f, fa]);

  // For ticking existing goals/pieces to include
  const togglePkgGoal = id => setPkgGoals(g => g.includes(id) ? g.filter(x=>x!==id) : [...g, id]);
  const togglePkgPiece = id => setPkgPieces(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  // For adding new goals/pieces from scratch in the package builder
  const [newPkgGoalLabel, setNewPkgGoalLabel] = useState("");
  const [newPkgGoalType, setNewPkgGoalType] = useState("weekly_minutes");
  const [newPkgGoalTarget, setNewPkgGoalTarget] = useState("");
  const [pkgGoalItems, setPkgGoalItems] = useState([]); // custom-built goals for package
  const [newPkgPieceTitle, setNewPkgPieceTitle] = useState("");
  const [newPkgPieceComposer, setNewPkgPieceComposer] = useState("");
  const [newPkgPieceStatus, setNewPkgPieceStatus] = useState("learning");
  const [pkgPieceItems, setPkgPieceItems] = useState([]); // custom-built pieces for package
  const [newPkgFocus, setNewPkgFocus] = useState("");
  const [pkgFocusItems, setPkgFocusItems] = useState([]); // custom-built focus areas for package

  const addPkgGoal = () => {
    if (!newPkgGoalLabel.trim() || !newPkgGoalTarget) return;
    const targetVal = newPkgGoalType === "weekly_minutes" ? toMins(Number(newPkgGoalTarget), unit) : Number(newPkgGoalTarget);
    setPkgGoalItems(g => [...g, { id: Date.now(), label: newPkgGoalLabel.trim(), type: newPkgGoalType, target: targetVal }]);
    setNewPkgGoalLabel(""); setNewPkgGoalTarget("");
  };
  const removePkgGoal = id => setPkgGoalItems(g => g.filter(x => x.id !== id));

  const addPkgPiece = () => {
    if (!newPkgPieceTitle.trim()) return;
    setPkgPieceItems(p => [...p, { id: Date.now(), title: newPkgPieceTitle.trim(), composer: newPkgPieceComposer.trim(), status: newPkgPieceStatus }]);
    setNewPkgPieceTitle(""); setNewPkgPieceComposer("");
  };
  const removePkgPiece = id => setPkgPieceItems(p => p.filter(x => x.id !== id));

  const addPkgFocusItem = () => {
    if (!newPkgFocus.trim() || pkgFocusItems.includes(newPkgFocus.trim())) return;
    setPkgFocusItems(f => [...f, newPkgFocus.trim()]); setNewPkgFocus("");
  };
  const removePkgFocus = fa => setPkgFocusItems(f => f.filter(x => x !== fa));

  // Also allow ticking existing goals/pieces from the user's own data
  const linkableGoals = goals.filter(g => g.type !== "custom");
  const allFocusAreas = [...new Set(sessions.flatMap(s => s.tags||[]))];

  const APP_URL = "https://violin-journal-app.vercel.app";

  const generateLink = () => {
    // Combine custom-built items with any ticked existing ones
    const tickedGoals = linkableGoals.filter(g => pkgGoals.includes(g.id)).map(g => ({ label: g.label, type: g.type, target: g.target }));
    const tickedPieces = pieces.filter(p => pkgPieces.includes(p.id)).map(p => ({ title: p.title, composer: p.composer||"", status: p.status, difficulty: p.difficulty, notes: p.notes||"" }));
    const allGoals = [...pkgGoalItems.map(g => ({ label: g.label, type: g.type, target: g.target })), ...tickedGoals];
    const allPieces = [...pkgPieceItems.map(p => ({ title: p.title, composer: p.composer, status: p.status, difficulty: 0, notes: "" })), ...tickedPieces];
    const allFocus = [...pkgFocusItems, ...pkgFocusAreas];
    const pkg = {
      type: "practice_package",
      name: pkgName || "Practice Package",
      tutorName: pkgTutorName,
      description: pkgDescription,
      goals: allGoals,
      pieces: allPieces,
      focusAreas: [...new Set(allFocus)],
      created: todayStr(),
    };
    const encoded = btoa(JSON.stringify(pkg));
    setGeneratedLink(`${APP_URL}/?pkg=${encoded}`);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(()=>setCopied(false), 2500); } catch {}
  };

  const buildHTMLReport = () => {
    const totalMins = sessions.reduce((a,s)=>a+(s.duration||0),0);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Violin Practice Log</title>
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
<table><thead><tr><th>Date</th><th>Duration</th><th>Composer</th><th>Piece / Focus</th><th>Rating</th><th>Tags</th><th>Notes</th></tr></thead>
<tbody>${sessions.map(s=>`<tr><td>${s.date}</td><td>${toDisplay(s.duration,unit)}${unitLabel(unit)}</td><td>${s.composer||""}</td><td>${s.piece||""}</td><td>${"★".repeat(s.rating||0)}</td><td>${(s.tags||[]).join(", ")}</td><td>${s.notes||""}</td></tr>`).join("")}</tbody></table>
<h2>Repertoire</h2>
<table><thead><tr><th>Title</th><th>Composer</th><th>Status</th><th>Difficulty</th><th>Last Practiced</th><th>Notes</th></tr></thead>
<tbody>${pieces.map(p=>`<tr><td>${p.title}</td><td>${p.composer||""}</td><td>${p.status}</td><td>${"★".repeat(p.difficulty||0)}</td><td>${p.lastPracticed||"—"}</td><td>${p.notes||""}</td></tr>`).join("")}</tbody></table>
<div class="footer">Generated by Violin Practice Journal</div>
</body></html>`;
  };

  const exportCSV = () => {
    const rows = [["Date","Duration","Composer","Piece/Focus","Rating","Tags","Notes"]];
    sessions.forEach(s => rows.push([s.date,`${toDisplay(s.duration,unit)}${unitLabel(unit)}`,s.composer||"",s.piece||"",s.rating||"",(s.tags||[]).join(";"),(s.notes||"").replace(/"/g,"'")]));
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="violin_practice_log.csv"; a.click();
  };

  const exportPDF = async () => {
    const html = buildHTMLReport();
    if (isCapacitor()) {
      try {
        setPdfStatus("generating");
        const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const fileName = `violin_practice_${new Date().toISOString().slice(0,10)}.html`;
        await Filesystem.writeFile({ path: fileName, data: html, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const fileResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({ title: "Violin Practice Journal", text: "My violin practice report", url: fileResult.uri, dialogTitle: "Save or share your practice report" });
        setPdfStatus("done"); setTimeout(() => setPdfStatus("idle"), 3000);
      } catch (e) { console.error(e); setPdfStatus("error"); setTimeout(() => setPdfStatus("idle"), 3000); }
    } else {
      const w = window.open("","_blank");
      if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }
    }
  };

  const pdfLabel = pdfStatus==="generating" ? "⏳ Generating…" : pdfStatus==="done" ? "✓ Saved!" : pdfStatus==="error" ? "⚠ Error" : isCapacitor() ? "📤 Share / Save" : "🖨 PDF";

  return (
    <>
      {/* Create Practice Package */}
      <div className="card">
        <div className="card-title">📦 Create Practice Package</div>
        <div style={{fontSize:".83rem",color:"var(--text-mid)",marginBottom:14,lineHeight:1.55}}>
          Build a shareable link for your students containing goals, pieces, and focus areas.
        </div>
        <div className="field"><label>Package Name</label><input placeholder="e.g. Week 3 Beginner Routine" value={pkgName} onChange={e=>setPkgName(e.target.value)} /></div>
        <div className="field"><label>Your Name (Tutor)</label><input placeholder="e.g. Mr. Smith" value={pkgTutorName} onChange={e=>setPkgTutorName(e.target.value)} /></div>
        <div className="field"><label>Description / Notes for Student</label><textarea rows={2} placeholder="e.g. Focus on bow hold this week. Practice slowly!" value={pkgDescription} onChange={e=>setPkgDescription(e.target.value)} /></div>

        {/* Goals */}
        <div className="field">
          <label>Goals to Include</label>
          {pkgGoalItems.map(g => (
            <div key={g.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,padding:"5px 8px",background:"var(--cream)",borderRadius:7,border:"1px solid var(--warm2)"}}>
              <span style={{flex:1,fontSize:".82rem",fontWeight:700}}>{g.label}</span>
              <span style={{fontSize:".74rem",color:"var(--text-light)"}}>{toDisplay(g.target,unit)}{unitLabel(unit)}</span>
              <button onClick={()=>removePkgGoal(g.id)} style={{background:"none",border:"none",color:"var(--rust)",cursor:"pointer",fontWeight:900,fontSize:".9rem"}}>✕</button>
            </div>
          ))}
          {/* Also tick existing goals */}
          {linkableGoals.length > 0 && linkableGoals.map(g => {
            const on = pkgGoals.includes(g.id);
            return (
              <div key={g.id} onClick={()=>togglePkgGoal(g.id)} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,padding:"5px 8px",background:on?"#fff5f0":"var(--cream)",borderRadius:7,border:`1.5px solid ${on?"var(--rust)":"var(--warm2)"}`,cursor:"pointer"}}>
                <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${on?"var(--rust)":"var(--warm2)"}`,background:on?"var(--rust)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {on&&<span style={{color:"white",fontSize:".55rem",fontWeight:900}}>✓</span>}
                </div>
                <span style={{flex:1,fontSize:".82rem"}}>{g.label}</span>
                <span style={{fontSize:".74rem",color:"var(--text-light)"}}>{toDisplay(g.target,unit)}{unitLabel(unit)}</span>
              </div>
            );
          })}
          <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6,padding:"10px",background:"var(--warm1)",borderRadius:8}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"var(--text-mid)",marginBottom:2}}>Add a goal</div>
            <input placeholder="Goal label, e.g. Daily scales" value={newPkgGoalLabel} onChange={e=>setNewPkgGoalLabel(e.target.value)} style={{fontSize:".82rem"}} />
            <div style={{display:"flex",gap:6}}>
              <select value={newPkgGoalType} onChange={e=>setNewPkgGoalType(e.target.value)} style={{flex:1,fontSize:".8rem"}}>
                <option value="weekly_minutes">Weekly minutes</option>
                <option value="total_sessions">Total sessions</option>
              </select>
              <input placeholder={newPkgGoalType==="weekly_minutes"?"mins/week":"sessions"} value={newPkgGoalTarget} onChange={e=>setNewPkgGoalTarget(e.target.value)} type="number" style={{width:90,fontSize:".82rem"}} />
              <button className="btn btn-primary btn-sm" onClick={addPkgGoal}>+ Add</button>
            </div>
          </div>
        </div>

        {/* Pieces */}
        <div className="field">
          <label>Pieces to Include</label>
          {pkgPieceItems.map(p => (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,padding:"5px 8px",background:"var(--cream)",borderRadius:7,border:"1px solid var(--warm2)"}}>
              <span style={{flex:1,fontSize:".82rem",fontWeight:700}}>{p.title}</span>
              {p.composer&&<span style={{fontSize:".74rem",color:"var(--text-light)",fontStyle:"italic"}}>{p.composer}</span>}
              <button onClick={()=>removePkgPiece(p.id)} style={{background:"none",border:"none",color:"var(--rust)",cursor:"pointer",fontWeight:900,fontSize:".9rem"}}>✕</button>
            </div>
          ))}
          {/* Also tick existing pieces */}
          {pieces.length > 0 && pieces.map(p => {
            const on = pkgPieces.includes(p.id);
            return (
              <div key={p.id} onClick={()=>togglePkgPiece(p.id)} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,padding:"5px 8px",background:on?"#fff5f0":"var(--cream)",borderRadius:7,border:`1.5px solid ${on?"var(--rust)":"var(--warm2)"}`,cursor:"pointer"}}>
                <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${on?"var(--rust)":"var(--warm2)"}`,background:on?"var(--rust)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {on&&<span style={{color:"white",fontSize:".55rem",fontWeight:900}}>✓</span>}
                </div>
                <span style={{flex:1,fontSize:".82rem"}}>{p.title}</span>
                {p.composer&&<span style={{fontSize:".74rem",color:"var(--text-light)",fontStyle:"italic"}}>{p.composer}</span>}
              </div>
            );
          })}
          <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6,padding:"10px",background:"var(--warm1)",borderRadius:8}}>
            <div style={{fontSize:".74rem",fontWeight:700,color:"var(--text-mid)",marginBottom:2}}>Add a piece</div>
            <input placeholder="Piece title, e.g. Violin Concerto in A minor" value={newPkgPieceTitle} onChange={e=>setNewPkgPieceTitle(e.target.value)} style={{fontSize:".82rem"}} onKeyDown={e=>e.key==="Enter"&&addPkgPiece()} />
            <div style={{display:"flex",gap:6}}>
              <input placeholder="Composer (optional)" value={newPkgPieceComposer} onChange={e=>setNewPkgPieceComposer(e.target.value)} style={{flex:1,fontSize:".82rem"}} />
              <select value={newPkgPieceStatus} onChange={e=>setNewPkgPieceStatus(e.target.value)} style={{fontSize:".8rem"}}>
                <option value="wishlist">Wishlist</option>
                <option value="learning">Learning</option>
                <option value="polishing">Polishing</option>
                <option value="ready">Ready</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={addPkgPiece}>+ Add</button>
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="field">
          <label>Focus Areas to Include</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
            {pkgFocusItems.map(fa => (
              <span key={fa} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:"var(--rust)",color:"white",fontSize:".8rem",fontWeight:700}}>
                {fa}<button onClick={()=>removePkgFocus(fa)} style={{background:"none",border:"none",color:"white",cursor:"pointer",fontWeight:900,marginLeft:2,fontSize:".85rem"}}>✕</button>
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input placeholder="e.g. Bow technique" value={newPkgFocus} onChange={e=>setNewPkgFocus(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPkgFocusItem()} style={{flex:1,fontSize:".82rem"}} />
            <button className="btn btn-primary btn-sm" onClick={addPkgFocusItem}>+ Add</button>
          </div>
        </div>

        <button className="btn btn-primary" style={{width:"100%",marginBottom:generatedLink?10:0}} onClick={generateLink}>🔗 Generate Share Link</button>

        {generatedLink && (
          <div style={{background:"var(--cream)",border:"1.5px solid var(--warm2)",borderRadius:9,padding:"10px 12px"}}>
            <div style={{fontSize:".74rem",color:"var(--text-light)",marginBottom:5,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em"}}>Share this link with your student</div>
            <div style={{fontSize:".75rem",color:"var(--text-mid)",wordBreak:"break-all",marginBottom:8,fontFamily:"monospace",background:"white",padding:"6px 8px",borderRadius:6,border:"1px solid var(--warm2)"}}>{generatedLink}</div>
            <button className="btn btn-primary btn-sm" onClick={copyLink} style={{width:"100%"}}>{copied ? "✓ Copied!" : "📋 Copy Link"}</button>
          </div>
        )}
      </div>

      {/* Export Data */}
      <div className="card">
        <div className="card-title">📤 Export Practice Data</div>
        <p style={{fontSize:".85rem",color:"var(--text-mid)",marginBottom:20,lineHeight:1.55}}>Export your practice log to share with your teacher or keep as a backup.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--warm2)"}}>
            <div><div style={{fontWeight:700}}>CSV Spreadsheet</div><div style={{fontSize:".78rem",color:"var(--text-light)",marginTop:2}}>Open in Excel, Sheets, or Numbers. {sessions.length} sessions.</div></div>
            <button className="btn btn-primary" onClick={exportCSV}>⬇ CSV</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--warm2)"}}>
            <div><div style={{fontWeight:700}}>{isCapacitor() ? "Share / Save Report" : "PDF / Print Report"}</div><div style={{fontSize:".78rem",color:"var(--text-light)",marginTop:2}}>{isCapacitor() ? "Opens native share sheet — save as PDF, email, or share." : "Formatted report with stats, full log and repertoire."}</div></div>
            <button className="btn btn-ghost" onClick={exportPDF} disabled={pdfStatus==="generating"}>{pdfLabel}</button>
          </div>
        </div>
        <div style={{marginTop:18,padding:"11px 14px",background:"var(--warm1)",borderRadius:9,fontSize:".8rem",color:"var(--text-mid)"}}>
          💡 <strong>Tip:</strong> Share the report with your violin teacher before each lesson.
        </div>
      </div>
    </>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function Settings({ sessions, setSessions, pieces, setPieces, goals, setGoals, reminders, setReminders, focusAreas, setFocusAreas, unit, incomingPkg, setIncomingPkg }) {
  const [confirm, setConfirm] = useState(null);
  const [newArea, setNewArea] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [importLink, setImportLink] = useState("");
  const [importPreview, setImportPreview] = useState(incomingPkg || null);
  const [importError, setImportError] = useState("");
  const [importDone, setImportDone] = useState(false);

  // Auto-show incoming package from URL on first render
  useEffect(() => {
    if (incomingPkg) { setImportPreview(incomingPkg); setIncomingPkg(null); }
  }, []);

  const resetSessions = async () => { setSessions([]); await sSet(SK.sessions,[]); setConfirm(null); };
  const resetPieces = async () => { setPieces([]); await sSet(SK.pieces,[]); setConfirm(null); };
  const resetGoals = async () => { setGoals([]); await sSet(SK.goals,[]); setConfirm(null); };
  const resetAll = async () => { setSessions([]); setPieces([]); setGoals([]); setReminders([]); await Promise.all([sSet(SK.sessions,[]),sSet(SK.pieces,[]),sSet(SK.goals,[]),sSet(SK.reminders,[])]); setConfirm(null); };

  const toggleSelect = name => setSelected(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const addFocusArea = async () => {
    const trimmed = newArea.trim();
    if (!trimmed || focusAreas.includes(trimmed)) return;
    const updated = [...focusAreas, trimmed];
    setFocusAreas(updated); await sSet(SK.focusAreas, updated);
    setNewArea("");
  };

  const deleteSelected = async () => {
    const updated = focusAreas.filter(a => !selected.has(a));
    setFocusAreas(updated); await sSet(SK.focusAreas, updated);
    setSelected(new Set());
    setConfirm(null);
  };

  // Parse a package link or raw base64 string
  const parseImportLink = (raw) => {
    setImportError(""); setImportPreview(null); setImportDone(false);
    try {
      let encoded = raw.trim();
      // Extract from URL if it's a full link
      try {
        const url = new URL(encoded);
        encoded = url.searchParams.get("pkg") || encoded;
      } catch {}
      const decoded = JSON.parse(atob(encoded));
      if (!decoded.type === "practice_package") throw new Error("Not a valid package");
      setImportPreview(decoded);
    } catch {
      if (raw.trim()) setImportError("Invalid package link. Please check and try again.");
    }
  };

  const applyImport = async () => {
    if (!importPreview) return;
    const pkg = importPreview;

    if (pkg.goals?.length) {
      const fresh = pkg.goals.map(g => ({
        id: Date.now() + Math.random(),
        label: g.label,
        type: g.type,
        target: g.target,
        progress: 0,
        created: todayStr(),
      }));
      const newGoals = [...goals, ...fresh];
      await sSet(SK.goals, newGoals); setGoals(newGoals);
    }
    if (pkg.pieces?.length) {
      const fresh = pkg.pieces.map(p => ({
        id: Date.now() + Math.random(),
        title: p.title,
        composer: p.composer || "",
        status: p.status || "learning",
        difficulty: p.difficulty || 0,
        notes: p.notes || "",
        lastPracticed: null,
        added: todayStr(),
      }));
      const newPieces = [...pieces, ...fresh];
      await sSet(SK.pieces, newPieces); setPieces(newPieces);
    }
    if (pkg.focusAreas?.length) {
      const merged = [...new Set([...focusAreas, ...pkg.focusAreas])];
      await sSet(SK.focusAreas, merged); setFocusAreas(merged);
    }
    setImportDone(true); setImportPreview(null); setImportLink("");
    setTimeout(() => setImportDone(false), 3000);
  };

  const rows = [
    {label:"Practice Logs",sub:`${sessions.length} session(s)`,fn:()=>setConfirm({title:"Clear all practice logs?",body:"All sessions permanently deleted.",action:resetSessions})},
    {label:"Repertoire",sub:`${pieces.length} piece(s)`,fn:()=>setConfirm({title:"Clear repertoire?",body:"All pieces removed.",action:resetPieces})},
    {label:"Goals",sub:`${goals.length} goal(s)`,fn:()=>setConfirm({title:"Clear all goals?",body:"All goals deleted.",action:resetGoals})},
    {label:"Everything",sub:"Wipe all data",danger:true,fn:()=>setConfirm({title:"Reset everything?",body:"All data permanently deleted. Cannot be undone.",action:resetAll})},
  ];

  return (
    <>
      {confirm&&<ConfirmModal title={confirm.title} body={confirm.body} onConfirm={confirm.action} onCancel={()=>setConfirm(null)} />}
      <div style={{maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>

        {/* Import Practice Package */}
        <div className="card">
          <div className="card-title">📥 Import Practice Package</div>
          <div style={{fontSize:".83rem",color:"var(--text-mid)",marginBottom:14,lineHeight:1.55}}>
            Paste a practice package link from your tutor to add their recommended goals, pieces, and focus areas.
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input
              placeholder="Paste package link here…"
              value={importLink}
              onChange={e => { setImportLink(e.target.value); parseImportLink(e.target.value); }}
              style={{flex:1}}
            />
            {importLink && <button className="btn btn-ghost btn-sm" onClick={()=>{ setImportLink(""); setImportPreview(null); setImportError(""); }}>✕</button>}
          </div>
          {importError && <div style={{fontSize:".8rem",color:"var(--rust)",marginBottom:8,fontWeight:700}}>⚠ {importError}</div>}
          {importDone && <div style={{fontSize:".8rem",color:"#2e7d52",fontWeight:700,marginBottom:8}}>✓ Package imported successfully!</div>}

          {importPreview && (
            <div style={{background:"var(--cream)",border:"1.5px solid var(--warm2)",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:".88rem",marginBottom:6,color:"var(--brown)"}}>
                📦 {importPreview.name || "Practice Package"}
              </div>
              {importPreview.tutorName && <div style={{fontSize:".78rem",color:"var(--text-light)",marginBottom:8}}>From: {importPreview.tutorName}</div>}
              {importPreview.description && <div style={{fontSize:".82rem",color:"var(--text-mid)",marginBottom:10,fontStyle:"italic"}}>{importPreview.description}</div>}
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
                {importPreview.goals?.length > 0 && <div style={{fontSize:".8rem"}}><span style={{color:"var(--rust)",fontWeight:700}}>🎯 {importPreview.goals.length} goal{importPreview.goals.length>1?"s":""}</span> — {importPreview.goals.map(g=>g.label).join(", ")}</div>}
                {importPreview.pieces?.length > 0 && <div style={{fontSize:".8rem"}}><span style={{color:"var(--rust)",fontWeight:700}}>🎼 {importPreview.pieces.length} piece{importPreview.pieces.length>1?"s":""}</span> — {importPreview.pieces.map(p=>p.title).join(", ")}</div>}
                {importPreview.focusAreas?.length > 0 && <div style={{fontSize:".8rem"}}><span style={{color:"var(--rust)",fontWeight:700}}>🏷 {importPreview.focusAreas.length} focus area{importPreview.focusAreas.length>1?"s":""}</span> — {importPreview.focusAreas.join(", ")}</div>}
              </div>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={applyImport}>✓ Import Package</button>
            </div>
          )}
        </div>

        {/* Export */}
        <Export sessions={sessions} pieces={pieces} goals={goals} unit={unit} />

        {/* Focus Areas */}
        <div className="card">
          <div className="card-title">🏷 Edit Focus Areas</div>
          <div style={{fontSize:".8rem",color:"var(--text-light)",marginBottom:12}}>Select areas to delete them, or add new ones below.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {focusAreas.map(a => {
              const isSelected = selected.has(a);
              return (
                <button key={a} onClick={()=>toggleSelect(a)} style={{
                  padding:"5px 12px", borderRadius:20, fontSize:".82rem", fontWeight:700, cursor:"pointer",
                  border: `1.5px solid ${isSelected ? "#c0392b" : "var(--warm2)"}`,
                  background: isSelected ? "#fee" : "var(--cream)",
                  color: isSelected ? "#c0392b" : "var(--text-mid)",
                  transition:"all .15s",
                }}>
                  {isSelected && <span style={{marginRight:4}}>✕</span>}{a}
                </button>
              );
            })}
          </div>
          {selected.size > 0 && (
            <button className="btn btn-danger btn-sm" style={{marginBottom:14}}
              onClick={()=>setConfirm({title:`Delete ${selected.size} focus area${selected.size>1?"s":""}?`,body:"This won't affect existing logged sessions, but these areas will no longer appear as options.",action:deleteSelected})}>
              Delete {selected.size} selected
            </button>
          )}
          <div style={{display:"flex",gap:8}}>
            <input placeholder="New focus area name…" value={newArea} onChange={e=>setNewArea(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") addFocusArea(); }} style={{flex:1}} />
            <button className="btn btn-primary btn-sm" onClick={addFocusArea} style={{whiteSpace:"nowrap"}}>+ Add</button>
          </div>
        </div>

        {/* Data Reset */}
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
const TABS = ["Dashboard","Log","Repertoire","Goals","Statistics","Reminders","Metronome","Settings"];

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [sessions, setSessions] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [focusAreas, setFocusAreas] = useState(DEFAULT_FOCUS_AREAS);
  const [loaded, setLoaded] = useState(false);
  const [unit, setUnit] = useState("min");
  const [incomingPkg, setIncomingPkg] = useState(null);

  useEffect(() => {
    (async () => {
      const [s,p,g,r,fa] = await Promise.all([sGet(SK.sessions),sGet(SK.pieces),sGet(SK.goals),sGet(SK.reminders),sGet(SK.focusAreas)]);
      if (s) setSessions(s); if (p) setPieces(p); if (g) setGoals(g); if (r) setReminders(r);
      if (fa) setFocusAreas(fa);
      // Check for incoming practice package in URL
      try {
        const params = new URLSearchParams(window.location.search);
        const pkg = params.get("pkg");
        if (pkg) {
          const decoded = JSON.parse(atob(pkg));
          if (decoded.type === "practice_package") {
            setIncomingPkg(decoded);
            setTab("Settings");
            // Clean URL without reloading
            window.history.replaceState({}, "", window.location.pathname);
          }
        }
      } catch {}
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
          {loaded&&tab==="Log"&&<LogSession sessions={sessions} setSessions={setSessions} unit={unit} goals={goals} focusAreas={focusAreas} pieces={pieces} setPieces={setPieces} />}
          {loaded&&tab==="Repertoire"&&<Pieces pieces={pieces} setPieces={setPieces} sessions={sessions} />}
          {loaded&&tab==="Goals"&&<Goals goals={goals} setGoals={setGoals} sessions={sessions} unit={unit} />}
          {loaded&&tab==="Statistics"&&<Stats sessions={sessions} unit={unit} />}
          {loaded&&tab==="Reminders"&&<Reminders reminders={reminders} setReminders={setReminders} focusAreas={focusAreas} />}
          {loaded&&tab==="Metronome"&&<Metronome />}
          {loaded&&tab==="Settings"&&<Settings sessions={sessions} setSessions={setSessions} pieces={pieces} setPieces={setPieces} goals={goals} setGoals={setGoals} reminders={reminders} setReminders={setReminders} focusAreas={focusAreas} setFocusAreas={setFocusAreas} unit={unit} incomingPkg={incomingPkg} setIncomingPkg={setIncomingPkg} />}
        </div>
      </div>
    </>
  );
}
