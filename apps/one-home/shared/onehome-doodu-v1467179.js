(function(){
'use strict';
if(window.__ONEHOME_DOODU_V1467179__) return;
window.__ONEHOME_DOODU_V1467179__=true;

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
 J:{word:'Jelly Bean',prompt:'Make the J sign, then color the jelly beans.',icon:'beans'},
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
 Z:{word:'Zombie',prompt:'Make the Z sign, then create a silly friendly zombie.',icon:'zombie'}
};
var ORDER=Object.keys(LESSONS), STORE='onehome_doodu_asl_v1_progress';
function q(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ensurePage(id){var p=q(id);if(p)return p;var main=q('top')||document.querySelector('main')||document.body;p=document.createElement('div');p.className='page-view';p.id=id;main.appendChild(p);return p}
function show(id){try{if(window.oneHomeV15Show){window.oneHomeV15Show(id);return}}catch(_e){}try{if(window.showPage){window.showPage(id);return}}catch(_e2){}document.querySelectorAll('.page-view').forEach(function(p){p.classList.remove('active')});var page=q(id);if(page)page.classList.add('active');try{window.scrollTo({top:0,behavior:'auto'})}catch(_e3){}}
function progress(){try{var x=JSON.parse(localStorage.getItem(STORE)||'{}');return x&&typeof x==='object'?x:{}}catch(_e){return {}}}
function saveProgress(d){try{localStorage.setItem(STORE,JSON.stringify(d||{}))}catch(_e){}}
var HAND_URLS={"A":"https://upload.wikimedia.org/wikipedia/commons/2/27/Sign_language_A.svg","B":"https://upload.wikimedia.org/wikipedia/commons/1/18/Sign_language_B.svg","C":"https://upload.wikimedia.org/wikipedia/commons/e/e3/Sign_language_C.svg","D":"https://upload.wikimedia.org/wikipedia/commons/0/06/Sign_language_D.svg","E":"https://upload.wikimedia.org/wikipedia/commons/c/cd/Sign_language_E.svg","F":"https://upload.wikimedia.org/wikipedia/commons/8/8f/Sign_language_F.svg","G":"https://upload.wikimedia.org/wikipedia/commons/d/d9/Sign_language_G.svg","H":"https://upload.wikimedia.org/wikipedia/commons/9/97/Sign_language_H.svg","I":"https://upload.wikimedia.org/wikipedia/commons/1/10/Sign_language_I.svg","J":"https://upload.wikimedia.org/wikipedia/commons/b/b1/Sign_language_J.svg","K":"https://upload.wikimedia.org/wikipedia/commons/9/97/Sign_language_K.svg","L":"https://upload.wikimedia.org/wikipedia/commons/d/d2/Sign_language_L.svg","M":"https://upload.wikimedia.org/wikipedia/commons/c/c4/Sign_language_M.svg","N":"https://upload.wikimedia.org/wikipedia/commons/e/e6/Sign_language_N.svg","O":"https://upload.wikimedia.org/wikipedia/commons/e/e0/Sign_language_O.svg","P":"https://upload.wikimedia.org/wikipedia/commons/0/08/Sign_language_P.svg","Q":"https://upload.wikimedia.org/wikipedia/commons/3/34/Sign_language_Q.svg","R":"https://upload.wikimedia.org/wikipedia/commons/3/3d/Sign_language_R.svg","S":"https://upload.wikimedia.org/wikipedia/commons/3/3f/Sign_language_S.svg","T":"https://upload.wikimedia.org/wikipedia/commons/1/13/Sign_language_T.svg","U":"https://upload.wikimedia.org/wikipedia/commons/7/7c/Sign_language_U.svg","V":"https://upload.wikimedia.org/wikipedia/commons/c/ca/Sign_language_V.svg","W":"https://upload.wikimedia.org/wikipedia/commons/8/83/Sign_language_W.svg","X":"https://upload.wikimedia.org/wikipedia/commons/b/b7/Sign_language_X.svg","Y":"https://upload.wikimedia.org/wikipedia/commons/1/1d/Sign_language_Y.svg","Z":"https://upload.wikimedia.org/wikipedia/commons/0/0a/Sign_language_Z.svg"}, HAND_DATA_CACHE={};
function handUrl(letter){return HAND_URLS[String(letter||'').toUpperCase()]||''}
function svgDataUrl(text){return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(text)))}
async function handDataUrl(letter){
  letter=String(letter||'A').toUpperCase();
  if(HAND_DATA_CACHE[letter])return HAND_DATA_CACHE[letter];
  var url=handUrl(letter); if(!url)throw new Error('ASL hand reference unavailable.');
  var res=await fetch(url,{mode:'cors',cache:'force-cache'});
  if(!res.ok)throw new Error('ASL hand reference could not be loaded.');
  var raw=await res.text();
  raw=raw.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi,'');
  HAND_DATA_CACHE[letter]=svgDataUrl(raw);
  return HAND_DATA_CACHE[letter];
}

