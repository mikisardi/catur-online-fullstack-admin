import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';

type Tab = 'overview' | 'users' | 'games' | 'queue' | 'reports' | 'audit';

export default function AdminDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextTab: Tab = tab) => {
    setBusy(true); setError('');
    try {
      if (nextTab === 'overview') setDashboard((await api('/api/v1/admin/dashboard')).data);
      if (nextTab === 'users') setUsers((await api('/api/v1/admin/users?search=' + encodeURIComponent(search))).data || []);
      if (nextTab === 'games') setGames((await api('/api/v1/admin/games')).data || []);
      if (nextTab === 'queue') setQueue((await api('/api/v1/admin/matchmaking')).data || []);
      if (nextTab === 'reports') setReports((await api('/api/v1/admin/reports')).data || []);
      if (nextTab === 'audit') setAudit((await api('/api/v1/admin/audit-logs')).data || []);
    } catch (e: any) {
      setError(e.message || 'Tidak dapat memuat dashboard');
      if (e.message?.toLowerCase().includes('forbidden') || e.message?.toLowerCase().includes('login')) nav('/login');
    } finally { setBusy(false); }
  };

  useEffect(() => { load('overview'); }, []);
  useEffect(() => { if (tab !== 'overview') load(tab); }, [tab]);

  const metrics = useMemo(() => dashboard?.metrics || {}, [dashboard]);
  const statusUser = async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    const reason = window.prompt(`Alasan ${status.toLowerCase()}:`);
    if (!reason) return;
    await api(`/api/v1/admin/users/${id}/status`, { method: 'POST', body: JSON.stringify({ status, reason }) });
    load('users');
  };

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link to="/" className="brand">♞ Catur Admin</Link>
      <div className="admin-caption">OPERATIONS</div>
      {(['overview','users','games','queue','reports','audit'] as Tab[]).map(x => <button key={x} className={`admin-nav ${tab===x?'active':''}`} onClick={()=>setTab(x)}>{label(x)}</button>)}
      <Link className="admin-nav" to="/play">← Kembali ke aplikasi</Link>
    </aside>
    <section className="admin-content">
      <div className="admin-topbar"><div><div className="eyebrow">CONTROL CENTER</div><h1>{label(tab)}</h1></div><button className="btn" onClick={()=>load(tab)}>Refresh</button></div>
      {error && <div className="alert">{error}</div>}
      {busy && !dashboard ? <div className="card">Memuat dashboard…</div> : <>
        {tab === 'overview' && <>
          <div className="admin-metrics">{[
            ['Active Games', metrics.activeGames], ['Queue', metrics.queued], ['Users', metrics.users], ['Finished Today', metrics.finishedToday], ['Suspended', metrics.suspendedUsers], ['Banned', metrics.bannedUsers], ['Open Reports', metrics.openReports], ['Error Rate', metrics.errorRate ?? '—']
          ].map(([k,v])=><div className="metric-card" key={String(k)}><span>{k}</span><strong>{v}</strong></div>)}</div>
          <div className="card"><div className="section-head"><h2>Game terbaru</h2><button className="btn" onClick={()=>setTab('games')}>Lihat semua</button></div><DataTable rows={dashboard?.recentGames||[]} columns={[
            ['Game', (x:any)=>x.id.slice(-8)], ['White', (x:any)=>x.whitePlayer?.username||'—'], ['Black', (x:any)=>x.blackPlayer?.username||'—'], ['Status',(x:any)=>x.status], ['Result',(x:any)=>x.result||'—']
          ]}/></div>
          <div className="card"><div className="section-head"><h2>Catatan telemetry</h2></div><p>{dashboard?.note || '—'}</p></div>
        </>}
        {tab === 'users' && <div className="card"><div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load('users')} placeholder="Cari username/email"/><button className="btn" onClick={()=>load('users')}>Cari</button></div><DataTable rows={users} columns={[
          ['Username',(x:any)=>x.username],['Email',(x:any)=>x.email],['Role',(x:any)=>x.role],['Status',(x:any)=>x.status],['Rating',(x:any)=>x.rating?.rating??'—'],['Games',(x:any)=>(x._count?.whiteGames||0)+(x._count?.blackGames||0)],
          ['Aksi',(x:any)=><div className="table-actions">{x.status!=='ACTIVE'&&<button className="btn small" onClick={()=>statusUser(x.id,'ACTIVE')}>Aktifkan</button>}{x.status!=='SUSPENDED'&&<button className="btn small" onClick={()=>statusUser(x.id,'SUSPENDED')}>Suspend</button>}{x.status!=='BANNED'&&<button className="btn small danger" onClick={()=>statusUser(x.id,'BANNED')}>Ban</button>}</div>]
        ]}/></div>}
        {tab === 'games' && <div className="card"><DataTable rows={games} columns={[
          ['ID',(x:any)=>x.id],['Mode',(x:any)=>x.mode],['White',(x:any)=>x.whitePlayer?.username||'—'],['Black',(x:any)=>x.blackPlayer?.username||'—'],['Status',(x:any)=>x.status],['Result',(x:any)=>x.result||'—'],['Reason',(x:any)=>x.resultReason||'—']
        ]}/></div>}
        {tab === 'queue' && <div className="card"><DataTable rows={queue} columns={[
          ['Ticket',(x:any)=>x.id.slice(-8)],['User',(x:any)=>x.user?.username],['Rating',(x:any)=>x.user?.rating?.rating??x.rating],['Time Control',(x:any)=>x.timeControl],['Queued At',(x:any)=>new Date(x.queuedAt).toLocaleString()]
        ]}/></div>}
        {tab === 'reports' && <div className="card"><DataTable rows={reports} columns={[
          ['ID',(x:any)=>x.id.slice(-8)],['Reporter',(x:any)=>x.reporter?.username],['Reported',(x:any)=>x.reportedUser?.username],['Status',(x:any)=>x.status],['Reason',(x:any)=>x.reason],['Game',(x:any)=>x.game?.id?.slice(-8)||'—']
        ]}/></div>}
        {tab === 'audit' && <div className="card"><DataTable rows={audit} columns={[
          ['Time',(x:any)=>new Date(x.createdAt).toLocaleString()],['Admin',(x:any)=>x.admin?.username],['Action',(x:any)=>x.action],['Target',(x:any)=>x.targetUserId||'—'],['Metadata',(x:any)=>JSON.stringify(x.metadataJson||{})]
        ]}/></div>}
      </>}
    </section>
  </div>
}

function label(x: Tab) { return ({overview:'Overview',users:'Users',games:'Games',queue:'Matchmaking',reports:'Reports',audit:'Audit Logs'} as any)[x]; }
function DataTable({ rows, columns }: { rows: any[]; columns: [string, (row:any)=>React.ReactNode][] }) {
  if (!rows.length) return <div className="empty">Tidak ada data.</div>;
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c[0]}>{c[0]}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c[0]}>{c[1](r)}</td>)}</tr>)}</tbody></table></div>;
}
