import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const get=(path:string)=>readFileSync(new URL(path,root),'utf8');

test('Assign homework lets the coach create a written exercise instead of supplying a video',()=>{
 const ui=get('src/components/portal/Admin.tsx');
 assert.ok(ui.includes('Write new exercise · No video'));
 assert.ok(ui.includes("homeworkMode==='written'"));
 assert.ok(ui.includes("body.action='homework-custom'"));
 assert.ok(ui.includes("name=\"new_cues\""));
 assert.ok(ui.includes('HomeworkExercisePicker exercises={data.exercises}'));
});
test('Server action creates written homework via an atomic, authorised RPC',()=>{
 const route=get('src/app/api/portal/route.ts');
 const sql=get('db/cgp-create-text-homework.sql');
 assert.ok(route.includes("if(b.action==='homework-custom')"));
 assert.ok(route.includes("db.rpc('cgp_create_text_homework',args)"));
 assert.ok(sql.includes('security invoker'));
 assert.ok(sql.includes('cgp_private.portal_admin()'));
 assert.ok(sql.includes("youtube_id,cues,active"));
 assert.ok(sql.includes('values(title_clean,category_clean,null,cues_clean,true)'));
 assert.ok(sql.includes('insert into public.cgp_homework'));
});
test('Text-only homework still renders cues and prescriptions without a video frame',()=>{
 const source=get('src/components/portal/Shared.tsx');
 assert.ok(source.includes('const hasVideo=Boolean(exercise.youtube_id)'));
 assert.ok(source.includes('{hasVideo&&<div className="p-video">'));
 assert.ok(source.includes('{assignment&&<p className="p-prescription">'));
});
