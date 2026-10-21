import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('One compact admin list lets coach add from library or add without video',()=>{
 const ui=read('src/components/portal/CompactHomework.tsx');
 const admin=read('src/components/portal/Admin.tsx');
 assert.ok(ui.includes('＋ Add exercise'));
 assert.ok(ui.includes("addMode==='library'?<HomeworkExercisePicker exercises={exercises}/>"));
 assert.ok(ui.includes('New exercise'));
 assert.ok(ui.includes('name="new_title"'));
 assert.ok(ui.includes("action:addMode==='written'?'homework-custom':'homework'"));
 assert.ok(ui.includes('setAddVersion(n=>n+1)'));
 assert.ok(admin.includes("onAdd={async fields=>{await action({...fields,client_id:client.id});}}"));
});
test('Inline edit saves client-only name overrides, prescription and coaching note',()=>{
 const ui=read('src/components/portal/CompactHomework.tsx');
 const admin=read('src/components/portal/Admin.tsx');
 const api=read('src/app/api/portal/route.ts');
 const migration=read('db/cgp-homework-list-edit.sql');
 assert.ok(ui.includes('setEditingId(openEdit?null:assignment.id)'));
 assert.ok(ui.includes('name="display_name"'));
 assert.ok(ui.includes('name="prescription"'));
 assert.ok(ui.includes('name="coach_note"'));
 assert.ok(ui.includes("display_title:title===editing.exercise.title?'':title"));
 assert.ok(admin.includes("onEdit={async(id,fields)=>{await action({action:'homework-update',client_id:client.id,id,...fields});}}"));
 assert.ok(api.includes("if(b.action==='homework-update')"));
 assert.ok(api.includes(".eq('id',assignment).eq('client_id',client).eq('active',true).select('id')"));
 assert.ok(migration.includes('add column if not exists display_title text'));
});
test('List supports arrow reordering and direct jump to a numbered position',()=>{
 const ui=read('src/components/portal/CompactHomework.tsx');
 assert.ok(ui.includes('onDrop={onReorder?'));
 assert.ok(ui.includes('Move up'));
 assert.ok(ui.includes('Move down'));
 assert.ok(ui.includes('Move '+display+' to position'));
 assert.ok(ui.includes('await onReorder(next)'));
 assert.ok(ui.includes('onArchive(assignment.id)'));
});
test('Athletes cannot manage names, add or reorder; they retain completion tracking',()=>{
 const ui=read('src/components/portal/CompactHomework.tsx');
 const athlete=read('src/components/portal/Athlete.tsx');
 assert.ok(ui.includes('onDone(assignment.id,!done)'));
 assert.ok(ui.includes('{onEdit&&<button'));
 assert.ok(ui.includes('{onReorder&&<div'));
 assert.ok(ui.includes('{adding&&onAdd&&<form'));
 assert.ok(athlete.includes('onDone={(homework_id,done)=>'));
 assert.ok(!athlete.includes('onEdit='));
 assert.ok(!athlete.includes('onReorder='));
});
