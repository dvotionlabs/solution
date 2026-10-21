'use client';

import {useState,type FormEvent} from 'react';
import {type Exercise,type Homework,type HomeworkLog,londonDay,orderHomework} from '@/lib/portal/model';
import {Empty,Modal} from './Shared';
import HomeworkQuickAdd from './HomeworkQuickAdd';

type Changes={title:string;prescription:string;coach_note:string;exercise_id:string};
type Props={
 assignments:Homework[];
 exercises:Exercise[];
 logs:HomeworkLog[];
 onDone?:(id:string,done:boolean)=>void;
 onArchive?:(id:string)=>void;
 onReorder?:(orderedIds:string[])=>Promise<void>;
 onAdd?:(data:Record<string,unknown>)=>Promise<void>;
 onUpdate?:(id:string,changes:Changes)=>Promise<void>;
};

function InlineEditor({
 assignment,exercise,exercises,onSave,onClose
}:{
 assignment:Homework;exercise:Exercise;exercises:Exercise[];
 onSave:(values:Changes)=>Promise<void>;onClose:()=>void;
}){
 const [title,setTitle]=useState(assignment.title_override||exercise.title);
 const [prescription,setPrescription]=useState(assignment.prescription);
 const [coachNote,setCoachNote]=useState(assignment.coach_note);
 const [exerciseId,setExerciseId]=useState(exercise.id);
 const [replacing,setReplacing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const sources=exercises.filter(e=>e.active||e.id===exercise.id)
  .sort((a,b)=>a.title.localeCompare(b.title)||a.category.localeCompare(b.category));
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving)return;
  setSaving(true);setError('');
  try{
   await onSave({title:title.trim(),prescription:prescription.trim(),coach_note:coachNote.trim(),exercise_id:exerciseId});
  }catch(e){setError(e instanceof Error?e.message:'Could not update exercise.');}
  finally{setSaving(false);}
 }
 return <form className="p-hw-inline-edit" onSubmit={submit} aria-label={'Edit homework: '+exercise.title}>
  <div className="p-hw-edit-heading"><strong>Edit assignment</strong>
   <button type="button" className="p-hw-text-link" onClick={onClose} disabled={saving}>Cancel ×</button>
  </div>
  <div className="p-hw-fields">
   <label>Exercise name<input required minLength={2} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Sets / reps / frequency<input required maxLength={500} value={prescription} onChange={e=>setPrescription(e.target.value)}/></label>
   <label className="p-hw-wide">Notes for this athlete<textarea rows={2} maxLength={2000} value={coachNote} onChange={e=>setCoachNote(e.target.value)} placeholder="Add individual cues or instructions"/></label>
  </div>
  <button type="button" className="p-hw-text-link p-hw-change-source" onClick={()=>setReplacing(v=>!v)} disabled={saving}>
   {replacing?'Hide library selection':'Change source exercise from library'} <span aria-hidden="true">{replacing?'⌃':'⌄'}</span>
  </button>
  {replacing&&<label className="p-hw-change-select">Source exercise
   <select value={exerciseId} onChange={e=>{
    const next=sources.find(item=>item.id===e.target.value);
    if(next){setExerciseId(next.id);setTitle(next.title);}
   }}>
    {sources.map(e=><option value={e.id} key={e.id}>{e.title}{e.youtube_id?' · Video':''}</option>)}
   </select>
   <small className="p-muted">Changing source also changes its demonstration and general technique cues, not other clients' homework.</small>
  </label>}
  <div className="p-hw-edit-footer">
   {error&&<span className="p-hw-error" role="alert">{error}</span>}
   <button className="p-button" type="submit" disabled={saving}>{saving?'Saving…':'Save changes'}</button>
  </div>
 </form>;
}

/**
 * A single, readable list on mobile and desktop.
 * Clients only get a completion control and optional details/video.
 * Coaches can create, edit, archive, move by arrows, or drag to reorder.
 */
