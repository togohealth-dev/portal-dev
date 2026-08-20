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

  // ── email the command list ─────────────────────────────────────────────────
  // The body is BUILT FROM THE PAGE's own command blocks (the [data-step] ones,
  // in order, using whichever OS variant is showing), so the email can never
  // drift from the guide it was sent from.
  // This is a static site with no server, so nothing is sent from here: we open
  // a pre-filled draft and the sender presses Send. The UI says exactly that.
  (function(){
    var box = document.querySelector('.sendbox');
    if (!box) return;
    var input = box.querySelector('input'), btn = box.querySelector('.send'),
        msg = box.querySelector('.sendmsg');

    function commands(){
      var blocks = [].slice.call(document.querySelectorAll('.oscode[data-step]'));
      blocks.sort(function(a,b){ return (+a.dataset.step) - (+b.dataset.step); });
      return blocks.map(function(b){
        var pre = b.querySelector('pre.show') || b.querySelector('pre');
        return { n:b.dataset.step, label:b.dataset.label || '', cmd:pre.innerText.replace(/\s+$/,'') };
      });
    }
    function bodyText(){
      var os = document.querySelector('.oscode .tab.active');
      var lines = [
        'Here are the setup commands for your new machine.',
        '',
        'HOW TO RUN THEM: open Terminal, then paste ONE command, press Return, and',
        'wait for it to finish before pasting the next. Do not paste them as a block',
        '- two of them stop and wait for you, and one needs the shell state that the',
        'command before it creates.',
        ''
      ];
      commands().forEach(function(c){
        lines.push(c.n + ') ' + c.label);
        lines.push(c.cmd);
        lines.push('');
      });
      lines.push('That last one starts Claude Code. Sign in with your work Claude account.');
      lines.push('');
      lines.push('The illustrated version of this - what each command should print, what to');
      lines.push('do when one fails, and the card to run next - is here:');
      // Canonical URL on purpose, NOT location.origin: this body is going to someone
      // else's machine, so a link built from a localhost preview would be useless there.
      lines.push('https://togohealth-dev.github.io/portal-dev/setup-a.html');
      if (os && os.dataset.os === 'pc') lines.push('', '(Sent with the PC commands selected.)');
      return lines.join('\n');
    }
    var SUBJECT = 'Your TogoHealth machine setup - six commands, one at a time';

    function show(html, isErr){ msg.innerHTML = html; msg.classList.toggle('err', !!isErr); }

    btn.addEventListener('click', function(){
      var to = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
        input.classList.add('bad'); input.focus();
        show('That does not look like an email address - check it and click Send again.', true);
        return;
      }
      input.classList.remove('bad');
      var q = 'to=' + encodeURIComponent(to) + '&su=' + encodeURIComponent(SUBJECT) +
              '&body=' + encodeURIComponent(bodyText());
      var gmail = 'https://mail.google.com/mail/?view=cm&fs=1&' + q;
      var mailto = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(SUBJECT) +
                   '&body=' + encodeURIComponent(bodyText());
      window.open(gmail, '_blank', 'noopener');
      show('Draft opened in Gmail for <b>' + to.replace(/[<&>]/g,'') + '</b> \u2014 <b>press Send there</b> to actually send it. ' +
           'Nothing leaves this page on its own. <a href="' + mailto + '">Use my mail app instead</a>.');
    });
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') btn.click(); });

    var copyAll = box.querySelector('[data-copyall]');
    if (copyAll) copyAll.addEventListener('click', function(){
      var text = commands().map(function(c){ return '# ' + c.n + ') ' + c.label + '\n' + c.cmd; }).join('\n\n');
      var after = function(ok){ show(ok ? 'All six commands copied \u2014 paste them into any message you like.'
                                        : 'Could not reach the clipboard \u2014 select the blocks below instead.', !ok); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function(){after(true);},function(){after(false);});
      else after(false);
    });
  })();
