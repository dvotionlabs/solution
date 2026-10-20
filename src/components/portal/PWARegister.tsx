'use client';
import {useEffect} from 'react';

/** Register CGP's privacy-preserving PWA worker on every page, including the public homepage. */
export default function PWARegister(){
 useEffect(()=>{
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'})
   .catch(error=>{console.warn('CGP installation support is unavailable',error);});
 },[]);
 return null;
}
