import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { Shield, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

/* ── Predefined demo users ──────────────────────────────────────────────── */
const DEMO_USERS = [
  {
    role: 'volunteer',
    label: 'Volunteer',
    sublabel: 'Report field issues',
    username: 'A1',
    name: 'A1',
    password: 'vol@123',
    route: '/volunteer',
    district: 'Kurnool',
    mandal: 'Orvakal',
    village: 'Orvakal',
    gradient: 'from-indigo-500 to-violet-600',
    icon: '🙋',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  {
    role: 'nodal',
    label: 'Nodal Officer',
    sublabel: 'Verify & approve reports',
    username: 'Nodal-101',
    name: 'Suresh Reddy',
    password: 'nodal@123',
    route: '/nodal',
    district: 'Visakhapatnam',
    mandal: '',
    village: '',
    gradient: 'from-purple-500 to-pink-600',
    icon: '🧑‍💼',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    role: 'district',
    label: 'District Officer',
    sublabel: 'District-level governance',
    username: 'District-101',
    name: 'P. Venkata Rao',
    password: 'district@123',
    route: '/district',
    district: 'Visakhapatnam',
    mandal: '',
    village: '',
    gradient: 'from-blue-500 to-cyan-500',
    icon: '🏛️',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
];

const Login = () => {
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const navigate                    = useNavigate();

  const doLogin = async (u: string, p: string) => {
    setIsLoading(true);
    setError('');
    try {
      // For quick-demo users bypassing the DB, handle them locally as a fallback
      if (u.match(/^A[1-6]$/)) {
        localStorage.setItem('govconnect_user', JSON.stringify({ role: 'volunteer', username: u, name: u, district: 'Kurnool', mandal: 'Orvakal', village: 'Orvakal' }));
        navigate('/volunteer');
        return;
      }
      
      const response = await login({ username: u, password: p });
      localStorage.setItem('gov_jwt', response.token);
      localStorage.setItem('govconnect_user', JSON.stringify({
        role: response.role.toLowerCase(),
        username: response.username,
        name: response.fullName || response.username,
        district: 'Kurnool',
        mandal: 'Orvakal',
        village: 'Orvakal'
      }));

      if (response.role === 'VOLUNTEER') navigate('/volunteer');
      else if (response.role === 'NODAL_OFFICER') navigate('/nodal');
      else if (response.role === 'ADMIN' || response.role === 'DISTRICT_OFFICER') navigate('/district');
      else navigate('/');
      
    } catch (err) {
      setError('Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doLogin(username, password); };
  const quickLogin   = (u: string, p: string) => { setUsername(u); setPassword(p); doLogin(u, p); };

  return (
    <div className="min-h-screen bg-[#080f1e] flex items-center justify-center relative overflow-hidden font-sans">

      {/* ── Ambient glows ── */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[130px]" />
      <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-violet-600/15 rounded-full blur-[150px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[120px]" />

      {/* ── Subtle grid ── */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-16 items-center">

        {/* ══ LEFT ══ */}
        <div className="hidden lg:flex flex-col space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <Shield size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                GovConnect<span className="text-indigo-400">AP</span>
              </h1>
              <p className="text-xs text-gray-500 tracking-widest uppercase">Andhra Pradesh</p>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-5xl font-bold leading-[1.12] text-white">
              AI-Powered<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Volunteer Monitoring
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Real-time command center for government volunteers across 28 districts, 688 mandals and 17,808 villages of Andhra Pradesh.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['🤖 AI Classification','📍 17,808 Villages','🔐 Role-Based Access','📊 Real-time Dashboard','⚡ Instant Alerts'].map(f => (
              <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">{f}</span>
            ))}
          </div>

          {/* Stats strip */}
          <div className="flex gap-8 pt-4 border-t border-white/10">
            {[['28','Districts'],['688','Mandals'],['17,808','Villages']].map(([n,l]) => (
              <div key={l}>
                <p className="text-2xl font-bold text-white">{n}</p>
                <p className="text-xs text-gray-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RIGHT — Login Card ══ */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#111827]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">

            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />

            <div className="p-8">
              {/* Mobile logo */}
              <div className="flex items-center gap-3 mb-8 lg:hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <h1 className="text-xl font-bold text-white">GovConnect<span className="text-indigo-400">AP</span></h1>
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">Sign in</h3>
              <p className="text-sm text-gray-500 mb-7">Access your role-specific dashboard</p>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Username */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Username / ID</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text" required value={username}
                      onChange={e => { setUsername(e.target.value); setError(''); }}
                      placeholder="e.g. A1 or Nodal-101"
                      className="w-full pl-10 pr-4 py-3 bg-[#0d1526] border border-gray-700/80 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPass ? 'text' : 'password'} required value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-3 bg-[#0d1526] border border-gray-700/80 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                    ⚠️ {error}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed">
                  {isLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Signing in…</span></>
                    : <><span>Sign In</span><ArrowRight size={16} /></>
                  }
                </button>
              </form>

              {/* ── Demo Quick Login ── */}
              <div className="mt-8 pt-6 border-t border-white/[0.07]">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest text-center mb-4">
                  ⚡ One-click demo login
                </p>
                <div className="space-y-2.5">
                  {DEMO_USERS.map(u => (
                    <button key={u.username} onClick={() => quickLogin(u.username, u.password)} disabled={isLoading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all group disabled:opacity-50">
                      <span className="text-xl flex-shrink-0">{u.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white group-hover:text-white/90">{u.label}</p>
                        <p className="text-xs text-gray-500">{u.sublabel}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-xs font-mono px-2 py-0.5 rounded-md border ${u.badge}`}>{u.username}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{u.password}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-700 mt-6">
            Government of Andhra Pradesh · Volunteer Monitoring System · 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
