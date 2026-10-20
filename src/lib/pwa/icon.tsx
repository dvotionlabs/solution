import {ImageResponse} from 'next/og';

/** Reuse CGP's dark background and pale-green logo without an icon service. */
export function cgpIconResponse(size:number,maskable=false):ImageResponse{
 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#20271f',borderRadius:maskable?0:Math.round(size*.17)}}>
   <span style={{fontFamily:'Arial, Helvetica, sans-serif',fontWeight:700,fontSize:Math.round(size*.415),letterSpacing:-Math.round(size*.016),color:'#d9edaf',paddingRight:Math.round(size*.027),paddingBottom:Math.round(size*.026)}}>
    cgp
   </span>
  </div>,
  {width:size,height:size}
 );
}
