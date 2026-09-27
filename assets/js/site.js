// Shared page behaviour for index.html and prequel.html (and the generated
// translations). Kept out of the HTML so the CSP can forbid inline script.
(function(){

  // Localize Amazon links to the visitor's browser region (falls back to .com)
  (function(){
    const map={US:'com',CA:'ca',GB:'co.uk',UK:'co.uk',IE:'co.uk',DE:'de',AT:'de',CH:'de',
      FR:'fr',BE:'fr',IT:'it',ES:'es',NL:'nl',PL:'pl',SE:'se',AU:'com.au',NZ:'com.au',
      JP:'co.jp',IN:'in',MX:'com.mx',BR:'com.br',SG:'sg',AE:'ae',SA:'sa',TR:'com.tr',EG:'eg'};
    const langs=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en-US'];
    let dom='ca';
    for(const l of langs){const m=/[-_]([A-Za-z]{2})$/.exec(l||'');if(m&&map[m[1].toUpperCase()]){dom=map[m[1].toUpperCase()];break;}}
    document.querySelectorAll('a.js-amazon').forEach(a=>{
      a.href='https://www.amazon.'+dom+'/dp/'+a.getAttribute('data-asin');
    });
  })();

  // Nav background on scroll
  const nav=document.querySelector('header.nav');
  if(nav) addEventListener('scroll',()=>{nav.style.background=scrollY>40?'rgba(10,12,14,.9)':'rgba(10,12,14,.72)';});

  // Reveal on scroll
  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')})},{threshold:.18});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // Mailing list — submits to Kit (form 9532000) via fetch, keeps user on page.
  async function handleSignup(e){
    e.preventDefault();
    const form=document.getElementById('signupForm');
    const btn=form.querySelector('button');
    const email=document.getElementById('email').value;
    const msg=document.getElementById('signupMsg');
    // Language of THIS page — baked into <html lang> by the pre-render build.
    // Use the page's language (not a stored dropdown preference) so the message
    // always matches the page the visitor actually subscribed from.
    let lang='en';
    try{ lang=(document.documentElement.lang||'en').slice(0,2); }catch(_){}
    const MSG={
      // The confirmation email's subject line is English for every language —
      // it is what the reader will literally see in their inbox, so it is NOT
      // translated here. Naming the sender + subject measurably lifts confirms.
      en:{t:'> TRANSMITTING…', ok:'✓ VERIFIED / GREEN — one step left: open the email from james@portman.ca titled “One step to enter Baylight” and tap confirm. Not there? Check spam.', err:'⚠ SIGNAL LOST — please try again in a moment.'},
      pt:{t:'> TRANSMITINDO…', ok:'✓ VERIFICADO / VERDE — falta um passo: abra o e-mail de james@portman.ca com o assunto “One step to enter Baylight” e confirme. Não encontrou? Veja o spam.', err:'⚠ SINAL PERDIDO — tente novamente em instantes.'},
      es:{t:'> TRANSMITIENDO…', ok:'✓ VERIFICADO / VERDE — falta un paso: abre el correo de james@portman.ca con el asunto “One step to enter Baylight” y confirma. ¿No lo ves? Revisa el spam.', err:'⚠ SEÑAL PERDIDA — inténtalo de nuevo en un momento.'},
      fr:{t:'> TRANSMISSION…', ok:'✓ VÉRIFIÉ / VERT — une étape reste : ouvrez l’e-mail de james@portman.ca intitulé « One step to enter Baylight » et confirmez. Rien reçu ? Vérifiez les spams.', err:'⚠ SIGNAL PERDU — réessayez dans un instant.'},
      zh:{t:'> 传输中…', ok:'✓ 已验证 / 绿色 —— 还差一步：打开来自 james@portman.ca、主题为“One step to enter Baylight”的邮件并点击确认。没看到？请查看垃圾邮件。', err:'⚠ 信号丢失 —— 请稍后再试。'},
      fa:{t:'> در حالِ ارسال…', ok:'✓ تأییدشده / سبز — یک قدم مانده: ایمیلِ james@portman.ca با موضوعِ «One step to enter Baylight» را باز کنید و تأیید را بزنید. نبود؟ پوشه‌ی اسپم را ببینید.', err:'⚠ سیگنال قطع شد — لطفاً چند لحظه بعد دوباره تلاش کنید.'}
    };
    const m=MSG[lang]||MSG.en;
    const langName={en:'English', pt:'Português', es:'Español', fr:'Français', zh:'中文', fa:'فارسی'}[lang]||lang;
    msg.style.color='var(--green)';
    msg.textContent=m.t;
    btn.disabled=true;
    try{
      const data=new FormData();
      data.append('email_address',email);
      // Records the sign-up language on the subscriber in Kit (create a
      // "language" custom field in Kit so this value is stored).
      data.append('fields[language]',langName);
      const res=await fetch('https://app.kit.com/forms/9532000/subscriptions',{
        method:'POST',
        headers:{'Accept':'application/json'},
        body:data
      });
      if(!res.ok) throw new Error('bad status');
      msg.style.color='var(--green)';
      msg.textContent=m.ok;
      form.reset();
    }catch(err){
      msg.style.color='#f2643b';
      msg.textContent=m.err;
    }finally{
      btn.disabled=false;
    }
    return false;
  }

  // Wired here rather than with an inline onsubmit attribute, which the
  // Content-Security-Policy in _headers would block.
  const signupForm=document.getElementById('signupForm');
  if(signupForm) signupForm.addEventListener('submit',handleSignup);

})();
