import { useState, useRef, useEffect } from 'react';
import {
  Mic, Upload, Camera, Send, CheckCircle, AlertTriangle,
  FileText, Bell, LogOut, Plus, Clock, X, ChevronRight,
  Wifi, Loader2, MapPin, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchReports, createReport } from '../api';

/* ── Read logged-in user profile from localStorage ────────────────────────── */
type UserProfile = {
  role: string; username: string; name: string;
  district: string; mandal: string; village: string;
};
const getProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem('govconnect_user');
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch { /* ignore */ }
  return { role: 'volunteer', username: 'A?', name: 'Volunteer', district: '', mandal: '', village: '' };
};

/* ── Data: starts empty; populated when reports are submitted ─────────────── */
type Report = {
  id: string; issue: string; category: string; severity: string;
  status: string; date: string;
  district: string; mandal: string; village: string;
  volunteer: string; priority: string; ai_confidence: number;
};

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  'Pending Verification': { color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',  icon: '⏳', label: 'Pending' },
  'Verified':             { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  icon: '✅', label: 'Verified' },
  'Resolved':             { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',    icon: '✔️', label: 'Resolved' },
  'Rejected':             { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',      icon: '❌', label: 'Rejected' },
};
const severityConfig: Record<string, { color: string; dot: string }> = {
  Low:      { color: 'text-gray-400',   dot: '⚪' },
  Medium:   { color: 'text-yellow-400', dot: '🟡' },
  High:     { color: 'text-orange-400', dot: '🟠' },
  Critical: { color: 'text-red-400',    dot: '🔴' },
};

/* ── AI Mock ─────────────────────────────────────────────────────────────── */
const mockAIAnalyze = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('bribe') || t.includes('bribery') || t.includes('corruption') || t.includes('lancham'))
    return { category: 'Corruption',    icon: '💰', severity: 'Critical', priority: 'High',     confidence: 96, summary: 'Allegations of bribery/corruption detected. Requires immediate confidential review.' };
  if (t.includes('land') || t.includes('capture') || t.includes('encroach') || t.includes('grab'))
    return { category: 'Land Dispute',  icon: '🚧', severity: 'High',     priority: 'High',     confidence: 93, summary: 'Alleged illegal land capture or encroachment. Requires revenue department verification.' };
  if (t.includes('water') || t.includes('neer') || t.includes('నీళ్ళు'))
    return { category: 'Water Supply',  icon: '💧', severity: 'High',     priority: 'High',     confidence: 94, summary: 'Critical water supply disruption affecting residents. Immediate intervention needed.' };
  if (t.includes('road') || t.includes('pothole') || t.includes('రోడ్డు'))
    return { category: 'Roads',         icon: '🛣️', severity: 'Medium',   priority: 'Medium',   confidence: 91, summary: 'Road damage detected. Risk of accidents and vehicle damage.' };
  if (t.includes('light') || t.includes('electricity') || t.includes('కరెంట్'))
    return { category: 'Electricity',   icon: '⚡', severity: 'Low',      priority: 'Low',      confidence: 88, summary: 'Power supply issue in public lighting. Safety concern during night hours.' };
  if (t.includes('garbage') || t.includes('waste') || t.includes('చెత్త'))
    return { category: 'Sanitation',    icon: '🗑️', severity: 'High',     priority: 'High',     confidence: 89, summary: 'Unsanitary waste accumulation detected. Health hazard risk.' };
  if (t.includes('flood') || t.includes('water logging'))
    return { category: 'Flooding',      icon: '🌊', severity: 'Critical', priority: 'Critical', confidence: 97, summary: 'Flood risk detected. Immediate evacuation assessment recommended.' };
  return   { category: 'General Issue', icon: '📋', severity: 'Medium',   priority: 'Medium',   confidence: 82, summary: 'Issue registered and classified. Awaiting officer review.' };
};

