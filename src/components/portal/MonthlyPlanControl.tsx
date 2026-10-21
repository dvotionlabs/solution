'use client';
import {useEffect,useState} from 'react';
import type {MonthlyPlan} from '@/lib/portal/model';

/** Set the recurring monthly allowance once per athlete; no billing changes. */
export default function MonthlyPlanControl({
 plan,onSave
}:{plan?:MonthlyPlan;onSave:(sessions:4|8|null)=>Promise<void>}){
 const [selection,setSelection]=useState(plan?.sessions_per_month?String(plan.sessions_per_month):'');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{setSelection(plan?.sessions_per_month?String(plan.sessions_per_month):'');},[plan?.sessions_per_month]);
 async function change(value:string){
  if(saving)return;
  const previous=selection;
  setSelection(value);setSaving(true);setError('');
  try{await onSave(value===''?null:value==='8'?8:4);}
  catch(e){setSelection(previous);setError(e instanceof Error?e.message:'Monthly sessions could not be updated.');}
  finally{setSaving(false);}
 }
 return <section className="p-monthly-plan-control">
  <div>
   <h2>Monthly sessions</h2>
   <p>Automatically allocate 4 or 8 sessions from the 1st to the last day of each month. Choose the amount for this client once.</p>
  </div>
  <label>Sessions each month
   <select value={selection} disabled={saving} onChange={e=>void change(e.target.value)}>
    <option value="">Manual only</option>
    <option value="4">4 sessions / month</option>
    <option value="8">8 sessions / month</option>
   </select>
  </label>
  {saving&&<span className="p-muted p-small" role="status">Saving…</span>}
  {error&&<p className="p-error" role="alert">{error}</p>}
  <p className="p-monthly-plan-foot">Allocations do not charge clients. Existing manually added packs are preserved; overlapping packs won't be duplicated.</p>
 </section>;
}
