'use client';

import {useState,type FormEvent} from 'react';
import {type Exercise,type Homework,type HomeworkLog,londonDay,orderHomework} from '@/lib/portal/model';
import {Modal} from './Shared';
import HomeworkExercisePicker from './HomeworkExercisePicker';

type EditFields={display_title:string;prescription:string;coach_note:string};
type Props={
 assignments:Homework[];
 exercises:Exercise[];
 logs:HomeworkLog[];
 onDone?:(id:string,done:boolean)=>void;
 onArchive?:(id:string)=>void;
 onReorder?:(orderedIds:string[])=>Promise<void>;
 onEdit?:(id:string,fields:EditFields)=>Promise<void>;
 onAdd?:(fields:Record<string,unknown>)=>Promise<void>;
};

export default function HomeworkGrid({assignments,exercises,logs,onDone,onArchive,onReorder,onEdit,onAdd}:Props){
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [adding,setAdding]=useState(false);
 const [addMode,setAddMode]=useState<'library'|'written'>('library');
 const [addVersion,setAddVersion]=useState(0);
 const [overrideIds,setOverrideIds]=useState<string[]|null>(null);
 const [savingOrder,setSavingOrder]=useState(false);
 const [savingEdit,setSavingEdit]=useState(false);
 const [savingAdd,setSavingAdd]=useState(false);
 const [draggingId,setDraggingId]=useState<string|null>(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const index=new Map(exercises.map(e=>[e.id,e] as const));
 const base=orderHomework(assignments.filter(h=>h.active)).flatMap(assignment=>{
  const exercise=index.get(assignment.exercise_id);
  return exercise?[{assignment,exercise}]:[];
 });
 const baseIds=base.map(({assignment})=>assignment.id);
 const validOverride=overrideIds&&overrideIds.length===baseIds.length&&
  overrideIds.every(id=>baseIds.includes(id));
 const order=validOverride?overrideIds:baseIds;
 const byId=new Map(base.map(item=>[item.assignment.id,item] as const));
 const items=order.flatMap(id=>{
  const item=byId.get(id);
  return item?[item]:[];
 });
 const today=londonDay();
 const doneIds=new Set(logs.filter(l=>l.done_on===today).map(l=>l.homework_id));
 const completed=items.filter(item=>doneIds.has(item.assignment.id)).length;
 const selected=items.find(item=>item.assignment.id===selectedId);
 const editable=Boolean(onAdd||onEdit||onReorder);
 const editing=items.find(item=>item.assignment.id===editingId);

 async function moveTo(sourceId:string,targetIndex:number){
  if(!onReorder||savingOrder||savingEdit||savingAdd)return;
  const from=order.indexOf(sourceId);
  if(from<0||targetIndex<0||targetIndex>=order.length||from===targetIndex)return;
  const next=[...order];
  const [moved]=next.splice(from,1);
  next.splice(targetIndex,0,moved);
  setOverrideIds(next);setError('');setNotice('');setSavingOrder(true);
  try{
   await onReorder(next);
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Could not save the new exercise order.');
  }finally{
   setOverrideIds(null);
   setSavingOrder(false);
   setDraggingId(null);
  }
 }

 async function saveEdit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!onEdit||!editing||savingEdit)return;
  const fields=new FormData(event.currentTarget);
  const title=String(fields.get('display_name')||'').trim();
  const prescription=String(fields.get('prescription')||'').trim();
  const coach_note=String(fields.get('coach_note')||'').trim();
  if(title.length<2||title.length>120||!prescription||prescription.length>500||coach_note.length>2000){
   setError('Check the exercise name, sets/reps and coaching note.');
   return;
  }
  setSavingEdit(true);setError('');
  try{
   await onEdit(editing.assignment.id,{
    display_title:title===editing.exercise.title?'':title,
    prescription,
    coach_note
   });
   setEditingId(null);setNotice('Changes saved.');
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not update this homework.');}
  finally{setSavingEdit(false);}
 }

 async function addHomework(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!onAdd||savingAdd)return;
  const body=Object.fromEntries(new FormData(event.currentTarget));
  setSavingAdd(true);setError('');setNotice('');
  try{
   await onAdd({...body,action:addMode==='written'?'homework-custom':'homework'});
   setAddVersion(n=>n+1); // Clear the selected exercise and inputs for the next addition.
   setNotice('Added to homework. Add another, or press Done.');
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not add this exercise.');}
  finally{setSavingAdd(false);}
 }

 return <section className={'p-homework-list'+(editable?' is-coach':'')} aria-label="Homework programme">
  <div className="p-hl-toolbar">
   <span className="p-hl-count"><strong>{items.length}</strong> {items.length===1?'exercise':'exercises'}{onDone&&<span className="p-hl-completed"> · {completed} done today</span>}</span>
   {onAdd&&<button type="button" className="p-hl-add-button"
    aria-expanded={adding} onClick={()=>{setAdding(v=>!v);setError('');setNotice('');}}>
    {adding?'Close':'＋ Add exercise'}
   </button>}
  </div>
  {adding&&onAdd&&<form key={addVersion} className="p-hl-add-form" onSubmit={addHomework}>
   <div className="p-hl-form-heading"><strong>Add to programme</strong><span>No video required</span></div>
   <div className="p-hl-form-tabs" role="group" aria-label="Choose an exercise source">
    <button type="button" aria-pressed={addMode==='library'} onClick={()=>{setAddMode('library');setAddVersion(n=>n+1);}}>From library</button>
    <button type="button" aria-pressed={addMode==='written'} onClick={()=>{setAddMode('written');setAddVersion(n=>n+1);}}>New exercise</button>
   </div>
   {addMode==='library'?<HomeworkExercisePicker exercises={exercises}/>:
    <div className="p-hl-new-fields">
     <label>Exercise name<input name="new_title" required minLength={2} maxLength={120} placeholder="e.g. Single-leg calf raise"/></label>
     <label>Category<input name="new_category" required maxLength={60} defaultValue="Movement"/></label>
     <label>Technique cues <span>(optional)</span><textarea name="new_cues" maxLength={4000} rows={2} placeholder="How to perform the movement…"/></label>
    </div>}
   <div className="p-hl-add-fields">
    <label>Sets, reps and frequency<input name="prescription" required maxLength={500} placeholder="e.g. 3 × 10 · 3 times per week"/></label>
    <label>Individual note <span>(optional)</span><input name="coach_note" maxLength={2000} placeholder="Optional coaching instruction"/></label>
   </div>
   <div className="p-hl-form-actions">
    <button type="submit" className="p-button" disabled={savingAdd}>{savingAdd?'Adding…':'Add exercise ＋'}</button>
    <button type="button" className="p-hl-cancel" onClick={()=>setAdding(false)} disabled={savingAdd}>Done</button>
   </div>
  </form>}
  {notice&&<p className="p-hl-notice" role="status">{notice}</p>}
  {error&&<p className="p-error p-hl-error" role="alert">{error}</p>}
  {onReorder&&items.length>1&&<p className="p-hl-hint">Use ↑ ↓ to change the order. Drag the handle on desktop.</p>}
  {items.length?<div className="p-hl-rows" role="list">
   {items.map(({assignment,exercise},i)=>{
    const display=assignment.display_title||exercise.title;
    const done=doneIds.has(assignment.id);
    const openEdit=editingId===assignment.id;
    return <article key={assignment.id} className={'p-hl-item'+(draggingId===assignment.id?' is-dragging':'')} role="listitem"
     onDragOver={onReorder?event=>{
      if(draggingId&&draggingId!==assignment.id&&!savingOrder){
       event.preventDefault();event.dataTransfer.dropEffect='move';
      }
     }:undefined}
     onDrop={onReorder?event=>{
      if(!draggingId||savingOrder)return;
      event.preventDefault();
      const source=event.dataTransfer.getData('text/plain')||draggingId;
      setDraggingId(null);
      void moveTo(source,i);
     }:undefined}>
     <div className="p-hl-row">
      <div className="p-hl-leading">
       {onReorder&&<button type="button" className="p-hl-grip" draggable={!savingOrder&&!savingEdit&&!savingAdd}
        title={'Drag '+display+' to reorder'} aria-label={'Drag '+display+' to reorder'}
        onDragStart={event=>{
         event.dataTransfer.effectAllowed='move';
         event.dataTransfer.setData('text/plain',assignment.id);
         setDraggingId(assignment.id);
        }} onDragEnd={()=>setDraggingId(null)}>⠿</button>}
       <span className="p-hl-number">{String(i+1).padStart(2,'0')}</span>
      </div>
      <div className="p-hl-identity">
       <button type="button" className="p-hl-name" onClick={()=>setSelectedId(assignment.id)} title="View exercise details">{display}</button>
       <span className="p-hl-category">{exercise.category}{exercise.youtube_id?' · Video':''}</span>
      </div>
      <div className="p-hl-prescription" title={assignment.prescription}>{assignment.prescription}</div>
      <div className="p-hl-row-actions">
       {onReorder&&<div className="p-hl-move-actions" aria-label={'Reorder '+display}>
        <button type="button" title="Move up" aria-label={'Move '+display+' up'}
         disabled={savingOrder||savingEdit||savingAdd||i===0}
         onClick={()=>void moveTo(assignment.id,i-1)}>↑</button>
        <button type="button" title="Move down" aria-label={'Move '+display+' down'}
         disabled={savingOrder||savingEdit||savingAdd||i===items.length-1}
         onClick={()=>void moveTo(assignment.id,i+1)}>↓</button>
       </div>}
       {onEdit&&<button type="button" className={'p-hl-edit-button'+(openEdit?' is-active':'')}
        title={'Edit '+display} aria-label={'Edit '+display} aria-expanded={openEdit}
        disabled={savingOrder||savingEdit||savingAdd}
        onClick={()=>{setEditingId(openEdit?null:assignment.id);setError('');setNotice('');}}>Edit</button>}
       {onDone?<button type="button" className={'p-hl-done'+(done?' is-done':'')}
        aria-pressed={done} aria-label={(done?'Mark as not done today: ':'Mark as done today: ')+display}
        onClick={()=>onDone(assignment.id,!done)}>{done?'✓':'○'}<span>{done?'Done':'Mark done'}</span></button>
        :done&&<span className="p-hl-done-label" title="Completed today">✓</span>}
       <button type="button" className="p-hl-details" title={'View '+display}
        aria-label={'View video and instructions for '+display}
        onClick={()=>setSelectedId(assignment.id)}>{exercise.youtube_id?'▶':'›'}</button>
      </div>
     </div>
     {openEdit&&onEdit&&<form className="p-hl-edit-form" onSubmit={saveEdit}>
      <div className="p-hl-edit-fields">
       <label>Exercise name<input name="display_name" required minLength={2} maxLength={120}
        defaultValue={display} autoFocus/></label>
       <label>Sets / reps / frequency<input name="prescription" required maxLength={500}
        defaultValue={assignment.prescription}/></label>
       <label className="p-hl-edit-notes">Coaching instructions <span>(for this athlete only)</span>
        <textarea name="coach_note" maxLength={2000} rows={2} defaultValue={assignment.coach_note}/></label>
      </div>
      <div className="p-hl-edit-actions">
       <button type="submit" className="p-button" disabled={savingEdit||savingOrder}>
        {savingEdit?'Saving…':'Save changes'}</button>
       <button type="button" className="p-hl-cancel" disabled={savingEdit}
        onClick={()=>setEditingId(null)}>Cancel</button>
       {onReorder&&items.length>1&&<label className="p-hl-position">Position
        <select aria-label={'Move '+display+' to position'} value={i+1}
         disabled={savingOrder||savingEdit}
         onChange={event=>void moveTo(assignment.id,Number(event.target.value)-1)}>
         {items.map((_,n)=><option key={n} value={n+1}>{n+1}</option>)}
        </select>
       </label>}
       {onArchive&&<button type="button" className="p-hl-delete" disabled={savingEdit||savingOrder}
        onClick={()=>{
         if(window.confirm('Remove '+display+' from this athlete’s current homework?')){
          setEditingId(null);onArchive(assignment.id);
         }
        }}>Remove</button>}
      </div>
      <p className="p-hl-edit-foot">Changes to the name and instructions apply only to this athlete, not the shared exercise library.</p>
     </form>}
    </article>;
   })}
  </div>:!adding&&<p className="p-hl-empty">No exercises assigned yet.{onAdd?' Add the first exercise above.':''}</p>}
  {selected&&<Modal title={selected.assignment.display_title||selected.exercise.title} onClose={()=>setSelectedId(null)}>
   <div className="p-hw-dialog">
    {selected.exercise.youtube_id&&<div className="p-hw-dialog-video">
     <iframe src={'https://www.youtube-nocookie.com/embed/'+selected.exercise.youtube_id+'?autoplay=1&rel=0'}
      title={'Video demonstration: '+(selected.assignment.display_title||selected.exercise.title)}
      allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"/>
    </div>}
    <p className="p-hw-dialog-category">{selected.exercise.category}</p>
    <div className="p-hw-dialog-block">
     <h3>Sets &amp; reps</h3><p className="p-hw-dialog-prescription">{selected.assignment.prescription}</p>
    </div>
    {selected.exercise.cues&&<div className="p-hw-dialog-block">
     <h3>Technique &amp; coaching cues</h3><p className="p-multiline">{selected.exercise.cues}</p>
    </div>}
    {selected.assignment.coach_note&&<div className="p-hw-dialog-block">
     <h3>Your coach's note</h3><p className="p-multiline">{selected.assignment.coach_note}</p>
    </div>}
    <div className="p-hw-dialog-footer">
     {selected.exercise.youtube_id&&<a className="p-link" href={'https://www.youtube.com/watch?v='+selected.exercise.youtube_id}
      target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>}
     {onDone&&<button type="button" className={'p-hl-done'+(doneIds.has(selected.assignment.id)?' is-done':'')}
      aria-pressed={doneIds.has(selected.assignment.id)}
      onClick={()=>onDone(selected.assignment.id,!doneIds.has(selected.assignment.id))}>
      {doneIds.has(selected.assignment.id)?'✓ Done today':'○ Mark done today'}
     </button>}
    </div>
   </div>
  </Modal>}
 </section>;
}
