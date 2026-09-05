(()=>{
'use strict';
if(window.COLONYPulseGlassVisualGuard) return;
const ADAPTER='pulse-glass-141.webgl2';
const APP='moor.city.island';
let patched=false;
function patch(){
  const R=window.COLONYRendererAdapters;
  const A=window.COLONYPulseGlass141?.adapter;
  if(!R||!A||patched) return false;
  patched=true;
  const originalStart=A.start.bind(A);
  A.start=async args=>{
    const w=args.cityWindow,scene=w?.__MOOR_RENDER_CONTEXT?.scene;
    const suppressed=[];
    try{
      scene?.traverse?.(o=>{
        if((o?.isLine||o?.isLineSegments||o?.isLineLoop)&&o.visible!==false){
          suppressed.push({o,visible:o.visible});
          o.visible=false;
        }
      });
    }catch{}
    let session;
    try{session=await originalStart(args)}catch(e){for(const x of suppressed)try{x.o.visible=x.visible}catch{};throw e}
    const baseGet=(session.getMetrics||session.getTelemetry)?.bind(session);
    if(baseGet){
      const guarded=()=>{
        const m={...baseGet()};
        m.suppressedLineObjects=suppressed.length;
        m.visualCorrectness=suppressed.length?'PARTIAL_UNSUPPORTED_LINES':'PASS';
        if(suppressed.length){
          m.coverage=Math.min(Number.isFinite(m.coverage)?m.coverage:1,.55);
          m.qualification='EXPERIMENTAL_VISUAL_PARTIAL';
        }
        return m;
      };
      session.getMetrics=guarded;
      session.getTelemetry=guarded;
      try{
        const ctx=w.__MOOR_RENDER_CONTEXT;
        if(ctx?.activeAdapter?.id===ADAPTER)ctx.getRenderTelemetry=guarded;
        if(ctx?.renderService?.rendererId==='rp-mtnzjxi3-kkbrk')ctx.renderService.getTelemetry=guarded;
      }catch{}
    }
    const baseStop=session.stop?.bind(session);
    session.stop=()=>{
      try{baseStop?.()}finally{for(const x of suppressed)try{x.o.visible=x.visible}catch{}}
    };
    return session;
  };
  return true;
}
if(!patch()){
  const t=setInterval(()=>{if(patch())clearInterval(t)},100);
  setTimeout(()=>clearInterval(t),10000);
}
window.COLONYPulseGlassVisualGuard={version:'0.1.0',adapter:ADAPTER,app:APP,patch};
})();