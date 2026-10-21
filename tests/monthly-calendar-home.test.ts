import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Athlete home shows full homework first, daily steps and other metrics second, appointment third, compact sessions last',()=>{
 const page=read('src/components/portal/Athlete.tsx');
 const home=page.slice(page.lastIndexOf("return <>{header('Hello,"));
 const homework=home.indexOf('Your homework');
 const data=home.indexOf('Daily activity &amp; recovery');
 const appointment=home.indexOf('Your next session');
 const balance=home.indexOf('Session balance');
 assert.ok(homework>=0&&homework<data&&data<appointment&&appointment<balance);
 assert.ok(home.includes('<HomeworkGrid assignments={homework.filter(h=>h.active)}'));
 assert.ok(!home.includes('slice(0,2)'));
 assert.ok(home.includes('<Metrics metrics={metrics}/>'));
 assert.ok(home.includes('p-home-balance'));
 assert.ok(!home.includes('<Balance credits={credits} bookings={bookings}/>'));
 assert.ok(page.includes("b.client_id===id&&b.status!=='cancelled'"),'Deleted calendar appointments do not clutter an athlete diary');
});
test('Athlete navigation prioritises homework and wearable data over booking credits',()=>{
 const portal=read('src/components/portal/Portal.tsx');
 assert.ok(portal.includes("['overview','homework','wearables','bookings']"));
 const metrics=read('src/components/portal/Shared.tsx');
 const cards=metrics.slice(metrics.indexOf('const cards=['));
 assert.ok(cards.indexOf("title:'Daily steps'")<cards.indexOf("title:'Sleep'"));
});

test('Each plan is 4 or 8 sessions, valid for exactly one London calendar month, and avoids double credits',()=>{
 const sql=read('db/cgp-monthly-allowances.sql');
 const api=read('src/app/api/portal/route.ts');
 assert.ok(sql.includes('check(sessions_per_month in (4,8))'));
 assert.ok(sql.includes("month_first date:=date_trunc('month'"));
 assert.ok(sql.includes("interval '1 month - 1 day'"));
 assert.ok(sql.includes('coalesce(c.expires_on'));
 assert.ok(sql.includes('blocked_count:=blocked_count+1'));
 assert.ok(sql.includes('source_reference=source for update'));
 assert.ok(sql.includes('cgp_private.calendar_authorized(p_key)'));
 assert.ok(sql.includes('cgp_private.portal_admin()'));
 assert.ok(api.includes("if(b.action==='monthly-plan')"));
 assert.ok(api.includes("db.rpc('cgp_monthly_plan_set'"));
 const admin=read('src/components/portal/Admin.tsx');
 assert.ok(admin.includes('MonthlyPlanControl'));
 assert.ok(admin.includes('monthlyPlans.find(p=>p.client_id===client.id)'));
});

test('Google Calendar sync renews monthly sessions even before Google account is linked',()=>{
 const source=read('src/lib/portal/calendar-sync.ts');
 assert.ok(source.includes("rpc('cgp_monthly_ensure'"));
 assert.ok(source.indexOf("rpc('cgp_monthly_ensure'")<source.indexOf("rpc('cgp_calendar_sync_state'"));
 assert.ok(source.includes('if(!state.connected||!state.encrypted_tokens)return {connected:false,monthly}'));
 assert.ok(source.includes("rpc('cgp_calendar_sync_finalize'"));
 assert.ok(source.includes('new Date(Date.now()-45*86400000)'));
 const cron=read('vercel.json');
 assert.ok(cron.includes('*/10 * * * *'));
});

test('Only exact Google title aliases map bookings; past bookings complete and deleted ones cancel',()=>{
 const sql=read('db/cgp-calendar-retrospective.sql');
 const initial=read('db/cgp-calendar-sync.sql');
 assert.ok(initial.includes('where lower(a.alias)=lower(summary)'));
 assert.ok(sql.includes("status=(case when end_at>now() then 'scheduled' else 'completed' end)"));
 assert.ok(sql.includes("status in ('scheduled','completed')"));
 assert.ok(sql.includes("b.starts_at>=p_window_start"));
 assert.ok(sql.includes("item.status='scheduled' and item.ends_at<=now()"));
 assert.ok(sql.includes("set status='cancelled'"));
 assert.ok(sql.includes("delete from cgp_private.calendar_event_links"));
 assert.ok(sql.includes('cgp_private.calendar_authorized(p_key)'));
});