/* ── Helper: generate report ID ─────────────────────────────────────────── */
const genId = (district: string, count: number) => {
  const d = district?.slice(0, 3).toUpperCase().replace(/\s/g, '') || 'AP';
  const n = String(count + 1).padStart(6, '0');
  return `REP-AP-${d}-2026-${n}`;
};

/* ── Helper: format today's date ─────────────────────────────────────────── */
const today = () => new Date().toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });

/* ── Main Component ────────────────────────────────────────────────────────── */
const VolunteerDashboard = () => {
  const user = getProfile();

  const [activeTab, setActiveTab]   = useState<'report' | 'myreports'>('report');
  const [desc, setDesc]             = useState('');
  const [isAnalyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult]     = useState<ReturnType<typeof mockAIAnalyze> | null>(null);
  const [submitted, setSubmitted]   = useState(false);
  const [newId, setNewId]           = useState('');
  const [charCount, setCharCount]   = useState(0);
  const [isRecording, setRecording] = useState(false);
  const [reports, setReports]       = useState<Report[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textRef                     = useRef<HTMLTextAreaElement>(null);
  const recognitionRef              = useRef<any>(null);

  // Load from API on mount
  useEffect(() => {
    fetchReports()
      .then(data => {
        // Filter to only show this volunteer's reports
        setReports(data.filter((r: Report) => r.volunteer === user.username));
      })
      .catch(err => console.error(err));
  }, [user.username]);

  const handleDesc = (v: string) => { setDesc(v); setCharCount(v.length); if (aiResult) setAiResult(null); };

  const handleAnalyze = () => {
    if (!desc.trim()) return;
    setAnalyzing(true); setAiResult(null);
    setTimeout(() => { setAnalyzing(false); setAiResult(mockAIAnalyze(desc)); }, 1600);
  };

  const handleSubmit = () => {
    if (!aiResult) return;
    const id = genId(user.district, reports.length);
    const newReport: Report = {
      id,
      issue: desc.trim(),
      category: aiResult.category,
      severity: aiResult.severity,
      status: 'Pending Verification',
      date: today(),
      district: user.district,
      mandal: user.mandal,
      village: user.village,
      volunteer: user.username,
      priority: aiResult.priority,
      ai_confidence: aiResult.confidence,
    };
    
    createReport(newReport, attachedFiles[0]).then((savedReport) => {
      setReports(prev => [savedReport, ...prev]);
      setNewId(savedReport.id);
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setDesc(''); setAiResult(null); setCharCount(0); setNewId(''); setAttachedFiles([]); }, 5000);
    }).catch(err => {
      console.error(err);
      alert('Failed to submit report to backend.');
    });
  };

  const handleRecord = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Your browser does not support the Web Speech API. Please try using Google Chrome.');
      return;
    }

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecording(false);
    } else {
      // Start recording
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // You can change the language here, e.g., 'te-IN' for Telugu
      recognition.lang = 'en-IN'; 

      let finalTranscript = desc ? desc + ' ' : '';

      recognition.onstart = () => {
        setRecording(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        handleDesc(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const approved = reports.filter(r => r.status === 'Verified' || r.status === 'Resolved').length;
  const pending  = reports.filter(r => r.status === 'Pending Verification').length;
  const rejected = reports.filter(r => r.status === 'Rejected').length;

  // Avatar initials from name
  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#080f1e] text-white font-sans">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <nav className="bg-[#0d1526]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Left: Avatar + Name + ID */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-lg shadow-indigo-500/20">
              {initials}
            </div>
            <div>
              <p className="font-bold text-sm leading-none text-white">{user.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-indigo-400 font-mono">{user.username}</span>
                {user.mandal && (
                  <>
                    <span className="text-gray-700">·</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={9} className="text-gray-600" />
                      {user.village && `${user.village}, `}{user.mandal}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <Wifi size={10} /> Online
            </div>
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
              <Bell size={18} className="text-gray-400" />
              {pending > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-[#0d1526]" />
              )}
            </button>
            <Link to="/" onClick={() => localStorage.removeItem('govconnect_user')}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors" title="Logout">
              <LogOut size={18} className="text-gray-400" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Welcome Banner ── */}
        <div className="relative bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-5 overflow-hidden">
          <div className="absolute right-4 top-0 text-[80px] opacity-10 select-none">🙋</div>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">Welcome back</p>
          <p className="text-xl font-bold text-white">{user.name}</p>
          <p className="text-xs text-indigo-300/70 font-mono mt-0.5">{user.username}</p>

          {/* Assignment info */}
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-indigo-500/10">
            {user.district && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="text-gray-600">📍 District</span>
                <span className="text-white font-semibold">{user.district}</span>
              </div>
            )}
            {user.mandal && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="text-gray-600">🏘️ Mandal</span>
                <span className="text-white font-semibold">{user.mandal}</span>
              </div>
            )}
            {user.village && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="text-gray-600">🌾 Village</span>
                <span className="text-white font-semibold">{user.village}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
              <span className="text-gray-600">📋 Reports</span>
              <span className="text-indigo-300 font-bold">{reports.length}</span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Submitted', value: reports.length, icon: FileText,    gradient: 'from-indigo-500 to-blue-500',   bg: 'bg-indigo-500/10 border-indigo-500/20' },
            { label: 'Approved',        value: approved,       icon: CheckCircle, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10 border-green-500/20'   },
            { label: 'Pending Review',  value: pending,        icon: Clock,       gradient: 'from-amber-500 to-orange-500',  bg: 'bg-amber-500/10 border-amber-500/20'   },
            { label: 'Rejected',        value: rejected,       icon: X,           gradient: 'from-red-500 to-pink-500',      bg: 'bg-red-500/10 border-red-500/20'       },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <Icon size={16} className="text-white/50" />
                  <span className={`text-3xl font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>{s.value}</span>
                </div>
                <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-[#0d1526]/80 border border-white/[0.08] rounded-xl p-1 w-fit">
          {([['report', '+ New Report', Plus], ['myreports', 'My Reports', FileText]] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${activeTab === tab
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
              <Icon size={14} />{label}
              {tab === 'myreports' && reports.length > 0 && (
                <span className="bg-indigo-500/30 text-indigo-200 text-xs px-1.5 py-0.5 rounded-full font-bold">{reports.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ REPORT TAB ══ */}
        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Left: Report Form ── */}
            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-base text-white mb-1 flex items-center gap-2">
                    <AlertTriangle size={17} className="text-amber-400" /> Report an Issue
                  </h2>
                  <p className="text-xs text-gray-500">Describe what you observed. You can write in Telugu, Hindi, or English.</p>
                </div>

                {/* Attached location pill */}
                {(user.village || user.mandal || user.district) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <MapPin size={13} className="text-indigo-400 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                      <span className="text-gray-500">Report will be tagged to:</span>
                      {[user.village, user.mandal, user.district].filter(Boolean).map((v, i, arr) => (
                        <span key={v}>
                          <span className="text-indigo-300 font-semibold">{v}</span>
                          {i < arr.length - 1 && <span className="text-gray-600 mx-1">›</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    ref={textRef} rows={6} value={desc}
                    onChange={e => handleDesc(e.target.value)}
                    placeholder={"మీ సమస్యను వివరించండి / Describe the issue…\n\nExample: 'Our village has no drinking water since 2 days. People are suffering…'"}
                    className="w-full bg-[#060d1a] border border-gray-700/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all leading-relaxed"
                  />
                  {isRecording && (
                    <div className="absolute inset-0 rounded-xl border-2 border-red-500/50 bg-red-500/5 flex items-center justify-center pointer-events-none">
                      <span className="text-red-400 text-sm font-medium animate-pulse flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        Recording…
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-right text-xs text-gray-600 -mt-3">{charCount} characters</p>

                {/* Attachment Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={handleRecord}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border text-xs font-medium transition-all
                      ${isRecording
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-lg shadow-red-500/10'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20'}`}>
                    {isRecording ? <><Loader2 size={20} className="animate-spin" />Stop</> : <><Mic size={20} />Voice</>}
                  </button>
                  <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-300 hover:bg-violet-500/20 transition-all text-xs font-medium cursor-pointer">
                    <Camera size={20} />Photo/Video
                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => {
                      if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }} />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 hover:bg-blue-500/20 transition-all text-xs font-medium cursor-pointer">
                    <Upload size={20} />Document
                    <input type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => {
                      if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }} />
                  </label>
                </div>

                {/* Attached Files List */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs">
                        <span className="text-gray-300 max-w-[120px] truncate">{f.name}</span>
                        <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Analyze Button */}
                <button onClick={handleAnalyze} disabled={!desc.trim() || isAnalyzing}
                  className="w-full py-3 rounded-xl font-semibold text-sm border transition-all flex items-center justify-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                  {isAnalyzing
                    ? <><span className="w-4 h-4 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" /> Analyzing…</>
                    : <>🤖 Analyze with AI</>}
                </button>

                {!desc && (
                  <p className="text-xs text-gray-600 text-center">
                    💡 You can also use Voice input to dictate in Telugu or Hindi
                  </p>
                )}

                {/* Submit Button */}
                {aiResult && !submitted && (
                  <button onClick={handleSubmit}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0">
                    <Send size={16} /> Submit Report to Nodal Officer
                  </button>
                )}

                {/* Success state */}
                {submitted && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-green-400 font-semibold">
                      <CheckCircle size={18} /> Report Submitted Successfully!
                    </div>
                    <div className="space-y-1 pl-1">
                      <p className="text-xs text-gray-400">
                        Report ID: <span className="font-mono text-green-300">{newId}</span>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={10} className="text-gray-500" />
                        Tagged to: <span className="text-white font-medium ml-1">
                          {[user.village, user.mandal, user.district].filter(Boolean).join(' › ')}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">Submitted by: <span className="text-white">{user.name} ({user.username})</span></p>
                      <p className="text-xs text-gray-600 mt-1">A nodal officer will review it shortly.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: AI Result Panel ── */}
            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-violet-500 to-pink-500" />
              <div className="p-6">
                <h2 className="font-bold text-base text-white mb-1 flex items-center gap-2">
                  <span className="text-violet-400">🤖</span> AI Analysis
                </h2>
                <p className="text-xs text-gray-500 mb-5">AI automatically classifies issue, severity, and priority — no manual selection needed.</p>

                {/* Empty state */}
                {!aiResult && !isAnalyzing && (
                  <div className="flex flex-col items-center justify-center min-h-[240px] text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-white/5 flex items-center justify-center text-4xl">
                      🧠
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-300">AI Ready</p>
                      <p className="text-xs text-gray-600 max-w-[200px] leading-relaxed">
                        Write a description on the left and click <span className="text-violet-400">Analyze with AI</span>
                      </p>
                    </div>
                    <div className="w-full space-y-2 mt-2 text-left">
                      {[
                        ['1', 'Write or record your issue description'],
                        ['2', 'Click "Analyze with AI"'],
                        ['3', 'Review AI result and submit'],
                      ].map(([n, t]) => (
                        <div key={n} className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
                          <span className="text-xs text-gray-500">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading */}
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center min-h-[240px] space-y-5">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                      <div className="absolute inset-2 rounded-full border-4 border-violet-500/20 border-b-violet-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-indigo-400 font-semibold text-sm">Processing…</p>
                      <p className="text-xs text-gray-600">Classifying · Assessing severity · Checking duplicates</p>
                    </div>
                  </div>
                )}

                {/* Result */}
                {aiResult && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <span className="text-2xl">{aiResult.icon}</span>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Category Detected</p>
                        <p className="font-bold text-white">{aiResult.category}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Severity',    value: aiResult.severity,           cls: severityConfig[aiResult.severity]?.color || 'text-white' },
                        { label: 'Priority',    value: aiResult.priority,           cls: severityConfig[aiResult.priority]?.color || 'text-white' },
                        { label: 'Confidence', value: `${aiResult.confidence}%`,   cls: 'text-green-400' },
                      ].map(f => (
                        <div key={f.label} className="bg-[#060d1a] border border-white/5 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-600 mb-1">{f.label}</p>
                          <p className={`font-bold text-sm ${f.cls}`}>{f.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                      <p className="text-xs text-violet-400 font-semibold mb-2">🧠 AI Summary</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{aiResult.summary}</p>
                    </div>

                    {/* Report preview — what will be attached */}
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl space-y-1.5">
                      <p className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1"><User size={11} /> Report will be submitted as:</p>
                      <p className="text-xs text-gray-400">Volunteer: <span className="text-white font-medium">{user.name} ({user.username})</span></p>
                      {(user.village || user.mandal || user.district) && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin size={10} className="text-indigo-400" />
                          Location: <span className="text-indigo-300 font-medium ml-1">
                            {[user.village, user.mandal, user.district].filter(Boolean).join(' › ')}
                          </span>
                        </p>
                      )}
                    </div>

                    {(aiResult.severity === 'Critical' || aiResult.severity === 'High') && (
                      <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <AlertTriangle size={15} className="text-orange-400 flex-shrink-0" />
                        <p className="text-xs text-orange-300">This issue will be <strong>escalated automatically</strong> based on severity.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ MY REPORTS TAB ══ */}
        {activeTab === 'myreports' && (
          <div className="space-y-4">

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2">
              {['All', 'Pending Verification', 'Verified', 'Resolved', 'Rejected'].map(s => (
                <button key={s}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                  {s === 'All' ? '🗂 All' : `${statusConfig[s]?.icon} ${statusConfig[s]?.label}`}
                </button>
              ))}
            </div>

            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2 text-sm">
                  <FileText size={16} className="text-indigo-400" /> My Submitted Reports
                </h2>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">{reports.length} reports</span>
              </div>

              {reports.length === 0 ? (
                <div className="py-16 text-center text-gray-600">
                  <p className="text-3xl mb-3">📋</p>
                  <p className="text-sm font-semibold text-gray-400 mb-1">No reports yet</p>
                  <p className="text-xs">Use the <span className="text-indigo-400">+ New Report</span> tab to submit your first issue</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {reports.map((r, i) => {
                    const sc = statusConfig[r.status];
                    const sv = severityConfig[r.severity];
                    return (
                      <div key={r.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.07] flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5 group-hover:border-indigo-500/30 transition-colors">
                            {reports.length - i}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-sm font-semibold text-white leading-snug">{r.issue}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full">{r.category}</span>
                              <span className={`text-xs font-semibold flex items-center gap-1 ${sv.color}`}>
                                {sv.dot} {r.severity}
                              </span>
                            </div>
                            {/* Location tag attached to report */}
                            {(r.village || r.mandal || r.district) && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={10} className="text-gray-600 flex-shrink-0" />
                                {[r.village, r.mandal, r.district].filter(Boolean).map((v, idx, arr) => (
                                  <span key={v}>
                                    <span className={idx === 0 ? 'text-gray-300 font-medium' : ''}>{v}</span>
                                    {idx < arr.length - 1 && <span className="text-gray-700 mx-1">›</span>}
                                  </span>
                                ))}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 font-mono">{r.id} · {r.date}</p>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${sc.bg} ${sc.color}`}>
                              {sc.icon} {r.status}
                            </span>
                            <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <p className="text-xs text-gray-600">
                  {reports.length > 0 ? `Showing all ${reports.length} reports` : 'No reports submitted yet'}
                </p>
                <button onClick={() => setActiveTab('report')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-medium">
                  <Plus size={13} /> Report New Issue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Report Button (Mobile) ── */}
      {activeTab === 'myreports' && (
        <button onClick={() => setActiveTab('report')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center lg:hidden hover:scale-110 transition-transform z-40">
          <Plus size={24} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default VolunteerDashboard;
