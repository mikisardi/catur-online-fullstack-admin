import React,{useEffect,useState} from 'react'; import {createRoot} from 'react-dom/client'; import {BrowserRouter,useNavigate,useParams,useLocation,Routes,Route,Link} from 'react-router-dom'; import {api,API} from './lib/api'; import {io} from 'socket.io-client'; import Board from './components/Board';
import AdminDashboard from './pages/AdminDashboard'; import './styles.css';
function Layout({children}:{children:React.ReactNode}){const [role,setRole]=useState<string>(''); useEffect(()=>{api('/api/v1/me').then(j=>setRole(j.data?.role||'')).catch(()=>setRole(''))},[]); return <div className="app"><header><Link to="/" className="brand">♞ Catur Online</Link><nav><Link to="/play">Main</Link><Link to="/leaderboard">Papan Skor</Link><Link to="/history">Riwayat</Link><Link to="/profile">Profil</Link>{['ADMIN','SUPER_ADMIN'].includes(role)&&<Link to="/admin">Admin</Link>}</nav></header><main>{children}</main></div>}
function Home(){return <Layout><section className="hero"><div><div className="eyebrow">REALTIME • FAIR • SERVER-AUTHORITATIVE</div><h1>Catur online yang cepat, kompetitif, dan modern.</h1><p>Main melawan pemain, latihan dengan bot, dan pantau rating dalam satu platform.</p><div className="actions"><Link to="/login" className="btn primary">Mulai Sekarang</Link><Link to="/play/bot" className="btn">Lawan Bot</Link></div></div><div className="panel"><div className="stat"><span>Realtime</span><b>Socket.IO</b></div><div className="stat"><span>Rules</span><b>Chess.js</b></div><div className="stat"><span>Backend</span><b>Fastify</b></div><div className="stat"><span>Database</span><b>PostgreSQL</b></div></div></section></Layout>}
function Login(){const [identifier,setI]=useState('demo@example.com');const [password,setP]=useState('Demo123!');const nav=useNavigate(); const submit=async(e:any)=>{e.preventDefault();try{await api('/api/v1/auth/login',{method:'POST',body:JSON.stringify({identifier,password})});nav('/play')}catch(err:any){alert(err.message)}};return <Layout><div className="card auth"><h2>Masuk</h2><form onSubmit={submit}><input value={identifier} onChange={e=>setI(e.target.value)} placeholder="Email / username"/><input value={password} onChange={e=>setP(e.target.value)} type="password" placeholder="Password"/><button className="btn primary">Masuk</button></form><p>Demo: demo@example.com / Demo123!</p></div></Layout>}
function Play(){const [tc,setTc]=useState('5+0');const nav=useNavigate();const [status,setStatus]=useState('idle');const start=async()=>{const j=await api('/api/v1/matchmaking/join',{method:'POST',body:JSON.stringify({timeControl:tc})}); if(j.data.gameId)nav('/play/game/'+j.data.gameId); else {setStatus('Mencari lawan... Ticket '+j.data.ticketId); const timer=setInterval(async()=>{try{const x=await api('/api/v1/matchmaking/status/'+j.data.ticketId); if(x.data?.matchedGameId){clearInterval(timer);nav('/play/game/'+x.data.matchedGameId)}}catch{clearInterval(timer)}},1500)}};return <Layout><div className="grid2"><div className="card"><h2>Cari Lawan</h2><select value={tc} onChange={e=>setTc(e.target.value)}><option>1+0</option><option>3+0</option><option>3+2</option><option>5+0</option><option>10+0</option><option>10+5</option></select><button className="btn primary" onClick={start}>Quick Match</button><p>{status}</p></div><div className="card"><h2>Latihan Bot</h2><Link className="btn" to="/play/bot">Pilih Level Bot</Link></div></div></Layout>}
function Game(){const {id}=useParams();const [g,setG]=useState<any>();const [status,setStatus]=useState('');useEffect(()=>{(async()=>{const j=await api('/api/v1/games/'+id);setG(j.data)})(); const s=io(API,{withCredentials:true}); s.on('connect',()=>s.emit('room:join',{gameId:id})); s.on('game:snapshot',(x)=>setG((old:any)=>({...old,...x,moves:old?.moves||[]}))); s.on('game:move_applied',()=>api('/api/v1/games/'+id).then(j=>setG(j.data)).catch(()=>{})); s.on('game:finish',(x)=>setStatus(x.reason+': '+x.result)); return()=>{s.disconnect()}},[id]);
                if(!g)return <Layout><div className="card">Loading...</div></Layout>; 
                const playerColor = g.whitePlayerId ? 'WHITE' : 'BLACK';
                const move=async(uci:string)=>{try{await api('/api/v1/games/'+id+'/move',{method:'POST',body:JSON.stringify({move:uci})});const j=await api('/api/v1/games/'+id);setG(j.data)}catch(e:any){alert(e.message)}};return <Layout><div className="game"><div><Board fen={g.fen||g.initialFen} onMove={move}/></div><aside className="card side"><h2>Game</h2><p>Status: {status||g.status}</p><p>Turn: {g.turn||'w'}</p><p>White: {Math.ceil((g.whiteMs||g.initialSeconds*1000)/1000)}s</p><p>Black: {Math.ceil((g.blackMs||g.initialSeconds*1000)/1000)}s</p><div className="actions"><button className="btn" onClick={()=>api('/api/v1/games/'+id+'/resign',{method:'POST'})}>Resign</button><button className="btn" onClick={()=>api('/api/v1/games/'+id+'/draw-offer',{method:'POST'})}>Offer Draw</button></div></aside></div></Layout>}
