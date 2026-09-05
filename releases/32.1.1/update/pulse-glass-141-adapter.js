(()=>{
'use strict';
if(window.COLONYPulseGlass141) return;

const C={
  id:'rp-mtnzjxi3-kkbrk',createdAt:'2026-09-05T06:12:16.347Z',name:'Pulse Glass 141',
  familyId:'webgl2-custom',family:'Lean Custom WebGL2',description:'Purpose-built WebGL2 subset for MOOR render packets.',
  live:true,contract:'moor.render/1',adapterId:'pulse-glass-141.webgl2',implementationVersion:'PulseGlass141/0.1.1',
  qualification:'EXPERIMENTAL',compatibleApps:['moor.city.island'],
  params:{pixelRatioCap:1.6,shadows:true,shadowType:0,exposure:1},lastScore:null,lastMetrics:null
};
const STORE='colony.renderer.pulls.v1';
const q=(a,p)=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*p)]};
const med=a=>q(a,.5);
const color=(v,d=[1,1,1])=>v&&Number.isFinite(v.r)?[v.r,v.g,v.b]:d;

function persistCandidate(){
  try{
    const s=JSON.parse(localStorage.getItem(STORE)||'{}');
    s.saved=Array.isArray(s.saved)?s.saved:[];
    const i=s.saved.findIndex(x=>x.id===C.id);
    const prior=i>=0?s.saved[i]:{};
    const next={...prior,...C,compatibleApps:[...new Set([...(prior.compatibleApps||[]),'moor.city.island'])]};
    if(i>=0)s.saved[i]=next;else s.saved.unshift(next);
    localStorage.setItem(STORE,JSON.stringify(s));
  }catch(e){console.warn('[Pulse Glass] candidate registry',e)}
}

function registry(){
  if(window.COLONYRendererAdapters) return window.COLONYRendererAdapters;
  const map=new Map();let active=null;
  return window.COLONYRendererAdapters={
    version:'COLONYRendererAdapters/1.0.0',
    register:a=>(map.set(a.id,a),a),
    resolve:(c,app)=>[...map.values()].find(a=>a.matches?.(c,app))||null,
    start:async(a,c,app,w)=>{try{active?.session?.stop?.()}catch{}const session=await a.start({candidate:c,app,cityWindow:w});active={adapter:a,session};return session},
    stopActive:()=>{try{active?.session?.stop?.()}catch{}active=null},
    getActive:()=>active,
    list:()=>[...map.values()].map(a=>({id:a.id,version:a.version,contract:a.contract,apps:a.apps}))
  };
}

function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader');return s}
function program(gl){
  const vs=`#version 300 es\nprecision highp float;layout(location=0)in vec3 p;layout(location=1)in vec3 n;uniform mat4 model,view,proj;out vec3 N;void main(){N=mat3(model)*n;gl_Position=proj*view*model*vec4(p,1.0);}`;
  const fs=`#version 300 es\nprecision highp float;in vec3 N;uniform vec3 color;uniform float exposure;out vec4 outColor;void main(){float l=.38+.62*max(dot(normalize(N),normalize(vec3(.35,.8,.25))),0.);outColor=vec4(color*l*exposure,1.0);}`;
  const p=gl.createProgram(),a=shader(gl,gl.VERTEX_SHADER,vs),b=shader(gl,gl.FRAGMENT_SHADER,fs);gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'link');return p;
}
function indexType(gl,a){return a instanceof Uint32Array?gl.UNSIGNED_INT:a instanceof Uint16Array?gl.UNSIGNED_SHORT:gl.UNSIGNED_BYTE}
function mul4(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}

