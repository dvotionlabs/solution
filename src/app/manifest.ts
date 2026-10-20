import type {MetadataRoute} from 'next';

/** The installed app opens the athlete portal and keeps coach routes inside the app. */
export default function manifest():MetadataRoute.Manifest{
 return {
  id:'/portal',
  name:'CG Performance – Athlete Portal',
  short_name:'CGP',
  description:'CG Performance coaching: bookings, sessions and exercise programmes.',
  start_url:'/portal',
  scope:'/',
  display:'standalone',
  background_color:'#f4f3ed',
  theme_color:'#20271f',
  icons:[
   {src:'/pwa/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/pwa/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/pwa/icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ],
 };
}
