'use strict';
const TRACK_PARTS={'assets/coast.mp3':4,'assets/forest.mp3':3,'assets/night.mp3':4,'assets/sky.mp3':4,'assets/snow.mp3':5,'assets/sunny-journey.mp3':5};
async function fetchTrackBuffer(url){
  const clean=url.split('?')[0],count=TRACK_PARTS[clean];
  if(!count){const response=await fetch(url);if(!response.ok)throw Error('Music unavailable');return response.arrayBuffer();}
  const packed=clean.replace('assets/','assets/packed/')+'.part';
  const chunks=await Promise.all(Array.from({length:count},async(_,i)=>{const response=await fetch(packed+String(i).padStart(2,'0'));if(!response.ok)throw Error('Music part unavailable');return response.arrayBuffer();}));
  return new Blob(chunks).arrayBuffer();
}
// Decoded loop and GainNodes: reliable volume/fades on iOS, no autoplay assumption.
class JourneyAudio {
  constructor(url, onError) { this.url=url;this.onError=onError;this.context=null;this.buffer=null;this.source=null;this.offset=0;this.startedAt=0;this.wantsMusic=false;this.loading=null;this.duckUntil=0;this.musicVolume=.65;this.effectsVolume=.5;this.muted=false;this.failed=false;this.lastLevel=-1;this.lastEffects=-1;this.trackEpoch=0;this.loop=true;this.samples={};this.samplesLoading=null; }
  unlock() {
    try {
      if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.context=new AC();this.music=this.context.createGain();this.music.gain.value=0;this.music.connect(this.context.destination);this.effects=this.context.createGain();this.effects.connect(this.context.destination);this.loadSamples();}
      if(this.context.state!=='running')this.context.resume().then(()=>{if(this.wantsMusic)this.play();}).catch(()=>{});
      // A synchronous silent buffer unlocks Safari audio during the initiating tap.
      const b=this.context.createBufferSource();b.buffer=this.context.createBuffer(1,1,this.context.sampleRate);b.connect(this.effects);b.start();
      if(!this.buffer&&!this.loading){const epoch=this.trackEpoch,url=this.url;const pending=fetchTrackBuffer(url).then(b=>this.context.decodeAudioData(b)).then(b=>{if(epoch!==this.trackEpoch)return;this.buffer=b;this.failed=false;if(this.wantsMusic)this.play();}).catch(()=>{if(epoch!==this.trackEpoch)return;this.failed=true;this.onError?.();}).finally(()=>{if(epoch===this.trackEpoch)this.loading=null;});this.loading=pending;}

    }catch{this.failed=true;this.onError?.();}
  }
  setTrack(url){this.loop=true;if(this.url===url)return;this.stopSource();this.trackEpoch++;this.url=url;this.buffer=null;this.loading=null;this.offset=0;this.failed=false;this.lastLevel=-1;if(this.music)this.music.gain.setValueAtTime(0,this.context.currentTime);}
  play(reset=false){this.wantsMusic=true;if(reset){this.stopSource();this.offset=0;}if(this.muted)return;this.unlockIfNeeded();if(!this.context||!this.buffer||this.context.state!=='running'||this.source)return;const s=this.context.createBufferSource();s.buffer=this.buffer;s.loop=this.loop;s.connect(this.music);s.start(0,this.offset%this.buffer.duration);this.startedAt=this.context.currentTime;this.source=s;s.onended=()=>{if(this.source!==s)return;this.source=null;this.offset=0;if(!s.loop)this.wantsMusic=false;s.disconnect();};}
  victory(){this.pause();this.setTrack('assets/victory.mp3');this.loop=false;this.unlock();this.play(true);}
  unlockIfNeeded(){if(!this.context)this.unlock();}
  stopSource(){if(this.source){if(this.buffer)this.offset=(this.offset+this.context.currentTime-this.startedAt)%this.buffer.duration;try{this.source.stop();this.source.disconnect();}catch{}this.source=null;}}
  pause(){this.wantsMusic=false;if(this.music){this.music.gain.cancelScheduledValues(this.context.currentTime);this.music.gain.setTargetAtTime(0,this.context.currentTime,.02);this.lastLevel=0;}if(this.source){const old=this.source;this.offset=(this.offset+this.context.currentTime-this.startedAt)%this.buffer.duration;this.source=null;old.stop(this.context.currentTime+.09);old.onended=()=>old.disconnect();}}
  mix({music,effects,muted}){this.musicVolume=music;this.effectsVolume=effects;this.muted=muted;if(this.effects)this.effects.gain.setTargetAtTime(muted?0:effects,this.context.currentTime,.03);if(muted)this.stopSource();else if(this.wantsMusic){this.unlock();this.play();}}
  update(active,dash){if(!this.context)return;const t=this.context.currentTime;const level=active&&!this.muted?this.musicVolume*.62*(t<this.duckUntil?.38:1)*(dash?1.08:1):0;if(Math.abs(level-this.lastLevel)>.001){this.music.gain.setTargetAtTime(level,t,.12);this.lastLevel=level;}const effectLevel=this.muted?0:this.effectsVolume;if(effectLevel!==this.lastEffects){this.effects.gain.setTargetAtTime(effectLevel,t,.03);this.lastEffects=effectLevel;}}
  duck(){if(this.context)this.duckUntil=this.context.currentTime+.42;}
  tone(freq=600,duration=.08,type='sine',volume=.045,glide=0){if(this.muted||!this.context||this.context.state!=='running')return;const t=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();o.type=type==='triangle'?'sine':type;o.frequency.setValueAtTime(freq,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.effects);o.start(t);o.stop(t+duration+.015);o.onended=()=>{o.disconnect();g.disconnect();};}
  foley(kind){if(this.sample(kind,kind==='smash'?.42:kind==='hit'?.5:kind==='land'?.3:.22))return;if(this.muted||!this.context||this.context.state!=='running')return;const c=this.context,t=c.currentTime,d=kind==='slide'?.13:kind==='hit'?.14:.075;if(!this.noise){this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*.2),c.sampleRate);const data=this.noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(.8*Math.sin(i*2.31)+.5*Math.sin(i*5.7))*.14)/1.08;data[i]=last;}}const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise;f.type='lowpass';f.frequency.setValueAtTime(kind==='slide'?1800:kind==='hit'?1000:650,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(kind==='hit'?.20:.10,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(f);f.connect(g);g.connect(this.effects);n.start(t);n.stop(t+d);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};}

  flourish(){[440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.22,'sine',.052,f*1.02),i*55));}

  loadSamples(){if(this.samplesLoading)return;this.samplesLoading=Promise.allSettled(['land','snow','hit','smash','slide','swipe','star'].map(async key=>{const r=await fetch('assets/sfx/'+key+'.mp3');if(!r.ok)return;const b=await this.context.decodeAudioData(await r.arrayBuffer());this.samples[key]=b;}));}
  sample(key,volume=.3){if(this.muted||!this.context||this.context.state!=='running'||!this.samples[key])return false;const s=this.context.createBufferSource(),g=this.context.createGain();s.buffer=this.samples[key];s.playbackRate.value=.97+Math.random()*.06;g.gain.value=volume;s.connect(g);g.connect(this.effects);s.start();s.onended=()=>{s.disconnect();g.disconnect();};return true;}

}
