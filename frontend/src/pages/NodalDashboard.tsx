import { useState, useEffect } from 'react';
import {
  Bell, LogOut, ChevronDown, Filter, MapPin,
  CheckCircle, XCircle, Eye, AlertTriangle, Users, ShieldCheck,
  Search, RefreshCw, TrendingUp, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AP_DISTRICTS, getMandals, getVillages, getTrustInfo, volunteerTrustStats } from '../data/apHierarchy';
import { fetchReports, updateReportStatus } from '../api';
import { connectWebSocket, disconnectWebSocket } from '../websocket';

/* ── Data: starts empty; will be populated via backend API ──────────────── */
type Issue = {
  id: string; volunteer: string; district: string; mandal: string; village: string;
  issue: string; category: string; severity: string; priority: string;
  ai_confidence: number; date: string;
};

const severityConfig: Record<string, { color: string; bg: string; dot: string }> = {
  Low:      { color: 'text-gray-400',   bg: 'bg-gray-400/10 border-gray-400/30',   dot: '⚪' },
  Medium:   { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', dot: '🟡' },
  High:     { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30', dot: '🟠' },
  Critical: { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',      dot: '🔴' },
};

const categoryIcons: Record<string, string> = {
  'Water Supply':   '💧',
  'Roads':          '🛣️',
  'Sanitation':     '🗑️',
  'Electricity':    '⚡',
  'Flooding':       '🌊',
  'Infrastructure': '🏗️',
  'Healthcare':     '🏥',
  'Corruption':     '💰',
  'Land Dispute':   '🚧',
};

/* ── Dropdown ─────────────────────────────────────────────────────────────── */
const Dropdown = ({ label, options, value, onChange, disabled = false }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean;
}) => (
  <div>
    <label className="text-xs text-gray-500 block mb-1.5">{label}</label>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className="w-full appearance-none bg-[#060d1a] border border-gray-700/60 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
        <option value="">All {label}s</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  </div>
);

/* ── Main ─────────────────────────────────────────────────────────────────── */
const NodalDashboard = () => {
  const [selDistrict, setSelDistrict] = useState('');
  const [selConstituency, setSelConstituency] = useState('');
  const [selMandal,   setSelMandal]   = useState('');
  const [selVillage,  setSelVillage]  = useState('');
  const [selSeverity, setSelSeverity] = useState('');
  const [search,      setSearch]      = useState('');
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<'queue' | 'volunteers'>('queue');
  const [approved,    setApproved]    = useState<string[]>([]);
  const [rejected,    setRejected]    = useState<string[]>([]);
  const [allIssues,   setAllIssues]   = useState<Issue[]>([]);

  useEffect(() => {
    fetchReports()
      .then(data => setAllIssues(data))
      .catch(err => console.error(err));
      
    connectWebSocket((newReport) => {
      setAllIssues(prev => {
        const exists = prev.find(i => i.id === newReport.id);
        if (exists) {
          return prev.map(i => i.id === newReport.id ? newReport : i);
        } else {
          return [newReport, ...prev];
        }
      });
    });

    return () => {
      disconnectWebSocket();
    };
  }, []);

  const constituencies = selDistrict ? [`${selDistrict} Assembly`] : [];
  const mandals  = selDistrict ? getMandals(selDistrict)             : [];
  const villages = selMandal   ? getVillages(selDistrict, selMandal) : [];

  const onDistrict     = (v: string) => { setSelDistrict(v); setSelConstituency(''); setSelMandal(''); setSelVillage(''); };
  const onConstituency = (v: string) => { setSelConstituency(v); setSelMandal(''); setSelVillage(''); };
  const onMandal       = (v: string) => { setSelMandal(v);   setSelVillage(''); };
  const clearAll       = () => { setSelDistrict(''); setSelConstituency(''); setSelMandal(''); setSelVillage(''); setSelSeverity(''); setSearch(''); };

  const filteredIssues = allIssues.filter(i => {
    if (approved.includes(i.id) || rejected.includes(i.id)) return false;
    if (selDistrict && i.district !== selDistrict) return false;
    if (selMandal   && i.mandal   !== selMandal)   return false;
    if (selVillage  && i.village  !== selVillage)  return false;
    if (selSeverity && i.severity !== selSeverity) return false;
    if (search && !i.issue.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasFilter = !!(selDistrict || selMandal || selVillage || selSeverity || search);
  const criticalCount = filteredIssues.filter(i => i.severity === 'Critical').length;

  return (
    <div className="min-h-screen bg-[#080f1e] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="bg-[#0d1526]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-sm">
              N
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-none">Nodal Officer</p>
              <p className="text-xs text-gray-500 mt-0.5">Nodal-101 · Andhra Pradesh</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full animate-pulse">
                ⚠️ {criticalCount} Critical
              </div>
            )}
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
              <Bell size={18} className="text-gray-400" />
              {filteredIssues.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0d1526]" />}
            </button>
            <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors" title="Logout">
              <LogOut size={18} className="text-gray-400" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review',   value: filteredIssues.length,                                            color: 'from-amber-500 to-orange-500', icon: '⏳' },
            { label: 'Critical',         value: allIssues.filter(i => i.severity === 'Critical').length,          color: 'from-red-500 to-pink-600',     icon: '🔴' },
            { label: 'Approved Today',   value: approved.length,                                                   color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Rejected Today',   value: rejected.length,                                                   color: 'from-gray-500 to-gray-600',    icon: '❌' },
          ].map(s => (
            <div key={s.label} className="bg-[#0d1526]/80 border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{s.icon}</span>
                <span className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</span>
              </div>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-[#0d1526]/80 border border-white/[0.08] rounded-xl p-1 w-fit">
          {([
            ['queue',      'Issue Queue',        AlertTriangle],
            ['volunteers', 'Volunteer Trust',    Users],
          ] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* ══ ISSUE QUEUE TAB ══ */}
        {activeTab === 'queue' && (<>

          {/* ── Filters ── */}
          <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-purple-400" />
                  <span className="font-semibold text-sm">Filter Issues</span>
                  <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-lg border border-white/[0.06]">
                    28 districts · 688 mandals · 17,808 villages
                  </span>
                </div>
                {hasFilter && (
                  <button onClick={clearAll}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 hover:border-white/20 transition-all">
                    <RefreshCw size={11} /> Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                <Dropdown label="District"     options={AP_DISTRICTS}                             value={selDistrict}     onChange={onDistrict} />
                <Dropdown label="Constituency" options={constituencies} disabled={!selDistrict}     value={selConstituency} onChange={onConstituency} />
                <Dropdown label="Mandal"       options={mandals}        disabled={!selConstituency} value={selMandal}       onChange={onMandal} />
                <Dropdown label="Village"      options={villages}       disabled={!selMandal}       value={selVillage}      onChange={setSelVillage} />
                <Dropdown label="Severity"  options={['Low','Medium','High','Critical']}        value={selSeverity} onChange={setSelSeverity} />
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by issue description or report ID…"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#060d1a] border border-gray-700/60 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all" />
              </div>

              {selDistrict && (
                <div className="flex items-center gap-1.5 mt-3 text-xs flex-wrap">
                  <span className="text-gray-500">Location:</span>
                  <span className="text-purple-400 font-semibold">{selDistrict}</span>
                  {selConstituency && <><ChevronRight size={10} className="text-gray-600" /><span className="text-purple-400 font-semibold">{selConstituency}</span></>}
                  {selMandal && <><ChevronRight size={10} className="text-gray-600" /><span className="text-purple-400 font-semibold">{selMandal}</span></>}
                  {selVillage && <><ChevronRight size={10} className="text-gray-600" /><span className="text-purple-400 font-semibold">{selVillage}</span></>}
                </div>
              )}
            </div>
          </div>

          {/* ── Issues List ── */}
          <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Pending Verification Queue
              </h2>
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">{filteredIssues.length} issues</span>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <p className="text-3xl mb-3">🎉</p>
                <p className="text-base font-semibold text-gray-400 mb-1">{hasFilter ? 'No matches found' : 'Queue is empty!'}</p>
                <p className="text-sm">{hasFilter ? 'Try adjusting your filters' : 'All issues have been reviewed'}</p>
                {hasFilter && <button onClick={clearAll} className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors">Clear filters</button>}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {filteredIssues.map(issue => {
                  const sev   = severityConfig[issue.severity];
                  const trust = getTrustInfo(issue.volunteer);
                  const isExp = expandedId === issue.id;

                  return (
                    <div key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                      <div className="p-5 flex items-start gap-4">
                        {/* Severity badge */}
                        <div className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded-lg border text-xs font-bold ${sev.bg} ${sev.color}`}>
                          {sev.dot} {issue.severity}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-gray-600">{issue.id}</span>
                            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                              {categoryIcons[issue.category] || '📋'} {issue.category}
                            </span>
                            {issue.severity === 'Critical' && (
                              <span className="text-xs text-red-400 font-semibold animate-pulse">⚡ Emergency</span>
                            )}
                          </div>

                          <p className="text-sm font-semibold text-white">{issue.issue}</p>

                          {/* Location */}
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={10} className="text-gray-600 flex-shrink-0" />
                            {issue.district} <ChevronRight size={9} className="text-gray-700" /> {issue.mandal} <ChevronRight size={9} className="text-gray-700" />
                            <span className="text-gray-300 font-medium">{issue.village}</span>
                          </p>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              👤 {issue.volunteer}
                              <span className={`ml-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${trust.bg} ${trust.color}`}>
                                {trust.dot} {trust.label}
                              </span>
                            </span>
                            <span>🤖 {issue.ai_confidence}% confidence</span>
                            <span>🕐 {issue.date}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex flex-col gap-2">
                          <button onClick={() => setExpandedId(isExp ? null : issue.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                            <Eye size={12} />{isExp ? 'Hide' : 'Details'}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); updateReportStatus(issue.id, 'Verified').then(() => { setApproved(p => [...p, issue.id]); setAllIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: 'Verified' } : i)); }).catch(err => console.error(err)); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors">
                            <CheckCircle size={12} />Approve
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); updateReportStatus(issue.id, 'Rejected').then(() => { setRejected(p => [...p, issue.id]); setAllIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: 'Rejected' } : i)); }).catch(err => console.error(err)); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                            <XCircle size={12} />Reject
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExp && (
                        <div className="px-5 pb-5 ml-[72px]">
                          <div className="bg-[#060d1a] border border-white/[0.05] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div><p className="text-xs text-gray-600 mb-1">Priority</p><p className={`font-bold text-sm ${severityConfig[issue.priority]?.color}`}>{issue.priority}</p></div>
                            <div><p className="text-xs text-gray-600 mb-1">AI Confidence</p><p className="font-bold text-sm text-green-400">{issue.ai_confidence}%</p></div>
                            <div><p className="text-xs text-gray-600 mb-1">Volunteer Trust</p><p className={`font-bold text-sm ${trust.color}`}>{trust.label}</p></div>
                            <div><p className="text-xs text-gray-600 mb-1">Reports Approved</p><p className="font-bold text-sm text-white">{trust.stats.approved} / {trust.stats.submitted}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recently actioned ── */}
          {(approved.length > 0 || rejected.length > 0) && (
            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={15} className="text-green-400" /> Actions Taken This Session
              </h3>
              <div className="flex flex-wrap gap-2">
                {approved.map(id => (
                  <span key={id} className="text-xs px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">✅ {id.split('-').slice(-1)[0]}</span>
                ))}
                {rejected.map(id => (
                  <span key={id} className="text-xs px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">❌ {id.split('-').slice(-1)[0]}</span>
                ))}
              </div>
            </div>
          )}
        </>)}

        {/* ══ VOLUNTEER TRUST TAB ══ */}
        {activeTab === 'volunteers' && (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { dot: '🟢', label: 'Trusted', sub: '≥ 5 approved', color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
                { dot: '🟠', label: 'Semi Trusted', sub: '2–4 approved',  color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
                { dot: '🟤', label: 'Not Trusted',  sub: '< 2 approved',  color: 'text-yellow-800', bg: 'bg-yellow-900/20 border-yellow-800/20' },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${item.bg}`}>
                  <span>{item.dot}</span>
                  <div>
                    <p className={`font-semibold ${item.color}`}>{item.label}</p>
                    <p className="text-gray-600">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-green-400" /> Volunteer Trust Overview
                </h2>
                <span className="text-xs text-gray-500">{Object.keys(volunteerTrustStats).length} volunteers</span>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {Object.entries(volunteerTrustStats).map(([volId, stats]) => {
                  const trust = getTrustInfo(volId);
                  const rate  = stats.submitted > 0 ? Math.round((stats.approved / stats.submitted) * 100) : 0;
                  return (
                    <div key={volId} className="p-5 hover:bg-white/[0.02] transition-colors flex items-center gap-5">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-indigo-300 flex-shrink-0">
                        {volId}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-white text-sm">{volId}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${trust.bg} ${trust.color}`}>
                            {trust.dot} {trust.label}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
                              style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">{rate}% rate</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-5 text-center flex-shrink-0">
                        <div><p className="text-[10px] text-gray-600 mb-0.5">Submitted</p><p className="font-bold text-white text-sm">{stats.submitted}</p></div>
                        <div><p className="text-[10px] text-gray-600 mb-0.5">Approved</p><p className="font-bold text-green-400 text-sm">{stats.approved}</p></div>
                        <div><p className="text-[10px] text-gray-600 mb-0.5">Rejected</p><p className="font-bold text-red-400 text-sm">{stats.rejected}</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodalDashboard;
