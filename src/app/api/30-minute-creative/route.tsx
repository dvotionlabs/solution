import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const width = 1080;
const height = 1350;

const variants = {
  "1": {
    photo: "/force-plate-squat.webp",
    position: "70% 50%",
    eyebrow: "LIVERPOOL STREET / LONDON",
    kicker: "1:1 PERSONAL TRAINING",
    headline: "30 MINUTES.",
    second: "MADE TO COUNT.",
    details: "Individual coaching. Purposeful training. Progress that fits your week.",
    small: "TWO 30-MINUTE SESSIONS EACH WEEK",
  },
  "2": {
    photo: "/force-plate-squat.webp",
    position: "46% 50%",
    eyebrow: "LIVERPOOL STREET / LONDON",
    kicker: "PERSONAL TRAINING / 30 MINUTES",
    headline: "£55 / SESSION.",
    second: "TWICE A WEEK.",
    details: "8 individually coached sessions for £440 every 4 weeks.",
    small: "RECURRING FOUR-WEEK PLAN • DIRECT DEBIT",
  },
  "3": {
    photo: "/movement-arm.webp",
    position: "43% 50%",
    eyebrow: "LIVERPOOL STREET / LONDON",
    kicker: "COACHING BUILT AROUND YOU",
    headline: "MOVE WELL.",
    second: "GET STRONGER.",
    details: "An individual approach to movement, strength and progression. In just 30 minutes.",
    small: "START WITH AN INITIAL CONSULTATION",
  },
} as const;

export async function GET(request: NextRequest) {
  const variant = request.nextUrl.searchParams.get("variant") ?? "1";
  if (!(variant in variants)) return new Response("Unknown creative", {status: 404});
  const creative = variants[variant as keyof typeof variants];

  // Use the *existing real CGP/DVOTION photography*, never a generated person.
  const photoResponse = await fetch(new URL(creative.photo, request.url), { cache: "force-cache" });
  if (!photoResponse.ok) return new Response("Source photograph not available", { status: 502 });
  const photoBytes = Buffer.from(await photoResponse.arrayBuffer());
  const pngBytes = await sharp(photoBytes).png().toBuffer();
  const photoData = "data:image/png;base64," + pngBytes.toString("base64");

  try {
  const image = new ImageResponse(
    (
      <div style={{display:"flex",position:"relative",width:"100%",height:"100%",background:"#20271f",fontFamily:"Arial, sans-serif",color:"#f5f5ef",overflow:"hidden"}}>
        {/* Authentic photograph, no alterations to people */}
        <img src={photoData} alt="" style={{position:"absolute",top:0,left:0,width:"100%",height:"82%",objectFit:"cover",objectPosition:creative.position}} />
        {/* Readability gradients and premium CGP editorial framing */}
        <div style={{position:"absolute",inset:0,display:"flex",background:"linear-gradient(to bottom, rgba(17,23,17,0.20) 0%, rgba(17,23,17,0.05) 28%, rgba(17,23,17,0.35) 49%, rgba(22,29,22,0.96) 73%, #20271f 100%)"}}/>
        <div style={{position:"absolute",top:53,left:64,right:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",fontWeight:800,fontSize:69,letterSpacing:-5}}>cgp<span style={{color:"#d9edaf",fontSize:32,marginTop:28}}>●</span></div>
          <div style={{display:"flex",fontSize:18,letterSpacing:5,fontWeight:500}}>CG PERFORMANCE</div>
        </div>
        <div style={{position:"absolute",top:170,left:68,display:"flex",fontSize:17,letterSpacing:3,color:"#e5e9db"}}>{creative.eyebrow}</div>
        <div style={{position:"absolute",bottom:89,left:68,right:68,display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
          <div style={{display:"flex",fontSize:18,letterSpacing:4,fontWeight:700,color:"#d9edaf",marginBottom:28}}>{creative.kicker}</div>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1.02,letterSpacing:-4,fontSize:75,fontWeight:800}}>
            <div style={{display:"flex"}}>{creative.headline}</div>
            <div style={{display:"flex",color:"#d9edaf"}}>{creative.second}</div>
          </div>
          <div style={{display:"flex",width:96,height:6,background:"#d9edaf",marginTop:29,marginBottom:28}}/>
          <div style={{display:"flex",maxWidth:860,fontSize:31,lineHeight:1.37,letterSpacing:-0.5,marginBottom:26}}>{creative.details}</div>
          <div style={{display:"flex",fontSize:17,letterSpacing:2,color:"#d8decc",marginBottom:32}}>{creative.small}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%"}}>
            <div style={{display:"flex",padding:"20px 32px",background:"#d9edaf",color:"#20271f",fontWeight:800,fontSize:22,letterSpacing:2}}>ENQUIRE NOW ↗</div>
            <div style={{display:"flex",fontSize:17,letterSpacing:1,color:"#d8decc"}}>CG PERFORMANCE</div>
          </div>
        </div>
      </div>
    ),
    {width,height}
  );
  const png = await image.arrayBuffer();
  return new Response(png, {headers: {"Content-Type":"image/png","Cache-Control":"public, max-age=300, s-maxage=3600","Content-Disposition":`inline; filename="cgp-30-minute-ad-${variant}.png"`}});
  } catch (e) { console.error("CGP ad rendering", e); return new Response("Creative error: " + (e instanceof Error ? e.message : String(e)), {status: 500}); }
}
