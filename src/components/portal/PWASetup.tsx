'use client';
import {useEffect,useState} from 'react';

interface InstallPromptEvent extends Event{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:'accepted'|'dismissed'}>;
}

/** Offline support and a user-initiated installation action for the CGP portal. */
export default function PWASetup(){
 const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 const [showInstructions,setShowInstructions]=useState(false);

 useEffect(()=>{
  if('serviceWorker' in navigator){
   void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'})
    .catch(error=>{console.warn('CGP app installation is unavailable',error);});
  }
  const standalone=window.matchMedia('(display-mode: standalone)').matches||
   Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
  if(standalone)setInstalled(true);
  function ready(event:Event){event.preventDefault();setPromptEvent(event as InstallPromptEvent);}
  function completed(){setInstalled(true);setPromptEvent(null);}
  window.addEventListener('beforeinstallprompt',ready);
  window.addEventListener('appinstalled',completed);
  return ()=>{
   window.removeEventListener('beforeinstallprompt',ready);
   window.removeEventListener('appinstalled',completed);
  };
 },[]);

 async function install(){
  if(!promptEvent){setShowInstructions(value=>!value);return;}
  try{
   await promptEvent.prompt();
   const choice=await promptEvent.userChoice;
   if(choice.outcome==='accepted')setInstalled(true);
   else setShowInstructions(true);
  }catch{setShowInstructions(true);}
  finally{setPromptEvent(null);}
 }
 if(installed)return null;
 return <div className="p-pwa-setup">
  <button type="button" className="p-pwa-install" onClick={()=>void install()}>
   <span aria-hidden="true">＋</span> Install CGP app <span aria-hidden="true">↗</span>
  </button>
  {showInstructions&&<div className="p-pwa-install-help" role="status">
   <p><strong>iPhone / iPad:</strong> Open the portal in Safari, tap Share, then Add to Home Screen.</p>
   <p><strong>Android:</strong> Open in Chrome, tap the menu (⋮), then Install app or Add to Home Screen.</p>
  </div>}
 </div>;
}
