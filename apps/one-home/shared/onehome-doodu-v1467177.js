(function(){
'use strict';
if(window.__ONEHOME_DOODU_V1467177__) return;
window.__ONEHOME_DOODU_V1467177__=true;

var LESSONS = {
 A:{word:'Apple',challenge:'Can you make the A handshape?',guide:'Close your fingers into a fist and rest your thumb along the side of your index finger.'},
 B:{word:'Bowling Buddy',challenge:'Design or color your favorite bowling ball.'},
 C:{word:'Coffee',challenge:'Color the coffee cup.'},
 D:{word:'Dood',challenge:'Design your own Dood shirt.'},
 E:{word:'Ember',challenge:'Draw something that inspires you.'},
 F:{word:'Fish',challenge:'Color the fish any colors you want.'},
 G:{word:'Garden',challenge:'Draw something growing.'},
 H:{word:'Home',challenge:'Draw something that makes home special.'},
 I:{word:'Ice Cream',challenge:'Create your dream flavor.'},
 J:{word:'Jelly Bean',challenge:'Draw and count your jelly beans.'},
 K:{word:'Key',challenge:'Design your own key.'},
 L:{word:'Learn',challenge:'Draw or write something you learned today.'},
 M:{word:'Moon',challenge:'Draw stars around the moon.'},
 N:{word:'Night Shots',challenge:'Draw a favorite memory.'},
 O:{word:'Owl',challenge:'Give your owl its own colors.'},
 P:{word:'Possum',challenge:'Give your possum a name.'},
 Q:{word:'Quill Key',challenge:'Design your own special key.'},
 R:{word:'Rare',challenge:'Draw something unique.'},
 S:{word:'Skateboard',challenge:'Design your own skateboard deck.'},
 T:{word:'Taco',challenge:'Add your favorite toppings.'},
 U:{word:'University',challenge:'If you could teach something, what would you teach?'},
 V:{word:'Volcano',challenge:'Color the eruption.'},
 W:{word:'Wallet',challenge:'Draw treasures you would keep inside.'},
 X:{word:'XRP',challenge:'Draw a path around the world.',note:'XRP is a digital asset designed to help value move from one place to another.'},
 Y:{word:'Yo-Yo',challenge:'Draw a cool yo-yo trick.'},
 Z:{word:'Zombie',challenge:'Create your own silly friendly zombie.'}
};

var ORDER = Object.keys(LESSONS);
var STORE='onehome_doodu_asl_v1_progress';

function q(id){ return document.getElementById(id); }
function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
function ensurePage(id){
  var p=q(id); if(p) return p;
  var main=q('top')||document.querySelector('main')||document.body;
  p=document.createElement('div'); p.className='page-view'; p.id=id; main.appendChild(p); return p;
}
function show(id){
  try{ if(window.oneHomeV15Show){ window.oneHomeV15Show(id); return; } }catch(_e){}
  try{ if(window.showPage){ window.showPage(id); return; } }catch(_e2){}
  document.querySelectorAll('.page-view').forEach(function(p){p.classList.remove('active')});
  var page=q(id); if(page) page.classList.add('active');
  try{window.scrollTo({top:0,behavior:'auto'})}catch(_e3){}
}
function progress(){
  try{ var x=JSON.parse(localStorage.getItem(STORE)||'{}'); return x&&typeof x==='object'?x:{}; }catch(_e){return {};}
}
function saveProgress(data){ try{ localStorage.setItem(STORE,JSON.stringify(data||{})); }catch(_e){} }
function appleSvg(){return '<svg viewBox="0 0 220 220" aria-label="Apple coloring outline" role="img"><path d="M113 54c-2-22 12-38 30-44" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M118 43c19-15 37-8 45 4-20 6-34 5-45-4Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/><path d="M109 67c-29-22-73-9-82 34-10 48 32 100 79 100 17 0 27-9 36-9 8 0 19 9 35 9 48 0 83-54 72-101-9-39-51-54-82-33-18 12-38 12-58 0Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/></svg>';}

function renderLanding(){
  var p=ensurePage('doodUPage');
  p.innerHTML=''+
  '<div class="doodu-shell">'+
    '<header class="doodu-hero">'+
      '<p class="doodu-kicker">Dood U</p>'+ 
      '<h1>Welcome to Dood U</h1>'+ 
      '<div class="doodu-tagline">Learn something new. Create something fun. Share what you discover.</div>'+ 
    '</header>'+ 
    '<nav class="doodu-area-list" aria-label="Dood U learning areas">'+
      '<button class="doodu-area-link" type="button" onclick="window.OneHomeDoodU.openCourse()">'+
        '<span class="doodu-area-copy"><strong>Children\'s Learning</strong><span>Sign &amp; Color Adventure • ASL Alphabet • Volume 1</span></span>'+ 
        '<span class="doodu-area-action">Start Learning →</span>'+ 
      '</button>'+ 
      '<button class="doodu-area-link" type="button" onclick="openComingSoon(\'Art &amp; Design\',\'doodUPage\',\'Art and design tutorials are being built for Dood U.\')">'+
        '<span class="doodu-area-copy"><strong>Art &amp; Design</strong><span>Tutorials and creative lessons for creators.</span></span>'+ 
        '<span class="doodu-area-action">Open Lessons →</span>'+ 
      '</button>'+ 
      '<button class="doodu-area-link" type="button" onclick="openComingSoon(\'AI &amp; Video\',\'doodUPage\',\'AI and video guides are being built for Dood U.\')">'+
        '<span class="doodu-area-copy"><strong>AI &amp; Video</strong><span>Creative technology guides and learning.</span></span>'+ 
        '<span class="doodu-area-action">Open Guides →</span>'+ 
      '</button>'+ 
      '<button class="doodu-area-link" type="button" onclick="openComingSoon(\'XRPL &amp; Business\',\'doodUPage\',\'XRPL and business education is being built for Dood U.\')">'+
        '<span class="doodu-area-copy"><strong>XRPL &amp; Business</strong><span>Mimi &amp; Pops Shop, printing, marketing, entrepreneurship, and XRPL education.</span></span>'+ 
        '<span class="doodu-area-action">Open Business Tools →</span>'+ 
      '</button>'+ 
    '</nav>'+ 
  '</div>';
  p.setAttribute('data-doodu-version','1467177');
}

function renderCourse(){
  var p=ensurePage('doodUCoursePage');
  var done=progress();
  var buttons=ORDER.map(function(letter){return '<button class="doodu-letter-button'+(done[letter]?' is-done':'')+'" type="button" aria-label="Open letter '+letter+'" onclick="window.OneHomeDoodU.openLetter(\''+letter+'\')">'+letter+'</button>';}).join('');
  p.innerHTML=''+
  '<div class="doodu-shell">'+
    '<header class="doodu-course-head">'+
      '<button class="doodu-btn doodu-back" type="button" onclick="window.OneHomeDoodU.home()">← Dood U</button>'+
      '<p class="doodu-kicker">Children&#39;s Learning</p>'+
      '<h1>Sign &amp; Color Adventure</h1>'+
      '<div class="doodu-course-subtitle">ASL Alphabet • Volume 1</div>'+
      '<p class="doodu-copy">Learn the ASL alphabet one letter at a time through coloring, drawing, and participation.</p>'+
    '</header>'+
    '<section class="doodu-alphabet-wrap">'+
      '<h2 class="doodu-section-title">Pick a letter</h2>'+
      '<div class="doodu-alphabet" aria-label="ASL alphabet lessons">'+buttons+'</div>'+
      '<div class="doodu-course-actions"><button class="doodu-btn primary" type="button" onclick="window.OneHomeDoodU.openLetter(\'A\')">Start with A</button></div>'+
      '<div class="doodu-next-activity"><strong>Next activity: 3 × 3 Color Card</strong><span>A small printable card kids can color and share.</span></div>'+
    '</section>'+
  '</div>';
  p.setAttribute('data-doodu-version','1467177');
}

function lessonCopy(letter, lesson){
  var extra=lesson.note?'<p>'+esc(lesson.note)+'</p>':'';
  var guide=letter==='A'?'<div class="doodu-hand-guide"><strong>Try the A handshape</strong><p>'+esc(lesson.guide)+'</p></div>':'';
  var art=letter==='A'?'<div class="doodu-apple-art">'+appleSvg()+'</div>':'';
  return '<h2>'+esc(letter)+' is for '+esc(lesson.word)+'</h2>'+extra+art+'<div class="doodu-challenge"><strong>Try It!</strong><p>'+esc(lesson.challenge)+'</p></div>'+guide;
}

function renderLetter(letter){
  letter=String(letter||'A').toUpperCase();
  if(!LESSONS[letter]) letter='A';
  var lesson=LESSONS[letter];
  var idx=ORDER.indexOf(letter);
  var done=progress();
  var p=ensurePage('doodULetterPage');
  p.innerHTML=''+
  '<div class="doodu-shell">'+
    '<header class="doodu-letter-head">'+
      '<button class="doodu-btn doodu-back" type="button" onclick="window.OneHomeDoodU.openCourse()">← ASL Alphabet</button>'+
      '<p class="doodu-kicker">ASL Manual Alphabet • '+esc(letter)+'</p>'+
      '<h1>'+esc(letter)+' is for '+esc(lesson.word)+'</h1>'+
    '</header>'+
    '<main class="doodu-lesson-grid">'+
      '<div class="doodu-big-letter" aria-label="Large outline letter '+esc(letter)+'">'+esc(letter)+'</div>'+
      '<div class="doodu-lesson-copy">'+lessonCopy(letter,lesson)+'</div>'+
    '</main>'+
    '<section class="doodu-progress">'+
      '<div class="doodu-progress-line" id="dooduProgressText">'+(done[letter]?'You tried this letter. ✓':'Ready when you are.')+'</div>'+
      '<div class="doodu-letter-actions">'+
        '<button class="doodu-btn primary" type="button" onclick="window.OneHomeDoodU.toggleDone(\''+letter+'\')">'+(done[letter]?'✓ I Tried It':'✓ I Tried It')+'</button>'+
        '<button class="doodu-btn" type="button" onclick="window.OneHomeDoodU.printLetter(\''+letter+'\')">Print</button>'+
        '<button class="doodu-btn" type="button" onclick="window.OneHomeDoodU.downloadLetter(\''+letter+'\')">Download SVG</button>'+
      '</div>'+
      '<div class="doodu-bottom-actions">'+
        (idx>0?'<button class="doodu-btn" type="button" onclick="window.OneHomeDoodU.openLetter(\''+ORDER[idx-1]+'\')">← '+ORDER[idx-1]+'</button>':'')+
        (idx<ORDER.length-1?'<button class="doodu-btn" type="button" onclick="window.OneHomeDoodU.openLetter(\''+ORDER[idx+1]+'\')">'+ORDER[idx+1]+' →</button>':'')+
      '</div>'+
    '</section>'+
  '</div>';
  p.setAttribute('data-doodu-letter',letter);
  p.setAttribute('data-doodu-version','1467177');
}

function printableSvg(letter){
  letter=String(letter||'A').toUpperCase(); if(!LESSONS[letter]) letter='A';
  var l=LESSONS[letter];
  var apple=letter==='A'?'<path d="M415 360c-45-35-110-15-124 50-15 74 49 155 121 155 27 0 42-14 55-14 13 0 29 14 54 14 73 0 127-83 109-156-14-61-78-84-126-51-28 18-59 18-89 2Z" fill="none" stroke="#000" stroke-width="8"/><path d="M470 341c-3-34 19-60 47-69" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round"/>':'';
  return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="8.5in" height="11in" viewBox="0 0 816 1056"><rect width="816" height="1056" fill="white"/><text x="408" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700">DOOD U • SIGN &amp; COLOR ADVENTURE</text><text x="408" y="112" text-anchor="middle" font-family="Arial,sans-serif" font-size="20">ASL Alphabet • Volume 1</text><text x="120" y="445" font-family="Arial,sans-serif" font-size="330" font-weight="900" fill="white" stroke="#000" stroke-width="6">'+esc(letter)+'</text>'+apple+'<text x="408" y="690" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="700">'+esc(letter)+' is for '+esc(l.word)+'</text><text x="80" y="755" font-family="Arial,sans-serif" font-size="24" font-weight="700">Try It!</text><foreignObject x="80" y="775" width="656" height="90"><div xmlns="http://www.w3.org/1999/xhtml" style="font:22px Arial,sans-serif;line-height:1.4;color:#000">'+esc(l.challenge)+'</div></foreignObject><line x1="80" y1="915" x2="736" y2="915" stroke="#000" stroke-width="2"/><text x="80" y="950" font-family="Arial,sans-serif" font-size="18">Name: __________________________</text><text x="408" y="1015" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700">KEEP LEARNING • KEEP CREATING • KEEP ROLLING</text></svg>';
}

function download(letter){
  var svg=printableSvg(letter), blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download='dood-u-asl-'+String(letter).toUpperCase()+'-simple.svg'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url)},1000);
}
function printLetter(letter){
  var svg=printableSvg(letter), w=window.open('','_blank');
  if(!w) { window.print(); return; }
  try{w.opener=null}catch(_e){}
  w.document.open(); w.document.write('<!doctype html><html><head><title>Dood U '+esc(letter)+'</title><style>html,body{margin:0;background:#fff}svg{display:block;width:8.5in;height:11in;margin:0 auto}@media print{@page{size:letter;margin:0}body{margin:0}}</style></head><body>'+svg+'<script>window.onload=function(){setTimeout(function(){window.print()},100)}<\/script></body></html>'); w.document.close();
}

function init(){
  ensurePage('doodUCoursePage'); ensurePage('doodULetterPage'); renderLanding(); renderCourse(); renderLetter('A');
}

window.OneHomeDoodU={
 home:function(){renderLanding();show('doodUPage');},
 openCourse:function(){renderCourse();show('doodUCoursePage');},
 openLetter:function(letter){renderLetter(letter);show('doodULetterPage');},
 toggleDone:function(letter){letter=String(letter||'A').toUpperCase();if(!LESSONS[letter])return;var d=progress();d[letter]=!d[letter];saveProgress(d);renderLetter(letter);show('doodULetterPage');},
 printLetter:printLetter,
 downloadLetter:download,
 lessons:LESSONS
};

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
window.addEventListener('onehome:page-activated',function(e){var id=e&&e.detail&&e.detail.pageId||'';if(id==='doodUPage'&&(!q('doodUPage')||q('doodUPage').getAttribute('data-doodu-version')!=='1467177'))renderLanding();});
})();