function duckMarkup(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')" fill="white" stroke="#000" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="92" cy="116" rx="62" ry="72"/><circle cx="86" cy="45" r="43"/><circle cx="72" cy="38" r="5" fill="#000"/><circle cx="101" cy="38" r="5" fill="#000"/><path d="M62 53 Q86 68 111 53 Q87 43 62 53Z"/><path d="M35 116 Q2 120 8 153 Q31 146 47 132"/><path d="M145 113 Q171 117 166 144 Q151 141 135 130"/><path d="M60 188 l-18 26 M105 188 l18 26"/><path d="M31 216 q18-10 33 0 M112 216 q18-10 33 0"/><rect x="48" y="96" width="78" height="67" rx="18"/><text x="87" y="128" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#000" stroke="none">DOOD U</text></g>'}


function screenDuck(){
 return '<svg viewBox="0 0 220 220" role="img" aria-label="Dood U mascot"><g stroke="#10151e" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="98" cy="132" rx="59" ry="66" fill="#fff"/><circle cx="94" cy="65" r="45" fill="#fff"/><circle cx="78" cy="58" r="5" fill="#10151e" stroke="none"/><circle cx="109" cy="58" r="5" fill="#10151e" stroke="none"/><path d="M66 76 Q94 92 123 76 Q94 62 66 76Z" fill="#ffb531"/><path d="M43 134 Q9 139 15 168 Q39 160 54 145" fill="#fff"/><path d="M153 132 Q184 137 179 165 Q158 160 145 146" fill="#fff"/><path d="M69 195 l-16 17 M120 195 l16 17" fill="none"/><path d="M43 214 q18-10 34 0 M124 214 q18-10 34 0" fill="none" stroke="#ffb531"/><path d="M63 121 h69 v56 H63Z" fill="#fff"/><text x="98" y="150" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="#10151e" stroke="none">DOOD U</text></g></svg>';
}

