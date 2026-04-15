// ═══════════════════════════════
// CONFIG
// ═══════════════════════════════
const AI_API_ENDPOINT = normalizeAiEndpoint(
  window.AI_API_ENDPOINT ||
  document.querySelector('meta[name="ai-endpoint"]')?.content ||
  '/api/ai'
);
const AI_ANALYZE_ENDPOINT = toAnalyzeEndpoint(AI_API_ENDPOINT);
const AI_SCORES_ENDPOINT = AI_API_ENDPOINT.replace(/\/api\/ai\/?$/i, '/api/scores');

function normalizeAiEndpoint(v){
  const s=(v??'').toString().trim();
  if(!s) return '/api/ai';
  if(/^https?:\/\//i.test(s)){
    try{
      const u=new URL(s);
      if(!u.pathname || u.pathname==='/') u.pathname='/api/ai';
      if(u.pathname.endsWith('/')) u.pathname=u.pathname.replace(/\/+$/,'');
      return u.toString().replace(/\/$/,'');
    }catch(_){ return s; }
  }
  return s;
}

function toAnalyzeEndpoint(ai){
  const s=(ai??'').toString().trim();
  if(!s) return '/api/analyze';
  if(/\/api\/ai\/?$/i.test(s)) return s.replace(/\/api\/ai\/?$/i,'/api/analyze');
  return s.replace(/\/+$/,'') + '/api/analyze';
}

async function fetchWithRetry(url, options, retries=3){
  const token = localStorage.getItem('token');
  if (token && !options.headers) options.headers = {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  
  for(let i=0;i<retries;i++){
    try{
      const res=await fetch(url,options);
      if(res.ok) return res;
      if((res.status===502||res.status===503) && i<retries-1){
        await new Promise(r=>setTimeout(r,1500));
        continue;
      }
      return res;
    }catch(e){
      if(i===retries-1) throw e;
      await new Promise(r=>setTimeout(r,1500));
    }
  }
}

// PARTICLES
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

// NAV
function go(id){
  const cur=document.querySelector('.page.active');
  if(cur && cur.id!==id){
    cur.classList.add('leaving');
    setTimeout(()=>{ cur.classList.remove('active','leaving'); },180);
  } else if(cur) cur.classList.remove('active');
  setTimeout(()=>{
    const next=document.getElementById(id);
    next.classList.add('active');
    animatePage(id);
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll(`.nav-item[onclick="go('${id}')"]`).forEach(b=>b.classList.add('active'));
    document.getElementById(id).scrollTop=0;
    if(id==='lb') renderLB();
    if(id==='courses') renderCoursesList();
    if(id==='quiz') renderCourseView();
    if(id==='diagnostic') renderDiagnostic();
  }, cur && cur.id!==id ? 150 : 0);
}

function animatePage(id){
  const pg=document.getElementById(id);
  const ph=pg.querySelector('.ph');
  if(ph){ ph.classList.remove('visible'); void ph.offsetWidth; ph.classList.add('visible'); }
  const items=pg.querySelectorAll('.ncard, .tip-row, .hcard, .citem, .course-card');
  items.forEach((el,i)=>{ el.classList.remove('visible'); void el.offsetWidth; setTimeout(()=>el.classList.add('visible'),i*70); });
}

// LANG
let lang='kk';
function toggleLang(){
  lang=lang==='kk'?'ru':'kk';
  const l2=document.getElementById('langLabel'); if(l2) l2.textContent=lang==='kk'?'Русский':'Қазақша';
  const m=document.getElementById('lb3'); if(m) m.textContent=lang==='kk'?'RU':'ҚЗ';
  document.querySelectorAll('[data-kk]').forEach(el=>{
    const v=lang==='kk'?el.getAttribute('data-kk'):el.getAttribute('data-ru');
    if(!v) return;
    if(el.tagName==='TEXTAREA'||el.tagName==='INPUT') el.placeholder=v;
    else el.innerHTML=v;
  });
  updateChipsAdv();
  renderLB();
  renderCoursesList();
  renderCourseView();
  renderSimScenarioOptions();
  renderDiagnostic();
}

// ========== AUTH ==========
let currentUser = null;

function showAuthModal() {
  document.getElementById('authModal').classList.add('on');
}

function hideAuthModal() {
  document.getElementById('authModal').classList.remove('on');
}

function setAuthToken(token, username) {
  localStorage.setItem('token', token);
  currentUser = username;
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.style.display = 'flex';
  hideAuthModal();
  loadUserProgress();
  renderCoursesList();
  renderCourseView();
  renderLB();
  renderDiagnostic();
}

function clearAuth() {
  localStorage.removeItem('token');
  currentUser = null;
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.style.display = 'none';
  showAuthModal();
  Object.keys(courseState).forEach(key => delete courseState[key]);
  renderCoursesList();
  renderCourseView();
}

async function login(username, password) {
  try {
    const res = await fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setAuthToken(data.token, data.username);
  } catch (err) {
    document.getElementById('authError').innerText = err.message;
  }
}

async function register(username, password) {
  try {
    const res = await fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setAuthToken(data.token, data.username);
  } catch (err) {
    document.getElementById('regError').innerText = err.message;
  }
}

async function logout() {
  clearAuth();
}

async function loadUserProgress() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/user/progress'), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.progress) {
      for (const [courseId, prog] of Object.entries(data.progress)) {
        if (!courseState[courseId]) courseState[courseId] = prog;
        else Object.assign(courseState[courseId], prog);
      }
      renderCourseView();
    }
  } catch (err) { console.error(err); }
}

async function saveUserProgress() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    await fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/user/progress'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ progress: courseState })
    });
  } catch (err) { console.error(err); }
}

// LEADERBOARD
async function renderLB(){
  const el=document.getElementById('lbb');
  if(el) el.innerHTML=`<div style="color:var(--muted);font-size:.8rem;padding:.5rem">${lang==='kk'?'Жүктелуде...':'Загрузка...'}</div>`;
  try{
    const res=await fetch(AI_SCORES_ENDPOINT).catch(()=>null);
    if(res && res.ok){
      const data=await res.json().catch(()=>null);
      const scores=data?.scores || [];
      if(scores.length>0){
        const M=['🥇','🥈','🥉'],C=['g','s','b'];
        el.innerHTML=scores.slice(0,20).map((r,i)=>`
          <div class="lbrow">
            <div class="lbrank ${C[i]||''}">${M[i]||i+1}</div>
            <div class="lbname">${r.name}</div>
            <div class="lbsc">${r.s}</div>
            <div class="lbdt">${r.d}</div>
          </div>`).join('');
        return;
      }
    }
  }catch{}
  if(el) el.innerHTML=`<div style="color:var(--muted);font-size:.8rem;padding:.5rem">${lang==='kk'?'Рейтинг бос немесе сервер қолжетімсіз':'Рейтинг пуст или сервер недоступен'}</div>`;
}

// ========== DIAGNOSTIC ==========
const DIAGNOSTIC_QUESTIONS = [
  {q:"Күшті пароль қандай болуы керек?", o:["Туған күніңіз","12+ символ, әріп, сан, белгі","Атыңыз","123456"], a:1},
  {q:"Фишинг дегеніміз не?", o:["Балық аулау","Жеке деректерді ұрлау әрекеті","Интернет жылдамдығын тексеру","Вирусты жою"], a:1},
  {q:"2FA деген не?", o:["Екі қадамды тексеру","Екі пароль","Қосымша файл","Екі антивирус"], a:0},
  {q:"Ашық Wi-Fi желісінде қандай қауіп бар?", o:["Интернет баяу","Деректерді ұстап алу","Батарея тез біту","Ешқандай"], a:1},
  {q:"Жалған сілтемені қалай тануға болады?", o:["Доменді тексеру","Бірден басу","Достарға жіберу","Ашу"], a:0},
  {q:"Пароль менеджері не үшін керек?", o:["Парольдерді жадында сақтау","Жеделдету","Антивирус","Кэш тазалау"], a:0},
  {q:"Құпия сөзді бірнеше жерде қолдану қауіпті ме?", o:["Жоқ","Иә, біреуі бұзылса бәрі бұзылады","Тек банкте","Тек поштада"], a:1},
  {q:"Екі факторлы аутентификацияның қай түрі қауіпсіз?", o:["SMS","Google Authenticator","E-mail","Барлығы бірдей"], a:1},
  {q:"Банк SMS-код сұраса не істеу керек?", o:["Жіберу","Тексермей жіберу","Банкке өзің қоңырау шалып тексеру","Елемеу"], a:2},
  {q:"AI (ChatGPT) қолданғанда не істеу керек?", o:["Барлық деректерді енгізу","Жеке деректерді енгізбеу","Парольді айту","Банк картасын жазу"], a:1}
];

let diagCurrent = 0;
let diagAnswers = [];
let diagSubmitted = false;

