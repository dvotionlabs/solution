import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Athletes and coaches use the same concise programme list including athlete overview',()=>{
 const admin=read('src/components/portal/Admin.tsx');
 const athlete=read('src/components/portal/Athlete.tsx');
 assert.match(admin,/import HomeworkGrid from '\.\/CompactHomework'/);
 assert.match(athlete,/import HomeworkGrid from '\.\/CompactHomework'/);
 assert.ok(admin.includes('<HomeworkGrid key={client.id} assignments={data.homework.filter'));
 assert.ok(athlete.includes('<HomeworkGrid assignments={homework}'));
 assert.ok(athlete.includes('homework.filter(h=>h.active).slice(0,2)'));
});

test('The single-column list shows names, prescriptions and completion without embedded video cards',()=>{
 const component=read('src/components/portal/CompactHomework.tsx');
 const css=read('src/app/portal/portal.css');
 assert.ok(component.includes('className="p-hw-list-rows" role="list"'));
 assert.ok(component.includes('className="p-hw-line-main"'));
 assert.ok(component.includes('{title}</button>'));
 assert.ok(component.includes('{assignment.prescription}</span>'));
 assert.ok(component.includes('londonDay()'));
 assert.ok(component.includes('aria-pressed={done}'));
 assert.ok(css.includes('.p-hw-line-main{display:flex'));
 assert.ok(!css.includes('.p-hw-grid{display:grid'));
 assert.ok(!component.includes('https://i.ytimg.com'));
});

test('Video and full coaching notes open only on demand in a modal',()=>{
 const component=read('src/components/portal/CompactHomework.tsx');
 assert.ok(component.includes('onClick={()=>setSelectedId(assignment.id)}'));
 assert.ok(component.includes('{selected&&<Modal title={selectedTitle}'));
 assert.ok(component.includes('selected.exercise.youtube_id&&<div className="p-hw-dialog-video"'));
 assert.ok(component.includes('youtube-nocookie.com/embed/'));
 assert.ok(component.includes('selected.assignment.coach_note'));
 assert.ok(component.includes('selected.exercise.cues'));
});

test('The existing athlete completion and coach archive actions remain wired',()=>{
 const component=read('src/components/portal/CompactHomework.tsx');
 assert.ok(component.includes('onDone(assignment.id,!done)'));
 assert.ok(component.includes('aria-pressed={done}'));
 assert.ok(component.includes('onArchive(assignment.id)'));
 assert.ok(component.includes('onClose={()=>setSelectedId(null)}'));
 assert.ok(component.includes('assignment.exercise_id'));
});
