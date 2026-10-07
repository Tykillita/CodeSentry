import { Component, lazy, Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { metaSnapshot, subscribeMeta } from '../../lib/journey-store';
import { setSceneStatus } from '../../lib/scene-status';
const Scene=lazy(()=>import('./SakuraCanvas'));
type ProjectCard={slug:string;order:number;title:string;area:string;areaMark:string;subtitle:string;flow:string[];detail:string};
interface Props { projects:ProjectCard[]; }
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){setSceneStatus('fallback');}
  render(){return this.state.failed?null:this.props.children;}
}
export default function GardenScene({projects}:Props) {
  const [ready,setReady]=useState(false);
  useSyncExternalStore(subscribeMeta,metaSnapshot,()=> 'false:false:false');
  useEffect(()=>{setReady(true);},[]);
  if(!ready)return null;
  return <SceneBoundary><Suspense fallback={null}><Scene projects={projects} /></Suspense></SceneBoundary>;
}
