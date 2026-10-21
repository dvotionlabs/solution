import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Athletes and coaches share the list UI; athlete overview still previews homework',()=>{
 const admin=read('src/components/portal/Admin.tsx');
 const athlete=read('src/components/portal/Athlete.tsx');
 assert.match(admin,/import HomeworkGrid from '\.\/CompactHomework'/);
 assert.match(athlete,/import HomeworkGrid from '\.\/CompactHomework'/);
 assert.ok(admin.includes('<HomeworkGrid key={client.id} assignments={data.homework.filter'));
 assert.ok(athlete.includes('<HomeworkGrid assignments={homework}'));
 assert.ok(athlete.includes('homework.filter(h=>h.active).slice(0,2)'));
 assert.ok(!athlete.includes('onEdit='));
 assert.ok(!athlete.includes('onAdd='));
});
test('Homework renders a single minimal row list, not large video cards',()=>{
 const component=read('src/components/portal/CompactHomework.tsx');
 const css=read('src/app/portal/portal.css');
 assert.ok(component.includes('className="p-hl-rows" role="list"'));
 assert.ok(component.includes('className="p-hl-prescription"'));
 assert.ok(component.includes('className="p-hl-name"'));
 assert.ok(component.includes('assignment.display_title||exercise.title'));
 assert.ok(component.includes('londonDay()'));
 assert.ok(component.includes('aria-pressed={done}'));
 assert.ok(css.includes('.p-hl-row{display:grid'));
 assert.ok(css.includes('border-bottom:1px solid var(--p-line)'));
 assert.ok(!css.includes('.p-hw-grid{display:grid;grid-template-columns:repeat(3,'));
 assert.ok(!component.includes('https://i.ytimg.com'));
});
test('Video and full instructions appear only when opened',()=>{
 const component=read('src/components/portal/CompactHomework.tsx');
 assert.ok(component.includes('onClick={()=>setSelectedId(assignment.id)}'));
 assert.ok(component.includes('{selected&&<Modal title={selected.assignment.display_title||selected.exercise.title}'));
 assert.ok(component.includes('{selected.exercise.youtube_id&&<div className="p-hw-dialog-video">'));
 assert.ok(component.includes('youtube-nocookie.com/embed/'));
 assert.ok(component.includes('selected.assignment.coach_note'));
 assert.ok(component.includes('selected.exercise.cues'));
});
test('Existing athlete completion, drag reorder and coach removal remain available',()=>{
 const component=read('src/components/portal/CompactHomework.tsx');
 assert.ok(component.includes('onDone(assignment.id,!done)'));
 assert.ok(component.includes('onArchive(assignment.id)'));
 assert.ok(component.includes('onClose={()=>setSelectedId(null)}'));
 assert.ok(component.includes('assignment.exercise_id'));
 assert.ok(component.includes('onDrop={onReorder?'));
});
