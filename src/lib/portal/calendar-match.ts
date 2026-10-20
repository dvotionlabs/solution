import {timingSafeEqual} from 'node:crypto';

export function normalizedTitle(title:string){
 return title.trim().normalize('NFKC').toLocaleLowerCase('en-GB');
}
/** Only unambiguous, case-insensitive exact titles may select an athlete. */
export function matchingClient(title:string,aliases:{alias:string;client_id:string}[]):string|null{
 const matches=aliases.filter(a=>normalizedTitle(a.alias)===normalizedTitle(title));
 return matches.length===1?matches[0].client_id:null;
}
export function equalState(a:string|null,b:string|null){
 if(!a||!b)return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
