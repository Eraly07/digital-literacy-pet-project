// ═══════════════════════════════
// CONFIG
// ═══════════════════════════════
// AI runs via backend proxy so the API key isn't exposed in the browser.
// See `server.py` for setup.
const AI_API_ENDPOINT = normalizeAiEndpoint(
  window.AI_API_ENDPOINT ||
  document.querySelector('meta[name="ai-endpoint"]')?.content ||
  '/api/ai'
);
const AI_ANALYZE_ENDPOINT = toAnalyzeEndpoint(AI_API_ENDPOINT);

function normalizeAiEndpoint(v){
  const s=(v??'').toString().trim();
  if(!s) return '/api/ai';
  if(/^https?:\/\//i.test(s)){
    try{
      const u=new URL(s);
      // If only base URL is provided, default to /api/ai.
      if(!u.pathname || u.pathname==='/') u.pathname='/api/ai';
      // Avoid trailing slash which would break strict routes on simple backends.
      if(u.pathname.endsWith('/')) u.pathname=u.pathname.replace(/\/+$/,'');
      return u.toString().replace(/\/$/,'');
    }catch(_){
      return s;
    }
  }
  return s;
}

function toAnalyzeEndpoint(ai){
  const s=(ai??'').toString().trim();
  if(!s) return '/api/analyze';
  if(/\/api\/ai\/?$/i.test(s)) return s.replace(/\/api\/ai\/?$/i,'/api/analyze');
  return s.replace(/\/+$/,'') + '/api/analyze';
}

// ═══════════════════════════════
// PARTICLES
// ═══════════════════════════════
(function(){
  const c=document.getElementById('particles');
  const x=c.getContext('2d');
  let W,H,pts=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
  function init(){
    pts=[];
    const n=Math.floor(W*H/18000);
    for(let i=0;i<n;i++) pts.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,
      r:Math.random()*1.5+.5,
      a:Math.random()*.5+.1
    });
  }
  function draw(){
    x.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);
      x.fillStyle=`rgba(0,240,200,${p.a})`;x.fill();
    });
    // connect nearby
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<120){
          x.beginPath();
          x.moveTo(pts[i].x,pts[i].y);x.lineTo(pts[j].x,pts[j].y);
          x.strokeStyle=`rgba(0,240,200,${0.06*(1-d/120)})`;
          x.lineWidth=.5;x.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  resize();init();draw();
  window.addEventListener('resize',()=>{resize();init();});
})();

// ═══════════════════════════════
// NAV
// ═══════════════════════════════
function go(id){
  const cur = document.querySelector('.page.active');
  if(cur && cur.id !== id){
    cur.classList.add('leaving');
    setTimeout(()=>{ cur.classList.remove('active','leaving'); }, 180);
  } else if(cur){
    cur.classList.remove('active');
  }
  setTimeout(()=>{
    const next = document.getElementById(id);
    next.classList.add('active');
    // trigger stagger animations
    animatePage(id);
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll(`.nav-item[onclick="go('${id}')"]`).forEach(b=>b.classList.add('active'));
    // scroll the active page to top
    document.getElementById(id).scrollTop = 0;
    if(id==='lb')renderLB();
    if(id==='quiz'&&!pName)setTimeout(()=>document.getElementById('nm').classList.add('on'),200);
  }, cur && cur.id !== id ? 150 : 0);
}

function animatePage(id){
  const pg = document.getElementById(id);
  // reset then stagger
  const ph = pg.querySelector('.ph');
  if(ph){ ph.classList.remove('visible'); void ph.offsetWidth; ph.classList.add('visible'); }

  const items = pg.querySelectorAll('.ncard, .tip-row, .hcard, .citem');
  items.forEach((el,i)=>{
    el.classList.remove('visible');
    void el.offsetWidth;
    setTimeout(()=>el.classList.add('visible'), i * 70);
  });
}

// ═══════════════════════════════
// LANG
// ═══════════════════════════════
let lang='kk';
function toggleLang(){
  lang=lang==='kk'?'ru':'kk';
  
  const l2=document.getElementById('langLabel');if(l2)l2.textContent=lang==='kk'?'Русский':'Қазақша';
  const m=document.getElementById('lb3');if(m)m.textContent=lang==='kk'?'RU':'ҚЗ';
  document.querySelectorAll('[data-kk]').forEach(el=>{
    const v=lang==='kk'?el.getAttribute('data-kk'):el.getAttribute('data-ru');
    if(!v)return;
    if(el.tagName==='TEXTAREA'||el.tagName==='INPUT')el.placeholder=v;
    else el.innerHTML=v;
  });
  updateChips();renderLB();
}

