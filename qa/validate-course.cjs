'use strict';
// Structural regression checks for published UK Business English lessons.
// Semantic accuracy, British IPA correctness and real-device TTS are separate editorial checks.
const fs=require('node:fs');
const path=require('node:path');
let errors=[],ipaReview=[],mainLines=new Map();
const plan=JSON.parse(fs.readFileSync('course-plan.json','utf8')).lessons;
const decode=s=>s.replace(/&#x27;|&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
const count=(s,re)=>(s.match(re)||[]).length;
const match=(s,re)=>Array.from(s.matchAll(re),m=>m[1]);
const fail=(day,msg)=>errors.push('Day'+day+': '+msg);
const start=new Date('2026-08-25T00:00:00Z');
const dateFor=d=>new Date(start.getTime()+(d-1)*86400000).toISOString().slice(0,10);
if(plan.length<129)fail('PLAN','fewer than 129 days');
for(let i=0;i<plan.length;i++){
 const l=plan[i],n=i+1;
 if(l.day!==n || l.date!==dateFor(n)||l.path!=='day'+String(n).padStart(2,'0')+'.html')fail(n,'plan numbering/date/path mismatch');
 if(l.category!=='日常' && l.category!=='工作')fail(n,'unexpected category');
}
for(let day=53;day<=plan.length;day++){
 const filename='day'+String(day).padStart(2,'0')+'.html';
 if(!fs.existsSync(filename)){fail(day,'missing file');continue;}
 const html=fs.readFileSync(filename,'utf8'),l=plan[day-1];
 if(!html.toLowerCase().includes('<!doctype html>') || !html.includes('</html>'))fail(day,'incomplete HTML document');
 if(!html.includes(l.date)||!new RegExp('DAY\\s*'+day+'\\b','i').test(html))fail(day,'date/day mismatch');
 if(!html.includes('<h1>'+l.title+'</h1>'))fail(day,'title mismatch');
 if(!html.includes('index.html'))fail(day,'directory link absent');
 if(day>1&&!html.includes('href="day'+String(day-1).padStart(2,'0')+'.html"'))fail(day,'previous page link absent');
 if(day<plan.length&&!html.includes('href="day'+String(day+1).padStart(2,'0')+'.html"'))fail(day,'next page link absent');
 const items=match(html,/<div class="item">([\s\S]*?)(?=<div class="item">|<\/section>)/g);
 const talks=match(html,/<div class="dialogue">([\s\S]*?)(?=<div class="dialogue">|<\/section>)/g);
 if(items.length!==10)fail(day,'expected 10 main items, found '+items.length);
 if(count(html,/★ 高频重点/g)!==3)fail(day,'expected 3 high frequency stars');
 if(talks.length!==3)fail(day,'expected 3 dialogues');
 for(let i=0;i<items.length;i++){
  const v=items[i];
  if(count(v,/class="en"/g)!==1||count(v,/class="ipa"/g)!==1||count(v,/class="zh"/g)!==1||count(v,/data-say=/g)!==1)fail(day,'missing main item fields at '+(i+1));
  if(!v.includes('class="usage"'))fail(day,'missing contextual phrase explanation at '+(i+1));
 }
 for(let i=0;i<talks.length;i++){
  const v=talks[i],nt=count(v,/class="turn"/g);
  if(nt<2||nt>3)fail(day,'bad dialogue turn count '+nt);
  if(count(v,/<div class="turn"><b>[^<]+<\/b>/g)!==nt)fail(day,'missing dialogue speaker');
  if(count(v,/class="en"/g)!==nt||count(v,/class="ipa"/g)!==nt||count(v,/class="zh"/g)!==nt||count(v,/data-say=/g)!==nt)fail(day,'dialogue fields missing');
 }
 const en=match(html,/<p class="en"[^>]*>([^<]*)<\/p>/g).map(decode);
 const ipa=match(html,/<p class="ipa">([^<]*)<\/p>/g);
 const zh=match(html,/<p class="zh">([^<]*)<\/p>/g);
 const spoken=match(html,/<button[^>]*data-say="([^"]*)"/g).map(decode);
 if(en.length!==ipa.length||en.length!==zh.length||en.length!==spoken.length)fail(day,'EN/IPA/CN/TTS length mismatch');
 for(let i=0;i<en.length;i++){
  if(en[i]!==spoken[i])fail(day,'spoken text does not equal displayed English, index '+i);
  if(!/^\/[^/]+\/$/.test(ipa[i]||''))fail(day,'IPA is empty or malformed, index '+i);
  if(!zh[i]||!/[\u3400-\u9fff]/.test(zh[i]))fail(day,'missing Chinese translation, index '+i);
 }
 if(new Set(en.slice(0,10)).size!==10)fail(day,'duplicate sentences inside lesson');
 if(!html.includes('speechSynthesis.cancel()')||!html.includes('SpeechSynthesisUtterance')||!html.includes('en-GB'))fail(day,'speech control missing');
 if(!html.includes('viewport')||!html.includes('prefers-color-scheme:dark'))fail(day,'responsive or dark theme missing');
 if(/localStorage|[\u200b\u200c\u200d\u0250\u0279]/.test(html))fail(day,'prohibited storage or IPA contamination');
 // This catches confirmed high-risk phonetic patterns, not all potential IPA errors.
 if(/ekskjˈuːs|ɒvðə|ɒnðə|bɪfˌɔː|rɪpˈɔː|kæfˈeɪ|ɪmpˈɔː|kənfˈɜːm|təmˈɒrəʊ/.test(html))ipaReview.push(day);
 for(const sentence of en.slice(0,10)){
  const norm=sentence.toLowerCase().replace(/[^a-z]+/g,' ').trim();
  if(mainLines.has(norm) && day-mainLines.get(norm)<=10)fail(day,'duplicate main expression within 10 days: Day'+mainLines.get(norm));
  mainLines.set(norm,day);
 }
}
console.log('Course QA: '+(plan.length-52)+' lessons checked (Day53-Day'+plan.length+').');
console.log('This automated test verifies structure, field alignment and links; it CANNOT certify conversational appropriateness, broad British IPA, pronunciation or iPhone TTS playback.');
if(ipaReview.length)console.warn('Editorial IPA review needed for '+ipaReview.length+' lessons with known suspect patterns: '+ipaReview.join(', '));
if(errors.length){console.error('FAILED checks ('+errors.length+'):\n'+errors.join('\n'));process.exit(1);}
console.log('Structural checks passed.');
