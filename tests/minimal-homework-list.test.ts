import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderHomework,type Homework} from '../src/lib/portal/model.ts';

const text=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Homework is one vertical list, never large multi-column video cards',()=>{
 const view=text('src/components/portal/CompactHomework.tsx');
 const css=text('src/app/portal/portal.css');
 assert.ok(view.includes('className="p-hw-list-rows" role="list"'));
 assert.ok(view.includes('className="p-hw-line-main"'));
 assert.ok(!view.includes('p-hw-grid'));
 assert.ok(css.includes('.p-hw-list-rows{border-top'));
 assert.ok(css.includes('.p-hw-line-main{display:flex'));
 assert.ok(!css.includes('.p-hw-grid{display:grid;grid-template-columns'));
});

test('Athletes retain mark-done, private notes and optional video details',()=>{
 const view=text('src/components/portal/CompactHomework.tsx');
 const athlete=text('src/components/portal/Athlete.tsx');
 assert.ok(view.includes('onDone(assignment.id,!done)'));
 assert.ok(view.includes('aria-pressed={done}'));
 assert.ok(view.includes('selected.assignment.coach_note'));
 assert.ok(view.includes('selected.exercise.cues'));
 assert.ok(view.includes('selected.exercise.youtube_id&&<div className="p-hw-dialog-video"'));
 assert.ok(view.includes('assignment.title_override||exercise.title'));
 assert.ok(athlete.includes("import HomeworkGrid from './CompactHomework'"));
 assert.ok(!athlete.includes('onUpdate='));
 assert.ok(!athlete.includes('onAdd='));
});

test('Coach can add from library or write without video, then keep adding',()=>{
 const add=text('src/components/portal/HomeworkQuickAdd.tsx');
 const admin=text('src/components/portal/Admin.tsx');
 assert.ok(add.includes('HomeworkExercisePicker'));
 assert.ok(add.includes("mode==='new'?'homework-custom':'homework'"));
 assert.ok(add.includes('form.current?.reset()'));
 assert.ok(add.includes('setAdded(n=>n+1)'));
 assert.ok(admin.includes('onAdd={async body=>{await action({...body,client_id:client.id});}}'));
 assert.ok(admin.includes('onUpdate={async(id,values)=>{await action({...values,action:'));
});

test('Coach inline-edit is per-assignment and can rename, change sets/reps, notes, or source',()=>{
 const view=text('src/components/portal/CompactHomework.tsx');
 const api=text('src/app/api/portal/route.ts');
 const migration=text('db/cgp-homework-inline-edit.sql');
 assert.ok(view.includes('className="p-hw-inline-edit"'));
 assert.ok(view.includes('setPrescription(e.target.value)'));
 assert.ok(view.includes('setCoachNote(e.target.value)'));
 assert.ok(view.includes('setTitle(e.target.value)'));
 assert.ok(view.includes('setExerciseId(next.id)'));
 assert.ok(api.includes("if(b.action==='homework-edit')"));
 assert.ok(api.includes(".eq('client_id',clientId).eq('active',true)"));
 assert.ok(api.includes('title_override:title===source.data.title?null:title'));
 assert.ok(migration.includes('add column if not exists title_override text'));
});

test('Reordering and archive remain coach-only; persisted order is shared with athlete view',()=>{
 const view=text('src/components/portal/CompactHomework.tsx');
 const api=text('src/app/api/portal/route.ts');
 assert.ok(view.includes('void moveTo(assignment.id,i-1)'));
 assert.ok(view.includes('void moveTo(assignment.id,i+1)'));
 assert.ok(view.includes("draggable={!savingOrder}"));
 assert.ok(view.includes('onArchive(assignment.id)'));
 assert.ok(api.includes('cgp_homework_reorder'));
 const entries=[
  {id:'later',sort_order:1,created_at:'2026-10-21T10:00:00Z'},
  {id:'first',sort_order:0,created_at:'2026-10-20T10:00:00Z'}
 ] as Pick<Homework,'id'|'sort_order'|'created_at'>[];
 assert.deepEqual(orderHomework(entries).map(e=>e.id),['first','later']);
});