function iconMarkup(name){var common='fill="white" stroke="#000" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
 var m={
 apple:'<path '+common+' d="M80 80 C35 45 10 105 30 150 C50 195 90 180 110 175 C130 180 170 195 190 150 C210 105 185 45 140 80 C120 92 100 92 80 80Z"/><path '+common+' d="M110 75 Q110 38 140 25"/><path '+common+' d="M126 42 Q154 24 172 46 Q148 58 126 42Z"/>',
 bowling:'<circle '+common+' cx="105" cy="112" r="75"/><circle cx="85" cy="82" r="7" fill="#000"/><circle cx="111" cy="70" r="7" fill="#000"/><circle cx="126" cy="94" r="7" fill="#000"/><path '+common+' d="M194 38 q18 38 0 70 l-14 55 h28 l-14-55 q-18-32 0-70Z"/>',
 coffee:'<path '+common+' d="M35 70 h125 v80 q0 35-35 35 H70 q-35 0-35-35Z"/><path '+common+' d="M160 88 h22 q30 0 30 28 q0 30-30 30 h-22"/><path '+common+' d="M68 42 q-12-20 8-35 M104 42 q-12-20 8-35 M140 42 q-12-20 8-35"/>',
 shirt:'<path '+common+' d="M70 38 l35 22 35-22 55 35-28 38-23-14v112H66V97l-23 14-28-38Z"/><text x="105" y="140" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">DOOD</text>',
 flame:'<path '+common+' d="M115 20 C158 66 175 88 166 130 C157 176 126 202 90 197 C42 191 25 153 37 119 C48 89 70 79 75 51 C93 63 103 81 99 101 C123 84 128 55 115 20Z"/>',
 fish:'<ellipse '+common+' cx="105" cy="112" rx="68" ry="48"/><path '+common+' d="M170 112 l52-44 v88Z"/><circle cx="72" cy="101" r="6" fill="#000"/><path '+common+' d="M95 78 q28-25 52 0 M95 146 q28 25 52 0"/>',
 garden:'<path '+common+' d="M50 182 Q105 152 160 182"/><path '+common+' d="M72 180 v-58 M122 180 v-95 M165 180 v-70"/><path '+common+' d="M72 145 q-28-20-36 4 q20 17 36-4 M122 120 q-32-22-39 6 q24 17 39-6 M165 146 q29-22 36 5 q-23 18-36-5"/><circle '+common+' cx="165" cy="94" r="26"/><circle '+common+' cx="165" cy="56" r="18"/><circle '+common+' cx="201" cy="91" r="18"/><circle '+common+' cx="166" cy="130" r="18"/><circle '+common+' cx="129" cy="92" r="18"/>',
 home:'<path '+common+' d="M25 102 L110 30 195 102 V200 H25Z"/><path '+common+' d="M73 200 v-66 h58 v66 M52 112 h35 v32 H52 M142 112 h35 v32 h-35"/>',
 icecream:'<path '+common+' d="M75 98 h70 l-35 110Z"/><circle '+common+' cx="110" cy="72" r="42"/><circle '+common+' cx="78" cy="84" r="30"/><circle '+common+' cx="142" cy="84" r="30"/>',
 beans:'<path '+common+' d="M45 70 q30-38 65 0 q-4 40-44 47 q-34-6-21-47Z"/><path '+common+' d="M120 82 q35-35 63 2 q-8 40-48 39 q-33-11-15-41Z"/><path '+common+' d="M70 135 q38-24 61 16 q-16 35-53 23 q-27-19-8-39Z"/>',
 key:'<circle '+common+' cx="70" cy="95" r="38"/><circle '+common+' cx="70" cy="95" r="14"/><path '+common+' d="M108 95 h96 v30 h-26 v28 h-28 v-28 h-42Z"/>',
 book:'<path '+common+' d="M25 55 q55-18 80 15 v125 q-28-25-80-7Z"/><path '+common+' d="M185 55 q-55-18-80 15 v125 q28-25 80-7Z"/><line '+common+' x1="105" y1="70" x2="105" y2="195"/>',
 moon:'<path '+common+' d="M150 30 q-78 35-65 110 q12 72 82 60 q-55 38-109 2 q-58-38-42-111 q16-75 134-61Z"/><path '+common+' d="M180 55 l8 18 20 2-16 12 5 20-17-11-17 11 5-20-16-12 20-2Z"/>',
 camera:'<rect '+common+' x="24" y="62" width="174" height="120" rx="18"/><circle '+common+' cx="111" cy="122" r="38"/><path '+common+' d="M65 62 l18-28 h56 l18 28"/><path '+common+' d="M172 82 h10"/>',
 owl:'<ellipse '+common+' cx="110" cy="122" rx="73" ry="88"/><circle '+common+' cx="80" cy="95" r="29"/><circle '+common+' cx="140" cy="95" r="29"/><circle cx="80" cy="95" r="8" fill="#000"/><circle cx="140" cy="95" r="8" fill="#000"/><path '+common+' d="M100 118 l10 16 10-16Z M55 160 q55 35 110 0"/>',
 possum:'<ellipse '+common+' cx="110" cy="115" rx="74" ry="53"/><path '+common+' d="M38 115 q-28-35 3-62 q32 22 44 45"/><path '+common+' d="M175 113 q48-12 41 29 q-30 15-51 4"/><circle cx="84" cy="104" r="6" fill="#000"/><path '+common+' d="M53 122 q18 15 37 2"/>',
 quill:'<path '+common+' d="M45 180 Q112 65 192 25 Q142 115 45 180Z"/><path '+common+' d="M55 166 Q105 130 166 63"/><circle '+common+' cx="165" cy="151" r="25"/><path '+common+' d="M187 151 h42 v22 h-15 v20 h-20 v-20 h-7"/>',
 gem:'<path '+common+' d="M40 76 L78 35 H150 L190 76 115 195Z"/><path '+common+' d="M40 76 h150 M78 35 l37 41 35-41 M78 76 l37 119 35-119"/>',
 skateboard:'<path '+common+' d="M30 120 q80 22 160 0 q13 40-32 46 H62 q-45-6-32-46Z"/><circle '+common+' cx="66" cy="180" r="16"/><circle '+common+' cx="158" cy="180" r="16"/>',
 taco:'<path '+common+' d="M30 155 Q110 35 190 155Z"/><path '+common+' d="M48 137 q12-32 32-9 q15-35 34-5 q16-35 37-3 q18-22 28 17"/>',
 university:'<path '+common+' d="M28 68 L110 28 192 68Z"/><rect '+common+' x="35" y="72" width="150" height="22"/><path '+common+' d="M48 94 v80 M80 94 v80 M112 94 v80 M144 94 v80 M176 94 v80"/><rect '+common+' x="28" y="174" width="164" height="22"/>',
 volcano:'<path '+common+' d="M25 190 L86 95 112 128 140 82 200 190Z"/><path '+common+' d="M86 95 q24 20 54-13"/><path '+common+' d="M109 65 q-28-30-2-48 M137 57 q20-35 43-8 M82 54 q-16-27-37-9"/>',
 wallet:'<rect '+common+' x="28" y="62" width="170" height="125" rx="18"/><path '+common+' d="M28 85 h170"/><path '+common+' d="M142 110 h72 v46 h-72 q-20-23 0-46Z"/><circle cx="169" cy="133" r="6" fill="#000"/>',
 globe:'<circle '+common+' cx="110" cy="112" r="82"/><path '+common+' d="M28 112 h164 M110 30 q-45 82 0 164 M110 30 q45 82 0 164 M48 66 q62 35 124 0 M48 158 q62-35 124 0"/>',
 yoyo:'<circle '+common+' cx="105" cy="126" r="62"/><circle '+common+' cx="105" cy="126" r="16"/><path '+common+' d="M105 64 q-5-43 28-47 q35-4 34 30 q-2 23-26 20"/>',
 zombie:'<circle '+common+' cx="110" cy="112" r="82"/><circle cx="80" cy="95" r="10" fill="#000"/><circle cx="145" cy="95" r="10" fill="#000"/><path '+common+' d="M72 145 q38 28 76 0 M54 55 l24 24 M62 45 l28 30 M158 42 l-22 32 M101 132 l18 0"/>'
 }; return m[name]||m.garden}

