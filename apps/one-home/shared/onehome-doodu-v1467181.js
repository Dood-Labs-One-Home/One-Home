(function(){
'use strict';
if(window.__ONEHOME_DOODU_V1467181__)return;
window.__ONEHOME_DOODU_V1467181__=true;
var LESSONS={
 A:{word:'Apple',prompt:'Make the A sign, then color the apple.',icon:'apple'},
 B:{word:'Bowling Buddy',prompt:'Make the B sign, then design a bowling ball.',icon:'bowling'},
 C:{word:'Coffee',prompt:'Make the C sign, then color the coffee cup.',icon:'coffee'},
 D:{word:'Dood',prompt:'Make the D sign, then design a Dood shirt.',icon:'shirt'},
 E:{word:'Ember',prompt:'Make the E sign, then draw something that inspires you.',icon:'flame'},
 F:{word:'Fish',prompt:'Make the F sign, then color the fish.',icon:'fish'},
 G:{word:'Garden',prompt:'Make the G sign, then draw something growing.',icon:'garden'},
 H:{word:'Home',prompt:'Make the H sign, then draw what makes home special.',icon:'home'},
 I:{word:'Ice Cream',prompt:'Make the I sign, then create your dream flavor.',icon:'icecream'},
 J:{word:'Jelly Bean',prompt:'Trace J with your little finger, then color the jelly beans.',icon:'beans'},
 K:{word:'Key',prompt:'Make the K sign, then design a key.',icon:'key'},
 L:{word:'Learn',prompt:'Make the L sign, then draw something you learned.',icon:'book'},
 M:{word:'Moon',prompt:'Make the M sign, then add stars around the moon.',icon:'moon'},
 N:{word:'Night Shots',prompt:'Make the N sign, then draw a favorite memory.',icon:'camera'},
 O:{word:'Owl',prompt:'Make the O sign, then give the owl your own colors.',icon:'owl'},
 P:{word:'Possum',prompt:'Make the P sign, then give the possum a name.',icon:'possum'},
 Q:{word:'Quill Key',prompt:'Make the Q sign, then design a special key.',icon:'quill'},
 R:{word:'Rare',prompt:'Make the R sign, then draw something unique.',icon:'gem'},
 S:{word:'Skateboard',prompt:'Make the S sign, then design a skateboard deck.',icon:'skateboard'},
 T:{word:'Taco',prompt:'Make the T sign, then add your favorite toppings.',icon:'taco'},
 U:{word:'University',prompt:'Make the U sign, then draw something you would teach.',icon:'university'},
 V:{word:'Volcano',prompt:'Make the V sign, then color the eruption.',icon:'volcano'},
 W:{word:'Wallet',prompt:'Make the W sign, then draw treasures for the wallet.',icon:'wallet'},
 X:{word:'XRP',prompt:'Make the X sign, then draw a path around the world.',icon:'globe'},
 Y:{word:'Yo-Yo',prompt:'Make the Y sign, then draw a cool yo-yo trick.',icon:'yoyo'},
 Z:{word:'Zombie',prompt:'Trace Z with your index finger, then color a friendly zombie.',icon:'zombie'}
};
var ORDER=Object.keys(LESSONS),ASSETS='/assets/doodu/v181/',current='A';
function q(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ensurePage(id){var p=q(id);if(p)return p;var main=q('top')||document.querySelector('main')||document.body;p=document.createElement('div');p.className='page-view';p.id=id;main.appendChild(p);return p}
function show(id){try{if(window.oneHomeV15Show){window.oneHomeV15Show(id);return}}catch(_e){}try{if(window.showPage){window.showPage(id);return}}catch(_e2){}document.querySelectorAll('.page-view').forEach(function(p){p.classList.remove('active')});var page=q(id);if(page)page.classList.add('active');try{window.scrollTo({top:0,behavior:'auto'})}catch(_e3){}}

function renderLanding(){
 var p=ensurePage('doodUPage');if(p.dataset.dooduVersion==='1467181')return;
 p.innerHTML='<div class="oh-room-directory doodu-house-directory"><div class="oh-room-grid cols-2">'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="window.OneHomeDoodU.openCourse()">Children&#39;s Learning</button>'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="openComingSoon(\'Art &amp; Design\',\'doodUPage\',\'Art and design tutorials are being built for Dood U.\')">Art &amp; Design</button>'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="openComingSoon(\'AI &amp; Video\',\'doodUPage\',\'AI and video guides are being built for Dood U.\')">AI &amp; Video</button>'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="openComingSoon(\'XRPL &amp; Business\',\'doodUPage\',\'XRPL and business education is being built for Dood U.\')">XRPL &amp; Business</button>'+
 '</div></div>';
 p.dataset.dooduVersion='1467181';
}


function valid(l){l=String(l||'A').toUpperCase();return Object.prototype.hasOwnProperty.call(LESSONS,l)?l:'A'}
function artwork(l){return ASSETS+l+(l==='A'?'-original.jpg':'-page.svg')}
function sprite(view,label,cls){return '<svg class="'+cls+'" viewBox="'+view+'" role="img" aria-label="'+label+'"><image href="'+ASSETS+'approved-demo.png" width="1672" height="941"/></svg>'}
function wordmark(){return sprite('88 98 745 162','Dood U','doodu-approved-wordmark')}
function mascot(){return '<svg class="doodu-approved-mascot" viewBox="43 497 195 290" role="img" aria-label="Dood U duck mascot watering the garden"><defs><clipPath id="dooduMascotClip"><polygon points="43,497 194,497 194,524 238,524 238,787 43,787"/></clipPath></defs><image href="'+ASSETS+'approved-demo.png" width="1672" height="941" clip-path="url(#dooduMascotClip)"/></svg>'}
function header(){return '<header class="doodu-header"><button type="button" class="doodu-brand" data-nav="choices" aria-label="One Home">'+sprite('52 10 274 56','One Home','doodu-brand-art')+'</button><nav aria-label="One Home"><button data-nav="passport">Passport</button><button data-nav="rooms">Explore Rooms</button><button data-nav="routes">Rare Routes</button><button data-nav="mints">Open Mints</button><button data-nav="doodu" aria-current="page">Dood U</button></nav><button class="doodu-account" data-nav="passport" aria-label="My Passport">♙</button></header>'}
function alphabet(l){return '<nav class="doodu-alphabet" aria-label="ASL alphabet">'+ORDER.map(function(x){return '<button type="button" class="doodu-letter-button'+(x===l?' active':'')+'" data-letter="'+x+'" aria-label="Letter '+x+'"'+(x===l?' aria-current="page"':'')+'>'+x+'</button>'}).join('')+'</nav>'}
function bind(p){p.querySelectorAll('[data-letter]').forEach(function(b){b.onclick=function(){openLetter(b.dataset.letter)}});p.querySelectorAll('[data-nav]').forEach(function(b){b.onclick=function(){var n=b.dataset.nav;if(n==='doodu'){home();return}if(n==='choices'&&window.oneHomePassportShowChoice){window.oneHomePassportShowChoice();return}var target={choices:'onehomeEntryChoicePage',passport:'onehomePassportJourneyPage',rooms:'homePage',routes:'onehomeRareRoutesPage',mints:'onehomeOpenMintsPage'}[n];var entry={passport:'passportChoicePassportBtn',rooms:'passportChoiceHomeBtn',routes:'passportChoiceRareRoutesBtn',mints:'passportChoiceOpenMintsBtn'}[n];var btn=q(entry);if(btn)btn.click();else show(target)}})}
function renderCourse(){var p=ensurePage('doodUCoursePage');if(p.dataset.dooduVersion==='1467181')return;p.innerHTML=header()+'<div class="doodu-children-stage"><div class="doodu-course-shell">'+wordmark()+'<div class="doodu-crumb">Children’s Learning → Sign &amp; Color Adventure</div><div class="doodu-pill">ASL Alphabet • Volume 1</div><h1>Choose a letter</h1><p>Make the sign, color a picture, and learn together.</p>'+alphabet('')+'</div></div>';p.dataset.dooduVersion='1467181';bind(p)}
function renderLetter(l){var p=ensurePage('doodULetterPage'),d=LESSONS[l];if(p.dataset.dooduLetter===l&&p.dataset.dooduVersion==='1467181')return;
p.innerHTML=header()+'<div class="doodu-children-stage"><div class="doodu-letter-layout"><section class="doodu-left">'+wordmark()+'<button class="doodu-crumb" type="button" id="dooduCourseBack">⌂ &nbsp; Children’s Learning → Sign &amp; Color Adventure</button><div class="doodu-pill">ASL Alphabet • Volume 1</div><h1 class="doodu-lesson-title"><span>'+l+'</span> is for '+esc(d.word)+'</h1><p class="doodu-prompt">'+esc(d.prompt)+'</p><div class="doodu-activity-row">'+mascot()+'<div class="doodu-actions"><button class="doodu-action purple" data-action="print">▣ &nbsp; Print 3×3 Card</button><button class="doodu-action blue" data-action="download">↓ &nbsp; Download 3×3 Card</button><button class="doodu-action green" data-action="full">▤ &nbsp; Full Coloring Page</button><button class="doodu-action pink" data-action="color">● &nbsp; Color Online</button></div></div>'+alphabet(l)+'<p class="doodu-status" role="status"></p></section><section class="doodu-preview" aria-label="Coloring page preview"><img class="doodu-page-art" src="'+artwork(l)+'" width="1102" height="1427" fetchpriority="high" decoding="async" alt="'+l+' is for '+esc(d.word)+' — ASL coloring page with the Dood Labs duck"></section></div></div>';
p.dataset.dooduVersion='1467181';p.dataset.dooduLetter=l;bind(p);q('dooduCourseBack').onclick=openCourse;
p.querySelectorAll('[data-action]').forEach(function(b){b.onclick=function(){var f={print:printCard,download:downloadCard,full:fullPage,color:colorOnline}[b.dataset.action];f(l)}});
p.querySelector('.doodu-page-art').onerror=function(){status('The picture could not load. Please reload this page.')};}
function status(s){var p=q('doodULetterPage');var el=p&&p.querySelector('.doodu-status');if(el)el.textContent=s}
function home(){renderLanding();show('doodUPage')}
function openCourse(){renderCourse();show('doodUCoursePage')}
function openLetter(l){current=valid(l);renderLetter(current);show('doodULetterPage')}
var cache=new Map();
function loadArtwork(l){l=valid(l);if(cache.has(l))return cache.get(l);var task=new Promise(function(resolve,reject){var img=new Image();img.onload=function(){resolve(img)};img.onerror=function(){cache.delete(l);reject(new Error('The picture could not load. Please try again.'))};img.src=artwork(l)});cache.set(l,task);if(cache.size>3)cache.delete(cache.keys().next().value);return task}
function saveBlob(blob,name){if(!blob)throw new Error('The download could not be prepared.');var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},5000)}
async function downloadCard(l){l=valid(l);status('Preparing your card…');try{var img=await loadArtwork(l),c=document.createElement('canvas');c.width=c.height=900;var ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,900,900);var w=900*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,(900-w)/2,0,w,900);var b=await new Promise(function(resolve){c.toBlob(resolve,'image/png')});saveBlob(b,'Dood-U-ASL-'+l+'-3x3-Card.png');status('Your card is ready.')}catch(e){status(e.message)}}
function printArtwork(l,full){l=valid(l);var w=window.open('','_blank');if(!w){status('Allow the print window to open, then try again.');return}var src=new URL(artwork(l),location.href).href;w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Dood U '+l+' '+(full?'Coloring Page':'3x3 Card')+'</title><style>@page{size:letter portrait;margin:.25in}*{box-sizing:border-box}html,body{margin:0;background:white}.sheet{'+(full?'width:8in;height:10.5in':'width:3in;height:3in')+';display:flex;align-items:center;justify-content:center;margin:auto}.sheet img{max-width:100%;max-height:100%;object-fit:contain}button{margin:12px;padding:10px 20px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print</button><div class="sheet"><img src="'+esc(src)+'" alt="ASL '+l+' coloring page" onload="window.print()" onerror="document.querySelector(\'.sheet\').textContent=\'The picture could not load. Close this window and try again.\'"></div></body></html>');w.document.close()}
function printCard(l){printArtwork(l,false)}function fullPage(l){printArtwork(l,true)}
async function colorOnline(l){l=valid(l);var existing=q('dooduColorModal');if(existing)existing.remove();var modal=document.createElement('div');modal.id='dooduColorModal';modal.className='doodu-color-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','dooduColorTitle');
modal.innerHTML='<div class="doodu-color-panel"><button class="doodu-color-close" aria-label="Close coloring">×</button><h2 id="dooduColorTitle">Color '+l+' Online</h2><p>Pick a color and draw with your mouse or finger.</p><div class="doodu-palette">'+[['Pink','#e9418a'],['Blue','#47b7ff'],['Green','#55e6a5'],['Yellow','#ffd052'],['Purple','#a675ff'],['Black','#111111']].map(function(v){return '<button aria-label="'+v[0]+'" aria-pressed="'+(v[0]==='Pink')+'" data-color="'+v[1]+'" style="background:'+v[1]+'!important"></button>'}).join('')+'<label class="doodu-brush">Brush size <input type="range" aria-label="Brush size" min="4" max="42" value="18"></label><p class="doodu-color-loading" role="status">Loading your picture…</p><div class="doodu-canvas-wrap" hidden><canvas width="900" height="1165" aria-label="Coloring canvas"></canvas><img alt="" aria-hidden="true"></div><div class="doodu-color-actions"><button class="doodu-action blue" data-save disabled>Download My Coloring</button><button class="doodu-action purple" data-reset disabled>Reset</button></div></div>';
var focused=document.activeElement;document.body.appendChild(modal);var close=modal.querySelector('.doodu-color-close');function dismiss(){modal.remove();if(focused&&focused.isConnected)focused.focus()}close.onclick=dismiss;close.focus();modal.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();dismiss()}if(e.key==='Tab'){var items=Array.from(modal.querySelectorAll('button:not(:disabled),input')).filter(function(el){return el.offsetParent!==null}),first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
var c=modal.querySelector('canvas'),ctx=c.getContext('2d'),color='#e9418a',drawing=false,brush=modal.querySelector('input'),base;
try{base=await loadArtwork(l);if(!modal.isConnected)return;var overlay=modal.querySelector('.doodu-canvas-wrap img');overlay.src=artwork(l);ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);modal.querySelector('.doodu-color-loading').remove();modal.querySelector('.doodu-canvas-wrap').hidden=false;modal.querySelector('[data-save]').disabled=false;modal.querySelector('[data-reset]').disabled=false}catch(e){if(modal.isConnected)modal.querySelector('.doodu-color-loading').textContent=e.message;return}
modal.querySelectorAll('[data-color]').forEach(function(b){b.onclick=function(){color=b.dataset.color;modal.querySelectorAll('[data-color]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))})}});
function point(e){var r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]}
c.onpointerdown=function(e){drawing=true;c.setPointerCapture(e.pointerId);var p=point(e);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Number(brush.value);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.arc(p[0],p[1],ctx.lineWidth/2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(p[0],p[1]);e.preventDefault()};c.onpointermove=function(e){if(!drawing)return;var p=point(e);ctx.lineTo(p[0],p[1]);ctx.stroke()};c.onpointerup=c.onpointercancel=c.onlostpointercapture=function(){drawing=false};
modal.querySelector('[data-reset]').onclick=function(){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)};
modal.querySelector('[data-save]').onclick=function(){var out=document.createElement('canvas');out.width=c.width;out.height=c.height;var o=out.getContext('2d');o.drawImage(c,0,0);o.globalCompositeOperation='multiply';o.drawImage(base,0,0,out.width,out.height);out.toBlob(function(b){saveBlob(b,'Dood-U-'+l+'-My-Coloring.png')},'image/png')};
}
function init(){ensurePage('doodUCoursePage');ensurePage('doodULetterPage');renderLanding()}
window.OneHomeDoodU={home:home,openCourse:openCourse,openLetter:openLetter,downloadCard:downloadCard,printCard:printCard,fullPage:fullPage,colorOnline:colorOnline,lessons:LESSONS};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('onehome:page-activated',function(e){var d=e&&e.detail||{},id=d.pageId||d.id;if(id==='doodUPage')renderLanding();else if(id==='doodUCoursePage')renderCourse();else if(id==='doodULetterPage'&&!q(id).dataset.dooduLetter)renderLetter(current)});
})();
