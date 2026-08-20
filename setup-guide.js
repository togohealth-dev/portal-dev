// Shared behaviour for the setup guides: OS tabs, scroll trail, and click-to-copy.
// OS tab toggle — one click switches every code block on the page, remembered via localStorage.
  function setOS(os){
    document.querySelectorAll('.oscode').forEach(function(box){
      box.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('active', t.dataset.os === os); });
      box.querySelectorAll('pre').forEach(function(p){ p.classList.toggle('show', p.classList.contains('os-'+os)); });
    });
    try { localStorage.setItem('togo-setup-os', os); } catch(e){}
  }
  document.querySelectorAll('.oscode .tab').forEach(function(btn){
    btn.addEventListener('click', function(){ setOS(btn.dataset.os); });
  });
  (function(){
    var saved = null;
    try { saved = localStorage.getItem('togo-setup-os'); } catch(e){}
    if (saved === 'mac' || saved === 'pc') setOS(saved);
  })();

  // scroll progress + trail fill + reveal (same mechanism as "How We Ship")
  var steps = [].slice.call(document.querySelectorAll('.step,.phase'));
  var trail = document.getElementById('trail'), fill = document.getElementById('fill'), bar = document.getElementById('bar');
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold:.14, rootMargin:'0px 0px -8% 0px' });
  steps.forEach(function(s){ io.observe(s); });

  // The hub page has no scroll-trail, so every element here is optional.
  function onScroll(){
    var d = document.documentElement;
    if (bar) {
      var p = d.scrollTop / Math.max(1, d.scrollHeight - d.clientHeight);
      bar.style.width = (p*100).toFixed(2) + '%';
    }
    if (trail && fill) {
      var r = trail.getBoundingClientRect();
      var seen = Math.min(Math.max(window.innerHeight*0.6 - r.top, 0), trail.offsetHeight);
      fill.style.height = seen + 'px';
    }
  }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
  onScroll();

  // ── click-to-copy ──────────────────────────────────────────────────────────
  // Copies the code variant that is actually visible (Mac or PC), so the button
  // never hands you the other platform's command.
  document.querySelectorAll('.oscode').forEach(function(box){
    var btn = box.querySelector('.copy');
    if (!btn) return;
    btn.addEventListener('click', function(){
      var pre = box.querySelector('pre.show') || box.querySelector('pre');
      if (!pre) return;
      var text = pre.innerText.replace(/\s+$/,'');
      var done = function(ok){
        var old = btn.dataset.label || btn.innerHTML;
        btn.dataset.label = old;
        btn.innerHTML = ok ? '<span class="sq">\u2713</span> Copied' : '<span class="sq">\u26a0</span> Press \u2318C';
        btn.classList.toggle('done', ok);
        setTimeout(function(){ btn.innerHTML = old; btn.classList.remove('done'); }, 1700);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ fallback(); });
      } else { fallback(); }
      // file:// and plain http have no clipboard API — select the text instead so
      // the reader can still copy it with one keystroke rather than dragging.
      function fallback(){
        try {
          var r = document.createRange(); r.selectNodeContents(pre);
          var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
          done(document.execCommand && document.execCommand('copy'));
        } catch(e){ done(false); }
      }
    });
  });