function wordMarkup(word){
  var safe=esc(word).toUpperCase(), parts=safe.split(/\s+/), lines=[];
  if(safe.length>11 && parts.length>1){
    var left=[],right=[],count=0;
    parts.forEach(function(p){if(count+p.length+(left.length?1:0)<=Math.ceil(safe.length/2)+2){left.push(p);count+=p.length+(left.length>1?1:0)}else{right.push(p)}});
    lines=[left.join(' '),right.join(' ')].filter(Boolean);
  } else lines=[safe];
  if(lines.length===1){
    var fs=safe.length>12?66:safe.length>9?78:safe.length>6?92:106;
    return '<text x="96" y="560" font-family="Arial,sans-serif" font-size="'+fs+'" font-weight="900" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">'+safe+'</text>';
  }
  var longest=Math.max(lines[0].length,lines[1].length), fs=longest>10?62:longest>7?72:82;
  return '<text x="96" y="510" font-family="Arial,sans-serif" font-size="'+fs+'" font-weight="900" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">'+lines[0]+'</text>'+
         '<text x="96" y="590" font-family="Arial,sans-serif" font-size="'+fs+'" font-weight="900" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">'+lines[1]+'</text>';
}
function motionMarkup(letter){
  if(letter==='J')return '<path d="M760 335 q35 55-12 98 q-42 36-72 2" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/><path d="M674 435 l19-2-8-17" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/>';
  if(letter==='Z')return '<path d="M565 350 h170 l-145 72 h170" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/><path d="M754 423 l-17-10 2 19" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/>';
  return '';
}
function cardSvg(letter,lesson,handHref){
 letter=String(letter||'A').toUpperCase();lesson=lesson||LESSONS[letter];
 var h=handHref||handUrl(letter),prompt='Can you make the '+esc(letter)+' sign?';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">'+
 '<rect width="900" height="900" fill="#fff"/><rect x="20" y="20" width="860" height="860" rx="34" fill="none" stroke="#000" stroke-width="10"/>'+
 '<path d="M56 122 l12 26 28 3-21 18 6 28-25-15-25 15 7-28-22-18 29-3Z" fill="none" stroke="#000" stroke-width="5"/>'+
 '<path d="M806 165 q22-35 44 0 q-22 32-44 0Z" fill="none" stroke="#000" stroke-width="5"/>'+
 '<text x="78" y="330" font-family="Arial,sans-serif" font-size="265" font-weight="900" fill="#fff" stroke="#000" stroke-width="8" paint-order="stroke">'+esc(letter)+'</text>'+
 '<text x="655" y="82" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="900">'+prompt+'</text>'+
 '<image crossorigin="anonymous" href="'+h+'" x="438" y="105" width="395" height="305" preserveAspectRatio="xMidYMid meet"/>'+motionMarkup(letter)+
 '<text x="104" y="440" font-family="Arial,sans-serif" font-size="52" font-weight="850">'+esc(letter)+' is for</text>'+wordMarkup(lesson.word)+
 '<g transform="translate(60 594)">'+duckMarkup(0,0,.68)+'</g>'+
 '<g transform="translate(545 620) scale(1.18)">'+iconMarkup(lesson.icon)+'</g>'+
 '<path d="M360 690 q19-26 38 0 q-19 29-38 0Z" fill="none" stroke="#000" stroke-width="5"/>'+
 '<circle cx="798" cy="620" r="29" fill="none" stroke="#000" stroke-width="5"/><path d="M798 573v-24 M798 691v-24 M751 620h-24 M869 620h-24 M765 587l-17-17 M848 670l-17-17 M831 587l17-17 M748 670l17-17" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>'+
 '<g transform="translate(625 804)"><path d="M0 27 L28 2 56 27 V65 H0Z" fill="white" stroke="#000" stroke-width="5"/><path d="M18 36 q10-13 20 0 q-10 17-20 0Z" fill="none" stroke="#000" stroke-width="4"/><text x="70" y="34" font-family="Arial,sans-serif" font-size="30" font-weight="900">DOOD U</text><text x="70" y="58" font-family="Arial,sans-serif" font-size="13" font-weight="700">A ONE HOME LEARNING SERIES</text></g>'+
 '</svg>';
}
async function embeddedCardSvg(letter){
 letter=String(letter||'A').toUpperCase();if(!LESSONS[letter])letter='A';
 try{return cardSvg(letter,LESSONS[letter],await handDataUrl(letter))}catch(_e){return cardSvg(letter,LESSONS[letter],handUrl(letter))}
}

