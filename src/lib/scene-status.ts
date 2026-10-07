export function setSceneStatus(status:'loading'|'ready'|'fallback') {
  const root=document.documentElement;
  root.dataset.scene=status;
  root.classList.toggle('scene-ready',status==='ready');
  if(status!=='ready')root.classList.remove('parchment-ready');
}
