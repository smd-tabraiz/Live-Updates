import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Bell, LogOut, ChevronDown, Filter, BarChart2, MapPin,
  Search, RefreshCw, TrendingUp, CheckCircle, AlertTriangle,
  ChevronRight, Download, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AP_DISTRICTS, getMandals, getVillages, getTrustInfo } from '../data/apHierarchy';
import { fetchReports, updateReportStatus } from '../api';
import { connectWebSocket, disconnectWebSocket } from '../websocket';

/* ── Data: starts empty; will be populated via backend API ──────────────── */
type ApprovedIssue = {
  id: string; volunteer: string; district: string; mandal: string; village: string;
  issue: string; category: string; severity: string; status: string;
  approvedBy: string; date: string;
};

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  'Verified':         { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',     icon: '🔵' },
  'Action Initiated': { color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/30', icon: '⚙️' },
  'Resolved':         { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',   icon: '✅' },
  'Escalated':        { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',       icon: '🚨' },
};
const severityConfig: Record<string, { color: string; bg: string; dot: string }> = {
  Low:      { color: 'text-gray-400',   bg: 'bg-gray-400/10 border-gray-400/30',    dot: '⚪' },
  Medium:   { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', dot: '🟡' },
  High:     { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30', dot: '🟠' },
  Critical: { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',       dot: '🔴' },
};
const categoryIcons: Record<string, string> = {
  'Water Supply': '💧', 'Roads': '🛣️', 'Sanitation': '🗑️',
  'Electricity': '⚡', 'Flooding': '🌊', 'Infrastructure': '🏗️', 'Healthcare': '🏥',
  'Corruption': '💰', 'Land Dispute': '🚧',
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
        className="w-full appearance-none bg-[#060d1a] border border-gray-700/60 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
        <option value="">All {label}s</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  </div>
);

/* ── Main ─────────────────────────────────────────────────────────────────── */
const DistrictDashboard = () => {
  const [selDistrict, setSelDistrict] = useState('');
  const [selConstituency, setSelConstituency] = useState('');
  const [selMandal,   setSelMandal]   = useState('');
  const [selVillage,  setSelVillage]  = useState('');
  const [selStatus,   setSelStatus]   = useState('');
  const [selSeverity, setSelSeverity] = useState('');
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState<'issues' | 'analytics'>('issues');
  const [approvedIssues, setApprovedIssues] = useState<ApprovedIssue[]>([]);

  useEffect(() => {
    fetchReports()
      .then(data => {
        const approved = data.filter((r: any) => r.status !== 'Pending Verification' && r.status !== 'Rejected');
        setApprovedIssues(approved);
      })
      .catch(err => console.error(err));

    connectWebSocket((newReport) => {
      setApprovedIssues(prev => {
        const isApproved = newReport.status !== 'Pending Verification' && newReport.status !== 'Rejected';
        const exists = prev.find(i => i.id === newReport.id);
        
        if (exists) {
          if (!isApproved) return prev.filter(i => i.id !== newReport.id);
          return prev.map(i => i.id === newReport.id ? newReport : i);
        } else {
          if (isApproved) return [newReport, ...prev];
          return prev;
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
  const clearAll       = () => { setSelDistrict(''); setSelConstituency(''); setSelMandal(''); setSelVillage(''); setSelStatus(''); setSelSeverity(''); setSearch(''); };

  const filteredIssues = approvedIssues.filter(i => {
    if (selDistrict && i.district !== selDistrict) return false;
    if (selMandal   && i.mandal   !== selMandal)   return false;
    if (selVillage  && i.village  !== selVillage)  return false;
    if (selStatus   && i.status   !== selStatus)   return false;
    if (selSeverity && i.severity !== selSeverity) return false;
    if (search && !i.issue.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasFilter = !!(selDistrict || selMandal || selVillage || selStatus || selSeverity || search);

  const handleExport = () => {
    if (filteredIssues.length === 0) return;
    const headers = ['ID', 'Date', 'District', 'Mandal', 'Village', 'Category', 'Severity', 'Status', 'Volunteer', 'Issue'];
    const csvRows = [
      headers.join(','),
      ...filteredIssues.map(i => [
        i.id, i.date, i.district, i.mandal, i.village, i.category, i.severity, i.status, i.volunteer, `"${i.issue.replace(/"/g, '""')}"`
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'district_issues_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Analytics
  const categoryBreakdown = approvedIssues.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {} as Record<string, number>);
  const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF8', '#F472B6', '#F87171', '#34D399'];

  const districtBreakdown = approvedIssues.reduce((acc, i) => { acc[i.mandal] = (acc[i.mandal] || 0) + 1; return acc; }, {} as Record<string, number>);
  const mandalData = Object.entries(districtBreakdown).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  const totalResolved = approvedIssues.filter(i => i.status === 'Resolved').length;
  const resolutionRate = approvedIssues.length > 0 ? Math.round((totalResolved / approvedIssues.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080f1e] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="bg-[#0d1526]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-sm">
              D
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-none">District Officer</p>
              <p className="text-xs text-gray-500 mt-0.5">District-101 · Andhra Pradesh</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full">
              📊 {resolutionRate}% Resolution Rate
            </div>
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
              <Bell size={18} className="text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0d1526]" />
            </button>
            <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors" title="Logout">
              <LogOut size={18} className="text-gray-400" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Approved',   value: approvedIssues.length,                                            color: 'from-blue-500 to-cyan-500',      icon: '📋' },
            { label: 'Action Initiated', value: approvedIssues.filter(i => i.status === 'Action Initiated').length, color: 'from-violet-500 to-purple-500', icon: '⚙️' },
            { label: 'Resolved',         value: totalResolved,                                                     color: 'from-green-500 to-emerald-500',  icon: '✅' },
            { label: 'Escalated',        value: approvedIssues.filter(i => i.status === 'Escalated').length,       color: 'from-red-500 to-pink-500',       icon: '🚨' },
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
          {([['issues', 'Approved Issues', CheckCircle], ['analytics', 'Analytics', BarChart2]] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${activeTab === tab
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* ══ ISSUES TAB ══ */}
        {activeTab === 'issues' && (<>

          {/* ── Filter Panel ── */}
          <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-blue-400" />
                  <span className="font-semibold text-sm">Filter by Location &amp; Status</span>
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

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
                <Dropdown label="District"     options={AP_DISTRICTS}                             value={selDistrict}     onChange={onDistrict} />
                <Dropdown label="Constituency" options={constituencies} disabled={!selDistrict}     value={selConstituency} onChange={onConstituency} />
                <Dropdown label="Mandal"       options={mandals}        disabled={!selConstituency} value={selMandal}       onChange={onMandal} />
                <Dropdown label="Village"      options={villages}       disabled={!selMandal}       value={selVillage}      onChange={setSelVillage} />
                <Dropdown label="Status"    options={['Verified','Action Initiated','Resolved','Escalated']} value={selStatus} onChange={setSelStatus} />
                <Dropdown label="Severity"  options={['Low','Medium','High','Critical']}        value={selSeverity} onChange={setSelSeverity} />
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search issues or report IDs…"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#060d1a] border border-gray-700/60 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all" />
              </div>

              {selDistrict && (
                <div className="flex items-center gap-1.5 mt-3 text-xs flex-wrap">
                  <span className="text-gray-500">Location:</span>
                  <span className="text-blue-400 font-semibold">{selDistrict}</span>
                  {selConstituency && <><ChevronRight size={10} className="text-gray-600" /><span className="text-blue-400 font-semibold">{selConstituency}</span></>}
                  {selMandal && <><ChevronRight size={10} className="text-gray-600" /><span className="text-blue-400 font-semibold">{selMandal}</span></>}
                  {selVillage && <><ChevronRight size={10} className="text-gray-600" /><span className="text-blue-400 font-semibold">{selVillage}</span></>}
                </div>
              )}
            </div>
          </div>

          {/* ── Issues Table ── */}
          <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle size={15} className="text-blue-400" /> Nodal-Approved Issues
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">{filteredIssues.length} of {approvedIssues.length}</span>
                <button onClick={handleExport} className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/20 bg-blue-500/10 rounded-lg px-2.5 py-1.5 hover:bg-blue-500/20 transition-colors">
                  <Download size={11} /> Export
                </button>
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-base font-semibold text-gray-400 mb-1">No issues match your filters</p>
                <p className="text-sm">Try adjusting the location, status, or severity filters above</p>
                {hasFilter && <button onClick={clearAll} className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">Clear all filters</button>}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {filteredIssues.map(issue => {
                  const sc    = statusConfig[issue.status];
                  const sev   = severityConfig[issue.severity];
                  const trust = getTrustInfo(issue.volunteer);
                  return (
                    <div key={issue.id} className="p-5 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-start gap-4">
                        {/* Severity */}
                        <div className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded-lg border text-xs font-bold ${sev.bg} ${sev.color}`}>
                          {sev.dot} {issue.severity}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Top tags */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-gray-600">{issue.id}</span>
                            <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              {categoryIcons[issue.category] || '📋'} {issue.category}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-white">{issue.issue}</p>

                          {/* Location */}
                          <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                            <MapPin size={10} className="text-gray-600 flex-shrink-0" />
                            {issue.district}
                            <ChevronRight size={9} className="text-gray-700" />
                            {issue.mandal}
                            <ChevronRight size={9} className="text-gray-700" />
                            <span className="text-gray-300 font-medium">{issue.village}</span>
                          </p>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            <span>
                              👤 {issue.volunteer}
                              <span className={`ml-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${trust.bg} ${trust.color}`}>
                                {trust.dot} {trust.label}
                              </span>
                            </span>
                            <span>Verified by: <span className="text-gray-400">{issue.approvedBy}</span></span>
                            <span>🕐 {issue.date}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${sc.bg} ${sc.color}`}>
                            {sc.icon} {issue.status}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); updateReportStatus(issue.id, 'Action Initiated').then(() => { setApprovedIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: 'Action Initiated' } : i)); }).catch(err => console.error(err)); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/20 transition-colors opacity-0 group-hover:opacity-100">
                            <ArrowUpRight size={11} /> Assign Action
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>)}

        {/* ══ ANALYTICS TAB ══ */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">

            {/* Resolution summary */}
            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-green-400" /> Overall Resolution Summary
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `${resolutionRate}%` }} />
                </div>
                <span className="text-2xl font-bold text-green-400 flex-shrink-0">{resolutionRate}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{totalResolved} of {approvedIssues.length} approved issues resolved</p>
            </div>

            {/* Status breakdown */}
            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-400" /> Status Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(statusConfig).map(([status, cfg]) => {
                  const count = approvedIssues.filter(i => i.status === status).length;
                  return (
                    <div key={status} className={`p-4 rounded-xl border ${cfg.bg} text-center`}>
                      <p className="text-2xl font-bold mb-1">{cfg.icon}</p>
                      <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-tight">{status}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Category breakdown Pie Chart */}
              <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <BarChart2 size={15} className="text-blue-400" /> Issues by Category
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {categoryData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mandal breakdown Bar Chart */}
              <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <MapPin size={15} className="text-purple-400" /> Top Mandals by Issue Volume
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mandalData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} />
                      <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* District breakdown */}
            <div className="bg-[#0d1526]/80 border border-white/[0.08] rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <MapPin size={15} className="text-violet-400" /> Issues by District
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(districtBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dist, count]) => (
                    <div key={dist} className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl hover:bg-white/[0.07] transition-colors">
                      <span className="text-sm font-bold text-violet-300">{count}</span>
                      <span className="text-sm text-gray-400">{dist}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistrictDashboard;