function renderLanding(){
 var p=ensurePage('doodUPage');
 p.innerHTML='<div class="oh-room-directory doodu-house-directory"><div class="oh-room-grid cols-2">'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="window.OneHomeDoodU.openCourse()">Children&#39;s Learning</button>'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="openComingSoon(\'Art &amp; Design\',\'doodUPage\',\'Art and design tutorials are being built for Dood U.\')">Art &amp; Design</button>'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="openComingSoon(\'AI &amp; Video\',\'doodUPage\',\'AI and video guides are being built for Dood U.\')">AI &amp; Video</button>'+
 '<button class="onehome-v15-btn oh-room-button" type="button" onclick="openComingSoon(\'XRPL &amp; Business\',\'doodUPage\',\'XRPL and business education is being built for Dood U.\')">XRPL &amp; Business</button>'+
 '</div></div>';
 p.dataset.dooduVersion='1467179';
}

function renderCourse(){
 var p=ensurePage('doodUCoursePage'),done=progress();
 var buttons=ORDER.map(function(l){return '<button class="doodu-letter-button'+(done[l]?' is-done':'')+'" onclick="window.OneHomeDoodU.openLetter(\''+l+'\')">'+l+'</button>'}).join('');
 p.innerHTML='<div class="doodu-children-stage"><div class="doodu-child-shell">'+
 '<button class="doodu-backlink" onclick="window.OneHomeDoodU.home()">← Dood U</button>'+
 '<div class="doodu-wordmark"><span>D</span><span>O</span><span>O</span><span>D</span><span>U</span><b>♡</b></div>'+
 '<div class="doodu-crumb">Children&#39;s Learning → Sign &amp; Color Adventure</div>'+
 '<div class="doodu-pill">ASL Alphabet • Volume 1</div>'+
 '<h1 class="doodu-course-title">Choose a letter</h1>'+
 '<p class="doodu-course-copy">Pick a letter to learn the handshape, color a 3×3 card, or color online.</p>'+
 '<div class="doodu-alphabet course">'+buttons+'</div>'+
 '</div></div>';
 p.dataset.dooduVersion='1467179';
}

