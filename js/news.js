/* ================= 렌더링 ================= */
// 데일리 뉴스
let newsDates=[];          // 아카이브 날짜 목록 ["2026-07-23",...]
let newsRange='today';     // 'today'|'week'|'month'|[from,to]
function _newsCounts(){
  const c={};
  const baseD=newsRange==='today'?_todayOnly(newsDomestic):newsDomestic;
  const baseF=newsRange==='today'?_todayOnly(newsForeign):newsForeign;
  [...baseD,...baseF].forEach(n=>{c[n.co]=(c[n.co]||0)+1;});
  return c;
}
function renderNewsKeywords(){
  const el=document.getElementById('news-keywords');
  const cnt=_newsCounts(), total=Object.values(cnt).reduce((a,b)=>a+b,0);
  const chip=(k,label,n)=>{
    const on=newsActiveKw===k;
    const dot=k===null?'':`<i class="co-dot" style="background:${CO_COLORS[k]||'#9aa4af'}"></i>`;
    const badge=`<b class="chip-n">${n||0}</b>`;
    return `<span class="filter-chip ${on?'on':''} ${!n&&k!==null?'zero':''}" onclick="setNewsKw(${k===null?'null':`'${k}'`})">${dot}${label}${badge}</span>`;
  };
  el.innerHTML=chip(null,'전체',total)+newsCompanies.map(k=>chip(k,k,cnt[k])).join('');
}
function setNewsKw(k){newsActiveKw=(newsActiveKw===k)?null:k;renderNewsKeywords();renderNewsList();}
function renderNewsDates(){
  const el=document.getElementById('news-dates'); if(!el) return;
  const isRange=Array.isArray(newsRange);
  el.innerHTML=[['today','오늘'],['week','이번주'],['month','이번달']].map(([v,l])=>
    `<span class="filter-chip ${newsRange===v?'on':''}" onclick="setNewsRange('${v}')">${l}</span>`).join('')
    +`<span class="filter-chip ${isRange?'on':''}" onclick="toggleRangeForm()">기간설정</span>`;
  const f=document.getElementById('news-range-form');
  if(f) f.style.display=(isRange||f.dataset.open==='1')?'':'none';
}
function toggleRangeForm(){ const f=document.getElementById('news-range-form'); f.dataset.open=f.dataset.open==='1'?'0':'1'; f.style.display=f.dataset.open==='1'?'':'none'; }
function applyNewsRange(){
  const from=document.getElementById('news-from').value, to=document.getElementById('news-to').value;
  if(from&&to&&from<=to){ newsRange=[from,to]; renderNewsDates(); loadNewsRange(); }
}
function setNewsRange(v){ newsRange=v; const f=document.getElementById('news-range-form'); if(f)f.dataset.open='0'; renderNewsDates(); if(v==='today'){ loadNewsJson().then(renderNews); } else loadNewsRange(); }
function _ymd(d){ const z=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
async function loadNewsRange(){
  const today=new Date(); let from,to=_ymd(today);
  if(newsRange==='week'){ const d=new Date(today); d.setDate(d.getDate()-((d.getDay()+6)%7)); from=_ymd(d); }
  else if(newsRange==='month'){ from=_ymd(new Date(today.getFullYear(),today.getMonth(),1)); }
  else if(Array.isArray(newsRange)){ from=newsRange[0]; to=newsRange[1]; }
  else return;
  const title=document.getElementById('clip-title');
  if(title) title.textContent = newsRange==='week'?'이번주 클리핑': newsRange==='month'?'이번달 클리핑':`${from.slice(5)}~${to.slice(5)} 클리핑`;
  let dom=[], for_=[];
  // 오늘 포함 시 라이브 news.json 먼저
  if(to>=_ymd(today)){
    try{ const r=await fetch('news.json',{cache:'no-store'}); if(r.ok){ const j=await r.json(); dom.push(...(j.domestic||[])); for_.push(...(j.foreign||[])); newsUpdated=j.updated||newsUpdated; } }catch(e){}
  }
  // 아카이브 병합 (최신순)
  const days=newsDates.filter(d=>d>=from&&d<=to&&d<_ymd(today)).sort().reverse();
  for(const d of days){
    try{ const r=await fetch(`news/${d}.json`,{cache:'no-store'}); if(r.ok){ const j=await r.json(); dom.push(...(j.domestic||[])); for_.push(...(j.foreign||[])); } }catch(e){}
  }
  const s1=new Set(); newsDomestic=dom.filter(n=>n.title&&!s1.has(n.title)&&s1.add(n.title));
  const s2=new Set(); newsForeign=for_.filter(n=>n.title&&!s2.has(n.title)&&s2.add(n.title));
  renderNews();
}
async function loadNewsIndex(){
  try{
    const r=await fetch('news/index.json',{cache:'no-store'});
    if(r.ok){ const j=await r.json(); newsDates=j.dates||[]; }
  }catch(e){}
}
function _todayOnly(list){
  // 당일 뷰: 오늘 날짜(MM/DD) 기사만
  const now=new Date(); const md=`${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
  const f=list.filter(n=>(n.date||n.time||'').startsWith(md));
  return f.length?f:list; // 파싱 실패 시 전체 유지
}
function _newsHref(n){ return n.link || n.url || '#'; }
function _newsTime(n){ return n.time || n.date || ''; }          // 봇 데이터는 date("07/23 14:24")
function _newsSrc(n){
  if(n.src) return n.src;
  try{ return new URL(n.link || n.url).hostname.replace(/^www\./,''); }catch(e){ return ''; }
}
function renderNewsList(){
  const match=n=> newsActiveKw===null || n.co===newsActiveKw;
  const baseD=newsRange==='today'?_todayOnly(newsDomestic):newsDomestic;
  const baseF=newsRange==='today'?_todayOnly(newsForeign):newsForeign;
  const dom=baseD.filter(match);
  const byCo={}; dom.forEach(n=>(byCo[n.co]=byCo[n.co]||[]).push(n));
  // 커버리지 6사를 앞에, 그 외는 뒤에 — 기사 많은 순
  const order=Object.keys(byCo).sort((a,b)=>{
    const wa=watchlist.indexOf(a), wb=watchlist.indexOf(b);
    if(wa>=0&&wb>=0) return byCo[b].length-byCo[a].length;
    if(wa>=0) return -1; if(wb>=0) return 1;
    return byCo[b].length-byCo[a].length;
  });
  const item=n=>`<div class="news-item"><div class="row"><span class="time">${_newsTime(n)}</span>`+
    (n.kw&&n.kw!==n.co?`<span class="kw-tag">${n.kw}</span>`:'')+
    `<a href="${_newsHref(n)}" target="_blank" rel="noopener">${n.title}</a>`+
    `<span class="src">${_newsSrc(n)}</span></div>`+
    (n.desc?`<div class="desc">${n.desc}</div>`:'')+`</div>`;
  document.getElementById('news-domestic').innerHTML=order.map(co=>{
    const c=CO_COLORS[co]||'#9aa4af';
    return `<div class="news-block"><div class="news-co" style="--co:${c}">${co}`+
      `<span class="n">${byCo[co].length}건</span></div>`+byCo[co].map(item).join('')+`</div>`;
  }).join('')||'<div style="color:var(--dim);padding:6px 2px">해당 기업 뉴스 없음</div>';
  const fdom=baseF.filter(match);
  const byF={}; fdom.forEach(n=>(byF[n.co]=byF[n.co]||[]).push(n));
  document.getElementById('news-foreign').innerHTML=Object.keys(byF).sort((a,b)=>byF[b].length-byF[a].length).map(co=>
    `<div class="news-block"><div class="news-co fo">${co}<span class="n">${byF[co].length}건</span></div>`+
    byF[co].map(item).join('')+`</div>`
  ).join('')||'<div style="color:var(--dim);padding:6px 2px">해당 기업 뉴스 없음</div>';
}
function renderNews(){
  const el=document.getElementById('clip-updated'); if(el) el.innerHTML=`마지막 업데이트 <b>${newsUpdated}</b>`;
  renderNewsKeywords(); renderNewsList();
}
// 실데이터 연동: 봇이 올린 news.json을 읽어 최신 뉴스로 교체 (없으면 샘플 유지)
async function loadNewsJson(){
  if(newsRange!=='today') return; // 기간 조회 중엔 덮어쓰지 않음
  try{
    const r = await fetch('news.json', {cache:'no-store'});
    if(!r.ok) return;
    const d = await r.json();
    if(d.updated) newsUpdated = d.updated;
    if(Array.isArray(d.domestic)) newsDomestic = d.domestic;
    if(Array.isArray(d.foreign))  newsForeign  = d.foreign;
    // 관찰목록에 없던 기업은 유지하되, 데이터에 있는 기업을 병합
    deriveNewsCompanies().forEach(c=>{ if(!newsCompanies.includes(c)) newsCompanies.push(c); });
    renderNews();
  }catch(e){ /* news.json 아직 없음 → 샘플 유지 */ }
}

let calDate=(()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),1);})(); // 항상 현재 월로 시작
let calCo=null;   // null=전체, 기업명=해당 기업 공시만
function collectEvents(){
  let out=[];
  const cos = calCo ? [calCo] : watchlist;
  cos.forEach(co=>(companyEvents[co]||[]).forEach(e=>out.push({...e,co})));
  if(!calCo) statutoryEvents(calDate.getFullYear()).forEach(e=>out.push({...e,co:"전 종목 공통"}));
  return out;
}
