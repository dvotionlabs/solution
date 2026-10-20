import test from 'node:test';
import assert from 'node:assert/strict';
import {optionalYoutubeId,searchExerciseChoices,type Exercise} from '../src/lib/portal/model.ts';

const exercises:Exercise[]=[
 {id:'a',title:'Single-leg calf raises',category:'Lower body',youtube_id:null,cues:'Keep the knee soft.',active:true},
 {id:'b',title:'Barbell back squat',category:'Lower body',youtube_id:'abcdefghijk',cues:'',active:true},
 {id:'c',title:'Pallof press',category:'Core & Control',youtube_id:'ABCDEFGHIJK',cues:'',active:true},
 {id:'d',title:'Front squat',category:'Strength',youtube_id:null,cues:'',active:false},
];

test('a CGP exercise can be saved without an attached YouTube video',()=>{
 for(const value of [undefined,null,'','   ','\n'])assert.equal(optionalYoutubeId(value),null);
 assert.equal(optionalYoutubeId('https://www.youtube.com/watch?v=abcdefghijk'),'abcdefghijk');
 assert.equal(optionalYoutubeId('https://youtu.be/ABCDEFGHIJK'),'ABCDEFGHIJK');
 assert.equal(optionalYoutubeId('https://www.youtube.com/shorts/abcdefghijk'),'abcdefghijk');
 assert.throws(()=>optionalYoutubeId('https://untrusted.example/video'),/valid YouTube/);
 assert.throws(()=>optionalYoutubeId('https://youtube.com.evil.test/watch?v=abcdefghijk'),/valid YouTube/);
 assert.throws(()=>optionalYoutubeId(['https://youtu.be/abcdefghijk']),/valid YouTube/);
});
test('homework search matches exercise names and categories, case-insensitively',()=>{
 assert.deepEqual(searchExerciseChoices(exercises,'SQUAT').map(x=>x.id),['b','d']);
 assert.deepEqual(searchExerciseChoices(exercises,'lower calf').map(x=>x.id),['a']);
 assert.deepEqual(searchExerciseChoices(exercises,'  core PRESS ').map(x=>x.id),['c']);
 assert.deepEqual(searchExerciseChoices(exercises,'not present'),[]);
 assert.equal(searchExerciseChoices(exercises,'').length,exercises.length);
});
test('written-only exercises remain selectable from the same exercise library',()=>{
 const active=exercises.filter(e=>e.active);
 assert.equal(searchExerciseChoices(active,'calf')[0]?.youtube_id,null);
 assert.equal(searchExerciseChoices(active,'squat')[0]?.youtube_id,'abcdefghijk');
 assert.equal(active.length,3);
});