function renderLetter(letter){
 letter=String(letter||'A').toUpperCase();if(!LESSONS[letter])letter='A';
 var lesson=LESSONS[letter],done=progress(),p=ensurePage('doodULetterPage');
 var buttons=ORDER.map(function(l){return '<button class="doodu-letter-button'+(l===letter?' active':'')+(done[l]?' is-done':'')+'" onclick="window.OneHomeDoodU.openLetter(\''+l+'\')">'+l+'</button>'}).join('');
 p.innerHTML='<div class="doodu-children-stage"><div class="doodu-child-shell doodu-letter-layout">'+
 '<section class="doodu-left">'+
 '<button class="doodu-backlink" onclick="window.OneHomeDoodU.openCourse()">← ASL Alphabet</button>'+
 '<div class="doodu-wordmark"><span>D</span><span>O</span><span>O</span><span>D</span><span>U</span><b>♡</b></div>'+
 '<div class="doodu-crumb">⌂ &nbsp; Children&#39;s Learning → Sign &amp; Color Adventure</div>'+
 '<div class="doodu-pill">ASL Alphabet • Volume 1</div>'+
 '<h1 class="doodu-lesson-title"><span>'+letter+'</span> is for '+esc(lesson.word)+'</h1>'+
 '<p class="doodu-prompt">'+esc(lesson.prompt)+'</p>'+
 '<div class="doodu-mascot-row">'+screenDuck()+'</div>'+
 '<div class="doodu-actions">'+
 '<button class="doodu-action purple" onclick="window.OneHomeDoodU.printCard(\''+letter+'\')">▣ &nbsp; Print 3×3 Card</button>'+
 '<button class="doodu-action blue" onclick="window.OneHomeDoodU.downloadCard(\''+letter+'\')">↓ &nbsp; Download 3×3 Card</button>'+
 '<button class="doodu-action green" onclick="window.OneHomeDoodU.fullPage(\''+letter+'\')">▤ &nbsp; Full Coloring Page</button>'+
 '<button class="doodu-action pink" onclick="window.OneHomeDoodU.colorOnline(\''+letter+'\')">● &nbsp; Color Online</button>'+
 '</div><div class="doodu-alphabet">'+buttons+'</div>'+
 '</section>'+
 '<section class="doodu-preview"><div class="doodu-card" id="dooduCard">'+cardSvg(letter,lesson)+'</div>'+
 '<div class="doodu-preview-label">Printable 3×3 Card Preview<span>3 inches × 3 inches • 900 × 900 px</span></div></section>'+
 '</div></div>';
 p.dataset.dooduLetter=letter;p.dataset.dooduVersion='1467179';
}

