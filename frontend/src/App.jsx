import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

import {
  LayoutDashboard, Server, BarChart3, Settings, LogOut, RefreshCw,
  Plus, Search, Eye, Edit, Trash2, X, Lock, Mail, Cpu, Save,
  User, Shield, Calendar, Key, Clock, Filter, Activity, Gauge,
  Thermometer, Zap, AlertTriangle, CheckCircle2, ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const fleetTrendData = [
  { date: '01 Aug', Healthy: 10, Warning: 4, Critical: 1 },
  { date: '02 Aug', Healthy: 11, Warning: 5, Critical: 1 },
  { date: '03 Aug', Healthy: 9, Warning: 4, Critical: 2 },
  { date: '04 Aug', Healthy: 10, Warning: 5, Critical: 1 },
];

const initialFormState = {
  id: '', name: '', type: 'Class M', location: 'Plant A', status: 'HEALTHY', health_score: 100
};

const inputContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '0.6rem 0.8rem'
};

const rawInputStyle = {
  background: 'none',
  border: 'none',
  color: '#f8fafc',
  width: '100%',
  outline: 'none',
  fontSize: '0.9rem'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '6px'
};

const submitBtnStyle = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  border: 'none',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.9rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

function Card({ title, value, sub, color }) {
  return (
    <div style={{ backgroundColor: '#131b2e', padding: '1.2rem', borderRadius: '10px', border: '1px solid #1e293b', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f8fafc', margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub}</div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  // Auth State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  // App Navigation & Data
  const [activeTab, setActiveTab] = useState('Machines');
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Telemetry Inputs
  const [productType, setProductType] = useState('L');
  const [airTemp, setAirTemp] = useState(300.0);
  const [processTemp, setProcessTemp] = useState(310.0);
  const [rotationalSpeed, setRotationalSpeed] = useState(1500);
  const [torque, setTorque] = useState(40.0);
  const [toolWear, setToolWear] = useState(120);
  const [telemetryResult, setTelemetryResult] = useState(null);

  // Profile & Settings Management
  const [profileName, setProfileName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Industrial Solutions Corp.',
    facilityLocation: 'Plant A - Main Division',
    autoSyncInterval: '30s',
    emailAlerts: true,
    criticalNotifications: true,
  });
  const [settingsMsg, setSettingsMsg] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  // AUTH SESSION TRACKING
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setProfileName(session.user.user_metadata?.full_name || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setProfileName(session.user.user_metadata?.full_name || '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // FETCH MACHINES FROM DATABASE
  const fetchMachines = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching machines:', error.message);
    } else {
      setMachines(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchMachines();
    }
  }, [session]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMsg('');
    let result;

    if (isSignUp) {
      result = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
        options: {
          data: {
            full_name: fullNameInput || emailInput.split('@')[0],
            role: 'OPERATOR',
          }
        }
      });
      if (!result.error) {
        setAuthMsg('Account created successfully! You may now log in.');
        setIsSignUp(false);
      }
    } else {
      result = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });
    }

    if (result?.error) {
      setAuthError(result.error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // PROFILE & SECURITY UPDATES
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    const updates = {
      data: { full_name: profileName }
    };

    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      setSettingsMsg(`Error: ${error.message}`);
    } else {
      setSettingsMsg('Profile updated successfully!');
      setTimeout(() => setSettingsMsg(''), 3000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert(`Error updating password: ${error.message}`);
    } else {
      alert('Password updated successfully!');
      setNewPassword('');
    }
  };

  // CRUD OPERATIONS
  const handleCreateMachine = async (e) => {
    e.preventDefault();
    const payload = { ...formData, machine_code: formData.id };

    const { error } = await supabase.from('machines').insert([payload]);
    if (error) {
      alert(`Error saving machine: ${error.message}`);
    } else {
      setIsAddModalOpen(false);
      setFormData(initialFormState);
      fetchMachines();
    }
  };

  const handleUpdateMachine = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('machines')
      .update({
        name: formData.name,
        location: formData.location,
        status: formData.status,
        health_score: formData.health_score,
        type: formData.type
      })
      .eq('id', formData.id);

    if (error) {
      alert(`Error updating machine: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      setFormData(initialFormState);
      fetchMachines();
    }
  };

  const handleDeleteMachine = async (machineId) => {
    if (window.confirm(`Delete machine ${machineId} from database?`)) {
      const { error } = await supabase.from('machines').delete().eq('id', machineId);
      if (error) {
        alert(`Error deleting machine: ${error.message}`);
      } else {
        fetchMachines();
      }
    }
  };

  // TELEMETRY DIAGNOSTICS ENGINE
  const analyzeTelemetry = () => {
    const tempDiff = processTemp - airTemp;
    const power = (torque * rotationalSpeed * 2 * Math.PI) / 60;
    const overstrain = toolWear * torque;

    let failures = [];
    if (toolWear >= 200) failures.push('Tool Wear Failure (TWF)');
    if (tempDiff < 8.6 && rotationalSpeed < 1380) failures.push('Heat Dissipation Failure (HDF)');
    if (power < 3500 || power > 9000) failures.push('Power Failure (PWF)');
    if (overstrain > 11000) failures.push('Overstrain Failure (OSF)');

    const hasFailure = failures.length > 0;
    const riskPercentage = hasFailure ? Math.min(98, 40 + failures.length * 20) : 12;

    setTelemetryResult({
      hasFailure,
      riskPercentage,
      failures: hasFailure ? failures : ['Operating Normally (No Failure Detected)'],
      metrics: {
        tempDiff: tempDiff.toFixed(2),
        powerKw: (power / 1000).toFixed(2),
        overstrainVal: overstrain.toFixed(0)
      }
    });
  };

  const getStatusColor = (status) => {
    if (!status) return '#94a3b8';
    const s = status.toUpperCase();
    if (s === 'HEALTHY') return '#10b981';
    if (s === 'WARNING') return '#f59e0b';
    if (s === 'CRITICAL') return '#ef4444';
    return '#38bdf8';
  };

  const filteredMachines = machines.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.type || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (m.status || '').toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const user = session?.user;
  const userFullName = profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operator';
  const userEmail = user?.email || 'N/A';
  const userRole = (user?.user_metadata?.role || 'OPERATOR').toUpperCase();
  const isAdmin = userRole === 'ADMIN';

  // LOGIN SCREEN
  if (!session) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#1e293b', borderRadius: '50%', marginBottom: '0.8rem' }}>
              <Cpu color="#38bdf8" size={32} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{isSignUp ? 'Create Company Account' : 'Company Portal Sign In'}</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Industrial Profiler Enterprise System</p>
          </div>

          {authError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {authError}
            </div>
          )}

          {authMsg && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {authMsg}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isSignUp && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={inputContainerStyle}>
                  <User size={18} color="#64748b" />
                  <input type="text" required value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} placeholder="Jane Doe" style={rawInputStyle} />
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Company Email Address</label>
              <div style={inputContainerStyle}>
                <Mail size={18} color="#64748b" />
                <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="name@company.com" style={rawInputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={inputContainerStyle}>
                <Lock size={18} color="#64748b" />
                <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" style={rawInputStyle} />
              </div>
            </div>

            <button type="submit" style={submitBtnStyle}>
              {isSignUp ? 'Sign Up Account' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '1.2rem' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); setAuthMsg(''); }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'Segoe UI, sans-serif' }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        table th, table td { vertical-align: middle; }
      `}</style>
      
      {/* SIDEBAR */}
      <aside style={{ width: '250px', backgroundColor: '#131b2e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.2rem 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '1.5rem', borderBottom: '1px solid #1e293b', marginBottom: '1.5rem' }}>
            <Cpu color="#38bdf8" size={28} />
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>Industrial Profiler</h2>
              <span style={{ fontSize: '0.7rem', color: '#10b981' }}>● Server Connected</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'Dashboard', icon: LayoutDashboard },
              { id: 'Machines', icon: Server },
              { id: 'Telemetry', icon: Gauge },
              { id: 'Analytics', icon: BarChart3 },
              { id: 'Settings', icon: Settings }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '0.7rem 1rem', borderRadius: '8px', border: 'none',
                    backgroundColor: isActive ? '#2563eb' : 'transparent', color: isActive ? '#ffffff' : '#94a3b8',
                    fontWeight: isActive ? '600' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}>
                  <Icon size={18} /> {item.id}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0f172a', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: isAdmin ? '#ef4444' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
              {userFullName.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userFullName}</div>
              <div style={{ fontSize: '0.7rem', color: isAdmin ? '#ef4444' : '#10b981', fontWeight: '700' }}>● {userRole}</div>
            </div>
          </div>

          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.7rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: '600', width: '100%' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>{activeTab} Overview</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Logged in as <strong style={{ color: '#38bdf8' }}>{userFullName}</strong> ({userEmail}) — <span style={{ color: isAdmin ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{userRole} MODE</span>
            </p>
          </div>
          <button onClick={fetchMachines} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', backgroundColor: '#1d4ed8', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
            <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} /> Sync Database
          </button>
        </header>

        {/* DASHBOARD TAB */}
        {activeTab === 'Dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <Card title="Total DB Machines" value={machines.length} sub="Saved in Database" color="#3b82f6" />
              <Card title="Healthy" value={machines.filter(m => (m.status || '').toUpperCase() === 'HEALTHY').length} sub="Operating normally" color="#10b981" />
              <Card title="Warning" value={machines.filter(m => (m.status || '').toUpperCase() === 'WARNING').length} sub="Requires inspection" color="#f59e0b" />
              <Card title="Critical" value={machines.filter(m => (m.status || '').toUpperCase() === 'CRITICAL').length} sub="Urgent action needed" color="#ef4444" />
            </div>

            <div style={{ backgroundColor: '#131b2e', padding: '1.2rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Fleet Health Trends</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={fleetTrendData}>
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Healthy" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Warning" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="Critical" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* MACHINES TAB (FIXED TABLE & ACTION LAYOUT) */}
        {activeTab === 'Machines' && (
          <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ ...inputContainerStyle, width: '280px' }}>
                  <Search size={16} color="#64748b" />
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search code, name, location..." style={rawInputStyle} />
                </div>

                <div style={{ ...inputContainerStyle, padding: '0.45rem 0.8rem' }}>
                  <Filter size={16} color="#64748b" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="ALL" style={{ backgroundColor: '#0f172a' }}>All Statuses</option>
                    <option value="HEALTHY" style={{ backgroundColor: '#0f172a' }}>HEALTHY</option>
                    <option value="WARNING" style={{ backgroundColor: '#0f172a' }}>WARNING</option>
                    <option value="CRITICAL" style={{ backgroundColor: '#0f172a' }}>CRITICAL</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setFormData({ id: `CNC-0${machines.length + 1}`, name: '', type: 'Class M', location: 'Plant A', status: 'HEALTHY', health_score: 95 });
                    setIsAddModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#fff', padding: '0.6rem 1rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add Machine
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '0.85rem 1rem', width: '120px' }}>Code / ID</th>
                    <th style={{ padding: '0.85rem 1rem', width: '220px' }}>Machine Name</th>
                    <th style={{ padding: '0.85rem 1rem', width: '90px' }}>Class</th>
                    <th style={{ padding: '0.85rem 1rem', width: '110px' }}>Location</th>
                    <th style={{ padding: '0.85rem 1rem', width: '90px' }}>Health</th>
                    <th style={{ padding: '0.85rem 1rem', width: '120px' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No machines found in database records.</td>
                    </tr>
                  ) : (
                    filteredMachines.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#131b2e' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#38bdf8', whiteSpace: 'nowrap' }}>{m.id}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '500', color: '#f8fafc' }}>{m.name}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{m.type}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{m.location}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold' }}>{m.health_score}%</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: `${getStatusColor(m.status)}18`, color: getStatusColor(m.status), padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getStatusColor(m.status) }}></span>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                            <button title="View Machine" onClick={() => { setSelectedMachine(m); setIsViewModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}>
                              <Eye size={17} />
                            </button>
                            {isAdmin && (
                              <>
                                <button title="Edit Machine" onClick={() => { setFormData(m); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}>
                                  <Edit size={17} />
                                </button>
                                <button title="Delete Machine" onClick={() => handleDeleteMachine(m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                  <Trash2 size={17} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TELEMETRY PROFILER TAB */}
        {activeTab === 'Telemetry' && (
          <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b', maxWidth: '800px' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: '#38bdf8' }}>Live Sensor Diagnostics Engine</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Input physical telemetry sensor values to compute real-time structural strain and failure likelihood.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Product Variant Type</label>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ ...rawInputStyle, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.6rem' }}>
                  <option value="L">L (Low Quality Class)</option>
                  <option value="M">M (Medium Quality Class)</option>
                  <option value="H">H (High Quality Class)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Rotational Speed [RPM]</label>
                <div style={inputContainerStyle}>
                  <Gauge size={16} color="#64748b" />
                  <input type="number" value={rotationalSpeed} onChange={(e) => setRotationalSpeed(Number(e.target.value))} style={rawInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Air Temperature [K]</label>
                <div style={inputContainerStyle}>
                  <Thermometer size={16} color="#64748b" />
                  <input type="number" step="0.1" value={airTemp} onChange={(e) => setAirTemp(Number(e.target.value))} style={rawInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Process Temperature [K]</label>
                <div style={inputContainerStyle}>
                  <Thermometer size={16} color="#38bdf8" />
                  <input type="number" step="0.1" value={processTemp} onChange={(e) => setProcessTemp(Number(e.target.value))} style={rawInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Torque [Nm]</label>
                <div style={inputContainerStyle}>
                  <Zap size={16} color="#64748b" />
                  <input type="number" step="0.1" value={torque} onChange={(e) => setTorque(Number(e.target.value))} style={rawInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tool Wear [min]</label>
                <div style={inputContainerStyle}>
                  <Clock size={16} color="#64748b" />
                  <input type="number" value={toolWear} onChange={(e) => setToolWear(Number(e.target.value))} style={rawInputStyle} />
                </div>
              </div>
            </div>

            <button onClick={analyzeTelemetry} style={submitBtnStyle}>
              <Activity size={18} /> Run Telemetry Diagnostic
            </button>

            {telemetryResult && (
              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', border: telemetryResult.hasFailure ? '1px solid #ef4444' : '1px solid #10b981', backgroundColor: telemetryResult.hasFailure ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {telemetryResult.hasFailure ? <AlertTriangle color="#ef4444" /> : <CheckCircle2 color="#10b981" />}
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: telemetryResult.hasFailure ? '#ef4444' : '#10b981' }}>
                    {telemetryResult.hasFailure ? 'Failure Risk Detected' : 'Optimal Machine Operation'}
                  </h3>
                </div>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Failure Risk Score:</strong> {telemetryResult.riskPercentage}%</p>
                <div style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                  <strong>Diagnostics Output:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                    {telemetryResult.failures.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                  Temp Difference: {telemetryResult.metrics.tempDiff} K | Power Output: {telemetryResult.metrics.powerKw} kW | Overstrain Index: {telemetryResult.metrics.overstrainVal}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'Analytics' && (
          <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Machine Class Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'Class M', count: machines.filter(m => m.type === 'Class M').length || 3 },
                { name: 'Class L', count: machines.filter(m => m.type === 'Class L').length || 2 },
                { name: 'Class H', count: machines.filter(m => m.type === 'Class H').length || 1 }
              ]}>
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SETTINGS TAB (REDESIGNED & FUNCTIONAL) */}
        {activeTab === 'Settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '1000px' }}>
            
            {/* USER PROFILE & SECURITY CARD */}
            <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid #1e293b' }}>
                <Shield color="#38bdf8" size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>User Account & Security</h3>
              </div>

              {settingsMsg && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {settingsMsg}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Full Display Name</label>
                  <div style={inputContainerStyle}>
                    <User size={16} color="#64748b" />
                    <input value={profileName} onChange={(e) => setProfileName(e.target.value)} style={rawInputStyle} placeholder="Enter your full name" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Registered Email</label>
                  <div style={{ ...inputContainerStyle, opacity: 0.7 }}>
                    <Mail size={16} color="#64748b" />
                    <input value={userEmail} disabled style={{ ...rawInputStyle, cursor: 'not-allowed' }} />
                  </div>
                </div>

                <button type="submit" style={{ ...submitBtnStyle, backgroundColor: '#2563eb' }}>
                  <Save size={16} /> Save Profile Name
                </button>
              </form>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: '#f8fafc' }}>Change Password</h4>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>New Security Password</label>
                    <div style={inputContainerStyle}>
                      <Key size={16} color="#64748b" />
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" style={rawInputStyle} />
                    </div>
                  </div>
                  <button type="submit" style={{ ...submitBtnStyle, backgroundColor: '#334155' }}>
                    <Lock size={16} /> Update Password
                  </button>
                </form>
              </div>
            </div>

            {/* FACILITY & PREFERENCES CARD */}
            <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid #1e293b' }}>
                <Settings color="#38bdf8" size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Facility & System Preferences</h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setSettingsMsg('Facility settings saved successfully!'); setTimeout(() => setSettingsMsg(''), 3000); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <div style={inputContainerStyle}>
                    <input value={companySettings.companyName} onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })} style={rawInputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Facility Location</label>
                  <div style={inputContainerStyle}>
                    <input value={companySettings.facilityLocation} onChange={(e) => setCompanySettings({ ...companySettings, facilityLocation: e.target.value })} style={rawInputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Auto Database Sync Interval</label>
                  <select
                    value={companySettings.autoSyncInterval}
                    onChange={(e) => setCompanySettings({ ...companySettings, autoSyncInterval: e.target.value })}
                    style={{ ...rawInputStyle, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.6rem' }}
                  >
                    <option value="15s">Every 15 Seconds</option>
                    <option value="30s">Every 30 Seconds</option>
                    <option value="60s">Every 60 Seconds</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Critical Failure Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Notify team on high-risk telemetry</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompanySettings({ ...companySettings, criticalNotifications: !companySettings.criticalNotifications })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: companySettings.criticalNotifications ? '#10b981' : '#64748b' }}
                  >
                    {companySettings.criticalNotifications ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>

                <button type="submit" style={{ ...submitBtnStyle, backgroundColor: '#2563eb', marginTop: '0.5rem' }}>
                  <Save size={16} /> Save Facility Preferences
                </button>
              </form>
            </div>

          </div>
        )}
      </main>

      {/* VIEW MACHINE MODAL */}
      {isViewModalOpen && selectedMachine && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '1.8rem', borderRadius: '10px', width: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#38bdf8' }}>Machine Details [{selectedMachine.id}]</h3>
              <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
              <div><strong>Name:</strong> {selectedMachine.name}</div>
              <div><strong>Class:</strong> {selectedMachine.type}</div>
              <div><strong>Location:</strong> {selectedMachine.location}</div>
              <div><strong>Health Score:</strong> {selectedMachine.health_score}%</div>
              <div>
                <strong>Status: </strong>
                <span style={{ color: getStatusColor(selectedMachine.status), fontWeight: 'bold' }}>{selectedMachine.status}</span>
              </div>
            </div>
            <button onClick={() => setIsViewModalOpen(false)} style={{ ...submitBtnStyle, width: '100%', marginTop: '1.2rem', backgroundColor: '#334155' }}>Close</button>
          </div>
        </div>
      )}

      {/* ADD / EDIT MACHINE MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '1.8rem', borderRadius: '10px', width: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{isAddModalOpen ? 'Add New Machine' : 'Edit Machine Details'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={isAddModalOpen ? handleCreateMachine : handleUpdateMachine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Machine Code / ID</label>
                <div style={inputContainerStyle}>
                  <input placeholder="e.g. CNC-01" disabled={isEditModalOpen} value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} required style={{ ...rawInputStyle, opacity: isEditModalOpen ? 0.6 : 1 }} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Machine Name</label>
                <div style={inputContainerStyle}>
                  <input placeholder="Machine description" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={rawInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Location</label>
                <div style={inputContainerStyle}>
                  <input placeholder="e.g. Plant A" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required style={rawInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ ...rawInputStyle, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.6rem' }}>
                  <option value="HEALTHY">HEALTHY</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                <button type="submit" style={submitBtnStyle}>Save Machine</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}