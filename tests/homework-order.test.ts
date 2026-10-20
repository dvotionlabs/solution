import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderHomework,type Homework} from '../src/lib/portal/model.ts';

const item=(id:string,sort_order:number,created_at:string):Homework=>({
 id,sort_order,created_at,client_id:'athlete-a',exercise_id:'demo',
 prescription:'3 × 10',coach_note:'',active:true
});

test('Homework stays in the coach-specified sequence rather than insertion order',()=>{
 const items=[item('first',0,'2026-10-19T10:00:00Z'),
  item('third',2,'2026-10-20T10:00:00Z'),
  item('second',1,'2026-10-20T08:00:00Z')];
 assert.deepEqual(orderHomework(items).map(x=>x.id),['first','second','third']);
 assert.deepEqual(items.map(x=>x.id),['first','third','second'],'sorting never mutates the original data');
});
test('Equal ranks stay in newest-first order for older homework records',()=>{
 const items=[item('older',0,'2026-10-16T08:00:00Z'),
  item('newer',0,'2026-10-19T08:00:00Z')];
 assert.deepEqual(orderHomework(items).map(x=>x.id),['newer','older']);
});

const source=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Coach has move buttons and drag/drop while athlete has no editing controls',()=>{
 const ui=source('src/components/portal/CompactHomework.tsx');
 const admin=source('src/components/portal/Admin.tsx');
 const athlete=source('src/components/portal/Athlete.tsx');
 assert.ok(ui.includes('onReorder?:'));
 assert.ok(ui.includes("title=\"Move up\""));
 assert.ok(ui.includes("title=\"Move down\""));
 assert.ok(ui.includes("onDrop={onReorder?"));
 assert.ok(ui.includes("draggable={!savingOrder}"));
 assert.ok(admin.includes("action:'homework-reorder',client_id:client.id,order"));
 assert.ok(athlete.includes("import HomeworkGrid from './CompactHomework'"));
 assert.ok(!athlete.includes('onReorder='));
});
test('Server enforces admin-only full-list reorder bound to one client',()=>{
 const api=source('src/app/api/portal/route.ts');
 const sql=source('db/cgp-homework-order.sql');
 assert.ok(api.includes("if(profile.role!=='admin')"));
 assert.ok(api.includes("if(b.action==='homework-reorder')"));
 assert.ok(api.includes("db.rpc('cgp_homework_reorder'"));
 assert.ok(sql.includes("security invoker"));
 assert.ok(sql.includes("cgp_private.portal_admin()"));
 assert.ok(sql.includes("n<>cardinality(p_order)"));
 assert.ok(sql.includes("h.client_id=p_client and h.active"));
 assert.ok(sql.includes("revoke all on function public.cgp_homework_reorder"));
});
test('New homework appends to the right athlete and video-free homework still works',()=>{
 const sql=source('db/cgp-homework-order.sql');
 const existing=source('db/cgp-create-text-homework.sql');
 assert.ok(sql.includes("before insert on public.cgp_homework"));
 assert.ok(sql.includes("where h.client_id=new.client_id"));
 assert.ok(existing.includes('youtube_id,cues,active'));
 assert.ok(existing.includes('values(title_clean,category_clean,null,cues_clean,true)'));
});