function renderDiagnostic() {
  const box = document.getElementById('diagnosticBox');
  if (!box) return;
  
  const token = localStorage.getItem('token');
  if (!token) {
    box.innerHTML = `<div class="course-empty">${lang==='kk'?'Диагностикадан өту үшін кіріңіз.':'Войдите, чтобы пройти диагностику.'}</div>`;
    return;
  }
  
  if (diagSubmitted) {
    box.innerHTML = `<div class="course-empty">${lang==='kk'?'Сіз диагностиканы тапсырдыңыз. Нәтиже рейтингке қосылды.':'Вы прошли диагностику. Результат добавлен в рейтинг.'}</div>`;
    return;
  }
  
  if (diagCurrent >= DIAGNOSTIC_QUESTIONS.length) {
    submitDiagnostic();
    return;
  }
  
  const q = DIAGNOSTIC_QUESTIONS[diagCurrent];
  const d = q;
  const prog = Math.round((diagCurrent / DIAGNOSTIC_QUESTIONS.length) * 100);
  
  box.innerHTML = `
    <div class="qwrap">
      <div class="qprog-bg"><div class="qprog-fill" style="width:${prog}%"></div></div>
      <div class="qmeta">${lang==='kk'?'СҰРАҚ':'ВОПРОС'} ${diagCurrent+1} / ${DIAGNOSTIC_QUESTIONS.length}</div>
      <div class="qq">${d.q}</div>
      <div class="qopts">
        ${d.o.map((o,i)=>`<button class="qopt" onclick="pickDiagnostic(${i})"><span class="qkey">${['A','B','C','D'][i]}</span>${o}</button>`).join('')}
      </div>
      <div class="qfb" id="diagFb"></div>
      <div class="qfoot">
        <span class="qscore">✓ ${diagAnswers.filter(a=>a!==null).length}/${DIAGNOSTIC_QUESTIONS.length}</span>
        <button class="qnext" id="diagNext" style="display:none;" onclick="nextDiagnostic()">${diagCurrent===DIAGNOSTIC_QUESTIONS.length-1?(lang==='kk'?'НӘТИЖЕ ▶':'РЕЗУЛЬТАТ ▶'):(lang==='kk'?'КЕЛЕСІ ▶':'ДАЛЕЕ ▶')}</button>
      </div>
    </div>
  `;
}

function pickDiagnostic(idx) {
  if (diagAnswers[diagCurrent] !== undefined) return;
  diagAnswers[diagCurrent] = idx;
  const q = DIAGNOSTIC_QUESTIONS[diagCurrent];
  const isCorrect = (idx === q.a);
  const fbDiv = document.getElementById('diagFb');
  if (isCorrect) {
    fbDiv.innerHTML = `✓ ${lang==='kk'?'Дұрыс!':'Правильно!'}`;
    fbDiv.className = 'qfb show ok';
  } else {
    fbDiv.innerHTML = `✗ ${lang==='kk'?'Қате! Дұрыс жауап: ':'Ошибка! Правильный ответ: '} ${q.o[q.a]}`;
    fbDiv.className = 'qfb show err';
  }
  document.querySelectorAll('.qopt').forEach(btn => btn.classList.add('dis'));
  document.getElementById('diagNext').style.display = 'inline-block';
  document.querySelector('.qscore').textContent = `✓ ${diagAnswers.filter(a=>a!==null).length}/${DIAGNOSTIC_QUESTIONS.length}`;
}

function nextDiagnostic() {
  diagCurrent++;
  renderDiagnostic();
}

async function submitDiagnostic() {
  let correct = 0;
  for (let i = 0; i < DIAGNOSTIC_QUESTIONS.length; i++) {
    if (diagAnswers[i] === DIAGNOSTIC_QUESTIONS[i].a) correct++;
  }
  const score = Math.round((correct / DIAGNOSTIC_QUESTIONS.length) * 100);
  let level = '';
  if (score >= 80) level = lang==='kk'?'Жоғары':'Высокий';
  else if (score >= 60) level = lang==='kk'?'Орташа':'Средний';
  else level = lang==='kk'?'Бастауыш':'Начальный';
  
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    await fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/diagnostic'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ score, level })
    });
    diagSubmitted = true;
    renderDiagnostic();
    renderLB();
  } catch (err) {
    console.error(err);
  }
  // ========== COURSE DATA (толық 7 курс) ==========
