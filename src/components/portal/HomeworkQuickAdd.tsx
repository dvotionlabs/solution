'use client';

import {useRef,useState,type FormEvent} from 'react';
import type {Exercise} from '@/lib/portal/model';
import HomeworkExercisePicker from './HomeworkExercisePicker';

export default function HomeworkQuickAdd({
 exercises,onAdd,onClose
}:{exercises:Exercise[];onAdd:(body:Record<string,unknown>)=>Promise<void>;onClose:()=>void}){
 const [mode,setMode]=useState<'library'|'new'>('library');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [added,setAdded]=useState(0);
 const form=useRef<HTMLFormElement>(null);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving)return;
  setSaving(true);setError('');
  const values=Object.fromEntries(new FormData(event.currentTarget));
  const body:Record<string,unknown>={...values,action:mode==='new'?'homework-custom':'homework'};
  try{
   await onAdd(body);
   setAdded(n=>n+1);
   form.current?.reset();
   // Leave the panel open: adding the next exercise should be one quick action.
  }catch(e){
   setError(e instanceof Error?e.message:'Could not add exercise.');
  }finally{setSaving(false);}
 }

 return <form ref={form} className="p-hw-add-form" onSubmit={submit}>
  <div className="p-hw-form-heading">
   <strong>Add exercise</strong>
   <button type="button" className="p-hw-text-link" onClick={onClose} disabled={saving}>Close ×</button>
  </div>
  <div className="p-hw-type-switch" role="group" aria-label="Add exercise type">
   <button type="button" aria-pressed={mode==='library'} onClick={()=>{setMode('library');setError('');}} disabled={saving}>From library</button>
   <button type="button" aria-pressed={mode==='new'} onClick={()=>{setMode('new');setError('');}} disabled={saving}>Write new · No video</button>
  </div>
  {mode==='library'
   ?<HomeworkExercisePicker key={'picker-'+added} exercises={exercises}/>
   :<div className="p-hw-fields">
     <label>Exercise name <input name="new_title" placeholder="e.g. Single-leg calf raise" minLength={2} maxLength={120} required/></label>
     <label>Category <input name="new_category" defaultValue="Movement" maxLength={60} required/></label>
     <label className="p-hw-wide">Technique cues (optional)
      <textarea name="new_cues" rows={2} maxLength={4000} placeholder="What should the athlete focus on?"/>
     </label>
    </div>}
  <div className="p-hw-fields">
   <label>Sets / reps / frequency
    <input name="prescription" maxLength={500} placeholder="3 × 8 each side" required/>
   </label>
   <label>Individual notes (optional)
    <input name="coach_note" maxLength={2000} placeholder="e.g. Maintain heel contact"/>
   </label>
  </div>
  <div className="p-hw-form-footer">
   {added>0&&<span className="p-hw-added" role="status">✓ Added {added}. Ready for another.</span>}
   {error&&<span role="alert" className="p-hw-error">{error}</span>}
   <button type="submit" className="p-button" disabled={saving}>{saving?'Adding…':'+ Add to programme'}</button>
  </div>
 </form>;
}
