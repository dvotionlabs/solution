import { createClient } from "@supabase/supabase-js";
import { validateEnquiry,sameOrigin } from "@/lib/validation";
import { rateLimited } from "@/lib/rate-limit";
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Please send your enquiry from the CG Performance website."},{status:403});
 if(rateLimited(request,"enquiry",6))return Response.json({error:"Please wait a few minutes or email Chris directly."},{status:429});
 if(!request.headers.get("content-type")?.includes("application/json"))return Response.json({error:"Invalid request."},{status:415});
 try{
  const raw=await request.text(); if(raw.length>5000)return Response.json({error:"Please shorten your message."},{status:413});
  const body=JSON.parse(raw); if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"Please check your details."},{status:400});
  if(body.website)return Response.json({ok:true});
  const data=validateEnquiry(body);if(!data)return Response.json({error:"Please complete all fields and agree to be contacted."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return Response.json({error:"Please email chrisgkoufas.performance@gmail.com while the enquiry form is being connected."},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.from("cgp_enquiries").insert(data);
  if(error?.code==="23505")return Response.json({error:"An enquiry from this email has already been received today. Please email Chris to add anything."},{status:409});
  if(error){console.error("CGP enquiry could not be stored",error.code);return Response.json({error:"Your enquiry could not be saved. Please try again or email Chris directly."},{status:503});}
  return Response.json({ok:true},{status:201});
 }catch{return Response.json({error:"Please check your details and try again."},{status:400});}
}
