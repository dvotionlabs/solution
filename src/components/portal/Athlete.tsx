'use client';
import {useEffect,useState} from 'react';
import type {PortalData} from '@/lib/portal/model';
import type {Action} from './Portal';
import {Balance,BookingList,HomeworkGrid,Metrics,dateTime} from './Shared';
import ExerciseLibrary from './ExerciseLibrary';
export default function Athlete({data,tab,action,navigate,onError}:{data:PortalData;tab:string;action:Action;navigate:(tab:string)=>void;onError:(error:string)=>void}){
 const [autoChecked,setAutoChecked]=useState(false),[library,setLibrary]=useState(false),[period,setPeriod]=useState('upcoming'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(''),[source,setSource]=useState('');
 const id=data.profile.id,bookings=data.bookings.filter(b=>b.client_id===id),credits=data.credits.filter(c=>c.client_id===id),homework=data.homework.filter(h=>h.client_id===id),connections=data.connections.filter(c=>c.client_id===id&&c.status!=='revoked');
 const live=connections.filter(c=>c.status==='connected');const selected=live.find(c=>c.id===source)||live[0];const metrics=data.metrics.filter(m=>m.connection_id===selected?.id);
 const upcoming=bookings.filter(b=>b.status==='scheduled'&&Date.parse(b.ends_at)>=Date.parse(data.asOf)).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 async function run(body:Record<string,unknown>,endpoint?:string){try{return await action(body,endpoint);}catch(e){onError(e instanceof Error?e.message:'Please try again.');}}
 async function connect(provider:string){
  setBusy(provider);
  try{
   const r=await action({action:'connect',provider,consent},'/api/portal/wearables');
   if(typeof r.url==='string')window.location.assign(r.url);
  }catch(e){onError(e instanceof Error?e.message:'Unable to connect.');}
  finally{setBusy('');}
 }
 useEffect(()=>{
  if(autoChecked)return;
  const url=new URL(window.location.href);
  const status=url.searchParams.get('device');
  if(!status)return;
  setAutoChecked(true);
  url.searchParams.delete('device');
  window.history.replaceState(null,'',url.pathname+url.search);
  if(status==='connected'){
   const newest=[...connections].filter(c=>c.status==='connected').sort((a,b)=>(b.consent_at||'').localeCompare(a.consent_at||''))[0];
   if(newest)void action({action:'sync',id:newest.id},'/api/portal/wearables').catch(e=>onError(e instanceof Error?e.message:'Could not sync wearable data.'));
  }else if(status==='declined'){onError('Your wearable provider did not grant access. You can try again at any time.');}
  else if(status==='failed'||status==='expired'){onError('That connection could not be completed. Please connect your wearable again.');}
 },[autoChecked,connections,action,onError]);

 const header=(title:string,subtitle:string)=><header className="p-page-heading"><p className="p-kicker">CG PERFORMANCE / {tab.toUpperCase()}</p><h1>{title}</h1><p>{subtitle}</p></header>;
 if(tab==='bookings')return <>{header('Your sessions.','Every booking and your remaining session balance. Times are shown in London time.')}<Balance credits={credits} bookings={bookings}/><div className="p-section-head"><div className="p-tabs">{['upcoming','history','all'].map(p=><button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p[0].toUpperCase()+p.slice(1)}</button>)}</div><a className="p-link" href="mailto:chrisgkoufas.performance@gmail.com">Arrange a session ↗</a></div><section className="p-panel"><BookingList items={period==='upcoming'?upcoming:period==='history'?bookings.filter(b=>b.status!=='scheduled'||Date.parse(b.ends_at)<Date.parse(data.asOf)):[...bookings].sort((a,b)=>b.starts_at.localeCompare(a.starts_at))}/></section><section className="p-panel p-pack-list"><h2>Session packs</h2>{credits.length?credits.map(c=><div className="p-pack" key={c.id}><div><h3>{c.label}</h3><p>{c.quantity} sessions · From {c.starts_on}{c.expires_on?` · Expires ${c.expires_on}`:''}</p></div><span>{bookings.filter(b=>b.credit_id===c.id&&['completed','no_show'].includes(b.status)).length} used</span></div>):<p className="p-muted">Your session packs will appear here once added by Chris.</p>}</section></>;
 if(tab==='homework')return <>{header('Keep the work going.','Your exercises, demonstrations and individual instructions.')}<div className="p-section-head"><div className="p-tabs"><button aria-pressed={!library} onClick={()=>setLibrary(false)}>My homework</button><button aria-pressed={library} onClick={()=>setLibrary(true)}>Exercise library</button></div>{data.youtubeChannel&&<a className="p-link" href={data.youtubeChannel} target="_blank" rel="noopener noreferrer">YouTube channel ↗</a>}</div>{library?<ExerciseLibrary exercises={data.exercises.filter(e=>e.active)}/>:<HomeworkGrid assignments={homework} exercises={data.exercises} logs={data.logs} onDone={(homework_id,done)=>{void run({action:'homework-done',homework_id,done});}}/>}</>;
 if(tab==='wearables')return <>{header('A little more context.','Connect the device you already use. You choose what to share with Chris.')}<div className="p-section-head"><h2>Your latest readings</h2>{live.length>0&&<select aria-label="Wearable data source" value={selected?.id||''} onChange={e=>setSource(e.target.value)}>{live.map(c=><option key={c.id} value={c.id}>{c.provider}</option>)}</select>}</div><Metrics metrics={metrics}/>{selected&&<p className="p-muted p-small">Source: {selected.provider}. Last received: {selected.synced_at?dateTime(selected.synced_at):'Waiting for the first sync'}. Values depend on what your device supplies.</p>}<section className="p-panel"><h2>Your connections</h2>
 {!data.wearablesReady&&<div className="p-info">WHOOP and Oura can connect directly once CGP's developer credentials are activated. Garmin requires approval from Garmin's business developer programme. No paid integration service is being used.</div>}
 <label className="p-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to share available sleep, steps, resting heart rate and HRV data with Chris for coaching. This is optional; I can disconnect and delete CGP's stored readings whenever I choose.</span></label>
 <div className="p-device-grid">{data.providers.map(provider=>{
  const c=connections.find(c=>c.provider===provider&&c.status==='connected');
  const enabled=data.providerReady[provider as 'WHOOP'|'OURA'|'GARMIN']===true;
  return <article className="p-device" key={provider}>
   <div className="p-row"><h3>{provider==='OURA'?'Oura Ring':provider}</h3><span className={`p-badge ${c?'completed':''}`}>{c?'Connected':enabled?'Ready to connect':provider==='GARMIN'?'Awaiting Garmin approval':'Developer setup pending'}</span></div>
   <p>{provider==='GARMIN'?'Garmin Health API needs Garmin business approval.':provider==='WHOOP'?'Sleep, recovery-related HRV, resting HR and steps where available.':'Nightly sleep, RMSSD HRV and daily steps where available.'}</p>
   {c?<div className="p-row" style={{flexWrap:'wrap',justifyContent:'flex-start'}}>
    <button className="p-button p-secondary" disabled={Boolean(busy)} onClick={()=>{setBusy(provider);void run({action:'sync',id:c.id},'/api/portal/wearables').finally(()=>setBusy(''));}}>{busy===provider?'Syncing…':'Sync now ↻'}</button>
    <button className="p-link" disabled={Boolean(busy)} onClick={()=>{if(window.confirm('Disconnect '+provider+' and delete the associated CGP readings?'))void run({action:'disconnect',id:c.id},'/api/portal/wearables');}}>Disconnect & delete</button>
   </div>:
   <button className="p-button p-secondary" disabled={!enabled||!consent||Boolean(busy)} onClick={()=>connect(provider)}>{busy===provider?'Connecting…':enabled?'Connect device':'Awaiting setup'} ↗</button>}
  </article>;
 })}</div></section>{metrics.length>0&&<section className="p-panel"><h2>Recent readings</h2><p className="p-muted">Last 30 days. Different devices may report HRV differently; RMSSD and SDNN are shown separately.</p><div className="p-table-wrap"><table><thead><tr><th>Date</th><th>Source</th><th>Steps</th><th>Sleep</th><th>HRV · RMSSD</th><th>HRV · SDNN</th></tr></thead><tbody>{metrics.slice(0,60).map(m=><tr key={`${m.kind}-${m.source_id}`}><td>{m.day}</td><td>{m.kind}</td><td>{m.steps?.toLocaleString()??'—'}</td><td>{m.sleep_seconds===null?'—':`${(m.sleep_seconds/3600).toFixed(1)} h`}</td><td>{m.hrv_rmssd===null?'—':`${m.hrv_rmssd} ms`}</td><td>{m.hrv_sdnn===null?'—':`${m.hrv_sdnn} ms`}</td></tr>)}</tbody></table></div></section>}</>;
 return <>{header(`Hello, ${data.profile.name.split(' ')[0]}.`,'Everything you need for your next step.')}<div className="p-overview-grid"><Balance credits={credits} bookings={bookings}/><section className="p-next-session"><span className="p-kicker">NEXT SESSION</span>{upcoming[0]?<><h2>{dateTime(upcoming[0].starts_at)}</h2><p>{upcoming[0].title}</p><p>{upcoming[0].location}</p><button className="p-link" onClick={()=>navigate('bookings')}>View your bookings ↗</button></>:<><h2>Let’s get your next<br/>session in the diary.</h2><p>No upcoming booking has been added yet.</p><a className="p-link" href="mailto:chrisgkoufas.performance@gmail.com">Contact Chris ↗</a></>}</section></div><div className="p-section-head"><h2>Your homework</h2><button className="p-link" onClick={()=>navigate('homework')}>View all ↗</button></div><HomeworkGrid assignments={homework.filter(h=>h.active).slice(0,2)} exercises={data.exercises} logs={data.logs} onDone={(homework_id,done)=>{void run({action:'homework-done',homework_id,done});}}/><div className="p-section-head"><h2>{selected?`${selected.provider} · Latest readings`:'Your daily picture'}</h2><button className="p-link" onClick={()=>navigate('wearables')}>{selected?'View wearables':'Connect a device'} ↗</button></div><Metrics metrics={metrics}/></>;
}