// ═══════════════════════════════
// LEADERBOARD
// ═══════════════════════════════
let board=[
  {name:'Айдос К.',s:10,d:'13.03'},
  {name:'Дана М.',s:9,d:'13.03'},
  {name:'Ерлан Б.',s:8,d:'12.03'},
  {name:'Зарина Т.',s:7,d:'12.03'},
  {name:'Нұрлан А.',s:6,d:'11.03'},
];
let pName='';
function saveName(){
  const v=document.getElementById('ni').value.trim();
  if(!v)return;
  pName=v;document.getElementById('nm').classList.remove('on');
}
function addBoard(n,s){
  const d=new Date(),ds=`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
  board=board.filter(r=>r.name!==n);board.push({name:n,s,d:ds});
}
function renderLB(){
  const sorted=[...board].sort((a,b)=>b.s-a.s);
  const M=['🥇','🥈','🥉'],C=['g','s','b'];
  document.getElementById('lbb').innerHTML=sorted.map((r,i)=>`
    <div class="lbrow">
      <div class="lbrank ${C[i]||''}">${M[i]||i+1}</div>
      <div class="lbname">${r.name}</div>
      <div class="lbsc">${r.s}/10</div>
      <div class="lbdt">${r.d}</div>
    </div>`).join('');
}

// ═══════════════════════════════
// QUIZ
// ═══════════════════════════════
const QS=[
  {kk:{q:"Қауіпсіз пароль деп нені айтамыз?",o:["Туған жылыңыз","12+ символды күрделі пароль","Атыңыз бен фамилияңыз","4 цифрлық сан"],e:"12+ символ, үлкен-кіші әріп, сан және арнайы белгілер — қауіпсіз пароль."},ru:{q:"Что называется надёжным паролем?",o:["Год рождения","Сложный пароль 12+ символов","Имя и фамилия","4-значное число"],e:"12+ символов, разные регистры, цифры и спецсимволы — надёжный пароль."},a:1},
  {kk:{q:"Фишинг дегеніміз не?",o:["Балық аулау түрі","Жеке деректерді ұрлауға жалған хаттар","Интернет жылдамдығын өлшеу","Бағдарламалау тілі"],e:"Фишинг — сенімді ұйымды бейнелеп деректерді ұрлауға тырысу."},ru:{q:"Что такое фишинг?",o:["Вид рыбалки","Рассылка фейковых писем для кражи данных","Измерение скорости","Язык программирования"],e:"Фишинг — имитация надёжных организаций для кражи данных."},a:1},
  {kk:{q:"2FA не үшін қолданылады?",o:["Интернет жылдамдықты арттыру","Аккаунтты қорғау — пароль + SMS код","Файлдарды жүктеу","Видео сапасын жақсарту"],e:"2FA — кіруде екі дәйектеме: пароль + телефон коды."},ru:{q:"Для чего используется 2FA?",o:["Ускорить интернет","Защита аккаунта — пароль + SMS","Скачивание файлов","Улучшение видео"],e:"2FA — при входе два подтверждения: пароль + код с телефона."},a:1},
  {kk:{q:"Интернеттегі ақпаратты оқығанда не істеу керек?",o:["Барлығына сену","Тек Wikipedia-ға сену","2-3 дереккөзден тексеру","Тек достар сілтемесіне сену"],e:"Ақпаратты 2-3 дереккөзден тексер — жалған жаңалықтар кеңінен таралады."},ru:{q:"Что делать при чтении информации в интернете?",o:["Доверять всему","Только Wikipedia","Проверять в 2-3 источниках","Только ссылки от друзей"],e:"Проверяй информацию в 2-3 источниках — фейки распространены."},a:2},
  {kk:{q:"Ашық Wi-Fi желісінде не қауіпті?",o:["Интернет баяу болады","Деректерді үшінші тарап оқи алады","Батарея тез бітеді","Барлық жауап дұрыс"],e:"Ашық Wi-Fi-да трафигіңді ұстап алу мүмкін. VPN пайдалан."},ru:{q:"Что опасно в открытой Wi-Fi?",o:["Медленный интернет","Третьи лица могут читать данные","Быстро садится батарея","Все верны"],e:"В открытой Wi-Fi могут перехватить трафик. Используй VPN."},a:1},
  {kk:{q:"Авторлық құқық туралы дұрыс тұжырым?",o:["Интернеттегі мазмұнды еркін пайдалануға болады","Белгі болмаса — рұқсат","Рұқсатсыз пайдалану заңға қайшы","Тегін сайттан алса — еркін"],e:"Интернеттегі суреттер мен мақалалар — авторлар меншігі."},ru:{q:"Верное утверждение об авторском праве?",o:["Контент в интернете свободен","Нет знака — можно","Использование без разрешения незаконно","С бесплатных сайтов — можно"],e:"Картинки и статьи — собственность авторов."},a:2},
  {kk:{q:"Парольді есте сақтаудың ең қауіпсіз жолы?",o:["Ноутбуктағы стикерге жазу","Пароль менеджер пайдалану","Email-де сақтау","Бір паролді пайдалану"],e:"Bitwarden, LastPass — шифрлап сақтайды."},ru:{q:"Самый безопасный способ хранить пароли?",o:["Написать на стикере","Менеджер паролей","Хранить в email","Один пароль"],e:"Bitwarden, LastPass — хранят зашифрованно."},a:1},
  {kk:{q:"Смартфон қосымшаларына рұқсат берерде не істеу керек?",o:["Барлығын қабылдау","Тек қажетті рұқсаттарды беру","Мүлдем бермеу","Тек геолокация беру"],e:"Артық рұқсат — жеке деректер қаупі."},ru:{q:"Что делать при запросе разрешений?",o:["Принять все","Давать только необходимые","Не давать вообще","Только геолокацию"],e:"Лишние разрешения — угроза данным."},a:1},
  {kk:{q:"AI (ChatGPT) пайдаланғанда не ескеру керек?",o:["Барлық жауапқа сену","Жеке деректер кіргізбеу және тексеру","Тапсырманы толық AI-мен орындау","Мүлдем пайдаланбау"],e:"AI жақсы көмекші, бірақ жеке деректер кіргізбе, жауаптарын тексер."},ru:{q:"Что учитывать при использовании AI?",o:["Доверять всем ответам","Не вводить личные данные и проверять","Делать всё через AI","Не использовать"],e:"AI — хороший помощник, но не вводи личные данные, проверяй ответы."},a:1},
  {kk:{q:"Кибербуллинг туралы дұрыс жауап?",o:["Жауап берсең мәселе шешіледі","Блоктап сенімді адамға хабарлау","Бұл ойын, алаңдама","Желілік зорлық — заңды"],e:"Кибербуллингте: блокта, скриншот ал, хабарла."},ru:{q:"Правильный ответ о кибербуллинге?",o:["Ответить — решит проблему","Заблокировать и сообщить взрослым","Это игра","Это законно"],e:"При кибербуллинге: блокируй, скриншоты, сообщи."},a:1},
];
let qc=0,qs=0,qa=false;
function renderQ(){
  const q=QS[qc],d=q[lang]||q.kk;
  document.getElementById('qp').style.width=(qc/QS.length*100)+'%';
  document.getElementById('qb').innerHTML=`
    <div class="qmeta">${lang==='kk'?'СҰРАҚ':'ВОПРОС'} ${qc+1} / ${QS.length}</div>
    <div class="qq">${d.q}</div>
    <div class="qopts">${d.o.map((o,i)=>`
      <button class="qopt" onclick="pickQ(${i})" id="qo${i}">
        <span class="qkey">${['A','B','C','D'][i]}</span>${o}
      </button>`).join('')}</div>
    <div class="qfb" id="qf"></div>
    <div class="qfoot">
      <span class="qscore">✓ ${qs}/${QS.length}</span>
      <button class="qnext" id="qn" onclick="nextQ()">
        ${qc===QS.length-1?(lang==='kk'?'НӘТИЖЕ ▶':'РЕЗУЛЬТАТ ▶'):(lang==='kk'?'КЕЛЕСІ ▶':'ДАЛЕЕ ▶')}
      </button>
    </div>`;
  qa=false;
}
function pickQ(i){
  if(qa)return;qa=true;
  const q=QS[qc],d=q[lang]||q.kk;
  document.querySelectorAll('.qopt').forEach(o=>o.classList.add('dis'));
  const fb=document.getElementById('qf');
  if(i===q.a){qs++;document.getElementById('qo'+i).classList.add('ok');fb.innerHTML='✓ '+d.e;fb.className='qfb show ok';}
  else{document.getElementById('qo'+i).classList.add('err');document.getElementById('qo'+q.a).classList.add('ok');fb.innerHTML=`✗ ${lang==='kk'?'Дұрыс':'Правильно'}: ${d.o[q.a]} — ${d.e}`;fb.className='qfb show err';}
  document.getElementById('qn').style.display='inline-block';
  document.querySelector('.qscore').textContent=`✓ ${qs}/${QS.length}`;
}
function nextQ(){qc++;qc>=QS.length?showRes():renderQ();}
function showRes(){
  document.getElementById('qp').style.width='100%';
  const pct=Math.round(qs/QS.length*100);
  const msg=pct>=80?(lang==='kk'?'ЖОҒАРЫ ДЕҢГЕЙ — Керемет!':'ВЫСОКИЙ УРОВЕНЬ — Отлично!'):pct>=60?(lang==='kk'?'ОРТАША — Жақсы нәтиже.':'СРЕДНИЙ — Хороший результат.'):(lang==='kk'?'БАСТАУЫШ — Материалдарды оқы.':'НАЧАЛЬНЫЙ — Изучи материалы.');
  const cn=pName||'Anonymous';
  if(pName)addBoard(pName,qs);
  document.getElementById('qb').innerHTML=`
    <div style="text-align:center;padding:1rem 0">
      <div class="res-pct">${pct}%</div>
      <div style="font-size:1.7rem;margin-bottom:.4rem">${pct>=80?'⭐⭐⭐':pct>=60?'⭐⭐':'⭐'}</div>
      <div class="res-msg">${msg}</div>
      ${pct>=60?`<div class="certbox">
        <div class="cert-lbl">🎓 СЕРТИФИКАТ</div>
        <div class="cert-nm">${cn}</div>
        <div class="cert-sub">${lang==='kk'?'Цифрлық сауаттылық тестін аяқтады':'Завершил тест по цифровой грамотности'}</div>
        <div class="cert-sc">${pct}%</div>
      </div>
      <button class="gbtn" onclick="dlCert('${cn}',${pct})" style="margin:.75rem .3rem 0">
        ⬇ ${lang==='kk'?'СЕРТИФИКАТ':'СЕРТИФИКАТ'}
      </button>`:''}
      <button class="gbtn-outline" onclick="resetQ()" style="margin:.75rem .3rem 0">
        ↺ ${lang==='kk'?'ҚАЙТА':'СНОВА'}
      </button>
    </div>`;
}
function dlCert(n,p){
  const c=document.createElement('canvas');c.width=800;c.height=520;
  const x=c.getContext('2d');
  x.fillStyle='#04040a';x.fillRect(0,0,800,520);
  // border glow
  x.shadowBlur=20;x.shadowColor='#00f0c8';
  x.strokeStyle='#00f0c8';x.lineWidth=2;x.strokeRect(16,16,768,488);
  x.shadowBlur=0;
  x.strokeStyle='rgba(0,240,200,0.2)';x.lineWidth=1;x.strokeRect(26,26,748,468);
  // scanlines
  for(let y=0;y<520;y+=4){x.fillStyle='rgba(0,0,0,0.04)';x.fillRect(0,y,800,2);}
  x.textAlign='center';
  x.fillStyle='#00f0c8';x.font='bold 22px monospace';x.shadowBlur=15;x.shadowColor='#00f0c8';
  x.fillText('[ ЦИФРСАУАТ ]',400,90);
  x.shadowBlur=0;
  x.fillStyle='#5a6480';x.font='11px monospace';
  x.fillText('СЕРТИФИКАТ · CERTIFICATE',400,120);
  x.fillStyle='#e8f0ff';x.font='bold 34px sans-serif';
  x.fillText(n,400,210);
  x.fillStyle='#8890aa';x.font='15px sans-serif';
  x.fillText(p>='kk'?'Цифрлық сауаттылық тестін аяқтады':'Успешно прошёл тест',400,260);
  x.fillStyle='#00f0c8';x.font='bold 54px monospace';x.shadowBlur=25;x.shadowColor='#00f0c8';
  x.fillText(p+'%',400,360);
  x.shadowBlur=0;x.fillStyle='#5a6480';x.font='12px monospace';
  x.fillText(new Date().getFullYear(),400,430);
  const a=document.createElement('a');a.download=`cert_${n}.png`;a.href=c.toDataURL();a.click();
}
function resetQ(){qc=0;qs=0;renderQ();}

// ═══════════════════════════════
// AI SIM
// ═══════════════════════════════
let sm='adv';
let simHistory=[]; // [{role:'user'|'assistant', content:string}]
let simStopped=false;
const SC={
  kk:{adv:['Таныс емес адамнан күдікті сілтеме келді','Банктен «паролді жіберіңіз» деген хабар алдым','Instagram аккаунтым бұзылды, не істеймін?','Телефонымды бөтен адамға берсем не болады?'],sim:['Хакер ретінде: банк болып хабар жазу','Алаяқ ретінде: жалған жүлде хабарландыруы','Скамер ретінде: жалған жұмыс ұсынысы']},
  ru:{adv:['Пришла подозрительная ссылка от незнакомца','Получил сообщение «отправьте пароль» от банка','Instagram взломали, что делать?','Что будет если дать телефон чужому?'],sim:['От лица хакера: притвориться банком','От лица мошенника: уведомление о выигрыше','От лица скамера: ложное предложение работы']}
};
const MD2={
  kk:{adv:'// оқиғаны жаз — AI қауіп деңгейін бағалайды, нақты қадамдар береді',sim:'// жағдайды сипатта — AI алаяқ/хакер тактикасын симуляция жасайды'},
  ru:{adv:'// опиши ситуацию — AI оценит угрозу, даст конкретные шаги',sim:'// опиши ситуацию — AI симулирует тактику мошенника/хакера'}
};
function setSim(m){
  sm=m;
  document.getElementById('t1').className='stab'+(m==='adv'?' on':'');
  document.getElementById('t2').className='stab'+(m==='sim'?' on':'');
  _updateSimActions();
  updateChips();
}
function updateChips(){
  document.getElementById('smd').textContent=MD2[lang][sm];
  document.getElementById('chips').innerHTML=SC[lang][sm].map(s=>
    `<button class="chip" onclick="document.getElementById('sta').value=this.textContent">${s}</button>`
  ).join('');
}
function _updateSimActions(){
  const box=document.getElementById('simActions');
  if(box) box.style.display = sm==='sim' ? 'flex' : 'none';
  const endBtn=document.getElementById('endbtn');
  if(endBtn) endBtn.disabled = sm!=='sim' || simHistory.length===0;
}
function detectCriticalMistake(text){
  const t=(text||'').toString().toLowerCase();
  const secrets=/(sms|смс|код|otp|cvv|cvc|пароль|password|құпиясөз|қупиясоз|құпия\s*код|иин|жсн|паспорт|карта|карточк|iban|счет)/i;
  const money=/(ақша|деньги|перевод|аудар|отправ|скинул|скинула|оплат|төл|transfer|payment)/i;
  const give=/(бердім|бердим|жібердім|жибердим|отправил|отправила|скинул|скинула|берем|берейін|жіберем|жиберем|дамын|дам|переведу|перевожу|отправлю|скину|аудардым|аударып|оплатил|оплатила|төледім|төледи)/i;
  const agree=/(келісем|келеcем|согласен|согласна|ok|okay|жарайды|ладно|берейік|давайте)/i;
  if((secrets.test(t) && give.test(t)) || (money.test(t) && give.test(t))) return {level:'high'};
  if((secrets.test(t) && agree.test(t)) || (money.test(t) && agree.test(t))) return {level:'maybe'};
  return {level:'none'};
}
async function endSim(){
  if(sm!=='sim' || simHistory.length===0) return;
  document.getElementById('se').style.display='none';
  document.getElementById('sr').style.display='none';
  document.getElementById('sl').style.display='flex';
  document.getElementById('sbtn').disabled=true;
  const res=await analyzeSim('end','');
  document.getElementById('sl').style.display='none';
  document.getElementById('sbtn').disabled=false;
  if(!res || !res.ok){
    const msg=(res?.error||res?.raw||'').toString() || (lang==='kk'?'Талдау қатесі':'Ошибка анализа');
    document.getElementById('sr').innerHTML=`<div class="ai-blk"><div class="ai-lbl">⚠ ${lang==='kk'?'ҚАТЕ':'ОШИБКА'}</div><p style="color:var(--danger)">${msg}</p></div>`;
    document.getElementById('sr').style.display='block';
    return;
  }
  renderSimSummary(res.data,res.raw);
}
async function analyzeSim(event,lastUser){
  const headers={'Content-Type':'application/json'};
  if(/ngrok/i.test(AI_ANALYZE_ENDPOINT)) headers['ngrok-skip-browser-warning']='true';
  try{
    const res=await fetch(AI_ANALYZE_ENDPOINT,{
      method:'POST',
      headers,
      body:JSON.stringify({
        event,
        lang,
        history:simHistory.slice(-12),
        last_user:lastUser||''
      })
    });
    const raw=await res.text();
    let data=null;
    try{data=JSON.parse(raw);}catch{data=null;}
    if(!res.ok || !data || data.error){
      return {ok:false,error:data?.error||data?.message||`HTTP ${res.status}`,raw};
    }
    return {ok:true,data,raw};
  }catch(e){
    return {ok:false,error:e?.message||'network_error',raw:''};
  }
}
async function sendAI(){
  const txt=document.getElementById('sta').value.trim();if(!txt)return;
  if(sm==='sim' && simStopped){
    renderSimStop({title:lang==='kk'?'Симуляция тоқтатылған':'Симуляция остановлена',why:[lang==='kk'?'Жаңа хабар жіберілмейді.':'Новые сообщения не принимаются.'],advice:[lang==='kk'?'Қайта бастау үшін бетті жаңартыңыз.':'Чтобы начать заново, обновите страницу.']});
    return;
  }
  document.getElementById('se').style.display='none';
  document.getElementById('sr').style.display='none';
  document.getElementById('sl').style.display='flex';
  document.getElementById('sbtn').disabled=true;
  const SYS=sm==='adv'
    ?`You are a digital security expert. Respond in the SAME language as the user. Output ONLY valid JSON, no markdown, no code fences. Schema: {"risk":"HIGH|MEDIUM|LOW","risk_label":"local risk name","what":"2-3 sentences","steps":["s1","s2","s3"],"prevention":"tip"}`
    :`You are a cybersecurity educator. Respond in the SAME language as the user. Output ONLY valid JSON, no markdown, no code fences. Do NOT generate scam messages, scripts, links, phone numbers, or step-by-step wrongdoing instructions. Keep tactics high-level and educational. Schema: {"tactics":["t1","t2","t3"],"warning_signs":["w1","w2"],"defense":["d1","d2","d3"]}`;
  try{
    const headers={'Content-Type':'application/json'};
    if(/ngrok/i.test(AI_API_ENDPOINT)) headers['ngrok-skip-browser-warning']='true';
    if(sm==='sim'){
      simHistory.push({role:'user',content:txt});
      _updateSimActions();
      const risk=detectCriticalMistake(txt);
      if(risk.level!=='none'){
        const chk=await analyzeSim('check',txt);
        if(chk && chk.ok && chk.data && chk.data.stop){
          simStopped=true;
          document.getElementById('sl').style.display='none';
          document.getElementById('sbtn').disabled=true;
          renderSimStop(chk.data);
          return;
        }
        if(risk.level==='high'){
          simStopped=true;
          document.getElementById('sl').style.display='none';
          document.getElementById('sbtn').disabled=true;
          renderSimStop({
            title: lang==='kk'?'СЕН АЛДАНДЫҢ':'ВЫ ПОПАЛИСЬ',
            why: lang==='kk'
              ?['Сен құпия деректі бердің немесе ақша аударуға келістің.']
              :['Вы передали чувствительные данные или согласились на перевод.'],
            advice: lang==='kk'
              ?['Ешқашан SMS-код, пароль, карта деректерін берме.','Банктің ресми номеріне өзің хабарлас.']
              :['Никогда не передавайте SMS‑код, пароль, данные карты.','Свяжитесь с банком по официальному номеру.']
          });
          return;
        }
      }
    }
    const res=await fetch(AI_API_ENDPOINT,{
      method:'POST',
      headers,
      body:JSON.stringify({
        mode:sm,
        lang,
        text:txt,
        system:SYS
      })
    });
    const rawBody=await res.text();
    let data=null;
    try{data=JSON.parse(rawBody);}catch{data=null;}
    if(!res.ok || !data || data.error){
      const msg=(data?.error||data?.message||(!rawBody?`HTTP ${res.status}`:rawBody.slice(0,240))).toString();
      const tip=msg.includes('OPENROUTER_API_KEY')
        ?(lang==='kk'
          ?'Backend конфигі жоқ: серверде OPENROUTER_API_KEY қою керек.'
          :'Нет конфига backend: на сервере нужно задать OPENROUTER_API_KEY.')
        :(lang==='kk'
          ?'Ескерту: free модельде лимит/кезек болуы мүмкін.'
          :'Примечание: у free модели бывают лимиты/очередь.');
      document.getElementById('sr').innerHTML=`<div class="ai-blk"><div class="ai-lbl">⚠ ${lang==='kk'?'ҚАТЕ':'ОШИБКА'}</div><p style="color:var(--danger)">${msg}</p><p style="color:var(--muted);margin-top:.45rem;font-size:.8rem;">${tip}</p><p style="color:var(--muted);margin-top:.25rem;font-size:.75rem;">endpoint: ${AI_API_ENDPOINT}</p></div>`;
      document.getElementById('sr').style.display='block';
    }else{
      const raw=(data.content||'{}').toString();
      const cleaned=raw.replace(/```(?:json)?|```/g,'').trim();
      let p=null;
      try{p=JSON.parse(cleaned);}catch{
        const s=cleaned.indexOf('{'),e=cleaned.lastIndexOf('}');
        if(s!==-1&&e!==-1&&e>s){try{p=JSON.parse(cleaned.slice(s,e+1));}catch{}}
      }
      if(sm==='sim'){
        simHistory.push({role:'assistant',content:cleaned.slice(0,1600)});
        _updateSimActions();
      }
      renderAIR(p,cleaned);
    }
  }catch(e){
    document.getElementById('sr').innerHTML=`<div class="ai-blk"><p style="color:var(--danger)">⚠ ${lang==='kk'?'Қосылу қатесі':'Ошибка соединения'}</p><p style="color:var(--muted);margin-top:.45rem;font-size:.8rem;">${lang==='kk'?'AI сервері іске қосылмаған болуы мүмкін. Деплой үшін backend керек (server.py).':'Возможно AI сервер не запущен. Для деплоя нужен backend (server.py).'}</p></div>`;
    document.getElementById('sr').style.display='block';
  }
  document.getElementById('sl').style.display='none';
  document.getElementById('sbtn').disabled=false;
}
function renderAIR(p,raw){
  let h='';
  if(sm==='adv'&&p){
    const rm={HIGH:'rH',MEDIUM:'rM',LOW:'rL'};
    h+=`<div class="ai-blk"><div class="ai-lbl">◉ ${lang==='kk'?'AI ТАЛДАУЫ':'AI АНАЛИЗ'}</div><span class="rpill ${rm[p.risk]||'rM'}">▲ ${p.risk_label||p.risk}</span><p>${p.what||''}</p></div>`;
    if(p.steps?.length)h+=`<div class="ai-blk"><div class="ai-lbl">◆ ${lang==='kk'?'НЕ ІСТЕУ КЕРЕК':'ЧТО ДЕЛАТЬ'}</div>${p.steps.map((s,i)=>`<p>▸ <b>${i+1}.</b> ${s}</p>`).join('')}</div>`;
    if(p.prevention)h+=`<div class="ai-blk"><div class="ai-lbl">◈ ${lang==='kk'?'БОЛАШАҚТА':'В БУДУЩЕМ'}</div><p>${p.prevention}</p></div>`;
  }else if(sm==='sim'&&p){
    if(p.tactics?.length)h+=`<div class="ai-blk"><div class="ai-lbl">🎭 ${lang==='kk'?'ТАКТИКАЛАР':'ТАКТИКИ'}</div>${p.tactics.map(t=>`<p>⚡ ${t}</p>`).join('')}</div>`;
    if(p.warning_signs?.length)h+=`<div class="ai-blk"><div class="ai-lbl">◈ ${lang==='kk'?'ЕСКЕРТУ БЕЛГІЛЕРІ':'ПРИЗНАКИ'}</div>${p.warning_signs.map(w=>`<p>🚩 ${w}</p>`).join('')}</div>`;
    if(p.defense?.length)h+=`<div class="ai-blk"><div class="ai-lbl">◆ ${lang==='kk'?'ҚОРҒАНЫШ':'ЗАЩИТА'}</div>${p.defense.map(d=>`<p>▸ ${d}</p>`).join('')}</div>`;
  }
  if(!h)h=`<div class="ai-blk"><div class="ai-lbl">◉ AI</div><p>${raw.substring(0,400)}</p></div>`;
  document.getElementById('sr').innerHTML=h;
  document.getElementById('sr').style.display='block';
}

function renderSimStop(info){
  const title = info?.title || (lang==='kk'?'СЕН АЛДАНДЫҢ':'ВЫ ПОПАЛИСЬ');
  const why = info?.why || info?.reasons || [];
  const advice = info?.advice || info?.tips || [];
  let h=`<div class="ai-blk"><div class="ai-lbl">⚠ ${title}</div>`;
  if(why?.length) h+=`${why.map(s=>`<p>▸ ${s}</p>`).join('')}`;
  if(advice?.length) h+=`</div><div class="ai-blk"><div class="ai-lbl">◆ ${lang==='kk'?'КЕҢЕС':'СОВЕТЫ'}</div>${advice.map(s=>`<p>▸ ${s}</p>`).join('')}</div>`;
  else h+=`</div>`;
  document.getElementById('sr').innerHTML=h;
  document.getElementById('sr').style.display='block';
}

function renderSimSummary(p,raw){
  if(!p){
    document.getElementById('sr').innerHTML=`<div class="ai-blk"><div class="ai-lbl">◉ AI</div><p>${raw.substring(0,500)}</p></div>`;
    document.getElementById('sr').style.display='block';
    return;
  }
  let h='';
  if(p.summary) h+=`<div class="ai-blk"><div class="ai-lbl">◎ ${lang==='kk'?'ҚОРЫТЫНДЫ':'ИТОГ'}</div><p>${p.summary}</p></div>`;
  if(p.good_moves?.length) h+=`<div class="ai-blk"><div class="ai-lbl">◆ ${lang==='kk'?'ДҰРЫС ҚАДАМДАР':'ХОРОШИЕ ШАГИ'}</div>${p.good_moves.map(s=>`<p>▸ ${s}</p>`).join('')}</div>`;
  if(p.mistakes?.length) h+=`<div class="ai-blk"><div class="ai-lbl">⚠ ${lang==='kk'?'ҚАТЕЛЕР':'ОШИБКИ'}</div>${p.mistakes.map(s=>`<p>▸ ${s}</p>`).join('')}</div>`;
  if(p.advice?.length) h+=`<div class="ai-blk"><div class="ai-lbl">◈ ${lang==='kk'?'КЕҢЕСТЕР':'СОВЕТЫ'}</div>${p.advice.map(s=>`<p>▸ ${s}</p>`).join('')}</div>`;
  if(typeof p.score==='number') h+=`<div class="ai-blk"><div class="ai-lbl">★ SCORE</div><p>${Math.max(0,Math.min(100,Math.round(p.score)))}/100</p></div>`;
  if(!h) h=`<div class="ai-blk"><div class="ai-lbl">◉ AI</div><p>${raw.substring(0,500)}</p></div>`;
  document.getElementById('sr').innerHTML=h;
  document.getElementById('sr').style.display='block';
}

// ═══════════════════════════════
// SURVEY
// ═══════════════════════════════
function submitS(){
  if(!['q1','q2','q3','q4'].every(n=>document.querySelector(`input[name="${n}"]:checked`))){
    alert(lang==='kk'?'Барлық сұрақтарға жауап беріңіз!':'Ответьте на все вопросы!');return;
  }
  document.getElementById('sf').style.display='none';
  document.getElementById('sd').style.display='block';
}

// ═══════════════════════════════
// SIDEBAR TOGGLE
// ═══════════════════════════════
let sidebarCollapsed = false;
function toggleSidebar(){
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.querySelector('.shell').classList.toggle('collapsed-shell', sidebarCollapsed);
  document.querySelector('.main').classList.toggle('sidebar-small', sidebarCollapsed);
}

// ═══════════════════════════════
// INIT
// ═══════════════════════════════
renderQ();renderLB();updateChips();_updateSimActions();
animatePage("home");