export default function HomeworkGrid({
 assignments,exercises,logs,onDone,onArchive,onReorder,onAdd,onUpdate
}:Props){
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [adding,setAdding]=useState(false);
 const [overrideIds,setOverrideIds]=useState<string[]|null>(null);
 const [savingOrder,setSavingOrder]=useState(false);
 const [draggingId,setDraggingId]=useState<string|null>(null);
 const [orderError,setOrderError]=useState('');
 const index=new Map(exercises.map(e=>[e.id,e] as const));
 const base=orderHomework(assignments.filter(h=>h.active)).flatMap(assignment=>{
  const exercise=index.get(assignment.exercise_id);
  return exercise?[{assignment,exercise}]:[];
 });
 const baseIds=base.map(x=>x.assignment.id);
 const validOverride=overrideIds&&overrideIds.length===baseIds.length&&
  overrideIds.every(id=>baseIds.includes(id));
 const order=validOverride?overrideIds:baseIds;
 const byId=new Map(base.map(item=>[item.assignment.id,item] as const));
 const items=order.flatMap(id=>{const item=byId.get(id);return item?[item]:[];});
 const doneIds=new Set(logs.filter(l=>l.done_on===londonDay()).map(l=>l.homework_id));
 const completed=items.filter(item=>doneIds.has(item.assignment.id)).length;
 const selected=items.find(item=>item.assignment.id===selectedId);
 const selectedTitle=selected?(selected.assignment.title_override||selected.exercise.title):'';
 async function moveTo(sourceId:string,targetIndex:number){
  if(!onReorder||savingOrder)return;
  const from=order.indexOf(sourceId);
  if(from<0||targetIndex<0||targetIndex>=order.length||from===targetIndex)return;
  const next=[...order],moved=next.splice(from,1)[0];
  next.splice(targetIndex,0,moved);
  setOverrideIds(next);setOrderError('');setSavingOrder(true);
  try{await onReorder(next);}
  catch(e){setOrderError(e instanceof Error?e.message:'Order could not be saved. Please try again.');}
  finally{setOverrideIds(null);setSavingOrder(false);setDraggingId(null);}
 }
 return <>
  <section className="p-hw-list" aria-label="Homework programme">
   <div className="p-hw-list-heading">
    <p role="status"><strong>{items.length}</strong> {items.length===1?'exercise':'exercises'} <span aria-hidden="true">·</span> {completed} done today</p>
    {onAdd&&<button type="button" className="p-hw-add-button" aria-expanded={adding} onClick={()=>{setAdding(v=>!v);setEditingId(null);}}>{adding?'Close ×':'+ Add exercise'}</button>}
   </div>
   {onAdd&&adding&&<HomeworkQuickAdd exercises={exercises} onAdd={onAdd} onClose={()=>setAdding(false)}/>}
   {orderError&&<p className="p-hw-error" role="alert">{orderError}</p>}
   {!items.length?<Empty title="No homework assigned yet">Add an exercise from the library or write one without a video.</Empty>:
   <div className="p-hw-list-rows" role="list">
    {items.map(({assignment,exercise},i)=>{
     const title=assignment.title_override||exercise.title;
     const done=doneIds.has(assignment.id);
     const editing=editingId===assignment.id;
     return <article key={assignment.id} className={'p-hw-line'+(draggingId===assignment.id?' is-dragging':'')} role="listitem"
      onDragOver={onReorder?event=>{
       if(draggingId&&draggingId!==assignment.id&&!savingOrder){
        event.preventDefault();event.dataTransfer.dropEffect='move';
       }
      }:undefined}
      onDrop={onReorder?event=>{
       if(!draggingId||savingOrder)return;
       event.preventDefault();
       const id=event.dataTransfer.getData('text/plain')||draggingId;
       setDraggingId(null);void moveTo(id,i);
      }:undefined}>
      <div className="p-hw-line-main">
       {onDone?<button type="button" className={'p-hw-check'+(done?' is-done':'')}
        aria-label={(done?'Mark not done: ':'Mark done: ')+title} aria-pressed={done}
        onClick={()=>onDone(assignment.id,!done)}>{done?'✓':''}</button>:
        onReorder?<button type="button" className="p-hw-list-grip" draggable={!savingOrder}
         disabled={savingOrder} title={'Drag '+title+' to reorder'} aria-label={'Drag '+title+' to reorder'}
         onDragStart={event=>{
          event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',assignment.id);setDraggingId(assignment.id);
         }} onDragEnd={()=>setDraggingId(null)}>⠿</button>:
        <span className="p-hw-list-index" aria-hidden="true">{i+1}</span>}
       <span className="p-hw-list-index" aria-label={'Exercise '+(i+1)}>{String(i+1).padStart(2,'0')}</span>
       <div className="p-hw-line-copy">
        <button type="button" className="p-hw-line-title" onClick={()=>setSelectedId(assignment.id)}
         title={'View '+title+' instructions'}>{title}</button>
        <span className="p-hw-line-prescription" title={assignment.prescription}>{assignment.prescription}</span>
       </div>
       <div className="p-hw-line-controls">
        {exercise.youtube_id&&<button type="button" className="p-hw-icon-action p-hw-video-action"
         onClick={()=>setSelectedId(assignment.id)} title={'Watch '+title}
         aria-label={'Watch video for '+title}>▶</button>}
        {onDone?null:done?<span className="p-hw-line-done">✓ Done</span>:null}
        {onUpdate&&<button type="button" className={'p-hw-icon-action'+(editing?' is-active':'')}
         onClick={()=>{setEditingId(editing?null:assignment.id);setAdding(false);}}
         title={'Edit '+title} aria-label={'Edit '+title} aria-expanded={editing}>✎</button>}
        {onReorder&&<div className="p-hw-line-order" role="group" aria-label={'Move '+title}>
         <button type="button" className="p-hw-icon-action" disabled={savingOrder||i===0}
          onClick={()=>void moveTo(assignment.id,i-1)} title="Move up" aria-label={'Move '+title+' up'}>↑</button>
         <button type="button" className="p-hw-icon-action" disabled={savingOrder||i===items.length-1}
          onClick={()=>void moveTo(assignment.id,i+1)} title="Move down" aria-label={'Move '+title+' down'}>↓</button>
        </div>}
        {onArchive&&<button type="button" className="p-hw-icon-action p-hw-remove-action"
         title={'Remove '+title} aria-label={'Remove '+title}
         onClick={()=>{if(window.confirm('Remove '+title+' from this programme?'))onArchive(assignment.id);}}>×</button>}
        {!onUpdate&&!onDone&&<button type="button" className="p-hw-line-view"
         onClick={()=>setSelectedId(assignment.id)}>Details ↗</button>}
       </div>
      </div>
      {editing&&onUpdate&&<InlineEditor key={assignment.id} assignment={assignment} exercise={exercise}
       exercises={exercises} onClose={()=>setEditingId(null)}
       onSave={async values=>{await onUpdate(assignment.id,values);setEditingId(null);}}/>}
     </article>;
    })}
   </div>}
  </section>
  {selected&&<Modal title={selectedTitle} onClose={()=>setSelectedId(null)}>
   <div className="p-hw-dialog">
    {selected.exercise.youtube_id&&<div className="p-hw-dialog-video">
     <iframe src={'https://www.youtube-nocookie.com/embed/'+selected.exercise.youtube_id+'?autoplay=1&rel=0'}
      title={'Video demonstration: '+selectedTitle} allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
    </div>}
    <p className="p-hw-dialog-category">{selected.exercise.category}</p>
    <div className="p-hw-dialog-block"><h3>Sets &amp; reps</h3>
     <p className="p-hw-dialog-prescription">{selected.assignment.prescription}</p></div>
    {selected.exercise.cues&&<div className="p-hw-dialog-block"><h3>Technique &amp; coaching cues</h3>
     <p className="p-multiline">{selected.exercise.cues}</p></div>}
    {selected.assignment.coach_note&&<div className="p-hw-dialog-block"><h3>Your coach's note</h3>
     <p className="p-multiline">{selected.assignment.coach_note}</p></div>}
    <div className="p-hw-dialog-footer">
     {selected.exercise.youtube_id&&<a className="p-link"
      href={'https://www.youtube.com/watch?v='+selected.exercise.youtube_id}
      target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>}
     {onDone?<button className={'p-hw-done'+(doneIds.has(selected.assignment.id)?' is-done':'')}
      type="button" aria-pressed={doneIds.has(selected.assignment.id)}
      onClick={()=>onDone(selected.assignment.id,!doneIds.has(selected.assignment.id))}>
      {doneIds.has(selected.assignment.id)?'✓ Done today':'○ Mark done today'}</button>:
      <span className={'p-hw-status'+(doneIds.has(selected.assignment.id)?' is-done':'')}>
       {doneIds.has(selected.assignment.id)?'✓ Done today':''}
      </span>}
    </div>
   </div>
  </Modal>}
 </>;
}
