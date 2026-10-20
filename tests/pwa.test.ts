import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import manifest from '../src/app/manifest.ts';

test('CGP app manifest supports athlete and coach installation',()=>{
 const m=manifest();
 assert.equal(m.id,'/portal');
 assert.equal(m.start_url,'/portal');
 assert.equal(m.scope,'/');
 assert.equal(m.display,'standalone');
 assert.equal(m.short_name,'CGP');
 const icons=m.icons||[];
 assert.ok(icons.some(icon=>icon.sizes==='192x192'&&icon.type==='image/png'));
 assert.ok(icons.some(icon=>icon.sizes==='512x512'&&icon.type==='image/png'&&icon.purpose==='any'));
 assert.ok(icons.some(icon=>icon.purpose==='maskable'));
});

test('offline worker never persists athlete pages or API responses',()=>{
 const worker=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 assert.ok(worker.includes("const OFFLINE_URL='/pwa/offline.html'"));
 assert.ok(worker.includes("request.mode!=='navigate'"));
 assert.ok(!worker.includes('cache.put(request'));
 assert.ok(!worker.includes('caches.open(CACHE_NAME).then(cache=>cache.addAll'));
});
