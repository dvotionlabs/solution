'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {Profile} from '@/lib/portal/model';

type Alias={id:string;client_id:string;alias:string};
type State={connected:boolean;email:string|null;last_sync_at:string|null;last_error:string|null;googleReady:boolean;aliases:Alias[]};
const fallback:State={connected:false,email:null,last_sync_at:null,last_error:null,googleReady:false,aliases:[]};
const callback='https://cgp-dvotion.vercel.app/api/admin/calendar/callback';

export default function GoogleCalendarSettings({clients}:{clients:Profile[]}){
 const [state,setState]=useState<State>(fallback);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [clientId,setClientId]=useState(''),[alias,setAlias]=useState('');
 const clientOptions=clients.filter(x=>x.role==='athlete'&&x.active);
 async function reload(){
  const r=await fetch('/api/admin/calendar',{cache:'no-store'});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error||'Could not load calendar settings.');
  setState(data as State);
 }
 useEffect(()=>{let open=true;(async()=>{try{await reload();}catch(e){if(open)setError(e instanceof Error?e.message:'Could not load Google Calendar.');}finally{if(open)setLoading(false);}})();return()=>{open=false;};},[]);
 async function act(action:string,fields:Record<string,unknown>={},path='/api/admin/calendar'){
  setError('');setMessage('');setBusy(action);
  try{
   const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...fields})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error||'That change could not be saved.');
   if(action==='connect'){
    if(typeof data.url==='string'){window.location.assign(data.url);return;}
    throw new Error('Google did not provide an authorisation page.');
   }
   if(action==='sync'){
    setMessage(data.connected===false?'Connect Google Calendar first.':`Calendar checked: ${data.created||0} new, ${data.completed||0} completed, ${data.cancelled||0} cancelled. Monthly allocations checked.`);
    window.dispatchEvent(new Event('focus'));
   }else setMessage(action==='disconnect'?'Disconnected. Previously imported bookings remain in CGP.':'Saved.');
   await reload();
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');}
  finally{setBusy('');}
 }
 function addMapping(e:FormEvent<HTMLFormElement>){e.preventDefault();const selected=clientId||clientOptions[0]?.id;if(!selected)return;void act('alias-add',{client_id:selected,alias:alias.trim()}).then(()=>setAlias(''));}
 const mappedName=(id:string)=>clientOptions.find(c=>c.id===id)?.name||'Former client';
 return <section className="p-panel p-calendar-settings">
  <div className="p-row"><h2>Google Calendar → CGP sessions</h2><span className={`p-badge ${state.connected?'completed':''}`}>{state.connected?'Connected':state.googleReady?'Ready to connect':'Setup required'}</span></div>
  <p className="p-muted">Read-only Google Calendar sync. Only an event whose title exactly matches a client mapping becomes that client's CGP appointment. No other calendar events are shown to athletes.</p>
  {loading?<p>Loading calendar connection…</p>:<>
   {state.connected?<div className="p-calendar-connection">
    <p><strong>Calendar:</strong> {state.email} · Primary calendar</p>
    <p><strong>Last successful sync:</strong> {state.last_sync_at?new Date(state.last_sync_at).toLocaleString('en-GB',{timeZone:'Europe/London'}):'Not synced yet'}</p>
    {state.last_error&&<p className="p-error" role="alert">Last sync issue: {state.last_error}</p>}
    <div className="p-calendar-actions">
     <button className="p-button" disabled={Boolean(busy)} onClick={()=>void act('sync',{},'/api/admin/calendar/sync')}>{busy==='sync'?'Syncing…':'Sync calendar now ↻'}</button>
     <button className="p-link" disabled={Boolean(busy)} onClick={()=>{if(window.confirm('Disconnect your Google Calendar? Existing CGP bookings will be preserved.'))void act('disconnect');}}>Disconnect</button>
    </div>
    <p className="p-muted p-small">CGP checks for new calendar events approximately every ten minutes. You can sync immediately with the button above.</p>
   </div>:<div className="p-calendar-connection">
    {state.googleReady?<button className="p-button" disabled={Boolean(busy)} onClick={()=>void act('connect')}>{busy==='connect'?'Opening Google…':'Connect Google Calendar ↗'}</button>:
     <><p>Before connecting, create a Google Cloud OAuth application for CGP and add its client ID and client secret to the CGP Vercel environment. Google Calendar API access is read-only.</p>
      <ol className="p-setup-list">
       <li>Visit <a className="p-link" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud credentials ↗</a>. Enable the Google Calendar API and configure your app's OAuth consent.</li>
       <li>Create an <strong>OAuth client (Web application)</strong> and add this exact authorised redirect URI: <code>{callback}</code>.</li>
       <li>In CGP's Vercel environment settings add <code>CGP_GOOGLE_CLIENT_ID</code> and <code>CGP_GOOGLE_CLIENT_SECRET</code> as server-side variables. Redeploy CGP. Never publish or paste the client secret into chat.</li>
      </ol>
     </>
    }
   </div>}
   <div className="p-section-head"><h3>Match calendar titles to clients</h3><span className="p-muted p-small">{state.aliases.length} names</span></div>
   <p className="p-muted p-small">Example: add <strong>Akash</strong> for <strong>Aakash Kabra</strong>. A Google event called exactly “Akash” then appears only in Aakash's diary. Titles that don't match are ignored. Matches are case-insensitive, not partial.</p>
   {state.aliases.length?<div className="p-calendar-aliases">{state.aliases.map(a=><div className="p-calendar-alias" key={a.id}><span><strong>{a.alias}</strong><small> → {mappedName(a.client_id)}</small></span><button className="p-link" disabled={Boolean(busy)} onClick={()=>{if(window.confirm(`Stop matching “${a.alias}” to ${mappedName(a.client_id)}? Future linked appointments may be cancelled on the next sync.`))void act('alias-delete',{id:a.id});}}>Remove</button></div>)}</div>:<p className="p-muted">No calendar title mappings yet.</p>}
   <form className="p-form p-calendar-map-form" onSubmit={addMapping}>
    <label>Calendar event title<input value={alias} maxLength={80} minLength={2} onChange={e=>setAlias(e.target.value)} placeholder="e.g. Aakash" required/></label>
    <label>Assign to athlete<select value={clientId||clientOptions[0]?.id||''} onChange={e=>setClientId(e.target.value)} required><option value="" disabled>Choose a client</option>{clientOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <button className="p-button p-secondary" disabled={Boolean(busy)||!clientOptions.length||alias.trim().length<2}>Add name mapping +</button>
   </form>
   <p className="p-muted p-small">Matched events appear only in the named athlete's diary. Once a calendar event has ended, CGP automatically marks that session completed; deleting it within the recent sync window cancels it and restores any reserved credit. Existing manual CGP appointments are never auto-completed. Each client's 4- or 8-session monthly plan is configured from their coach profile.</p>
  </>}
  {message&&<p className="p-info" role="status">{message}</p>}
  {error&&<p className="p-error" role="alert">{error}</p>}
 </section>;
}
