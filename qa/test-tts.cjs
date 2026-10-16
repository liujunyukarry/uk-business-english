'use strict';
// Simulate every lesson's TTS click handler without a browser or network.
// This verifies event wiring and per-sentence text/lang; real-device audio remains untested.
const fs=require('node:fs');
const vm=require('node:vm');
const lessons=JSON.parse(fs.readFileSync('course-plan.json','utf8')).lessons;
const decode=s=>s.replace(/&#x27;|&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
let total=0,errors=[];
for(let day=53;day<=lessons.length;day++){
 const name='day'+String(day).padStart(2,'0')+'.html';
 const html=fs.readFileSync(name,'utf8');
 const scripts=Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g),m=>m[1]);
 const expected=Array.from(html.matchAll(/<button[^>]*data-say="([^"]*)"/g),m=>decode(m[1]));
 if(scripts.length!==1){errors.push('Day'+day+' expected one script');continue;}
 let click=null,cancels=0,spoken=[];
 const synth={getVoices:()=>[{lang:'en-GB'}],addEventListener:()=>{},cancel:()=>{cancels++;},speak:u=>spoken.push(u)};
 const document={addEventListener:(type,callback)=>{if(type==='click')click=callback;}};
 const window={speechSynthesis:synth};
 class Utterance{constructor(text){this.text=text;}}
 try{vm.runInNewContext(scripts[0],{document,window,speechSynthesis:synth,SpeechSynthesisUtterance:Utterance},{timeout:1000});}
 catch(e){errors.push('Day'+day+' script error: '+e.message);continue;}
 if(typeof click!=='function'){errors.push('Day'+day+' click listener missing');continue;}
 for(let i=0;i<expected.length;i++){
  const before=spoken.length;
  try{click({target:{closest:selector=>selector==='[data-say]'?{dataset:{say:expected[i]}}:null}});}
  catch(e){errors.push('Day'+day+' click #'+i+' threw: '+e.message);continue;}
  if(spoken.length!==before+1||spoken[spoken.length-1].text!==expected[i]||spoken[spoken.length-1].lang!=='en-GB')errors.push('Day'+day+' TTS text or en-GB mismatch at #'+i);
  total++;
 }
 if(cancels!==expected.length)errors.push('Day'+day+' cancellation missing');
}
console.log('Simulated '+total+' independent TTS button presses across '+(lessons.length-52)+' lessons.');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('TTS click-handler simulation passed; no iPhone/Safari voice output was verified.');
