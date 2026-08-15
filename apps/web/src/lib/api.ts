export const API='http://localhost:4000';
export async function api(path:string,options:RequestInit={}){const r=await fetch(API+path,{...options,credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})}}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j?.error?.message||'Request gagal'); return j;}
