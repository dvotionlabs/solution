'use client';
import {useState} from 'react';
import type {Exercise} from '@/lib/portal/model';
import {Empty,ExerciseCard} from './Shared';

const PAGE_SIZE=24;

export default function ExerciseLibrary({exercises,onEdit}:{exercises:Exercise[];onEdit?:(exercise:Exercise)=>void}){
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('');
 const [shown,setShown]=useState(PAGE_SIZE);
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
   <div className="p-exercise-grid">{filtered.slice(0,shown).map(exercise=>
    <ExerciseCard key={exercise.id} exercise={exercise} adminAction={onEdit&&<button className="p-link p-archive" onClick={()=>onEdit(exercise)}>Edit exercise ↗</button>}/>
   )}</div>:
   <Empty title={exercises.length?'No matching exercises':'The exercise library is on its way'}>{exercises.length?'Try another exercise name or category.':'Exercise demonstrations will appear here when your coach adds them.'}</Empty>
  }
  {filtered.length>shown&&<div className="p-section-head" style={{justifyContent:'center'}}>
   <button className="p-button p-secondary" onClick={()=>setShown(n=>n+PAGE_SIZE)}>Show {Math.min(PAGE_SIZE,filtered.length-shown)} more exercises ↓</button>
  </div>}
 </>;
}
