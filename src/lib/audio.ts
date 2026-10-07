import { ui, type Locale } from '../data/ui';
export function initAudio(locale:Locale, notify:(message:string)=>void) {
  const button=document.querySelector<HTMLButtonElement>('#audio-toggle')!;
  const label=document.querySelector<HTMLElement>('#audio-state')!;
  let player:HTMLAudioElement|undefined;
  let enabled=false; let fade=0; let request=0;
  const render=()=>{
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-label',enabled?ui[locale].audioOn:ui[locale].audioOff);
    label.textContent=enabled?(locale==='es'?'activado':'on'):(locale==='es'?'apagado':'off');
  };
  function ramp(target:number,done?:()=>void) {
    cancelAnimationFrame(fade); if(!player)return;
    const start=player.volume; const at=performance.now();
    const tick=(now:number)=>{if(!player)return; const p=Math.min(1,(now-at)/900);player.volume=start+(target-start)*p;if(p<1)fade=requestAnimationFrame(tick);else done?.();};
    fade=requestAnimationFrame(tick);
  }
  async function play() {
    const version=++request;
    if(!player) {
      player=new Audio(); player.preload='none'; player.loop=true; player.volume=0;
      player.id='garden-audio';player.hidden=true;document.body.append(player);
      player.src=player.canPlayType('audio/ogg; codecs="vorbis"')?'/media/audio/garden.ogg':'/media/audio/garden.wav';
      player.addEventListener('error',()=>{if(enabled){enabled=false;request++;render();notify(ui[locale].audioError);}});
    }
    try {
      await player.play();
      if(version!==request||!enabled||document.hidden){player.pause();return;}
      ramp(.32);
    } catch {if(version===request){enabled=false;render();notify(ui[locale].audioError);}}
  }
  button.addEventListener('click',()=>{
    enabled=!enabled; render();
    if(enabled)void play();else {request++;ramp(0,()=>player?.pause());}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){request++;cancelAnimationFrame(fade);player?.pause();if(player)player.volume=0;}
    else if(enabled)void play();
  });
  window.addEventListener('pagehide',()=>{request++;player?.pause();cancelAnimationFrame(fade);});
  render();
}