function svgToPng(svg,filename,w,h){
 var blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
 img.onload=function(){var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);c.toBlob(function(b){if(!b)return;var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1500)},'image/png')};
 img.onerror=function(){URL.revokeObjectURL(url);var a=document.createElement('a');a.href='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);a.download=filename.replace(/\.png$/i,'.svg');a.click()};
 img.src=url;
}
async function downloadCard(letter){letter=String(letter||'A').toUpperCase();svgToPng(await embeddedCardSvg(letter),'Dood-U-ASL-'+letter+'-3x3-Card.png',900,900)}
function writePrintWindow(w,title,svg,sizeCss){
 w.document.open();w.document.write('<!doctype html><html><head><title>'+title+'</title><style>@page{margin:.25in}html,body{margin:0;background:#fff}body{display:grid;place-items:start center}svg{'+sizeCss+';display:block}</style></head><body>'+svg+'<script>onload=()=>setTimeout(()=>print(),450)<\/script></body></html>');w.document.close();
}
function printCard(letter){
 letter=String(letter||'A').toUpperCase();var w=window.open('','_blank');if(!w)return;w.document.write('<p style="font:18px Arial;padding:30px">Preparing coloring card…</p>');
 embeddedCardSvg(letter).then(function(svg){writePrintWindow(w,'Dood U '+letter+' 3x3',svg,'width:3in;height:3in')});
}
function fullPage(letter){
 letter=String(letter||'A').toUpperCase();var w=window.open('','_blank');if(!w)return;w.document.write('<p style="font:18px Arial;padding:30px">Preparing coloring page…</p>');
 embeddedCardSvg(letter).then(function(svg){writePrintWindow(w,'Dood U '+letter+' Coloring Page',svg,'width:7.6in;height:7.6in')});
}
async function colorOnline(letter){
 letter=String(letter||'A').toUpperCase();
 var modal=q('dooduColorModal');if(modal)modal.remove();
 modal=document.createElement('div');modal.id='dooduColorModal';modal.className='doodu-color-modal';
 modal.innerHTML='<div class="doodu-color-panel"><button class="doodu-color-close" onclick="this.closest(\'.doodu-color-modal\').remove()">×</button><h2>Color '+letter+' Online</h2><p class="doodu-color-hint">Pick a color and draw with your mouse or finger.</p><div class="doodu-palette"><button aria-label="Pink" data-c="#e9418a" style="background:#e9418a"></button><button aria-label="Blue" data-c="#47b7ff" style="background:#47b7ff"></button><button aria-label="Green" data-c="#55e6a5" style="background:#55e6a5"></button><button aria-label="Yellow" data-c="#ffd052" style="background:#ffd052"></button><button aria-label="Purple" data-c="#a675ff" style="background:#a675ff"></button><button aria-label="Black" data-c="#111" style="background:#111"></button></div><div class="doodu-color-loading">Loading coloring card…</div><canvas width="900" height="900" hidden></canvas><div class="doodu-color-actions"><button class="doodu-action blue" id="dooduSaveColor" disabled>Download My Coloring</button><button class="doodu-action purple" id="dooduResetColor" disabled>Reset</button></div></div>';
 document.body.appendChild(modal);
 var c=modal.querySelector('canvas'),ctx=c.getContext('2d'),color='#e9418a',drawing=false,baseImage=null;
 try{
   var svg=await embeddedCardSvg(letter),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();
   await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=reject;img.src=url});
   ctx.drawImage(img,0,0,900,900);baseImage=ctx.getImageData(0,0,900,900);URL.revokeObjectURL(url);
   modal.querySelector('.doodu-color-loading').remove();c.hidden=false;q('dooduSaveColor').disabled=false;q('dooduResetColor').disabled=false;
 }catch(_e){modal.querySelector('.doodu-color-loading').textContent='The coloring card could not load. Please try again.';return}
 modal.querySelectorAll('.doodu-palette button').forEach(function(b){b.onclick=function(){color=b.dataset.c}});
 function pos(e){var r=c.getBoundingClientRect(),t=e.touches&&e.touches[0]||e;return [(t.clientX-r.left)*900/r.width,(t.clientY-r.top)*900/r.height]}
 function start(e){drawing=true;var p=pos(e);ctx.beginPath();ctx.moveTo(p[0],p[1]);e.preventDefault()}
 function move(e){if(!drawing)return;var p=pos(e);ctx.strokeStyle=color;ctx.lineWidth=18;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineTo(p[0],p[1]);ctx.stroke();e.preventDefault()}
 function end(){drawing=false}
 c.addEventListener('mousedown',start);c.addEventListener('mousemove',move);window.addEventListener('mouseup',end);c.addEventListener('touchstart',start,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',end);
 q('dooduResetColor').onclick=function(){if(baseImage)ctx.putImageData(baseImage,0,0)};
 q('dooduSaveColor').onclick=function(){c.toBlob(function(b){var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='Dood-U-'+letter+'-My-Coloring.png';a.click();setTimeout(function(){URL.revokeObjectURL(u)},1000)})};
}
function init(){ensurePage('doodUCoursePage');ensurePage('doodULetterPage');renderLanding();renderCourse();renderLetter('A')}
window.OneHomeDoodU={home:function(){renderLanding();show('doodUPage')},openCourse:function(){renderCourse();show('doodUCoursePage')},openLetter:function(l){renderLetter(l);show('doodULetterPage')},downloadCard:downloadCard,printCard:printCard,fullPage:fullPage,colorOnline:colorOnline,lessons:LESSONS};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('onehome:page-activated',function(e){var id=e&&e.detail&&e.detail.pageId||'';if(id==='doodUPage'&&(!q('doodUPage')||q('doodUPage').dataset.dooduVersion!=='1467179'))renderLanding()});
})();