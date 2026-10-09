export const coachingOptions=["in_person","live_online","online_programming","not_sure"];
export function validateEnquiry(body:Record<string,unknown>){
 const name=typeof body.name==="string"?body.name.trim():"";
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const coaching=typeof body.coaching==="string"?body.coaching:"";
 const message=typeof body.message==="string"?body.message.trim():"";
 if(name.length<2||name.length>100||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||!coachingOptions.includes(coaching)||message.length<10||message.length>2000||body.consent!=="yes") return null;
 return {name,email,coaching,message,consent:true};
}
export function sameOrigin(request:Request){return request.headers.get("origin")===new URL(request.url).origin;}
