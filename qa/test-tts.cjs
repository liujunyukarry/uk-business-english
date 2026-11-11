'use strict';
// Simulate both delegated and per-button TTS handlers. Audio output on real devices is not verified.
const fs=require('node:fs');
const vm=require('node:vm');
const lessons=JSON.parse(fs.readFileSync('course-plan.json','utf8')).lessons;
const decode=s=>s.replace(/&#x27;|&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
let total=0,errors=[];
for(let day=53;day<=lessons.length;day++){
 const name='day'+String(day).padStart(2,'0')+'.html',html=fs.readFileSync(name,'utf8');
 const scripts=Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g),m=>m[1]);
 const expected=Array.from(html.matchAll(/<button[^>]*data-say="([^"]*)"/g),m=>decode(m[1]));
 if(scripts.length!==1){errors.push('Day'+day+' expected exactly one inline script');continue;}
 let delegate=null,cancels=0,spoken=[];
 const synth={getVoices:()=>[{lang:'en-GB'}],addEventListener:()=>{},cancel:()=>{cancels++;},speak:u=>spoken.push(u)};
 const buttons=expected.map(text=>({dataset:{say:text},getAttribute:k=>k==='data-say'?text:null,addEventListener:function(type,handler){if(type==='click')this.click=handler;}}));
 const document={addEventListener:(type,handler)=>{if(type==='click')delegate=handler;},querySelectorAll:selector=>selector==='[data-say]'?buttons:[]};
 const window={speechSynthesis:synth};
 class Utterance{constructor(text){this.text=text;}}
 try{vm.runInNewContext(scripts[0],{document,window,speechSynthesis:synth,SpeechSynthesisUtterance:Utterance},{timeout:1000});}
 catch(e){errors.push('Day'+day+' script error: '+e.message);continue;}
 for(let i=0;i<expected.length;i++){
  const before=spoken.length,button=buttons[i],fn=button.click||delegate;
  if(typeof fn!=='function'){errors.push('Day'+day+' button #'+i+' listener missing');continue;}
  try{fn({target:{closest:selector=>selector==='[data-say]'?button:null}});}
  catch(e){errors.push('Day'+day+' button #'+i+' click threw: '+e.message);continue;}
  if(spoken.length!==before+1||spoken[spoken.length-1].text!==expected[i]||spoken[spoken.length-1].lang!=='en-GB')errors.push('Day'+day+' button #'+i+' text/lang mismatch');
  total++;
 }
 if(cancels!==expected.length)errors.push('Day'+day+' cancels '+cancels+' of '+expected.length);
}
console.log('Simulated '+total+' TTS button clicks across '+(lessons.length-52)+' lessons.');
if(errors.length){console.error('FAILED '+errors.length+' checks:\n'+errors.join('\n'));process.exit(1);}
console.log('Static TTS interaction simulation passed; real-device voice playback not verified.');
