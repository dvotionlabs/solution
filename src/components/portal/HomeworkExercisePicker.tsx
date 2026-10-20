'use client';
import {useMemo,useState} from 'react';
import {searchExerciseChoices,type Exercise} from '@/lib/portal/model';

const VISIBLE_RESULTS=12;

/**
 * An accessible text search AND the original full dropdown, both choosing
 * the same exercise_id for the existing homework action.
 */
export default function HomeworkExercisePicker({exercises}:{exercises:Exercise[]}){
 const [query,setQuery]=useState('');
 const [selectedId,setSelectedId]=useState('');
 const all=useMemo(()=>exercises.filter(e=>e.active).sort((a,b)=>a.title.localeCompare(b.title)||a.category.localeCompare(b.category)),[exercises]);
 const matches=useMemo(()=>searchExerciseChoices(all,query),[all,query]);
 const selected=all.find(e=>e.id===selectedId);
 function updateQuery(value:string){
  setQuery(value);
  // Never submit a stale selection after searching for a different exercise.
  setSelectedId('');
 }
 function choose(id:string){
  setSelectedId(id);
  setQuery('');
 }
 return <div className="p-homework-exercise-picker">
  <label>Search exercise library
   <input type="search" value={query} onChange={e=>updateQuery(e.target.value)}
    placeholder="Type an exercise name, e.g. squat or calf…" autoComplete="off"
    aria-describedby="p-homework-search-help"/>
  </label>
  <p className="p-muted p-small" id="p-homework-search-help">Search by name or category, or browse the complete dropdown below.</p>
  {query.trim()&&<div className="p-homework-search-results" role="group" aria-label="Matching exercises">
   {matches.length?<>{matches.slice(0,VISIBLE_RESULTS).map(e=>
    <button type="button" key={e.id} className="p-homework-search-result" onClick={()=>choose(e.id)}>
     <span>{e.title}</span><small>{e.category}{e.youtube_id?' · Video':''}</small>
    </button>)}
    {matches.length>VISIBLE_RESULTS&&<p className="p-muted p-small">Showing {VISIBLE_RESULTS} of {matches.length} matches. Type more to narrow the search.</p>}
   </>:<p className="p-muted p-small">No matching exercises. Try a different name or browse the list.</p>}
  </div>}
  <label>Or choose from all exercises
   <select name="exercise_id" required value={selectedId} onChange={e=>choose(e.target.value)}>
    <option value="" disabled>Select an exercise…</option>
    {all.map(e=><option key={e.id} value={e.id}>{e.title} · {e.category}{e.youtube_id?'':' · No video'}</option>)}
   </select>
  </label>
  {selected&&<p className="p-homework-exercise-selected" role="status">Selected: <strong>{selected.title}</strong> <span>({selected.category})</span></p>}
 </div>;
}
