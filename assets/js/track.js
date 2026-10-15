// First-party analytics, loaded by every public page. No cookies.
// Sends one pageview per page load, plus a few visitor actions:
//   pdf_open        a chapter PDF link was clicked        (target: file name)
//   audio_play      an audiobook / narration player started (target: file name)
//   video_play      the opening-credits video started       (target: file name)
//   outbound_click  a link to another site was clicked      (target: host name)
//   signup_submit   the mailing-list form was accepted by Kit (from site.js)
// /api/track validates every field; anything it doesn't recognise is dropped.
(function(){
  try{
    if(location.pathname.indexOf('/admin')===0)return;
    // "Don't count this browser" on the admin dashboard sets this flag.
    try{ if(localStorage.getItem('bl_no_track')==='1')return; }catch(_){}

    function send(p){
      try{
        var b=JSON.stringify(p);
        if(navigator.sendBeacon){navigator.sendBeacon('/api/track',new Blob([b],{type:'application/json'}));}
        else{fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true});}
      }catch(_){}
    }
    function fileName(u){ try{ return new URL(u,location.href).pathname.split('/').pop(); }catch(_){ return ''; } }

    // Exposed for site.js (mailing-list sign-up).
    window.blTrack=function(action,target){
      send({kind:'action',action:action,target:target||'',path:location.pathname});
    };

    send({kind:'pageview',path:location.pathname,referrer:document.referrer||''});

    document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
      if(!a)return;
      var u; try{ u=new URL(a.href,location.href); }catch(_){ return; }
      if(u.origin===location.origin){
        if(/\.pdf$/i.test(u.pathname)) window.blTrack('pdf_open',fileName(u.href));
      }else if(/^https?:$/.test(u.protocol) && u.hostname!==location.hostname){
        window.blTrack('outbound_click',u.hostname.replace(/^www\./,''));
      }
    },true);

    // One play per player per page load, so pausing and resuming isn't counted twice.
    var played=new WeakSet();
    document.addEventListener('play',function(e){
      var m=e.target;
      if(!m||played.has(m))return;
      var tag=(m.tagName||'').toLowerCase();
      if(tag!=='audio'&&tag!=='video')return;
      played.add(m);
      window.blTrack(tag+'_play',fileName(m.currentSrc||m.src||''));
    },true);
  }catch(e){}
})();