const COURSE_DATA = [
  {
    id: 'phishing',
    title: 'Фишинг және алаяқтық',
    desc: 'Фишинг түрлері, күмәнді белгілер және қауіпсіз әрекеттер.',
    modules: [
      {
        title: 'Фишинг деген не?',
        lead: 'Фишинг — сенімді ұйым болып көрініп, жеке дерек немесе ақша сұрайтын алаяқтық.',
        points: ['Асықтыру мен қорқыту — күдікті белгі.', 'Күдікті сілтеме мен қате доменге назар аудар.', 'Бейтаныс файлды ашпа.'],
        quiz: [
          { q: 'Фишинг деген не?', o: ['Интернеттегі ойын', 'Сенімді ұйым болып көрініп дерек немесе ақша сұрау', 'Компьютерді тездету', 'Вирусты жою әдісі'], a: 1, e: 'Фишингтің мақсаты — дерек немесе ақша алу.' },
          { q: 'Хаттағы ең қауіпті белгі қандай?', o: ['Сәлемдесу', 'Жедел әрекет етуге қысым', 'Ұзын мәтін', 'Логотип'], a: 1, e: 'Асықтыру мен қысым — фишингтің жиі белгісі.' },
          { q: 'Сілтемені тексерудің дұрыс жолы', o: ['Бірден басу', 'Нақты доменді қарап алу', 'Тек қысқа URL-ға сену', 'Достарға жіберу'], a: 1, e: 'Алдымен нақты доменді тексер.' }
        ]
      },
      {
        title: 'Тексеру әдеттері',
        lead: 'Кез келген сұранысты ресми арна арқылы тексер. Күмән туғанда тоқтаған дұрыс.',
        points: ['Банк SMS‑кодты ешқашан сұрамайды.', 'Күмәнді қоңырауды тоқтатып, ресми нөмірге өзің қоңырау шал.', 'Қысқартылған сілтемелерді ашпа.'],
        quiz: [
          { q: 'Банк SMS‑кодты сұрай ма?', o: ['Иә, әрқашан', 'Жоқ, банк код сұрамайды', 'Тек түнде', 'Тек чатта'], a: 1, e: 'Банк SMS‑кодты сұрамайды.' },
          { q: 'Қауіпсіздік қызметі қысым жасаса не істеу керек?', o: ['Барлығын айтып беру', 'Қоңырауды тоқтатып, ресми нөмірге өзің хабарласу', 'SMS код жіберу', 'Ақша аудару'], a: 1, e: 'Ресми арнамен өзің қайта тексер.' },
          { q: 'Қысқартылған сілтеме келгенде', o: ['Бірден ашу', 'Тексермей ашпау', 'Барлығына тарату', 'Пароль енгізу'], a: 1, e: 'Қысқартылған URL күдікті болуы мүмкін.' }
        ]
      },
      {
        title: 'Әрекет және қорғаныс',
        lead: 'Қауіп байқалса — тез әрекет ет. Қауіпсіздік әдеттері тұрақты болуы керек.',
        points: ['Құпиясөзді ауыстыр және 2FA қос.', 'Күмәнді файл/сілтемені ашпа.', 'Қажет болса банкке хабарлас.'],
        quiz: [
          { q: 'Күдікті файл келсе дұрыс әрекет', o: ['Ашпай, жою', 'Антивируссыз ашу', 'Достарға жіберу', 'Көшіру'], a: 0, e: 'Күмәнді файлды ашпа.' },
          { q: 'Қауіпті сілтемені ашып қойсаң', o: ['Ештеңе істемеу', 'Құпиясөзді ауыстыру', 'Карта деректерін енгізу', 'Қайта басу'], a: 1, e: 'Құпиясөзді ауыстырып, аккаунтты тексер.' },
          { q: '2FA не үшін керек?', o: ['Әдемі болу', 'Қосымша қорғаныс', 'Интернет жылдамдату', 'Жарнама көру'], a: 1, e: '2FA аккаунтты күшейтеді.' }
        ]
      }
    ],
    finalExtra: [{ q: 'Фишингтен қорғанудың ең дұрыс қадамы қайсы?', o: ['Кодты жіберу', 'Ресми арнамен өзің қайта тексеру', 'Сілтемені ашу', 'Барлығын жариялау'], a: 1, e: 'Тек ресми арнаны пайдалан.' }]
  },
  {
    id: 'passwords',
    title: 'Пароль қауіпсіздігі',
    desc: 'Күшті пароль, 2FA және қауіпсіз сақтау әдеттері.',
    modules: [
      {
        title: 'Күшті пароль жасау',
        lead: 'Қауіпсіз пароль ұзын, бірегей және болжанбайтын болуы керек.',
        points: ['12+ символ, әріп/сан/белгі қолдан.', 'Әр аккаунтқа бөлек пароль қой.', 'Passphrase — есте сақталатын ұзын сөйлем.'],
        quiz: [
          { q: 'Күшті пароль қандай?', o: ['Қысқа сөз', '12+ символ, әріп/сан/белгі', 'Туған күн', 'Атыңыз'], a: 1, e: 'Ұзын әрі күрделі пароль қауіпсіз.' },
          { q: 'Бір парольді қайталау несімен қауіпті?', o: ['Қауіпсіз', 'Біреуі бұзылса бәрі бұзылады', 'Ұсынылады', 'Тек банкте'], a: 1, e: 'Бір пароль бұзылса, барлық аккаунт ашылады.' },
          { q: 'Passphrase деген не?', o: ['Ұзын есте сақталатын сөйлем', '4 сан', 'Туған күн', 'Лақап ат'], a: 0, e: 'Ұзын сөйлем қауіпсіз әрі есте қалады.' }
        ]
      },
      {
        title: 'Сақтау және менеджер',
        lead: 'Парольді қауіпсіз сақтау үшін менеджер қолданған дұрыс.',
        points: ['Менеджер парольді шифрлап сақтайды.', 'Құпиясөзді чатқа немесе стикерге жазба.', 'Breach сервистерінен паролің шыққан‑шықпағанын тексер.'],
        quiz: [
          { q: 'Пароль менеджердің артықшылығы', o: ['Құпиясөзді ашық сақтайды', 'Шифрланған түрде сақтайды', 'Хатқа жібереді', 'Бәрін бірдей етеді'], a: 1, e: 'Менеджер деректі шифрлап сақтайды.' },
          { q: 'Парольді қайда сақтау дұрыс емес?', o: ['Менеджерде', 'Қағазда үстелде', 'Қауіпсіз сейфте', 'Authenticator қосымшада'], a: 1, e: 'Көрінетін жерде сақтау — қауіп.' },
          { q: 'Бұзылған парольді қалай білеміз?', o: ['Достардан', 'Провайдерден', 'Breach тексеру сервистерінен', 'VPN арқылы'], a: 2, e: 'Breach сервистері паролі ағып кеткенін көрсетеді.' }
        ]
      },
      {
        title: '2FA және құрылғы',
        lead: 'Қосымша қорғаныс пен құрылғы қауіпсіздігі аккаунтты сақтайды.',
        points: ['2FA қосу — негізгі қорғаныс.', 'Authenticator көбіне SMS‑тен қауіпсіз.', 'Құрылғыны құлыптап, жүйені жаңартып отыр.'],
        quiz: [
          { q: '2FA деген не?', o: ['Екі қадамды қорғау', 'Екі парольді бірге қолдану', 'Wi‑Fi жылдамдату', 'Антивирус'], a: 0, e: '2FA — қосымша растау коды.' },
          { q: 'SMS пен authenticator салыстырмасында', o: ['SMS қауіпсіз', 'Authenticator қауіпсіз', 'Екеуі бірдей', 'Екеуі қауіпті'], a: 1, e: 'Authenticator әдетте қауіпсізірек.' },
          { q: 'Құлып экранының рөлі', o: ['Қажет емес', 'Қорғаныстың базалық бөлігі', 'Тек компьютерге', 'Тек балаларға'], a: 1, e: 'Құлып экраны — базалық қорғаныс.' }
        ]
      }
    ],
    finalExtra: [{ q: 'Парольді біреуге беру туралы дұрыс жауап', o: ['Қауіпсіз', 'Тек жақындарға болады', 'Беруге болмайды', 'Чатта жіберуге болады'], a: 2, e: 'Құпиясөзді ешкімге берме.' }]
  },
  {
    id: 'social',
    title: 'Әлеуметтік желі қауіпсіздігі',
    desc: 'Құпиялық баптауы, қауіптер және аккаунтты қорғау.',
    modules: [
      {
        title: 'Құпиялық баптауы',
        lead: 'Профильді ашық қалдырма. Жеке деректерді барынша шектеңіз.',
        points: ['Профильді достарға ғана көрсет.', 'Телефон, мекенжай, ИИН сияқты деректерді жариялама.', 'Геолокацияны қажет болмаса өшір.'],
        quiz: [
          { q: 'Құпиялық баптауының дұрыс нұсқасы', o: ['Барлығына ашық', 'Достарға ғана', 'Белгісізге ашық', 'Жабық қажет емес'], a: 1, e: 'Көбіне достарға ғана қолжетімді болуы дұрыс.' },
          { q: 'Геолокация туралы дұрыс тұжырым', o: ['Қауіпсіз', 'Үй/орынды көрсетуі мүмкін, абайлау керек', 'Тек ойын', 'Тек фото сапасы'], a: 1, e: 'Геолокация жеке орынға қауіп төндіруі мүмкін.' },
          { q: 'Профильде қандай дерек қауіпті?', o: ['Жалпы қала', 'ИИН/карта/құпия дерек', 'Хобби', 'Қызығушылық'], a: 1, e: 'Құпия деректерді жариялама.' }
        ]
      },
      {
        title: 'Алаяқтар және фейк аккаунт',
        lead: 'Әлеуметтік желіде алаяқтар жиі кездеседі. Әрбір хабарламаны тексер.',
        points: ['DM‑дегі сілтемелерге сақ бол.', 'Giveaway және ұтыс хабарларын ресми аккаунттан тексер.', 'Бөгде friend request болса — профильді қарап ал.'],
        quiz: [
          { q: 'DM‑дегі сілтеме келгенде', o: ['Бірден ашу', 'Жіберушіні тексеру', 'Барлығына тарату', 'Пароль енгізу'], a: 1, e: 'Алдымен кім жібергенін тексер.' },
          { q: 'Giveaway ұтысы туралы хабар', o: ['Әрқашан шынайы', 'Ресми аккаунтты тексеру керек', 'Қатынаса беру', 'Дереу ақша жіберу'], a: 1, e: 'Ресми аккаунттан ғана сенімді.' },
          { q: 'Бөгде адамнан friend request келсе', o: ['Қабылдау', 'Профиль тексеріп, қажет болмаса қабылдамау', 'Қайтару', 'Сілтеме сұрау'], a: 1, e: 'Бөгдені тексеріп, қажет болмаса қабылдама.' }
        ]
      },
      {
        title: 'Қалпына келтіру және бақылау',
        lead: 'Аккаунт қауіпсіздігін сақтау үшін 2FA және сессия бақылауын қолдан.',
        points: ['2FA қосып қой.', 'Белгісіз сессияны тоқтат.', 'Қалпына келтіру email/телефонды жаңартып отыр.'],
        quiz: [
          { q: 'Белгісіз сессия көрсең', o: ['Маңызды емес', 'Сессияны тоқтату', 'Барлығын қалдыру', 'Басқаға беру'], a: 1, e: 'Белгісіз құрылғыны шығарып таста.' },
          { q: 'Қалпына келтіру email/телефон', o: ['Маңызды', 'Маңызы жоқ', 'Тек уақытша', 'Тек ойын'], a: 0, e: 'Қалпына келтіру деректері маңызды.' },
          { q: 'Қосылған қолданбалар', o: ['Тексермей қалдыру', 'Артықтарын өшіру', 'Барлығына рұқсат беру', 'Жоюға болмайды'], a: 1, e: 'Артық қолданбаларды өшір.' }
        ]
      }
    ],
    finalExtra: [{ q: 'Қорлау/қысым болса дұрыс әрекет', o: ['Жауап беру', 'Блоктау және шағымдану', 'Елемеу', 'Өзің де қорлау'], a: 1, e: 'Блоктап, шағымдану дұрыс.' }]
  },
  {
    id: 'fake',
    title: 'Жалған ақпарат (Фейк)',
    desc: 'Фейкті тану, фактчек және саналы бөлісу.',
    modules: [
      {
        title: 'Фейк белгілері',
        lead: 'Фейк жаңалықтар эмоцияға әсер етуге және тез таралуға тырысады.',
        points: ['Айқайлы тақырып пен эмоцияға қысым — белгі.', 'Дәлел, дереккөз жоқ болса — күмәнді.', 'Мәтіндегі асығыстық — манипуляция.'],
        quiz: [
          { q: 'Фейктің жиі белгісі', o: ['Эмоцияға қысым', 'Ресми құжат', 'Нақты дереккөз', 'Сілтемесі бар материал'], a: 0, e: 'Эмоцияға қысым — фейктің белгісі.' },
          { q: 'Кликбейт деген не?', o: ['Нақты ақпарат', 'Адамды басуға итермелейтін тақырып', 'Ресми белгі', 'Фактчек'], a: 1, e: 'Кликбейт эмоцияға ойнайды.' },
          { q: 'Жалған ақпаратты бірден тарату', o: ['Дұрыс', 'Алдымен тексеру керек', 'Ұсынылады', 'Тек достарға'], a: 1, e: 'Алдымен тексер, содан кейін ғана бөліс.' }
        ]
      },
      {
        title: 'Фактчек қадамдары',
        lead: 'Ақпаратты бірнеше дереккөзден тексеру — негізгі ереже.',
        points: ['Дереккөзді және авторды тексер.', 'Дата мен контекстке назар аудар.', 'Суретті кері іздеу арқылы тексер.'],
        quiz: [
          { q: 'Ақпаратты қалай тексереміз?', o: ['Барлығына сену', '2-3 дереккөзден тексеру', 'Тек бір блог', 'Тек комментарий'], a: 1, e: 'Бірнеше дереккөзді салыстыр.' },
          { q: 'Дереккөзді тексеру', o: ['Кездейсоқ чат', 'Ресми/беделді дереккөз', 'Тек мем', 'Тек пікір'], a: 1, e: 'Ресми дереккөзге сүйен.' },
          { q: 'Суретті тексеру тәсілі', o: ['Қайта жүктеу', 'Reverse image search', 'Сүзгі қою', 'Кесіп тастау'], a: 1, e: 'Кері іздеу суреттің түпнұсқасын табады.' }
        ]
      },
      {
        title: 'Саналы бөлісу және deepfake',
        lead: 'Deepfake пен манипуляцияны тану үшін сыни ойлау қажет.',
        points: ['Контекст бұрмаланса — фейк туады.', 'Deepfake‑те дыбыс/ерін сәйкессіз болуы мүмкін.', 'Алгоритмдер қызығушылыққа сай контент береді.'],
        quiz: [
          { q: 'Deepfake белгісі', o: ['Барлығы үйлесімді', 'Жарық/ерін қозғалысы сәйкес емес', 'HD сапа', 'Ресми аккаунт'], a: 1, e: 'Техникалық сәйкессіздік — белгі.' },
          { q: 'Дата/контекст неге маңызды?', o: ['Маңызды емес', 'Ескі жаңалық жаңаша көрінуі мүмкін', 'Тек сурет', 'Тек пікір'], a: 1, e: 'Контекст бұрмаланса — фейк туады.' },
          { q: 'Алгоритмдер туралы дұрыс', o: ['Тек шындықты көрсетеді', 'Қызығушылыққа сай контент береді', 'Әрдайым тең', 'Тек білім'], a: 1, e: 'Алгоритмдер қызығушылыққа бейімделеді.' }
        ]
      }
    ],
    finalExtra: [{ q: 'Фейк көрсең не істеу керек?', o: ['Дереу тарату', 'Тексеріп, қажет болса шағымдану', 'Пікір жазу', 'Қорқыту'], a: 1, e: 'Тексеру және шағым — дұрыс жол.' }]
  },
  {
    id: 'privacy',
    title: 'Жеке деректерді қорғау',
    desc: 'Дерек түрлері, рұқсаттар және қауіп туғанда әрекет.',
    modules: [
      {
        title: 'Жеке дерек деген не?',
        lead: 'Жеке деректер — сізді анықтайтын мәліметтер. Оларды тек қажет жағдайда ғана беріңіз.',
        points: ['ИИН, паспорт, телефон, адрес — жеке дерек.', 'Дерек минимизациясы: тек қажет ақпаратты ғана бер.', 'Қоғамдық Wi‑Fi‑да абай бол.'],
        quiz: [
          { q: 'Жеке дерекке не жатады?', o: ['Кездейсоқ ник', 'ИИН/паспорт/телефон', 'Мем', 'Жаңалық'], a: 1, e: 'ИИН, паспорт, телефон — жеке дерек.' },
          { q: 'Дерек минимизациясы', o: ['Артық дерек беру', 'Тек қажет деректі беру', 'Кез келген формаға беру', 'Құпиясөзді беру'], a: 1, e: 'Тек қажет деректі ғана бер.' },
          { q: 'Қоғамдық Wi‑Fi‑да дұрыс әрекет', o: ['Банкке кіру', 'VPN қолдану немесе абай болу', 'Құпиясөз жіберу', 'Файлдарды ашу'], a: 1, e: 'Қоғамдық Wi‑Fi‑да қауіп жоғары.' }
        ]
      },
      {
        title: 'Рұқсаттар және келісім',
        lead: 'Қосымша рұқсаттарын бақылап, келісім мәтінін қарап шығу қажет.',
        points: ['Артық рұқсат берме.', 'Келісім мәтінінде қандай дерек жиналатынын қара.', 'Деректі өшіру құқығы бар.'],
        quiz: [
          { q: 'Қосымша рұқсаттары', o: ['Барлығын беру', 'Тек қажеттісін беру', 'Мүлдем бермеу', 'GPS-ті әрқашан беру'], a: 1, e: 'Артық рұқсат — қауіп.' },
          { q: 'Келісім мәтіні', o: ['Оқымай келісу', 'Нені жинайтынын қарау', 'Құпиясөз жазу', 'Скриншот'], a: 1, e: 'Кемі негізгі тармақтарды қарап шық.' },
          { q: 'Деректі өшіру құқығы', o: ['Жоқ', 'Бар, сұрау жіберуге болады', 'Тек банкке', 'Тек мектепке'], a: 1, e: 'Сервистен деректі жоюды сұрауға болады.' }
        ]
      },
      {
        title: 'Қауіп кезінде әрекет',
        lead: 'Қауіп байқалса — жедел әрекет ету керек.',
        points: ['Құрылғы жоғалса — қашықтан бұғатта.', 'Фишинг болса — дерек бермей, ресми арнадан тексер.', 'Leak болса — құпиясөзді ауыстыр.'],
        quiz: [
          { q: 'Құрылғы жоғалса не істеу керек?', o: ['Ештеңе істемеу', 'Қашықтан бұғаттау/өшіру', 'SIM-ді ашық қалдыру', 'Парольді жазу'], a: 1, e: 'Remote lock/erase — ең дұрыс қадам.' },
          { q: 'Фишинг дерек сұраса', o: ['Беріп жіберу', 'Бермеу және тексеру', 'SMS код жіберу', 'Карта деректерін айту'], a: 1, e: 'Деректі бермей, ресми арнадан тексер.' },
          { q: 'Leak болғанда не істеу керек?', o: ['Ештеңе істемеу', 'Парольді ауыстыру, банкке хабарлау', 'Барлығын жариялау', 'Қайта қолдану'], a: 1, e: 'Жедел әрекет — қауіптің алдын алады.' }
        ]
      }
    ],
    finalExtra: [{ q: 'Құжат фотосын чатқа жіберу туралы дұрыс жауап', o: ['Қауіпсіз', 'Қауіпті, тек ресми арнамен', 'Әрқашан болады', 'Тек түнде'], a: 1, e: 'Құжатты тек ресми арнамен жібер.' }]
  },
  {
    id: 'bullying',
    title: 'Кибербуллинг және этика',
    desc: 'Онлайн қысымнан қорғану және дұрыс этикалық мінез.',
    modules: [
      {
        title: 'Кибербуллинг түрлері',
        lead: 'Кибербуллинг — онлайн қысым мен қорлау. Оны елемеу емес, дұрыс әрекет маңызды.',
        points: ['Қорлау, қоқан‑лоқы, доксинг — кибербуллинг түрлері.', 'Әлеуметтік желіде де қауіп болуы мүмкін.', 'Қауіп төнсе — дәлел жина.'],
        quiz: [
          { q: 'Кибербуллинг деген не?', o: ['Онлайн қорлау/қысым', 'Ойын', 'Жарнама', 'Құпия'], a: 0, e: 'Кибербуллинг — онлайн қысым.' },
          { q: 'Доксинг деген не?', o: ['Ойын', 'Жеке деректерді жариялау', 'Жарнама', 'Қорғау'], a: 1, e: 'Доксинг — жеке деректерді жариялау.' },
          { q: 'Қорлау/қысым болса дұрыс әрекет', o: ['Жауап беру', 'Блоктау және шағымдану', 'Елемеу', 'Өзің де қорлау'], a: 1, e: 'Блоктап, шағымдану дұрыс.' }
        ]
      },
      {
        title: 'Қорғану және көмек',
        lead: 'Қорғану үшін дәлел жинап, көмек сұрау маңызды.',
        points: ['Скриншот жасап дәлел сақта.', 'Платформаға шағымдан.', 'Сенімді ересекке немесе досқа айт.'],
        quiz: [
          { q: 'Дәлелді қалай сақтаймыз?', o: ['Скриншот сақтау', 'Жою', 'Қорқыту', 'Тарату'], a: 0, e: 'Скриншот — негізгі дәлел.' },
          { q: 'Көмек сұрау', o: ['Ешкімге айтпау', 'Сенімді ересекке айту', 'Тек форум', 'Жауап беру'], a: 1, e: 'Сенімді адамға айту маңызды.' },
          { q: 'Бақылаушы рөлі', o: ['Қолдау көрсету және хабарлау', 'Қорлауға қосылу', 'Күлкі ету', 'Көру'], a: 0, e: 'Бақылаушы да көмектесе алады.' }
        ]
      },
      {
        title: 'Онлайн этика',
        lead: 'Әдеп пен құрмет — қауіпсіз орта құрудың негізі.',
        points: ['Авторлық құқықты сыйла.', 'Рұқсатсыз фото/контент таратпа.', 'Топ чатта спам жасама.'],
        quiz: [
          { q: 'Авторлық құқық туралы дұрыс тұжырым', o: ['Қажет емес', 'Рұқсатсыз пайдалану заңсыз', 'Тек мектепте', 'Тек ойын'], a: 1, e: 'Авторлық құқықты сақтау керек.' },
          { q: 'Жеке шекара', o: ['Рұқсатсыз фото жариялау', 'Рұқсат сұрау', 'Тек өзім', 'Міндетті емес'], a: 1, e: 'Рұқсат сұрау — дұрыс.' },
          { q: 'Топ чат этикасы', o: ['Барлығын тегімен белгілеу', 'Артық спам жасамау', 'Қорлау', 'Қауесет'], a: 1, e: 'Артық спам жасамау керек.' }
        ]
      }
    ],
    finalExtra: [{ q: 'Қауіп төнсе ең дұрыс әрекет', o: ['Кек алу', 'Бұғаттау, дәлел, хабарлау', 'Профильді өшіру және үнсіз', 'Барлығын жіберу'], a: 1, e: 'Қауіп болса — бұғаттап, хабарла.' }]
  },
  {
    id: 'ai',
    title: 'AI сауаттылығы',
    desc: 'AI мүмкіндігі, шектеуі және қауіпсіз қолдану.',
    modules: [
      {
        title: 'AI негіздері',
        lead: 'AI жауаптары қате болуы мүмкін. Сондықтан сыни ойлау маңызды.',
        points: ['AI әрқашан дұрыс жауап бермейді.', 'Bias — дерекке байланысты қисайу.', 'Жауапты міндетті түрде тексер.'],
        quiz: [
          { q: 'AI жауаптары туралы дұрыс тұжырым', o: ['Әрқашан дұрыс', 'Қате болуы мүмкін', 'Құжат', 'Заң'], a: 1, e: 'AI қателесуі мүмкін.' },
          { q: 'Bias деген не?', o: ['Жоқ нәрсе', 'Дерекке байланысты қисайу', 'Тек ойын', 'Тек мәтін'], a: 1, e: 'Bias — дерекке тәуелді қисайу.' },
          { q: 'Модель сенімділігі туралы', o: ['Әрқашан бірдей', 'Жауап өзгеруі мүмкін', 'Жоқ', 'Тек офлайн'], a: 1, e: 'Модель жаңартылса жауап өзгереді.' }
        ]
      },
      {
        title: 'Қауіпсіз пайдалану',
        lead: 'AI‑ды қауіпсіз қолдану үшін жеке деректерді қорғаңыз.',
        points: ['Жеке дерек енгізбе немесе маскала.', 'AI‑ды көмекші ретінде пайдалан.', 'Нақты промпт жақсы жауап береді.'],
        quiz: [
          { q: 'Жеке дерек енгізу', o: ['Қорықпай енгізу', 'Енгізбеу немесе маскалау', 'Тек пароль', 'Тек карта'], a: 1, e: 'Жеке деректі енгізбе.' },
          { q: 'AI‑ды қолдану тәсілі', o: ['Толық тапсырманы көшіріп беру', 'Көмекші ретінде пайдалану', 'Мүлдем қолданбау', 'Тек емтиханда'], a: 1, e: 'AI — көмекші.' },
          { q: 'Жақсы промпт', o: ['Түсініксіз', 'Нақты және контекстті', 'Бос', 'Тек код'], a: 1, e: 'Нақты промпт жақсы жауап береді.' }
        ]
      },
      {
        title: 'Жауапкершілік',
        lead: 'AI жауаптарын тексеру және жауапкершілікпен қолдану қажет.',
        points: ['Дереккөз көрсетіп, тексер.', 'Плагиатқа жол берме.', 'Жоғары тәуекелде адам тексеруі керек.'],
        quiz: [
          { q: 'Плагиатқа қатысты дұрыс жауап', o: ['AI мәтінін сол күйі тапсыру', 'Дереккөз көрсету және өз сөзіңмен өңдеу', 'Ештеңе қажет емес', 'Тек көшіріп алу'], a: 1, e: 'Өз сөзіңмен өңдеу қажет.' },
          { q: 'Жоғары тәуекел шешім', o: ['AI-ға толық тапсыру', 'Адамдық тексеріс қажет', 'Еш тексеріс', 'Тек чат'], a: 1, e: 'Қауіп жоғары болса адам тексеруі қажет.' },
          { q: 'Нәтижені пайдалану', o: ['Тексерусіз жариялау', 'Тексеріп, жауапкершілікпен қолдану', 'Көшіріп жіберу', 'Кез келгенін'], a: 1, e: 'Жауапты пайдалану маңызды.' }
        ]
      }
    ],
    finalExtra: [{ q: 'API кілті туралы дұрыс тұжырым', o: ['Жариялау', 'Жасырын сақтау', 'Чатта жіберу', 'Құжатқа жазу'], a: 1, e: 'Кілт құпия болуы керек.' }]
  }
];