class Session{
  constructor(candidate,app,w){
    this.c={...C,...candidate,live:true,compatibleApps:[...new Set([...(candidate.compatibleApps||[]),app])]};this.app=app;this.w=w;
    this.ctx=w.__MOOR_RENDER_CONTEXT;if(!this.ctx?.renderer||!this.ctx?.scene||!this.ctx?.camera)throw Error('MOOR render context not ready');
    this.legacy=this.ctx.renderer;this.legacyCanvas=this.legacy.domElement;this.originalRender=this.legacy.render;this.oldStyle={opacity:this.legacyCanvas.style.opacity,position:this.legacyCanvas.style.position,zIndex:this.legacyCanvas.style.zIndex,inset:this.legacyCanvas.style.inset};
    this.canvas=w.document.createElement('canvas');Object.assign(this.canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});(this.legacyCanvas.parentElement||w.document.body).insertBefore(this.canvas,this.legacyCanvas);Object.assign(this.legacyCanvas.style,{position:'absolute',inset:'0',zIndex:'1',opacity:'0'});
    this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,powerPreference:'high-performance'});if(!this.gl){this.restore();throw Error('WebGL2 unavailable')}
    this.prog=program(this.gl);this.buffers=new Map();this.frames=[];this.cpu=[];this.last=null;this.errors=0;this.frame=0;this.stats={calls:0,triangles:0,candidateObjects:0,visibleObjects:0,unsupportedObjects:0,coverage:0,uploadBytes:0,resourceBytes:0};this.u={model:this.gl.getUniformLocation(this.prog,'model'),view:this.gl.getUniformLocation(this.prog,'view'),proj:this.gl.getUniformLocation(this.prog,'proj'),color:this.gl.getUniformLocation(this.prog,'color'),exposure:this.gl.getUniformLocation(this.prog,'exposure')};
    this.previousService=this.ctx.renderService;this.previousAdapter=this.ctx.activeAdapter;this.expose();this.legacy.render=(scene,camera)=>this.render(scene,camera);
  }
  expose(){
    const self=this;this.service={contract:'moor.render/1',rendererId:C.id,rendererName:C.name,rendererVersion:C.implementationVersion,backend:'WebGL2',qualification:'EXPERIMENTAL',canvas:this.canvas,capabilities:{webgl2:true,indexedGeometry:true,instancing:'CPU compatibility path',textures:false,shadows:false,batchedMesh:false,renderReplay:'conditional'},getTelemetry:()=>self.metrics(),renderReplay:r=>self.replay(r)};
    this.ctx.renderService=this.service;this.ctx.activeAdapter={id:C.adapterId,candidateId:C.id,contract:'moor.render/1',getTelemetry:()=>self.metrics()};this.ctx.getRenderTelemetry=()=>self.metrics();this.w.MOORRenderService=this.service;
  }
  geometry(g){
    const pos=g?.attributes?.position;if(!pos?.array)return null;const key=g.uuid||g.id||g;const version=[pos.version||0,g.attributes?.normal?.version||0,g.index?.version||0].join(':');let b=this.buffers.get(key);if(b?.version===version)return b;
    if(b){for(const x of [b.pos,b.norm,b.idx])if(x)this.gl.deleteBuffer(x);this.stats.resourceBytes-=b.bytes||0}
    const gl=this.gl,upload=(arr,target)=>{const x=gl.createBuffer();gl.bindBuffer(target,x);gl.bufferData(target,arr,gl.STATIC_DRAW);this.stats.uploadBytes+=arr.byteLength||0;return x};
    b={version,bytes:0,pos:upload(pos.array,gl.ARRAY_BUFFER),posSize:pos.itemSize||3,count:g.index?.count||pos.count||pos.array.length/(pos.itemSize||3),idx:null,idxType:null};b.bytes+=pos.array.byteLength||0;
    const normal=g.attributes?.normal;if(normal?.array){b.norm=upload(normal.array,gl.ARRAY_BUFFER);b.normSize=normal.itemSize||3;b.bytes+=normal.array.byteLength||0}
    if(g.index?.array){b.idx=upload(g.index.array,gl.ELEMENT_ARRAY_BUFFER);b.idxType=indexType(gl,g.index.array);b.bytes+=g.index.array.byteLength||0}
    this.buffers.set(key,b);this.stats.resourceBytes+=b.bytes;return b;
  }
  drawObject(o,view,proj){
    const gl=this.gl,b=this.geometry(o.geometry);if(!b)return false;
    gl.bindBuffer(gl.ARRAY_BUFFER,b.pos);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,b.posSize,gl.FLOAT,false,0,0);
    if(b.norm){gl.bindBuffer(gl.ARRAY_BUFFER,b.norm);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,b.normSize,gl.FLOAT,false,0,0)}else{gl.disableVertexAttribArray(1);gl.vertexAttrib3f(1,0,1,0)}
    if(b.idx)gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.idx);
    const mat=Array.isArray(o.material)?o.material[0]:o.material;if(mat?.visible===false)return false;const c=color(mat?.color);gl.uniform3f(this.u.color,c[0],c[1],c[2]);gl.uniform1f(this.u.exposure,this.c.params?.exposure||1);gl.uniformMatrix4fv(this.u.view,false,view);gl.uniformMatrix4fv(this.u.proj,false,proj);
    const models=[];if(o.isInstancedMesh&&o.count>0&&o.instanceMatrix?.array&&o.matrixWorld?.elements){const a=o.instanceMatrix.array,w=o.matrixWorld.elements;for(let i=0;i<o.count;i++)models.push(mul4(w,a.subarray(i*16,i*16+16)))}else models.push(o.matrixWorld?.elements);
    const mode=o.isPoints?gl.POINTS:(o.isLine||o.isLineSegments)?gl.LINES:gl.TRIANGLES;let calls=0,tri=0;
    for(const model of models){if(!model)continue;gl.uniformMatrix4fv(this.u.model,false,model);if(b.idx)gl.drawElements(mode,b.count,b.idxType,0);else gl.drawArrays(mode,0,b.count);calls++;if(mode===gl.TRIANGLES)tri+=Math.floor(b.count/3)}
    this.stats.calls+=calls;this.stats.triangles+=tri;return true;
  }
  render(scene,camera){
    const t=this.w.performance.now();this.frame++;this.stats.uploadBytes=0;this.stats.calls=0;this.stats.triangles=0;this.stats.candidateObjects=0;this.stats.visibleObjects=0;this.stats.unsupportedObjects=0;
    try{
      if(this.last!=null){const dt=t-this.last;if(dt>0&&dt<1000){this.frames.push(dt);if(this.frames.length>360)this.frames.shift()}}this.last=t;
      const r=this.legacyCanvas.getBoundingClientRect(),pr=Math.min(this.w.devicePixelRatio||1,this.c.params?.pixelRatioCap||1.6),W=Math.max(1,Math.round(r.width*pr)),H=Math.max(1,Math.round(r.height*pr));if(this.canvas.width!==W||this.canvas.height!==H){this.canvas.width=W;this.canvas.height=H}
      scene.updateMatrixWorld?.();camera.updateMatrixWorld?.();camera.matrixWorldInverse?.copy?.(camera.matrixWorld)?.invert?.();const gl=this.gl;gl.viewport(0,0,W,H);const bg=color(scene.background,[.02,.03,.04]);gl.clearColor(bg[0],bg[1],bg[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.useProgram(this.prog);
      const view=camera.matrixWorldInverse?.elements,proj=camera.projectionMatrix?.elements;if(!view||!proj)throw Error('camera matrices unavailable');
      scene.traverseVisible?.(o=>{if(!(o.isMesh||o.isInstancedMesh||o.isPoints||o.isLine||o.isLineSegments||o.isSprite||o.isLOD))return;this.stats.candidateObjects++;if(o.isBatchedMesh||o.isSprite||o.isLOD){this.stats.unsupportedObjects++;return}const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.length>1||mats.some(m=>m?.map||m?.transparent||(m?.opacity??1)<.999))this.stats.unsupportedObjects++;if(this.drawObject(o,view,proj))this.stats.visibleObjects++});
      let coverage=this.stats.candidateObjects?this.stats.visibleObjects/this.stats.candidateObjects:1;coverage*=Math.max(0,1-(this.stats.unsupportedObjects/Math.max(1,this.stats.candidateObjects))*.35);if(this.c.params?.shadows)coverage*=.90;if(scene.fog)coverage*=.95;this.stats.coverage=Math.max(0,Math.min(1,coverage));
    }catch(e){this.errors++;console.error('[Pulse Glass 141]',e)}finally{const dt=this.w.performance.now()-t;this.cpu.push(dt);if(this.cpu.length>360)this.cpu.shift()}
  }
  metrics(){const f=this.frames.slice(-180),c=this.cpu.slice(-180),m=med(f),long=f.filter(x=>x>25).length/Math.max(1,f.length);return{schema:'moor.render.telemetry/1',renderer_id:C.id,renderer_version:C.implementationVersion,backend:'WebGL2',quality_profile:'MOOR_CITY',hardware_id:this.gl.getParameter(this.gl.RENDERER)||'UNAVAILABLE',scene_id:'moor.city.island.live',replay_id:null,frame_number:this.frame,frame_interval_ms:f.at(-1)??'UNAVAILABLE',cpu_render_extract_ms:'UNAVAILABLE',cpu_visibility_ms:'UNAVAILABLE',cpu_lod_ms:'UNAVAILABLE',cpu_render_prepare_ms:q(c,.95)??'UNAVAILABLE',cpu_submit_ms:'UNAVAILABLE',gpu_frame_ms:'UNAVAILABLE',draw_calls:this.stats.calls,triangles:this.stats.triangles,instances:'UNAVAILABLE',visible_objects:this.stats.visibleObjects,candidate_objects:this.stats.candidateObjects,cpu_resource_bytes:this.stats.resourceBytes,gpu_resource_bytes:this.stats.resourceBytes,upload_bytes_frame:this.stats.uploadBytes,shader_compiles:2,job_queue_depth:0,stale_jobs_discarded:0,samples:f.length,warming:f.length<20,frameP95:q(f,.95),frameP99:q(f,.99),fps:m?1000/m:null,renderCpuP95:q(c,.95),calls:this.stats.calls,coverage:this.stats.coverage,longFrameRatio:long,heap:this.w.performance?.memory?.usedJSHeapSize??null,errors:this.errors,unsupportedObjects:this.stats.unsupportedObjects,shadowCapability:false,requestedShadows:!!this.c.params?.shadows,qualification:'EXPERIMENTAL'}}
  getMetrics(){return this.metrics()} getTelemetry(){return this.metrics()}
  replay(r){const x=this.w.MOORRenderReplay||this.w.__MOOR_RENDER_REPLAY;return x?.runWithRenderer?x.runWithRenderer(this.service,r):{supported:false,contract:'moor.render/1',reason:'RenderReplay service unavailable in this City Island build'}}
  restore(){if(this.legacyCanvas)Object.assign(this.legacyCanvas.style,this.oldStyle||{});try{this.canvas?.remove()}catch{}}
  stop(){try{this.legacy.render=this.originalRender}catch{}this.restore();try{for(const b of this.buffers.values())for(const x of [b.pos,b.norm,b.idx])if(x)this.gl.deleteBuffer(x);this.gl.deleteProgram(this.prog)}catch{}this.ctx.renderService=this.previousService;this.ctx.activeAdapter=this.previousAdapter;delete this.ctx.getRenderTelemetry;if(this.w.MOORRenderService===this.service)this.w.MOORRenderService=this.previousService||null}
}

const adapter={id:C.adapterId,version:C.implementationVersion,contract:'moor.render/1',apps:['moor.city.island'],candidateIds:[C.id],matches:(c,app)=>app==='moor.city.island'&&(c?.id===C.id||c?.adapterId===C.adapterId),start:async({candidate,app,cityWindow})=>new Session(candidate,app,cityWindow)};
persistCandidate();const R=registry();R.register(adapter);window.COLONYPulseGlass141={version:C.implementationVersion,candidate:{...C},adapter,registry:R};
})();
