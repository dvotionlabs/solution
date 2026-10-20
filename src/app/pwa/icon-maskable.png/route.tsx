import {cgpIconResponse} from '@/lib/pwa/icon';
export const dynamic='force-static';
export function GET(){return cgpIconResponse(512,true);}
