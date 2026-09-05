(()=>{'use strict';
const load=(src,label)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error(label+' failed to load'));document.head.appendChild(s)});
load('https://cdn.jsdelivr.net/gh/bassseamoor/test-submission-portfolio@2b20843fca3348599795c071770de951be7c4c55/releases/30.0.0/update/colony-updater.js','COLONY shell').then(()=>load('https://cdn.jsdelivr.net/gh/bassseamoor/test-submission-portfolio@eeac436da2ba9959709c27210fb730e50941c940/releases/30.1.0/update/colony-request-capture.js','City request capture')).catch(err=>console.error('[COLONY 30.1]',err));
})();