function Bot(){
  const nav=useNavigate();
  const [color,setColor]=useState<'WHITE'|'BLACK'|'RANDOM'>('RANDOM');

  const start=async(level:string)=>{
    try{
      const j=await api('/api/v1/bot/games',{
        method:'POST',
        body:JSON.stringify({
          level,
          timeControl:'5+0',
          color
        })
      });

      nav('/play/game/'+j.data.id);
    }catch(e:any){
      alert(e.message);
    }
  };

  return <Layout>
    <div className="card">
      <h2>Lawan Bot</h2>
      <p>Pilih warna yang ingin kamu mainkan.</p>

      <div className="grid2">
        <button
          className={`btn ${color==='WHITE'?'primary':''}`}
          onClick={()=>setColor('WHITE')}
        >
          ♔ Putih
        </button>

        <button
          className={`btn ${color==='BLACK'?'primary':''}`}
          onClick={()=>setColor('BLACK')}
        >
          ♚ Hitam
        </button>

        <button
          className={`btn ${color==='RANDOM'?'primary':''}`}
          onClick={()=>setColor('RANDOM')}
        >
          🎲 Acak
        </button>
      </div>

      <p>
        Warna dipilih:{' '}
        <b>
          {color==='WHITE'?'Putih':color==='BLACK'?'Hitam':'Acak'}
        </b>
      </p>

      <h3>Pilih Level Bot</h3>

      <div className="grid2">
        <button className="btn primary" onClick={()=>start('beginner')}>
          Beginner
        </button>
        <button className="btn" onClick={()=>start('easy')}>
          Easy
        </button>
        <button className="btn" onClick={()=>start('medium')}>
          Medium
        </button>
        <button className="btn" onClick={()=>start('hard')}>
          Hard
        </button>
        <button className="btn" onClick={()=>start('expert')}>
          Expert
        </button>
      </div>
    </div>
  </Layout>
}
function Leaderboard(){const [d,setD]=useState<any[]>([]);useEffect(()=>{api('/api/v1/leaderboard').then(j=>setD(j.data))},[]);return <Layout><div className="card"><h2>Papan Skor</h2><table><thead><tr><th>#</th><th>Username</th><th>Rating</th><th>Games</th></tr></thead><tbody>{d.map((x,i)=><tr key={x.id}><td>{i+1}</td><td>{x.username}</td><td>{x.rating?.rating||1200}</td><td>{(x._count?.whiteGames||0)+(x._count?.blackGames||0)}</td></tr>)}</tbody></table></div></Layout>}
function History(){const [d,setD]=useState<any[]>([]);useEffect(()=>{api('/api/v1/history').then(j=>setD(j.data)).catch(()=>{})},[]);return <Layout><div className="card"><h2>Riwayat</h2>{d.map(x=><div className="history" key={x.id}><b>{x.whitePlayer?.username||'-'} vs {x.blackPlayer?.username||'-'}</b><span>{x.result||'—'} · {x.resultReason||''}</span></div>)}</div></Layout>}
function Profile(){const [d,setD]=useState<any>();useEffect(()=>{api('/api/v1/me').then(j=>setD(j.data)).catch(()=>{})},[]);return <Layout><div className="card"><h2>Profil</h2><p>Username: {d?.username||'—'}</p><p>Rating: {d?.rating?.rating||1200}</p><p>Peak: {d?.rating?.peakRating||1200}</p></div></Layout>}
function App(){const loc=useLocation();return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/play" element={<Play/>}/><Route path="/play/game/:id" element={<Game/>}/><Route path="/play/bot" element={<Bot/>}/><Route path="/leaderboard" element={<Leaderboard/>}/><Route path="/history" element={<History/>}/><Route path="/profile" element={<Profile/>}/><Route path="/admin" element={<AdminDashboard/>}/></Routes>}
createRoot(document.getElementById('root')!).render(<BrowserRouter><App/></BrowserRouter>);
