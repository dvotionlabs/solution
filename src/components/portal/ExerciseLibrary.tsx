'use client';
import {useState} from 'react';
import type {Exercise} from '@/lib/portal/model';
import {Empty,Modal} from './Shared';

const PAGE_SIZE=24;

export default function ExerciseLibrary({exercises,onEdit}:{exercises:Exercise[];onEdit?:(exercise:Exercise)=>void}){
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('');
 const [shown,setShown]=useState(PAGE_SIZE);
 const [selected,setSelected]=useState<Exercise|null>(null);
 const categories=[...new Set(exercises.map(e=>e.category))].sort((a,b)=>a.localeCompare(b));
 const filtered=exercises.filter(e=>
  (!category||e.category===category)&&
  (!search||`${e.title} ${e.category}`.toLowerCase().includes(search.trim().toLowerCase()))
 );
 function searchChanged(value:string){setSearch(value);setShown(PAGE_SIZE);}
 function categoryChanged(value:string){setCategory(value);setShown(PAGE_SIZE);}
 return <>
  <div className="p-section-head" style={{flexWrap:'wrap',alignItems:'stretch'}}>
   <label className="p-search" style={{flex:'1 1 260px',margin:0}}>
    <span className="p-sr-only">Search exercises</span>
    <input placeholder="Search exercise name or category…" value={search} onChange={e=>searchChanged(e.target.value)}/>
   </label>
   <select aria-label="Filter exercise category" value={category} onChange={e=>categoryChanged(e.target.value)}>
    <option value="">All categories</option>
    {categories.map(c=><option key={c} value={c}>{c}</option>)}
   </select>
  </div>
  <p className="p-muted p-small" role="status">Showing {Math.min(shown,filtered.length)} of {filtered.length} matching exercises · {exercises.length} in library</p>
  {filtered.length?
   <div className="p-library-grid">{filtered.slice(0,shown).map(exercise=>
    <article className="p-library-tile" key={exercise.id}>
     <button type="button" className="p-library-tile-open" onClick={()=>setSelected(exercise)} aria-label={`Watch ${exercise.title}`}>
      <span className="p-library-play-icon" aria-hidden="true">▶</span>
      <span className="p-library-name">{exercise.title}</span>
     </button>
     {onEdit&&<button type="button" className="p-library-edit" onClick={()=>onEdit(exercise)} aria-label={`Edit ${exercise.title}`} title="Edit exercise">✎</button>}
    </article>
   )}</div>:
   <Empty title={exercises.length?'No matching exercises':'The exercise library is on its way'}>{exercises.length?'Try another exercise name or category.':'Exercise demonstrations will appear here when your coach adds them.'}</Empty>
  }
  {filtered.length>shown&&<div className="p-section-head" style={{justifyContent:'center'}}>
   <button className="p-button p-secondary" onClick={()=>setShown(n=>n+PAGE_SIZE)}>Show {Math.min(PAGE_SIZE,filtered.length-shown)} more exercises ↓</button>
  </div>}
  {selected&&<Modal title={selected.title} onClose={()=>setSelected(null)}>
   <div className="p-library-player">
    <iframe src={`https://www.youtube-nocookie.com/embed/${selected.youtube_id}?autoplay=1&rel=0`} title={`Demonstration: ${selected.title}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
   </div>
   <p className="p-library-detail-category">{selected.category}</p>
   {selected.cues&&<p className="p-multiline p-library-detail-cues">{selected.cues}</p>}
   <div className="p-library-detail-actions">
    <a className="p-link" href={`https://www.youtube.com/watch?v=${selected.youtube_id}`} target="_blank" rel="noopener noreferrer">Open in YouTube ↗</a>
    {onEdit&&<button className="p-button p-secondary" onClick={()=>{const exercise=selected;setSelected(null);onEdit(exercise);}}>Edit exercise ↗</button>}
   </div>
  </Modal>}
 </>;
}
