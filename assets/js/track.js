// First-party pageview beacon, loaded by every public page.
// First-party pageview tracking (no cookies). Fire-and-forget.
  (function(){try{
    if(location.pathname.indexOf('/admin')===0)return;
    var p={path:location.pathname,referrer:document.referrer||''};
    var b=JSON.stringify(p);
    if(navigator.sendBeacon){navigator.sendBeacon('/api/track',new Blob([b],{type:'application/json'}));}
    else{fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true});}
  }catch(e){}})();
