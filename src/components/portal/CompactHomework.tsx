'use client';

import {useState} from 'react';
import {type Exercise,type Homework,type HomeworkLog,londonDay} from '@/lib/portal/model';
import {Empty,Modal} from './Shared';

type Props={
 assignments:Homework[];
 exercises:Exercise[];
 logs:HomeworkLog[];
 onDone?:(id:string,done:boolean)=>void;
 onArchive?:(id:string)=>void;
};

/**
 * A dense exercise overview. Full coaching cues and videos appear only when
 * someone opens Details/Watch, so the whole programme is easy to scan.
 * Reuses the existing homework action callbacks and never exposes client data.
 */
export default function HomeworkGrid({assignments,exercises,logs,onDone,onArchive}:Props){
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const index=new Map(exercises.map(e=>[e.id,e] as const));
 const items=assignments.filter(h=>h.active).flatMap(assignment=>{
  const exercise=index.get(assignment.exercise_id);
  return exercise?[{assignment,exercise}]:[];
 });
 const today=londonDay();
 const doneIds=new Set(logs.filter(l=>l.done_on===today).map(l=>l.homework_id));
 const completed=items.filter(item=>doneIds.has(item.assignment.id)).length;
 const selected=items.find(item=>item.assignment.id===selectedId);
 if(!items.length)return <Empty title="Your homework, all in one place">Chris will add your exercises, demonstrations and individual instructions here.</Empty>;

 return <>
  <section className="p-hw-compact" aria-label="Assigned exercises">
   <div className="p-hw-summary" role="status">
    <span><strong>{items.length}</strong> {items.length===1?'exercise':'exercises'}</span>
    <span>{completed} completed today</span>
   </div>
   <div className="p-hw-grid" role="list">
    {items.map(({assignment,exercise},i)=>{
     const done=doneIds.has(assignment.id);
     return <article key={assignment.id} role="listitem" className="p-hw-tile">
      <div className="p-hw-top">
       <span className="p-hw-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
       <span className="p-hw-category" title={exercise.category}>{exercise.category}</span>
       {exercise.youtube_id&&<span className="p-hw-video-label" title="Video available" aria-label="Video available">▶</span>}
      </div>
      <h3 className="p-hw-name" title={exercise.title}>{exercise.title}</h3>
      <p className="p-hw-dose" title={assignment.prescription}>{assignment.prescription}</p>
      <div className="p-hw-actions">
       {onDone?<button type="button" className={'p-hw-done'+(done?' is-done':'')}
        aria-pressed={done}
        aria-label={(done?'Mark as not done today: ':'Mark as done today: ')+exercise.title}
        onClick={()=>onDone(assignment.id,!done)}>{done?'✓ Done':'○ Mark done'}</button>:
        <span className={'p-hw-status'+(done?' is-done':'')}>{done?'✓ Done today':'Not done'}</span>}
       <div className="p-hw-actions-right">
        {onArchive&&<button className="p-hw-remove" type="button"
         aria-label={'Remove '+exercise.title+' from current homework'}
         title="Remove from homework"
         onClick={()=>{
          if(window.confirm('Remove '+exercise.title+' from current homework?'))onArchive(assignment.id);
         }}>×</button>}
        <button className="p-hw-open" type="button" onClick={()=>setSelectedId(assignment.id)}
         aria-label={(exercise.youtube_id?'Watch video and view instructions for ':'View full instructions for ')+exercise.title}>
         {exercise.youtube_id?'Watch':'Details'} <span aria-hidden="true">↗</span>
        </button>
       </div>
      </div>
     </article>;
    })}
   </div>
  </section>
  {selected&&<Modal title={selected.exercise.title} onClose={()=>setSelectedId(null)}>
   <div className="p-hw-dialog">
    {selected.exercise.youtube_id&&<div className="p-hw-dialog-video">
     <iframe src={'https://www.youtube-nocookie.com/embed/'+selected.exercise.youtube_id+'?autoplay=1&rel=0'}
      title={'Video demonstration: '+selected.exercise.title}
      allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"/>
    </div>}
    <p className="p-hw-dialog-category">{selected.exercise.category}</p>
    <div className="p-hw-dialog-block">
     <h3>Sets &amp; reps</h3>
     <p className="p-hw-dialog-prescription">{selected.assignment.prescription}</p>
    </div>
    {selected.exercise.cues&&<div className="p-hw-dialog-block">
     <h3>Technique &amp; coaching cues</h3>
     <p className="p-multiline">{selected.exercise.cues}</p>
    </div>}
    {selected.assignment.coach_note&&<div className="p-hw-dialog-block">
     <h3>Your coach's note</h3>
     <p className="p-multiline">{selected.assignment.coach_note}</p>
    </div>}
    <div className="p-hw-dialog-footer">
     {selected.exercise.youtube_id&&<a className="p-link" href={'https://www.youtube.com/watch?v='+selected.exercise.youtube_id}
      target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>}
     {onDone?<button type="button" className={'p-hw-done'+(doneIds.has(selected.assignment.id)?' is-done':'')}
      aria-pressed={doneIds.has(selected.assignment.id)}
      onClick={()=>onDone(selected.assignment.id,!doneIds.has(selected.assignment.id))}>
      {doneIds.has(selected.assignment.id)?'✓ Done today':'○ Mark done today'}
     </button>:<span className={'p-hw-status'+(doneIds.has(selected.assignment.id)?' is-done':'')}>
      {doneIds.has(selected.assignment.id)?'✓ Done today':'Not logged today'}
     </span>}
    </div>
   </div>
  </Modal>}
 </>;
}
