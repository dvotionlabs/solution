export type Profile={id:string;user_id:string|null;email:string;name:string;role:'athlete'|'admin';active:boolean;created_at:string};
export type Credit={id:string;client_id:string;label:string;quantity:number;starts_on:string;expires_on:string|null;source_reference:string|null};
export type Booking={id:string;client_id:string;credit_id:string|null;title:string;starts_at:string;ends_at:string;location:string;status:'scheduled'|'completed'|'cancelled'|'no_show';notes:string};
export type Exercise={id:string;title:string;category:string;youtube_id:string;cues:string;active:boolean};
export type Homework={id:string;client_id:string;exercise_id:string;prescription:string;coach_note:string;active:boolean};
export type HomeworkLog={id:string;homework_id:string;client_id:string;done_on:string};
export type Connection={id:string;client_id:string;provider:string;status:'pending'|'connected'|'revoked'|'error';synced_at:string|null;consent_at:string};
export type Metric={connection_id:string;day:string;kind:'daily'|'sleep';source_id:string;steps:number|null;sleep_seconds:number|null;hrv_rmssd:number|null;hrv_sdnn:number|null;resting_hr:number|null;measured_at:string;received_at:string};
export type PortalData={asOf:string;profile:Profile;clients:Profile[];credits:Credit[];bookings:Booking[];exercises:Exercise[];homework:Homework[];logs:HomeworkLog[];connections:Connection[];metrics:Metric[];youtubeChannel:string;wearablesReady:boolean;providers:string[]};
export const providers=['GARMIN','WHOOP','OURA','FITBIT','POLAR','SUUNTO','WITHINGS'];
export function londonDay(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function sessionBalance(credits:Credit[],bookings:Booking[],today=londonDay()){
 const active=credits.filter(c=>c.starts_on<=today&&(!c.expires_on||c.expires_on>=today));
 const ids=new Set(active.map(c=>c.id));const relevant=bookings.filter(b=>b.credit_id&&ids.has(b.credit_id));
 const total=active.reduce((sum,c)=>sum+c.quantity,0);
 const used=relevant.filter(b=>b.status==='completed'||b.status==='no_show').length;
 const booked=relevant.filter(b=>b.status==='scheduled').length;
 return {total,used,booked,remaining:Math.max(0,total-used),available:Math.max(0,total-used-booked)};
}
export function youtubeId(value:unknown){
 if(typeof value!=='string')return null;
 const text=value.trim();if(/^[\w-]{11}$/.test(text))return text;
 try{const u=new URL(text);if(u.protocol!=='https:')return null;
 const host=u.hostname.toLowerCase();let id:string|null=null;
 if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];
 if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})(?:\/|$)/)?.[1]||null;
 return id&&/^[\w-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function youtubeChannel(value:unknown){if(typeof value!=='string')return null;if(value.trim()==='')return '';try{const u=new URL(value);return u.protocol==='https:'&&['youtube.com','www.youtube.com'].includes(u.hostname)&&/^\/(?:@[^/?#]+|channel\/[\w-]+|c\/[^/?#]+|user\/[^/?#]+)\/?$/.test(u.pathname)?u.origin+u.pathname:null;}catch{return null;}}
export function uuid(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
export function textValue(value:unknown,min=0,max=2000){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new Error('Please check the length of the fields.');return value.trim();}
export function dateValue(value:unknown){const s=textValue(value,10,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw new Error('Choose a valid date.');return s;}
export function idValue(value:unknown){if(!uuid(value))throw new Error('Choose a valid record.');return value;}
export function timestamp(value:unknown){const s=textValue(value,20,35);if(!/T.*(Z|[+-]\d{2}:\d{2})$/.test(s)||Number.isNaN(Date.parse(s)))throw new Error('Choose a valid date and time.');return new Date(s).toISOString();}
export function londonInput(iso:string){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function londonToIso(value:string){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Choose a valid London date and time.');const nominal=Date.parse(value+'Z');let time=nominal;for(let i=0;i<3;i++){const local=Date.parse(londonInput(new Date(time).toISOString())+'Z');time+=nominal-local;}const result=new Date(time).toISOString();if(londonInput(result)!==value)throw new Error('This time does not exist because the clocks change. Choose another time.');return result;}
