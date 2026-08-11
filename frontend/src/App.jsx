import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

import {
  LayoutDashboard, Server, BarChart3, Settings, LogOut, RefreshCw,
  Plus, Search, Eye, Edit, Trash2, X, Lock, Mail, Cpu, Save,
  User, Shield, Calendar, Key, Clock, Filter
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

export default function App() {
  const [session, setSession] = useState(null);
  
  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard States
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Company Settings State
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Industrial Solutions Corp.',
    facilityLocation: 'Plant A - Main Division',
    autoSyncInterval: '30s',
    emailAlerts: true,
    criticalNotifications: true,
  });
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  const [formData, setFormData] = useState(initialFormState);

  // --- 1. AUTH SESSION MANAGEMENT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. DATABASE CRUD OPERATIONS ---
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
    let result;

    if (isSignUp) {
      result = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
        options: {
          data: {
            full_name: fullNameInput || emailInput.split('@')[0],
            role: 'OPERATOR', // New signups default to OPERATOR
          }
        }
      });
    } else {
      result = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });
    }

    if (result.error) {
      setAuthError(result.error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      machine_code: formData.id
    };

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
    if (window.confirm(`Delete machine ${machineId} from Company System?`)) {
      const { error } = await supabase.from('machines').delete().eq('id', machineId);
      if (error) {
        alert(`Error deleting machine: ${error.message}`);
      } else {
        fetchMachines();
      }
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettingsSavedMessage('Company settings saved successfully!');
    setTimeout(() => setSettingsSavedMessage(''), 3000);
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

  // Derived user details & Role-Based Access Control (RBAC)
  const user = session?.user;
  const userFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operator';
  const userEmail = user?.email || 'N/A';
  const userId = user?.id || 'N/A';
  const userRole = (user?.user_metadata?.role || 'OPERATOR').toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const userCreatedAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
  const userLastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A';

  if (!session) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#1e293b', borderRadius: '50%', marginBottom: '0.8rem' }}>
              <Cpu color="#38bdf8" size={32} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{isSignUp ? 'Create Company Account' : 'Company Portal Sign In'}</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Industrial Profiler Enterprise Management</p>
          </div>

          {authError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {authError}
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
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '1.2rem' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc', fontFamily: 'Segoe UI, sans-serif' }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      
      {/* SIDEBAR */}
      <aside style={{ width: '250px', backgroundColor: '#131b2e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.2rem 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '1.5rem', borderBottom: '1px solid #1e293b', marginBottom: '1.5rem' }}>
            <Cpu color="#38bdf8" size={28} />
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>Industrial Profiler</h2>
              <span style={{ fontSize: '0.7rem', color: '#10b981' }}>● Company Server Connected</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'Dashboard', icon: LayoutDashboard },
              { id: 'Machines', icon: Server },
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

        {/* SIDEBAR USER MINI-PROFILE WITH ROLE BADGE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0f172a', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isAdmin ? '#ef4444' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
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
              <Card title="Total DB Machines" value={machines.length} sub="Saved in Company Database" color="#3b82f6" />
              <Card title="Healthy" value={machines.filter(m => (m.status || '').toUpperCase() === 'HEALTHY').length} sub="Operating normally" color="#10b981" />
              <Card title="Warning" value={machines.filter(m => (m.status || '').toUpperCase() === 'WARNING').length} sub="Requires inspection" color="#f59e0b" />
              <Card title="Critical" value={machines.filter(m => (m.status || '').toUpperCase() === 'CRITICAL').length} sub="Urgent action needed" color="#ef4444" />
            </div>

            <div style={{ backgroundColor: '#131b2e', padding: '1.2rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Fleet Overview Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
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

        {/* MACHINES TAB */}
        {activeTab === 'Machines' && (
          <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={inputContainerStyle}>
                  <Search size={16} color="#64748b" />
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search database records..." style={rawInputStyle} />
                </div>

                <div style={{ ...inputContainerStyle, padding: '0.4rem 0.8rem' }}>
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

              {/* RBAC RESTRICTION: Only ADMINs see the Add Machine button */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setFormData({ id: `CNC-0${machines.length + 1}`, name: '', type: 'Class M', location: 'Plant A', status: 'HEALTHY', health_score: 95 });
                    setIsAddModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Plus size={16} /> Add Machine
                </button>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem' }}>Machine ID</th>
                  <th style={{ padding: '0.8rem' }}>Name</th>
                  <th style={{ padding: '0.8rem' }}>Variant</th>
                  <th style={{ padding: '0.8rem' }}>Location</th>
                  <th style={{ padding: '0.8rem' }}>Status</th>
                  <th style={{ padding: '0.8rem' }}>Health Score</th>
                  <th style={{ padding: '0.8rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.length > 0 ? (
                  filteredMachines.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #1a233a' }}>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold', color: '#38bdf8' }}>{m.id}</td>
                      <td style={{ padding: '0.8rem' }}>{m.name}</td>
                      <td style={{ padding: '0.8rem' }}>{m.type || 'Class M'}</td>
                      <td style={{ padding: '0.8rem' }}>{m.location || 'N/A'}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold', color: getStatusColor(m.status) }}>{m.status ? m.status.toUpperCase() : 'HEALTHY'}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{m.health_score ?? 100}%</td>
                      <td style={{ padding: '0.8rem' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => { setSelectedMachine(m); setIsViewModalOpen(true); }} style={iconBtnStyle}><Eye size={16} color="#38bdf8" /></button>
                          
                          {/* RBAC RESTRICTION: Only ADMINs see Edit & Delete */}
                          {isAdmin && (
                            <>
                              <button onClick={() => { setSelectedMachine(m); setFormData({ ...m }); setIsEditModalOpen(true); }} style={iconBtnStyle}><Edit size={16} color="#f59e0b" /></button>
                              <button onClick={() => handleDeleteMachine(m.id)} style={iconBtnStyle}><Trash2 size={16} color="#ef4444" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                      No machines match the selected status or search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'Analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ backgroundColor: '#131b2e', padding: '1.2rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Machine Distribution by Location</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { location: 'Plant A', count: machines.filter(m => m.location === 'Plant A').length || 1 },
                  { location: 'Plant B', count: machines.filter(m => m.location === 'Plant B').length || 1 },
                  { location: 'Plant C', count: machines.filter(m => m.location === 'Plant C').length || 1 }
                ]}>
                  <XAxis dataKey="location" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ backgroundColor: '#131b2e', padding: '1.2rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Healthy', value: machines.filter(m => (m.status || '').toUpperCase() === 'HEALTHY').length || 1, color: '#10b981' },
                      { name: 'Warning', value: machines.filter(m => (m.status || '').toUpperCase() === 'WARNING').length || 0, color: '#f59e0b' },
                      { name: 'Critical', value: machines.filter(m => (m.status || '').toUpperCase() === 'CRITICAL').length || 0, color: '#ef4444' }
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} label
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'Settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px' }}>
            {settingsSavedMessage && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                {settingsSavedMessage}
              </div>
            )}

            <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#38bdf8" /> User Account & Profile Details
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <UserDetailItem icon={User} label="Full Name" value={userFullName} />
                <UserDetailItem icon={Mail} label="Email Address" value={userEmail} />
                <UserDetailItem icon={Key} label="User ID (UUID)" value={userId} />
                <UserDetailItem icon={Shield} label="Auth Role" value={userRole} highlight={isAdmin ? '#ef4444' : '#10b981'} />
                <UserDetailItem icon={Calendar} label="Account Created" value={userCreatedAt} />
                <UserDetailItem icon={Clock} label="Last Sign-In Time" value={userLastSignIn} />
              </div>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.6rem' }}>Company Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Input
                    label="Company Name"
                    value={companySettings.companyName}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                  />
                  <Input
                    label="Primary Facility / Plant Location"
                    value={companySettings.facilityLocation}
                    onChange={(e) => setCompanySettings({ ...companySettings, facilityLocation: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.6rem' }}>System Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Auto-Sync Interval</label>
                    <select
                      value={companySettings.autoSyncInterval}
                      onChange={(e) => setCompanySettings({ ...companySettings, autoSyncInterval: e.target.value })}
                      style={inputStyle}>
                      <option value="15s">Every 15 Seconds</option>
                      <option value="30s">Every 30 Seconds</option>
                      <option value="1m">Every 1 Minute</option>
                      <option value="5m">Every 5 Minutes</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Email Notifications</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Receive automated daily telemetry summaries</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companySettings.emailAlerts}
                      onChange={(e) => setCompanySettings({ ...companySettings, emailAlerts: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Critical System Alerts</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Send immediate alerts when machine status drops to Critical</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companySettings.criticalNotifications}
                      onChange={(e) => setCompanySettings({ ...companySettings, criticalNotifications: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" style={{ ...submitBtnStyle, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>
                <Save size={18} /> Save Settings
              </button>
            </form>
          </div>
        )}

      </main>

      {/* --- ADD MODAL --- */}
      {isAddModalOpen && (
        <Modal title="Insert Record into Company System" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleCreateMachine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Machine ID" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} required />
            <Input label="Machine Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            <div>
              <label style={labelStyle}>Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                <option value="HEALTHY">HEALTHY</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <Input label="Health Score (%)" type="number" value={formData.health_score} onChange={(e) => setFormData({ ...formData, health_score: Number(e.target.value) })} />
            <button type="submit" style={submitBtnStyle}>Save to Database</button>
          </form>
        </Modal>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <Modal title={`Update Machine: ${formData.id}`} onClose={() => setIsEditModalOpen(false)}>
          <form onSubmit={handleUpdateMachine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Machine Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            <div>
              <label style={labelStyle}>Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                <option value="HEALTHY">HEALTHY</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <Input label="Health Score (%)" type="number" value={formData.health_score} onChange={(e) => setFormData({ ...formData, health_score: Number(e.target.value) })} />
            <button type="submit" style={submitBtnStyle}>Update Database Record</button>
          </form>
        </Modal>
      )}

      {/* --- VIEW MODAL --- */}
      {isViewModalOpen && selectedMachine && (
        <Modal title={`Machine Details - ${selectedMachine.id}`} onClose={() => setIsViewModalOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
            <div><strong>ID:</strong> {selectedMachine.id}</div>
            <div><strong>Name:</strong> {selectedMachine.name}</div>
            <div><strong>Variant:</strong> {selectedMachine.type || 'Class M'}</div>
            <div><strong>Location:</strong> {selectedMachine.location || 'N/A'}</div>
            <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedMachine.status), fontWeight: 'bold' }}>{selectedMachine.status}</span></div>
            <div><strong>Health Score:</strong> {selectedMachine.health_score}%</div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// Helpers
function UserDetailItem({ icon: Icon, label, value, highlight }) {
  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Icon size={20} color={highlight || "#64748b"} />
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>{label}</div>
        <div style={{ fontSize: '0.85rem', color: highlight || '#f8fafc', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
}

function Card({ title, value, sub, color }) {
  return (
    <div style={{ backgroundColor: '#131b2e', padding: '1.2rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{title}</span>
      <div style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0.4rem 0', color }}>{value}</div>
      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{sub}</span>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '10px', padding: '1.5rem', width: '100%', maxWidth: '450px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} color="#64748b" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} {...props} />
    </div>
  );
}

const labelStyle = { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' };
const inputStyle = { width: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none', fontSize: '0.85rem' };
const inputContainerStyle = { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.6rem 1rem' };
const rawInputStyle = { background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.85rem' };
const submitBtnStyle = { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 0 };