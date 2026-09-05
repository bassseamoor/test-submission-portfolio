(()=>{
  'use strict';
  if(window.COLONYRequestCapture) return;

  const DB_NAME='colony-request-capture-v1';
  const DB_VERSION=1;
  const STORE='requests';
  let requestZ=5200;

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Request database unavailable'));
    });
  }

  async function persist(record){
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('Request save failed'));
        tx.onabort=()=>reject(tx.error||new Error('Request save aborted'));
      });
    }finally{db.close()}
  }

  async function list(){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))));
        req.onerror=()=>reject(req.error);
      });
    }finally{db.close()}
  }

  function makeWindow(payload){
    const id='request-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
    const shell=document.createElement('section');
    shell.className='cbs colony-request-tab';
    shell.dataset.requestId=id;
    shell.style.zIndex=String(++requestZ);
    shell.innerHTML=`
      <header class="cbh">
        <div class="cbt">City Island Request</div>
        <div class="cbk">SCREEN + TEXT</div>
        <div class="cba">
          <button type="button" data-rq="min">—</button>
          <button type="button" data-rq="max">□</button>
          <button type="button" data-rq="close">×</button>
        </div>
      </header>
      <main class="cbb" style="display:grid;grid-template-rows:minmax(120px,42%) 1fr;gap:12px;overflow:hidden">
        <section style="min-height:0;border:1px solid #ffffff18;border-radius:12px;background:#0d1013;display:grid;place-items:center;overflow:hidden" data-rq-shot>
          <div class="muted">CAPTURING SCREEN…</div>
        </section>
        <section style="min-height:0;display:grid;grid-template-rows:auto 1fr auto;gap:8px">
          <div class="muted">Describe exactly what you want changed. The screenshot and request stay attached to the same request ID.</div>
          <textarea data-rq-text autofocus placeholder="What should change here?" style="box-sizing:border-box;width:100%;height:100%;resize:none;border:1px solid #ffffff22;border-radius:11px;background:#101316;color:white;padding:12px;font:600 13px/1.5 system-ui;outline:none"></textarea>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <button class="btn p" type="button" data-rq="submit">SUBMIT REQUEST</button>
            <button class="btn" type="button" data-rq="copy">COPY TEXT</button>
            <span class="muted" data-rq-status style="margin-left:auto">NOT SUBMITTED</span>
          </div>
        </section>
      </main>`;
    document.body.appendChild(shell);

    const shot=shell.querySelector('[data-rq-shot]');
    let objectUrl=null;
    if(payload.screenshotBlob){
      objectUrl=URL.createObjectURL(payload.screenshotBlob);
      shot.innerHTML=`<img alt="Captured MOOR City screen" src="${objectUrl}" style="width:100%;height:100%;object-fit:contain;background:#000">`;
    }else{
      shot.innerHTML='<div class="muted">SCREEN CAPTURE UNAVAILABLE — REQUEST CAN STILL BE SUBMITTED</div>';
    }

    const text=shell.querySelector('[data-rq-text]');
    const status=shell.querySelector('[data-rq-status]');
    requestAnimationFrame(()=>text?.focus());

    shell.querySelector('[data-rq="close"]').onclick=()=>{
      if(objectUrl) URL.revokeObjectURL(objectUrl);
      shell.remove();
    };
    shell.querySelector('[data-rq="max"]').onclick=()=>shell.classList.toggle('max');
    shell.querySelector('[data-rq="min"]').onclick=()=>{
      shell.classList.add('min');
      const dock=document.querySelector('.cbdock');
      if(!dock) return;
      const b=document.createElement('button');
      b.textContent='City Request';
      b.onclick=()=>{shell.classList.remove('min');b.remove()};
      dock.appendChild(b);
    };
    shell.querySelector('[data-rq="copy"]').onclick=async()=>{
      try{await navigator.clipboard.writeText(text.value||'');status.textContent='TEXT COPIED'}catch{status.textContent='COPY FAILED'}
    };
    shell.querySelector('[data-rq="submit"]').onclick=async()=>{
      const body=(text.value||'').trim();
      if(!body){status.textContent='TYPE A REQUEST FIRST';text.focus();return}
      const createdAt=payload.capturedAt||new Date().toISOString();
      const record={
        id,
        schema:'colony.city-island.request/1',
        projectId:'moor.city',
        createdAt,
        source:payload.source||'moor-city-island',
        runtimeUrl:payload.runtimeUrl||'',
        text:body,
        screenshot:payload.screenshotBlob||null,
        screenshotType:payload.screenshotBlob?.type||null,
        screenshotBytes:payload.screenshotBlob?.size||0,
        status:'submitted'
      };
      status.textContent='SAVING…';
      try{
        await persist(record);
        try{window.COLONYContinuity?.capture?.(body,{source:'city-island-request',requestId:id,capturedAt:createdAt,screenshot:!!payload.screenshotBlob,screenshotBytes:record.screenshotBytes})}catch{}
        try{window.MOORProjectRouting?.routeMoorCityUpdate?.(`City Island Request ${createdAt}`,`${body}\n\nRequest ID: ${id}\nCaptured: ${createdAt}\nScreenshot: ${payload.screenshotBlob?'attached in COLONY request database':'unavailable'}`)}catch{}
        status.textContent='SUBMITTED';
        shell.dataset.submitted='1';
      }catch(err){
        status.textContent='SAVE FAILED';
        console.error('[COLONY request capture]',err);
      }
    };

    const head=shell.querySelector('.cbh');
    let dragging=false,sx=0,sy=0,left=0,top=0;
    head.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||shell.classList.contains('max')) return;
      const r=shell.getBoundingClientRect();
      dragging=true;sx=e.clientX;sy=e.clientY;left=r.left;top=r.top;
      shell.style.transform='none';shell.style.left=left+'px';shell.style.top=top+'px';
      head.setPointerCapture?.(e.pointerId);
    });
    head.addEventListener('pointermove',e=>{
      if(!dragging) return;
      shell.style.left=Math.max(4,Math.min(innerWidth-shell.offsetWidth-4,left+e.clientX-sx))+'px';
      shell.style.top=Math.max(4,Math.min(innerHeight-50,top+e.clientY-sy))+'px';
    });
    head.addEventListener('pointerup',()=>dragging=false);

    return shell;
  }

  async function captureFromCityWindow(cityWindow){
    try{
      const ctx=cityWindow.__MOOR_RENDER_CONTEXT;
      const canvas=ctx?.renderer?.domElement || [...cityWindow.document.querySelectorAll('canvas')]
        .filter(c=>{const r=c.getBoundingClientRect();return r.width>20&&r.height>20})
        .sort((a,b)=>{
          const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
          return br.width*br.height-ar.width*ar.height;
        })[0];
      if(!canvas) return null;
      try{if(ctx?.renderer&&ctx?.scene&&ctx?.camera) ctx.renderer.render(ctx.scene,ctx.camera)}catch{}
      return await new Promise(resolve=>{
        try{canvas.toBlob(blob=>resolve(blob||null),'image/png')}catch{resolve(null)}
      });
    }catch{return null}
  }

  async function open(payload={}){
    return makeWindow(payload);
  }

  async function captureCity(cityWindow){
    const capturedAt=new Date().toISOString();
    const screenshotBlob=await captureFromCityWindow(cityWindow);
    return open({
      source:'moor-city-island',
      runtimeUrl:cityWindow?.location?.href||'',
      capturedAt,
      screenshotBlob
    });
  }

  function editableTarget(t){
    const tag=String(t?.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||tag==='select'||t?.isContentEditable;
  }

  function attachFrame(frame){
    if(!frame||frame.dataset.colonyRequestCapture==='1') return;
    const src=String(frame.getAttribute('src')||frame.src||'');
    if(!/moor-city/i.test(src)) return;
    frame.dataset.colonyRequestCapture='1';
    const install=()=>{
      try{
        const cw=frame.contentWindow;
        if(!cw||cw.__COLONY_BACKSLASH_REQUEST_INSTALLED) return;
        cw.__COLONY_BACKSLASH_REQUEST_INSTALLED=true;
        cw.addEventListener('keydown',async e=>{
          if(e.repeat||editableTarget(e.target)) return;
          if(e.code!=='Backslash'&&e.key!=='\\') return;
          e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
          await captureCity(cw);
        },true);
      }catch(err){console.warn('[COLONY] Could not attach City request shortcut',err)}
    };
    frame.addEventListener('load',install);
    setTimeout(install,250);
  }

  const mo=new MutationObserver(()=>document.querySelectorAll('iframe').forEach(attachFrame));
  mo.observe(document.documentElement,{childList:true,subtree:true});
  document.querySelectorAll('iframe').forEach(attachFrame);

  window.COLONYRequestCapture={
    version:'COLONYRequestCapture/1.0.0',
    open,
    captureCity,
    list
  };
})();