function getFinalQuestions(course) {
  if (course.final) return course.final;
  const base = (course.modules || []).flatMap(m => m.quiz || []);
  const extra = course.finalExtra || [];
  course.final = [...base, ...extra].slice(0, 10);
  return course.final;
}

COURSE_DATA.forEach(c => { getFinalQuestions(c); });

let currentCourseId = null;
const courseState = {};
const courseListOpen = {};

function getCourse(id) {
  return COURSE_DATA.find(c => c.id === id) || COURSE_DATA[0];
}

function ensureCourseState(courseId) {
  if (courseState[courseId]) return courseState[courseId];
  const c = getCourse(courseId);
  const finalQs = getFinalQuestions(c);
  courseState[courseId] = {
    started: false,
    modules: c.modules.map((m, i) => ({
      open: i === 0,
      ready: false,
      done: false,
      score: 0,
      answers: Array(m.quiz.length).fill(null)
    })),
    final: {
      started: false,
      idx: 0,
      score: 0,
      answered: false,
      done: false,
      answers: Array(finalQs.length).fill(null),
      submitted: false
    }
  };
  return courseState[courseId];
}

function toggleCourseDetails(courseId) {
  courseListOpen[courseId] = !courseListOpen[courseId];
  renderCoursesList();
}

function startCourse(courseId) {
  const st = ensureCourseState(courseId);
  if (!st.started) {
    st.started = true;
    st.modules.forEach((m, i) => { m.open = i === 0; });
  }
  renderCourseView();
}

