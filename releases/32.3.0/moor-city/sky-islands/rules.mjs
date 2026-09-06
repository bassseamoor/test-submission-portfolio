// Shared deterministic simulation; no scene graph, DOM, clock or storage ownership.
export const RULES=Object.freeze({version:'5.2.4',epochMs:600000,dropMeters:60.96,wastelandDropDepth:6,galleryRise:70.73,unit:2,halfCells:128,chunkCells:32,patchCount:24,mineCooldownMs:1000,mineReach:6,bagCapacity:240,incomeFraction:.001,offlineCapMs:7200000});
export const ORES=Object.freeze([
 {id:'iron',name:'Iron',color:0x94b9c3,price:1.25},
 {id:'copper',name:'Copper',color:0xe29b62,price:2},
 {id:'crystal',name:'Crystal',color:0x8cd7d0,price:4}
]);
export function hash(x,z,seed=0){let a=Math.imul(x^seed,374761393)^Math.imul(z,668265263);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967296;}
export function epochAt(now){return Math.floor(now/RULES.epochMs);}
export function heightAt(x,z){const gx=Math.floor(x/2),gz=Math.floor(z/2);if(Math.abs(x)<58&&z>-90&&z<26)return 0;const v=Math.sin(gx*.065)*2.5+Math.cos(gz*.075)*2+Math.sin((gx+gz)*.035)*3;return Math.max(0,Math.floor((v+5)/2))*2;}
export function onDeck(x,z){return Math.abs(x)<=54&&z>=-86&&z<=22;}
export function onGallery(x,z){
 return Math.abs(x)>=35.5&&Math.abs(x)<=52.5&&z>=-79.9&&z<=12.9;
}
export function galleryRampAt(x,z){
 const ax=Math.abs(x);
 if(ax<39.5||ax>48.5||z<-50||z>-14)return null;
 const t=Math.max(0,Math.min(1,(-z-14)/36));
 return RULES.dropMeters+t*RULES.galleryRise;
}
export function spawnPositionAllowed(x,z,y){
 const Y=RULES.dropMeters,playerRadius=.62,playerHeight=2.8;
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>=250||Math.abs(z)>=250)return false;

 // The four colonnades are solid from their deck plinths through their capitals.
 if(y+playerHeight>=Y-.05&&y<=Y+22){
  for(const px of[-52.5,-35.5,35.5,52.5])for(const pz of[-78,-63,-48,-33,-18,-3,12]){
   if(Math.hypot(x-px,z-pz)<2.8+playerRadius)return false;
  }
 }

 // Upper spectator corridors are bounded by their inner/outer long walls and
 // their masonry end returns. This leaves the gallery aisle itself walkable.
 if(y+playerHeight>=Y+20&&y<=Y+82){
  for(const wx of[-52.5,-35.8,35.8,52.5]){
   if(Math.abs(x-wx)<1.65+playerRadius&&z>=-81-playerRadius&&z<=15+playerRadius)return false;
  }
  for(const wz of[-79.4,13.4])for(const [x0,x1] of[[-55,-33],[33,55]]){
   if(x>=x0-playerRadius&&x<=x1+playerRadius&&Math.abs(z-wz)<1.65+playerRadius)return false;
  }
 }
 return true;
}
export function surfaceAt(x,z,y){
 if(onGallery(x,z)&&y>=RULES.dropMeters+RULES.galleryRise-.5)return RULES.dropMeters+RULES.galleryRise+.1;
 if(onDeck(x,z)&&y>=RULES.dropMeters-.5)return RULES.dropMeters+.1;
 return heightAt(x,z)+.1;
}
export function generateDeposits(epoch){const out=[];const used=new Set();for(let p=0;p<RULES.patchCount;p++){
 const a=p*Math.PI*2/RULES.patchCount+hash(p,4,epoch)*.18;
 const radius=70+hash(p,5,epoch)*130;
 const cx=Math.round(Math.sin(a)*radius/2)*2,cz=Math.round(Math.cos(a)*radius/2)*2;
 const rx=5+Math.floor(hash(p,6,epoch)*4),rz=5+Math.floor(hash(p,7,epoch)*4);
 const type=p%9===0?2:p%3===0?1:0;
 for(let dz=-rz;dz<=rz;dz++)for(let dx=-rx;dx<=rx;dx++){
  if((dx*dx)/(rx*rx)+(dz*dz)/(rz*rz)>1||hash(dx+p*23,dz,epoch)<.16)continue;
  const x=cx+dx*2,z=cz+dz*2,k=`${x},${z}`;
  if(used.has(k)||Math.abs(x)>248||Math.abs(z)>248||onDeck(x,z))continue;
  used.add(k);out.push({id:`${epoch}:${p}:${dx}:${dz}`,patch:p,type,x,z,y:heightAt(x,z)+.35});
 }
}return out;}
export function nearestOre(nodes,depleted,p,reach=RULES.mineReach){let best=null,d=reach*reach;for(const n of nodes){if(depleted.has(n.id))continue;const q=(n.x-p.x)**2+(n.z-p.z)**2+(n.y-p.y)**2;if(q<d){best=n;d=q;}}return best;}
export function bagCount(bag){return ORES.reduce((n,o)=>n+Math.max(0,Number(bag[o.id])||0),0);}
export function saleValue(bag){return Math.round(ORES.reduce((n,o)=>n+Math.max(0,Number(bag[o.id])||0)*o.price,0)*100)/100;}
export function incomeFor(value,elapsed){return Math.max(0,value)*RULES.incomeFraction*Math.min(RULES.offlineCapMs,Math.max(0,elapsed))/60000;}
