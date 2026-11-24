(function(){
  let ctx=null,master=null,running=false,timer=null,nextTime=0;
  const bpm=62;const beat=60/bpm;
  const prog=[{n:[60,64,67,72]},{n:[57,60,64,67]},{n:[55,59,62,67]},{n:[57,60,64,72]}];
  let step=0,chordIdx=0;
  function noteFreq(midi){return 440*Math.pow(2,(midi-69)/12);}
  function ensure(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=0.0;
    const reverb=ctx.createConvolver();reverb.buffer=makeImpulse(ctx,2.2,2.0);
    const wet=ctx.createGain();wet.gain.value=0.5;
    master.connect(ctx.destination);master.connect(reverb);reverb.connect(wet);wet.connect(ctx.destination);
  }
  function makeImpulse(ctx,dur,decay){
    const len=Math.floor(ctx.sampleRate*dur);
    const buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++){d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}}
    return buf;
  }
  function pluck(midi,when,dur,vol){
    const osc=ctx.createOscillator();osc.type='sine';
    const osc2=ctx.createOscillator();osc2.type='triangle';osc2.detune.value=4;
    const g=ctx.createGain();
    osc.frequency.value=noteFreq(midi);osc2.frequency.value=noteFreq(midi);
    g.gain.setValueAtTime(0,when);
    g.gain.linearRampToValueAtTime(vol,when+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,when+dur);
    osc.connect(g);osc2.connect(g);g.connect(master);
    osc.start(when);osc2.start(when);osc.stop(when+dur+0.1);osc2.stop(when+dur+0.1);
    const b=ctx.createOscillator();b.type='sine';b.frequency.value=noteFreq(midi-12);
    const bg=ctx.createGain();
    bg.gain.setValueAtTime(0,when);bg.gain.linearRampToValueAtTime(vol*0.5,when+0.03);
    bg.gain.exponentialRampToValueAtTime(0.0001,when+dur*1.4);
    b.connect(bg);bg.connect(master);b.start(when);b.stop(when+dur*1.4+0.1);
  }
  function scheduler(){
    if(!running)return;
    const ahead=0.12;
    while(nextTime<ctx.currentTime+ahead){
      const chord=prog[chordIdx];
      for(let i=0;i<chord.n.length;i++){pluck(chord.n[i],nextTime+i*(beat/4),beat*0.9,0.16);}
      if(step%4===0)pluck(chord.n[3]+12,nextTime+beat*0.75,beat*0.6,0.08);
      step++;nextTime+=beat;
      if(step>=16){step=0;chordIdx=(chordIdx+1)%prog.length;}
    }
    timer=setTimeout(scheduler,40);
  }
  window.PianoMusic={
    start(){ensure();if(ctx.state==='suspended')ctx.resume();running=true;nextTime=ctx.currentTime+0.1;step=0;chordIdx=0;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.linearRampToValueAtTime(0.9,ctx.currentTime+1.2);scheduler();},
    stop(){running=false;if(timer)clearTimeout(timer);if(ctx)master.gain.linearRampToValueAtTime(0.0,ctx.currentTime+0.8);}
  };
})();