function isModuleUnlocked(st, mi) {
  if (!st.started) return false;
  if (mi === 0) return true;
  return !!st.modules[mi - 1]?.done;
}

function allModulesDone(st) {
  return st.modules.every(m => m.done);
}

function moduleStats(course, st, mi) {
  const m = course.modules[mi];
  const answers = st.modules[mi].answers;
  const total = m.quiz.length;
  let answered = 0, correct = 0;
  answers.forEach((a, i) => {
    if (a !== null) {
      answered++;
      if (a === m.quiz[i].a) correct++;
    }
  });
  const pass = answered === total && correct >= Math.ceil(total * 0.66);
  return { total, answered, correct, pass };
}

function renderCoursesList() {
  const wrap = document.getElementById('courseList');
  if (!wrap) return;
  const startLabel = lang === 'kk' ? 'Курсты бастау' : 'Начать курс';
  const metaLabel = lang === 'kk' ? (cnt => `3 модуль · ${cnt} сұрақ · сертификат`) : (cnt => `3 модуля · ${cnt} вопросов · сертификат`);
  const toggleLabel = (open) => lang === 'kk' ? (open ? 'Жабу' : 'ҚҰРЫЛЫМЫ') : (open ? 'Скрыть' : 'Структура');
  const moduleLabel = (i) => lang === 'kk' ? `Модуль ${i + 1}` : `Модуль ${i + 1}`;
  const textLabel = lang === 'kk' ? 'Мәтін' : 'Текст';
  const miniLabel = lang === 'kk' ? 'Мини‑тест (3 сұрақ)' : 'Мини‑тест (3 вопроса)';
  const finalLabel = lang === 'kk' ? 'Қорытынды тест (10 сұрақ)' : 'Итоговый тест (10 вопросов)';
  
  wrap.innerHTML = COURSE_DATA.map(c => {
    const open = !!courseListOpen[c.id];
    const total = getFinalQuestions(c).length;
    const steps = c.modules.map((m, mi) => `
      <div class="course-step">
        <span class="tag">${moduleLabel(mi)}</span>
        <span>${m.title} · ${textLabel} → ${miniLabel}</span>
      </div>
    `).join('');
    return `
      <div class="course-card ${open ? 'open' : ''}">
        <div class="course-head" onclick="toggleCourseDetails('${c.id}')">
          <div>
            <div class="course-title">${c.title}</div>
            <div class="course-desc">${c.desc}</div>
            <div class="course-meta">${metaLabel(total)}</div>
          </div>
          <div class="course-toggle">${toggleLabel(open)}</div>
        </div>
        <div class="course-details">
          <div class="course-struct">${steps}<div class="course-step"><span class="tag">FIN</span><span>${finalLabel}</span></div></div>
          <div class="course-actions">
            <button class="gbtn-outline course-cta" onclick="openCourse('${c.id}')">${startLabel}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openCourse(id) {
  currentCourseId = id;
  go('quiz');
}
}
function renderCourseView() {
  const wrap = document.getElementById('courseView');
  if (!wrap) return;
  if (!currentCourseId) {
    wrap.innerHTML = `<div class="course-empty">${lang === 'kk' ? 'Курс таңдаңыз. Курстар бөліміне өтіңіз.' : 'Выберите курс. Перейдите в раздел курсов.'} <button class="gbtn-outline" onclick="go('courses')" style="margin-left:.5rem;">${lang === 'kk' ? 'Курстарға өту' : 'Перейти к курсам'}</button></div>`;
    return;
  }
  const c = getCourse(currentCourseId);
  const st = ensureCourseState(c.id);
  const totalFinal = getFinalQuestions(c).length;
  const doneCount = st.modules.filter(m => m.done).length;
  const progressLabel = lang === 'kk' ? `${doneCount}/3 модуль аяқталды` : `Пройдено модулей: ${doneCount}/3`;
  const backLabel = lang === 'kk' ? 'Курстарға қайту' : 'Назад к курсам';
  const startLabel = lang === 'kk' ? 'Курсты бастау' : 'Начать курс';
  const metaText = lang === 'kk' ? `3 модуль · ${totalFinal} сұрақ · сертификат` : `3 модуля · ${totalFinal} вопросов · сертификат`;
  
  if (!st.started) {
    wrap.innerHTML = `
      <div class="course-view">
        <div class="course-hero">
          <h2>${c.title}</h2>
          <p>${c.desc}</p>
          <div class="course-meta">${metaText}</div>
          <div class="course-back">
            <button class="gbtn-outline" onclick="go('courses')">← ${backLabel}</button>
            <button class="gbtn" onclick="startCourse('${c.id}')">▶ ${startLabel}</button>
          </div>
        </div>
        <div class="course-empty">${lang === 'kk' ? 'Бұл курс модульдерден тұрады: алдымен мәтінді оқисыз, кейін мини‑тест тапсырасыз. Дайын болсаңыз, курсты бастаңыз.' : 'Курс состоит из модулей: сначала изучаете материал, затем проходите мини‑тест. Нажмите «Начать курс».'}</div>
      </div>
    `;
    return;
  }
  
  const finalLocked = !allModulesDone(st);
  wrap.innerHTML = `
    <div class="course-view">
      <div class="course-hero">
        <h2>${c.title}</h2>
        <p>${c.desc}</p>
        <div class="course-meta">${metaText}</div>
        <div class="course-progress">${progressLabel}</div>
        <div class="course-back">
          <button class="gbtn-outline" onclick="go('courses')">← ${backLabel}</button>
        </div>
      </div>
      <div class="module-grid">
        ${c.modules.map((m, mi) => renderModuleCard(c, mi, st)).join('')}
      </div>
      <div class="final-card ${finalLocked ? 'locked' : ''}">
        <div class="final-head">
          <div class="final-title">${lang === 'kk' ? 'Қорытынды тест' : 'Итоговый тест'}</div>
          <div class="final-note">${totalFinal} ${lang === 'kk' ? 'сұрақ' : 'вопросов'}</div>
        </div>
        <div id="finalBox"></div>
      </div>
    </div>
  `;
  renderFinalQuestion(c.id);
}

function renderModuleCard(course, mi, st) {
  const m = course.modules[mi];
  const ms = st.modules[mi];
  const unlocked = isModuleUnlocked(st, mi);
  const open = st.started && ms.open;
  const statusClass = ms.done ? 'done' : (unlocked ? 'open' : 'locked');
  const statusLabel = ms.done ? (lang === 'kk' ? 'ӨТТІ' : 'ПРОЙДЕНО') : (unlocked ? (lang === 'kk' ? 'АШЫҚ' : 'ОТКРЫТО') : (lang === 'kk' ? 'ҚҰЛЫПТАУЛЫ' : 'ЗАКРЫТО'));
  const toggleLabel = lang === 'kk' ? (open ? 'Жабу' : 'Ашу') : (open ? 'Скрыть' : 'Открыть');
  const stats = moduleStats(course, st, mi);
  const scoreText = `${stats.correct}/${stats.total}`;
  const showQuiz = ms.ready || stats.answered > 0 || ms.done;
  const quizHtml = showQuiz ? `<div class="mod-quiz">${m.quiz.map((q, qi) => renderModuleQuestion(course, mi, qi, st)).join('')}</div>` : '';
  const scoreHtml = showQuiz ? `<div class="mod-score">${lang === 'kk' ? 'Мини‑тест' : 'Мини‑тест'}: ${scoreText}</div>` : '';
  const resultHtml = stats.answered === stats.total ? `<div class="mod-result ${stats.pass ? 'ok' : 'err'}">${stats.pass ? (lang === 'kk' ? '✔ Мини‑тесттен өттіңіз. Келесі модуль ашылды.' : '✔ Мини‑тест пройден. Следующий модуль открыт.') : (lang === 'kk' ? '✖ Мини‑тесттен өте алмадыңыз. Қайта тапсырыңыз.' : '✖ Мини‑тест не пройден. Попробуйте снова.')}</div>` : '';
  const actionStart = unlocked && !ms.ready && !ms.done ? `<button class="gbtn" onclick="startModuleQuiz('${course.id}', ${mi})">▶ ${lang === 'kk' ? 'ДАЙЫНМЫН' : 'ГОТОВ'}</button>` : '';
  const actionRetry = stats.answered === stats.total && !stats.pass ? `<button class="gbtn-outline" onclick="resetModuleQuiz('${course.id}', ${mi})">↺ ${lang === 'kk' ? 'ҚАЙТА ТАПСЫРУ' : 'ПОВТОРИТЬ'}</button>` : '';
  const actions = (actionStart || actionRetry) ? `<div class="mod-actions">${actionStart}${actionRetry}</div>` : '';
  
  return `
    <div class="mod-card ${!unlocked ? 'locked' : ''} ${ms.done ? 'done' : ''}">
      <div class="mod-top">
        <div>
          <div class="mod-head">${lang === 'kk' ? 'МОДУЛЬ' : 'МОДУЛЬ'} ${mi + 1}</div>
          <div class="mod-title">${m.title}</div>
        </div>
        <div class="mod-top-actions">
          <span class="mod-status ${statusClass}">${statusLabel}</span>
          ${st.started ? `<button class="gbtn-outline mod-toggle" onclick="toggleModule('${course.id}', ${mi})">${toggleLabel}</button>` : ''}
        </div>
      </div>
      ${open ? `
        <div class="mod-body">
          <div class="mod-lead">${m.lead}</div>
          <ul class="mod-list">${m.points.map(p => `<li>${p}</li>`).join('')}</ul>
          ${actions}
          ${!unlocked ? `<div class="mod-locked-note">${lang === 'kk' ? 'Алдыңғы модульді аяқтаңыз.' : 'Сначала завершите предыдущий модуль.'}</div>` : ''}
          ${quizHtml}
          ${resultHtml}
          ${scoreHtml}
        </div>
      ` : ''}
    </div>
  `;
}

function renderModuleQuestion(course, mi, qi, st) {
  const q = course.modules[mi].quiz[qi];
  const chosen = st.modules[mi].answers[qi];
  const opts = q.o.map((o, i) => {
    let cls = 'qopt';
    if (chosen !== null) {
      cls += ' dis';
      if (i === q.a) cls += ' ok';
      if (i === chosen && chosen !== q.a) cls += ' err';
    }
    return `<button class="${cls}" onclick="pickModuleAnswer('${course.id}', ${mi}, ${qi}, ${i})" ${chosen !== null ? 'disabled' : ''}><span class="qkey">${['A', 'B', 'C', 'D'][i]}</span>${o}</button>`;
  }).join('');
  const fbText = chosen === null ? '' : (chosen === q.a ? `✓ ${q.e}` : `✗ ${q.e}`);
  const fbClass = chosen === null ? 'qfb' : `qfb show ${chosen === q.a ? 'ok' : 'err'}`;
  return `
    <div class="mod-q" id="modq-${course.id}-${mi}-${qi}">
      <div class="qq">${q.q}</div>
      <div class="qopts">${opts}</div>
      <div class="${fbClass}">${fbText}</div>
    </div>
  `;
}

function toggleModule(courseId, mi) {
  const st = ensureCourseState(courseId);
  if (!st.started) return;
  st.modules[mi].open = !st.modules[mi].open;
  renderCourseView();
}

function startModuleQuiz(courseId, mi) {
  const st = ensureCourseState(courseId);
  if (!isModuleUnlocked(st, mi)) return;
  st.modules[mi].ready = true;
  st.modules[mi].open = true;
  renderCourseView();
}

function resetModuleQuiz(courseId, mi) {
  const c = getCourse(courseId);
  const st = ensureCourseState(courseId);
  const ms = st.modules[mi];
  ms.answers = Array(c.modules[mi].quiz.length).fill(null);
  ms.ready = false;
  ms.done = false;
  ms.score = 0;
  renderCourseView();
}

function pickModuleAnswer(courseId, mi, qi, optIdx) {
  const c = getCourse(courseId);
  const st = ensureCourseState(courseId);
  if (!isModuleUnlocked(st, mi)) return;
  const ms = st.modules[mi];
  if (ms.answers[qi] !== null) return;
  ms.answers[qi] = optIdx;
  ms.ready = true;
  const stats = moduleStats(c, st, mi);
  ms.score = stats.correct;
  if (stats.answered === stats.total && stats.pass) {
    ms.done = true;
    if (st.modules[mi + 1]) st.modules[mi + 1].open = true;
    saveUserProgress();
  }
  renderCourseView();
}

function startFinalTest(courseId) {
  const c = getCourse(courseId);
  const st = ensureCourseState(courseId);
  if (!allModulesDone(st)) return;
  const finalQs = getFinalQuestions(c);
  st.final = {
    started: true,
    idx: 0,
    score: 0,
    answered: false,
    done: false,
    answers: Array(finalQs.length).fill(null),
    submitted: false
  };
  renderFinalQuestion(courseId);
}

function renderFinalQuestion(courseId) {
  const c = getCourse(courseId);
  const st = ensureCourseState(courseId);
  const f = st.final;
  const box = document.getElementById('finalBox');
  if (!box) return;
  const finalQs = getFinalQuestions(c);
  const total = finalQs.length;
  
  if (!allModulesDone(st)) {
    box.innerHTML = `<div class="final-note">${lang === 'kk' ? 'Алдымен барлық модульді аяқтаңыз.' : 'Сначала завершите все модули.'}</div>`;
    return;
  }
  if (!f.started) {
    box.innerHTML = `<div class="final-note">${lang === 'kk' ? 'Қорытынды тестті бастау үшін батырманы басыңыз.' : 'Нажмите кнопку, чтобы начать итоговый тест.'}</div><div class="final-actions"><button class="gbtn" onclick="startFinalTest('${courseId}')">${lang === 'kk' ? 'БАСТАУ' : 'НАЧАТЬ'}</button></div>`;
    return;
  }
  if (f.done) {
    const pct = Math.round((f.score / total) * 100);
    const pass = pct >= 70;
    const msg = pass ? (lang === 'kk' ? 'ҚҰТТЫҚТАЙМЫЗ! Қорытынды тесттен өттіңіз.' : 'ПОЗДРАВЛЯЕМ! Итоговый тест пройден.') : (lang === 'kk' ? '70% жинай алмадыңыз. Материалды қайталап, қайта тапсырыңыз.' : 'Не набрано 70%. Повторите материал и попробуйте снова.');
    if (pass && !f.submitted) {
      f.submitted = true;
      addCourseScore(c, pct);
    }
    box.innerHTML = `
      <div style="text-align:center;padding:1rem 0">
        <div class="res-pct">${pct}%</div>
        <div class="res-msg">${msg}</div>
        ${pass ? `<div class="certbox"><div class="cert-lbl">🎓 СЕРТИФИКАТ</div><div class="cert-nm">${currentUser || 'Anonymous'}</div><div class="cert-sub">${lang === 'kk' ? 'Курсты аяқтады' : 'Завершил курс'}: ${c.title}</div><div class="cert-sc">${pct}%</div></div><button class="gbtn" onclick="dlCert('${currentUser || 'Anonymous'}', ${pct}, '${c.title.replace(/'/g, "&#39;")}')" style="margin:.75rem .3rem 0">⬇ ${lang === 'kk' ? 'СЕРТИФИКАТ' : 'СЕРТИФИКАТ'}</button>` : ''}
        <button class="gbtn-outline" onclick="resetFinalTest('${courseId}')" style="margin:.75rem .3rem 0">↺ ${lang === 'kk' ? 'ҚАЙТА' : 'СНОВА'}</button>
      </div>
    `;
    return;
  }
  
  const q = finalQs[f.idx];
  const prog = Math.round((f.idx / total) * 100);
  const chosen = f.answers[f.idx];
  const opts = q.o.map((o, i) => {
    let cls = 'qopt';
    if (f.answered) {
      cls += ' dis';
      if (i === q.a) cls += ' ok';
      if (i === chosen && chosen !== q.a) cls += ' err';
    }
    return `<button class="${cls}" onclick="pickFinalAnswer('${courseId}', ${i})" ${f.answered ? 'disabled' : ''}><span class="qkey">${['A', 'B', 'C', 'D'][i]}</span>${o}</button>`;
  }).join('');
  const fbText = !f.answered ? '' : (chosen === q.a ? `✓ ${q.e}` : `✗ ${q.e}`);
  const fbClass = !f.answered ? 'qfb' : `qfb show ${chosen === q.a ? 'ok' : 'err'}`;
  
  box.innerHTML = `
    <div class="qwrap">
      <div class="qprog-bg"><div class="qprog-fill" style="width:${prog}%"></div></div>
      <div class="qmeta">${lang === 'kk' ? 'СҰРАҚ' : 'ВОПРОС'} ${f.idx + 1} / ${total}</div>
      <div class="qq">${q.q}</div>
      <div class="qopts">${opts}</div>
      <div class="${fbClass}" id="qf">${fbText}</div>
      <div class="qfoot">
        <span class="qscore">✓ ${f.score}/${total}</span>
        <button class="qnext" style="display:${f.answered ? 'inline-block' : 'none'}" onclick="nextFinal('${courseId}')">
          ${f.idx === total - 1 ? (lang === 'kk' ? 'НӘТИЖЕ ▶' : 'РЕЗУЛЬТАТ ▶') : (lang === 'kk' ? 'КЕЛЕСІ ▶' : 'ДАЛЕЕ ▶')}
        </button>
      </div>
    </div>
  `;
}

function pickFinalAnswer(courseId, optIdx) {
  const c = getCourse(courseId);
  const st = ensureCourseState(courseId);
  const f = st.final;
  if (!f.started || f.done || f.answered) return;
  const q = getFinalQuestions(c)[f.idx];
  f.answers[f.idx] = optIdx;
  f.answered = true;
  if (optIdx === q.a) f.score++;
  renderFinalQuestion(courseId);
}

function nextFinal(courseId) {
  const st = ensureCourseState(courseId);
  const f = st.final;
  if (!f.answered) return;
  f.idx++;
  f.answered = false;
  if (f.idx >= getFinalQuestions(getCourse(courseId)).length) f.done = true;
  renderFinalQuestion(courseId);
}

function resetFinalTest(courseId) {
  const c = getCourse(courseId);
  const finalQs = getFinalQuestions(c);
  courseState[courseId].final = {
    started: false,
    idx: 0,
    score: 0,
    answered: false,
    done: false,
    answers: Array(finalQs.length).fill(null),
    submitted: false
  };
  renderFinalQuestion(courseId);
}

async function addCourseScore(course, pct) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const points = Math.floor(pct / 10);
  try {
    await fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/scores'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: currentUser, score: points, type: course.id, course: course.title })
    });
    renderLB();
  } catch (err) { console.error(err); }
}

function dlCert(n, p, courseTitle) {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 520;
  const x = c.getContext('2d');
  x.fillStyle = '#04040a';
  x.fillRect(0, 0, 800, 520);
  x.shadowBlur = 20;
  x.shadowColor = '#00f0c8';
  x.strokeStyle = '#00f0c8';
  x.lineWidth = 2;
  x.strokeRect(16, 16, 768, 488);
  x.shadowBlur = 0;
  x.strokeStyle = 'rgba(0,240,200,0.2)';
  x.lineWidth = 1;
  x.strokeRect(26, 26, 748, 468);
  for (let y = 0; y < 520; y += 4) {
    x.fillStyle = 'rgba(0,0,0,0.04)';
    x.fillRect(0, y, 800, 2);
  }
  x.textAlign = 'center';
  x.fillStyle = '#00f0c8';
  x.font = 'bold 22px monospace';
  x.shadowBlur = 15;
  x.shadowColor = '#00f0c8';
  x.fillText('[ ЦИФРСАУАТ ]', 400, 90);
  x.shadowBlur = 0;
  x.fillStyle = '#5a6480';
  x.font = '11px monospace';
  x.fillText('СЕРТИФИКАТ · CERTIFICATE', 400, 120);
  x.fillStyle = '#e8f0ff';
  x.font = 'bold 34px sans-serif';
  x.fillText(n, 400, 210);
  x.fillStyle = '#8890aa';
  x.font = '15px sans-serif';
  const sub = courseTitle ? (lang === 'kk' ? 'Курсты аяқтады: ' : 'Завершил курс: ') + courseTitle : (lang === 'kk' ? 'Цифрлық сауаттылық тестін аяқтады' : 'Завершил тест по цифровой грамотности');
  x.fillText(sub, 400, 260);
  x.fillStyle = '#00f0c8';
  x.font = 'bold 54px monospace';
  x.shadowBlur = 25;
  x.shadowColor = '#00f0c8';
  x.fillText(p + '%', 400, 360);
  x.shadowBlur = 0;
  x.fillStyle = '#5a6480';
  x.font = '12px monospace';
  x.fillText(new Date().getFullYear(), 400, 430);
  const a = document.createElement('a');
  a.download = `cert_${n}.png`;
  a.href = c.toDataURL();
  a.click();
}
// ========== AI ADV (Кеңесші) ==========
const SC_ADV = {
  kk: ['Таныс емес адамнан күдікті сілтеме келді', 'Банктен «паролді жіберіңіз» деген хабар алдым', 'Instagram аккаунтым бұзылды, не істеймін?', 'Телефонымды бөтен адамға берсем не болады?'],
  ru: ['Пришла подозрительная ссылка от незнакомца', 'Получил сообщение «отправьте пароль» от банка', 'Instagram взломали, что делать?', 'Что будет если дать телефон чужому?']
};
const MD_ADV = {
  kk: '// оқиғаны жаз — AI қауіп деңгейін бағалайды, нақты қадамдар береді',
  ru: '// опиши ситуацию — AI оценит угрозу, даст конкретные шаги'
};

function updateChipsAdv() {
  document.getElementById('smd').textContent = MD_ADV[lang];
  document.getElementById('chips').innerHTML = SC_ADV[lang].map(s => `<button class="chip" onclick="document.getElementById('sta').value = this.textContent">${s}</button>`).join('');
}

async function sendAIAdv() {
  const txt = document.getElementById('sta').value.trim();
  if (!txt) return;
  document.getElementById('se').style.display = 'none';
  document.getElementById('sr').style.display = 'none';
  document.getElementById('sl').style.display = 'flex';
  document.getElementById('sbtn').disabled = true;
  try {
    const res = await fetchWithRetry(AI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'adv', text: txt, scenario: 'bank' })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) {
      const msg = (data?.error || data?.message || `HTTP ${res.status}`).toString();
      document.getElementById('sr').innerHTML = `<div class="ai-blk"><div class="ai-lbl">⚠ ${lang === 'kk' ? 'ҚАТЕ' : 'ОШИБКА'}</div><p style="color:var(--danger)">${msg}</p></div>`;
      document.getElementById('sr').style.display = 'block';
    } else {
      const raw = (data.content || '{}').toString();
      const cleaned = raw.replace(/```(?:json)?|```/g, '').trim();
      let p = null;
      try { p = JSON.parse(cleaned); } catch {
        const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
        if (s !== -1 && e !== -1 && e > s) try { p = JSON.parse(cleaned.slice(s, e + 1)); } catch (e) { }
      }
      renderAdv(p, cleaned);
    }
  } catch (e) {
    document.getElementById('sr').innerHTML = `<div class="ai-blk"><p style="color:var(--danger)">⚠ ${lang === 'kk' ? 'Қосылу қатесі' : 'Ошибка соединения'}</p></div>`;
    document.getElementById('sr').style.display = 'block';
  }
  document.getElementById('sl').style.display = 'none';
  document.getElementById('sbtn').disabled = false;
}

function renderAdv(p, raw) {
  let h = '';
  if (p && p.risk) {
    const rm = { HIGH: 'rH', MEDIUM: 'rM', LOW: 'rL' };
    h += `<div class="ai-blk"><div class="ai-lbl">◉ ${lang === 'kk' ? 'AI ТАЛДАУЫ' : 'AI АНАЛИЗ'}</div><span class="rpill ${rm[p.risk] || 'rM'}">▲ ${p.risk_label || p.risk}</span><p>${p.what || ''}</p></div>`;
    if (p.steps?.length) h += `<div class="ai-blk"><div class="ai-lbl">◆ ${lang === 'kk' ? 'НЕ ІСТЕУ КЕРЕК' : 'ЧТО ДЕЛАТЬ'}</div>${p.steps.map((s, i) => `<p>▸ <b>${i + 1}.</b> ${s}</p>`).join('')}</div>`;
    if (p.prevention) h += `<div class="ai-blk"><div class="ai-lbl">◈ ${lang === 'kk' ? 'БОЛАШАҚТА' : 'В БУДУЩЕМ'}</div><p>${p.prevention}</p></div>`;
  } else {
    h = `<div class="ai-blk"><div class="ai-lbl">◉ AI</div><p>${raw.substring(0, 400)}</p></div>`;
  }
  document.getElementById('sr').innerHTML = h;
  document.getElementById('sr').style.display = 'block';
}

// ========== SIMULATION ==========
let simChatHistory = [];
let simChatActive = false;
let simCurrentScenario = "bank";

const SIM_SCENARIOS = {
  kk: [
    { id: 'bank', label: '🏦 Банк (қауіпсіздік қызметі)' },
    { id: 'delivery', label: '📦 Жеткізу қызметі' },
    { id: 'prize', label: '🎁 Ұтыс ойыны' },
    { id: 'friend', label: '👤 Досым деп жазып тұр' }
  ],
  ru: [
    { id: 'bank', label: '🏦 Банк (служба безопасности)' },
    { id: 'delivery', label: '📦 Служба доставки' },
    { id: 'prize', label: '🎁 Розыгрыш приза' },
    { id: 'friend', label: '👤 Пишет якобы друг' }
  ]
};

function renderSimScenarioOptions() {
  const sel = document.getElementById('simScenario');
  if (!sel) return;
  const scenarios = SIM_SCENARIOS[lang] || SIM_SCENARIOS.kk;
  sel.innerHTML = scenarios.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
  simCurrentScenario = scenarios[0].id;
  sel.value = simCurrentScenario;
}

function setSimScenario() {
  const sel = document.getElementById('simScenario');
  if (sel) simCurrentScenario = sel.value;
}

function _escHtml(s) {
  return (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function _simRenderChat() {
  const msgs = document.getElementById('simMessages');
  const empty = document.getElementById('simEmpty');
  if (!msgs) return;
  if (!simChatHistory.length) {
    msgs.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  msgs.style.display = 'block';
  msgs.innerHTML = simChatHistory.slice(-8).map(m => `
    <div class="sim-msg ${m.role === 'assistant' ? 'scam' : 'user'}">
      <div class="sim-msg-label">${m.role === 'assistant' ? (lang === 'kk' ? '◈ СКАМЕР' : '◈ МОШЕННИК') : (lang === 'kk' ? 'СІЗ' : 'ВЫ')}</div>
      <div class="sim-msg-bubble">${_escHtml(m.content)}</div>
    </div>
  `).join('');
  const box = document.getElementById('simChatBox');
  if (box) box.scrollTop = box.scrollHeight;
}

function _simSetLoader(show) {
  const el = document.getElementById('simLoader');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function _simSetBtns(sending) {
  const send = document.getElementById('simSendBtn');
  const end = document.getElementById('simEndBtn');
  const start = document.getElementById('simStartBtn');
  if (send) send.disabled = sending || !simChatActive;
  if (end) end.disabled = sending || !simChatActive || simChatHistory.length === 0;
  if (start) start.disabled = sending;
}

async function simStart() {
  simChatHistory = [];
  simChatActive = true;
  _simRenderChat();
  document.getElementById('simResult').style.display = 'none';
  _simSetBtns(true);
  _simSetLoader(true);
  try {
    const res = await fetchWithRetry(AI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sim', messages: [], text: 'start', scenario: simCurrentScenario })
    });
    const data = await res.json();
    let firstMsg = data?.content || (lang === 'kk' ? 'Сәлем! Бір минут уақытыңыз бар ма?' : 'Здравствуйте! У вас есть минута?');
    const badWords = ['cannot', 'sorry', 'i am an ai', 'i\'m an ai', 'as an ai', 'language model', 'кешіріңіз, мен', 'мен ai', 'мен ии'];
    const msgLow = firstMsg.toLowerCase();
    if (badWords.some(w => msgLow.includes(w)) || firstMsg.length < 10) {
      const fallbacks = {
        bank: lang === 'kk' ? 'Сәлеметсіз бе! Бұл Халық Банкінің қауіпсіздік бөлімі. Сіздің шотыңызда күдікті операция анықталды.' : 'Здравствуйте! Это служба безопасности банка. На вашем счете обнаружена подозрительная операция.',
        delivery: lang === 'kk' ? 'Сәлем! Сіздің жөнелтіліміңіз тоқтап қалды, мекенжайды растау керек.' : 'Здравствуйте! Ваша посылка задержана, нужно подтвердить адрес.',
        prize: lang === 'kk' ? 'Құттықтаймыз! Сіз біздің ұтыс ойынымызда 500 000 теңге ұттыңыз!' : 'Поздравляем! Вы выиграли 500 000 тенге в нашем розыгрыше!',
        friend: lang === 'kk' ? 'Сәлем! Қалайсың? Көптен хабарласпадық 😊' : 'Привет! Как дела? Давно не общались 😊'
      };
      firstMsg = fallbacks[simCurrentScenario] || fallbacks.bank;
    }
    simChatHistory.push({ role: 'assistant', content: firstMsg });
    _simRenderChat();
  } catch (e) {
    simChatHistory.push({ role: 'assistant', content: lang === 'kk' ? 'Қате, қайта бастаңыз.' : 'Ошибка, начните заново.' });
    _simRenderChat();
  } finally {
    _simSetLoader(false);
    _simSetBtns(false);
  }
}

async function simSend() {
  if (!simChatActive) return;
  const input = document.getElementById('simInput');
  const txt = input.value.trim();
  if (!txt) return;
  input.value = '';
  simChatHistory.push({ role: 'user', content: txt });
  _simRenderChat();
  _simSetBtns(true);
  _simSetLoader(true);
  try {
    const messagesToSend = simChatHistory.slice(-8);
    const res = await fetchWithRetry(AI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sim', messages: messagesToSend, scenario: simCurrentScenario })
    });
    const data = await res.json();
    let reply = data?.content || (lang === 'kk' ? '...' : '...');
    if (reply.toLowerCase().includes('cannot') || reply.toLowerCase().includes('sorry') || reply.toLowerCase().includes('ai')) {
      reply = lang === 'kk' ? 'Қауіпсіздік мақсатында ақпаратыңызды тексеру керек. Кодты жіберіңіз.' : 'В целях безопасности необходимо проверить ваши данные. Отправьте код.';
    }
    simChatHistory.push({ role: 'assistant', content: reply });
    _simRenderChat();
  } catch (e) {
    simChatHistory.push({ role: 'assistant', content: lang === 'kk' ? 'Байланыс үзілді.' : 'Связь прервана.' });
    _simRenderChat();
  } finally {
    _simSetLoader(false);
    _simSetBtns(false);
  }
}

async function simEnd() {
  if (!simChatActive || simChatHistory.length === 0) return;
  simChatActive = false;
  _simSetBtns(true);
  _simSetLoader(true);
  try {
    const res = await fetchWithRetry(AI_ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'end', lang, history: simChatHistory.slice(-8), last_user: '', scenario: simCurrentScenario })
    });
    const data = await res.json();
    let content = data?.content || (lang === 'kk' ? 'Талдау дайын.' : 'Анализ готов.');
    if (content.length > 600) content = content.slice(0, 600) + '...';
    document.getElementById('simResult').innerHTML = `
      <div class="ai-blk"><div class="ai-lbl">📊 ${lang === 'kk' ? 'ТАЛДАУ' : 'АНАЛИЗ'}</div><div class="sim-pre">${_escHtml(content)}</div></div>
      <div style="margin-top:.75rem;"><button class="gbtn-outline" onclick="simStart()" style="width:100%;">↺ ${lang === 'kk' ? 'ҚАЙТА БАСТАУ' : 'НАЧАТЬ ЗАНОВО'}</button></div>
    `;
    document.getElementById('simResult').style.display = 'block';
  } catch (e) {
    document.getElementById('simResult').innerHTML = `<div class="ai-blk"><p style="color:var(--danger)">⚠ ${lang === 'kk' ? 'Талдау қатесі' : 'Ошибка анализа'}</p></div>`;
    document.getElementById('simResult').style.display = 'block';
  } finally {
    _simSetLoader(false);
  }
}

// SIDEBAR TOGGLE
let sidebarCollapsed = false;
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.querySelector('.shell').classList.toggle('collapsed-shell', sidebarCollapsed);
  document.querySelector('.main').classList.toggle('sidebar-small', sidebarCollapsed);
}

// MODE SWITCH (Кеңесші / Симуляция)
let currentMode = 'adv';
function setMode(mode) {
  currentMode = mode;
  document.getElementById('t1').classList.toggle('on', mode === 'adv');
  document.getElementById('t2').classList.toggle('on', mode === 'sim');
  document.getElementById('advPanel').style.display = mode === 'adv' ? 'block' : 'none';
  document.getElementById('simPanel').style.display = mode === 'sim' ? 'block' : 'none';
  if (mode === 'sim') renderSimScenarioOptions();
}

// INIT
window.onload = () => {
  // Аутентификация тексеру
  const token = localStorage.getItem('token');
  if (token) {
    fetch(AI_API_ENDPOINT.replace('/api/ai', '/api/auth/me'), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (res.ok) return res.json(); else throw new Error(); })
      .then(data => {
        currentUser = data.username;
        document.getElementById('logoutBtn').style.display = 'flex';
        loadUserProgress();
      })
      .catch(() => { clearAuth(); });
  } else {
    showAuthModal();
  }
  
  // Беттерді рендерлеу
  renderCoursesList();
  renderCourseView();
  renderLB();
  updateChipsAdv();
  animatePage("home");
  renderSimScenarioOptions();
  renderDiagnostic();
  
  // Симуляция event listener
  document.getElementById('simStartBtn')?.addEventListener('click', simStart);
  document.getElementById('simSendBtn')?.addEventListener('click', simSend);
  document.getElementById('simEndBtn')?.addEventListener('click', simEnd);
  document.getElementById('simScenario')?.addEventListener('change', setSimScenario);
  
  // Аутентификация event listener
  document.getElementById('loginBtn')?.addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    login(username, password);
  });
  document.getElementById('registerBtn')?.addEventListener('click', () => {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    register(username, password);
  });
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('authLoginTab')?.addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('authLoginTab').classList.add('on');
    document.getElementById('authRegisterTab').classList.remove('on');
  });
  document.getElementById('authRegisterTab')?.addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authRegisterTab').classList.add('on');
    document.getElementById('authLoginTab').classList.remove('on');
  });
  
  // Режимді орнату
  setMode('adv');
};
