/* 해외 버즈 — 유럽 침투도 · 소비자 후기 · Big6 구글트렌드 (eu_buzz.json) */
async function loadEU(){
  if(euDoc) return;
  try{
    const r=await fetch('eu_buzz.json',{cache:'no-store'});
    if(!r.ok){ document.getElementById('eu-summary').innerHTML='<div class="na-msg">eu_buzz.json 없음 — 주간 스캔 후 생성됩니다</div>'; return; }
    let j=await r.json();
    if(!j.weeks){ j={latest:j.week||'2026-W30',weeks:{[j.week||'2026-W30']:j}}; }   // 구버전(단일) 호환
    euDoc=j; euWeek=j.latest||Object.keys(j.weeks).sort().pop();
  }catch(e){ return; }
  renderEUAll();
}
function euCur(){ return euDoc&&euDoc.weeks?euDoc.weeks[euWeek]:null; }
function renderEUAll(){ renderEUWeeks(); renderEUSummary(); renderEUMomentum(); renderEUPen(); renderEUReviews(); renderEUGeoToggle(); renderEUTrend(); }
function renderEUWeeks(){
  const el=document.getElementById('eu-weeks'); if(!el||!euDoc) return;
  const weeks=Object.keys(euDoc.weeks).sort().reverse();
  el.innerHTML=weeks.map((w,i)=>{
    const range=isoWeekRange(w);
    const label=i===0?`이번주(${range})`:i===1?`지난주(${range})`:range;
    return `<span class="filter-chip ${w===euWeek?'on':''}" onclick="setEUWeek('${w}')">${label}</span>`;
  }).join('');
}
function setEUWeek(w){ euWeek=w; renderEUAll(); }
let euSumOpen=false;
function euSumToggle(){ euSumOpen=!euSumOpen; renderEUSummary(); }
function renderEUSummary(){
  const d=euCur(); if(!d) return;
  const isLatest=euWeek===(euDoc.latest||Object.keys(euDoc.weeks).sort().pop());
  document.getElementById('eu-updated').textContent=`${isLatest?'이번주':'주간'} ${isoWeekRange(euWeek)}(월~일) · 트렌드 주간은 구글 기준 일~토 · ${d.updated} 스캔`;
  const el=document.getElementById('eu-summary');
  if(d.highlights&&d.highlights.length){
    const cards=d.highlights.map(h=>`<div class="rev" style="flex:1 1 240px;margin:0"><div style="font-size:13px;font-weight:800;margin-bottom:4px">${h.t}</div><div style="font-size:12.5px;color:var(--sub)">${h.d}</div></div>`).join('');
    el.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">${cards}</div>
      <div style="text-align:center;margin:4px 0 8px"><span class="filter-chip" onclick="euSumToggle()">${euSumOpen?'종합 판단 원문 접기 ▴':'종합 판단 원문 보기 ▾'}</span></div>
      ${euSumOpen?`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg)"><div class="body">${d.summary}</div></div>`:''}`;
  }else{
    el.innerHTML=`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg)"><div class="top"><span class="src" style="color:var(--green-d);font-weight:700">유럽 시장 종합</span></div><div class="body">${d.summary}</div></div>`;
  }
}
function renderEUMomentum(){
  const d=euCur(); const box=document.getElementById('eu-mom'); if(!box) return;
  if(!d||!d.trends||!d.trends.series){ box.innerHTML=''; return; }
  const names={GB:'영국',FR:'프랑스',ES:'스페인',PL:'폴란드',DE:'독일',IT:'이탈리아'};
  const chips=(d.trends.big6||[]).filter(cc=>d.trends.series[cc]).map(cc=>{
    const rj=d.trends.series[cc][0];
    const rec=_avg(rj.slice(-12)), prev=_avg(rj.slice(-24,-12));
    const m=prev?Math.round((rec-prev)/prev*100):0;
    return `<div class="card" style="padding:9px 13px;min-width:92px;cursor:pointer" onclick="euGeo='${cc}';renderEUGeoToggle();renderEUTrend();document.getElementById('euTrendChart').scrollIntoView({behavior:'smooth',block:'center'})">
      <div class="k" style="margin-bottom:2px">${names[cc]||cc}</div>
      <div style="font-size:17px;font-weight:800;color:${m>=0?'var(--up)':'var(--down)'}">${m>=0?'▲':'▼'} ${Math.abs(m)}%</div>
      <div class="s" style="margin-top:1px">리쥬란 모멘텀</div></div>`;
  }).join('');
  box.innerHTML=chips?`<div class="sec-h" style="margin:14px 0 10px"><div class="l"><h2 style="font-size:14.5px">리쥬란 검색 모멘텀 — Big6</h2></div><span class="note">최근 12주 vs 직전 12주 · 클릭 시 해당국 차트</span></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">${chips}</div>`:'';
}
const EU_CC_ALL={GB:'영국',FR:'프랑스',DE:'독일',ES:'스페인',IT:'이탈리아',PL:'폴란드',NL:'네덜란드',CZ:'체코',SE:'스웨덴',NO:'노르웨이',FI:'핀란드',CH:'스위스',IE:'아일랜드',GR:'그리스',RO:'루마니아',LT:'리투아니아',HU:'헝가리',BE:'벨기에',BG:'불가리아',DK:'덴마크',EE:'에스토니아',SK:'슬로바키아',HR:'크로아티아',TR:'튀르키예',PT:'포르투갈',AT:'오스트리아',SI:'슬로베니아',LV:'라트비아',MT:'몰타',CY:'키프로스',LU:'룩셈부르크',IS:'아이슬란드',RS:'세르비아',UA:'우크라이나'};
/* ===== 유럽 침투도 v2 — 브랜드 필터 · 국가 타일 · 브랜드×국가 매트릭스 ===== */
let euBrand='all', euCountry=null, euPenView='matrix';
const EU_BRANDS=[
  {id:'rejuran',label:'리쥬란',color:'#8bc34a'},
  {id:'Nucleofill',label:'Nucleofill',color:'#8f68c9'},
  {id:'PhilArt',label:'PhilArt',color:'#4a90d9'},
  {id:'Plinest',label:'Plinest',color:'#e07b28'},
  {id:'Ameela',label:'Ameela',color:'#c95f8f'},
  {id:'Vitaran',label:'Vitaran',color:'#2aa198'},
  {id:'PolyPhil',label:'PolyPhil',color:'#7b9cc7'},
  {id:'Plenhyage',label:'Plenhyage',color:'#b08a5c'},
  {id:'other',label:'기타 PN',color:'#9aa4af'},
  {id:'unspec',label:'PN 미표기',color:'#d5dade'}];
const EU_BRAND_MAP=Object.fromEntries(EU_BRANDS.map(b=>[b.id,b]));
// 브랜드 문자열 정규화 → 브랜드 id 배열 (복수 취급 시 여러 개)
function euBrandsOf(c){
  if(c.tier==='rejuran'){ const s=(c.brand||'').toLowerCase(); const arr=['rejuran']; if(/nucleofill/.test(s))arr.push('Nucleofill'); if(/philart/.test(s))arr.push('PhilArt'); if(/plinest|mastelli|pn-hpt/.test(s))arr.push('Plinest'); if(/ameela/.test(s))arr.push('Ameela'); if(/vitaran/.test(s))arr.push('Vitaran'); if(/polyphil/.test(s))arr.push('PolyPhil'); return arr; }
  const s=(c.brand||'').toLowerCase().trim();
  if(!s||s==='none'||s==='unspecified'||/미표기|unbranded|pn범주|^polynukleotid|^polynucleotid/.test(s)) return ['unspec'];
  const arr=[];
  if(/rejuran/.test(s))arr.push('rejuran'); if(/nucleofill/.test(s))arr.push('Nucleofill'); if(/philart/.test(s))arr.push('PhilArt');
  if(/plinest|mastelli|pn-hpt|newest/.test(s))arr.push('Plinest'); if(/ameela/.test(s))arr.push('Ameela'); if(/vitaran/.test(s))arr.push('Vitaran');
  if(/polyphil/.test(s))arr.push('PolyPhil'); if(/plenhyage/.test(s))arr.push('Plenhyage');
  return arr.length?arr:['other'];
}
function euBrandTag(c){
  const ids=euBrandsOf(c);
  return ids.map(id=>{const b=EU_BRAND_MAP[id]; const txt=id==='unspec'?'PN':id==='other'?(c.brand||'PN'):b.label;
    return `<span class="senti" style="font-size:10px;background:${b.color}22;color:${id==='unspec'?'var(--sub)':b.color};border:1px solid ${b.color}55;margin-right:3px">${txt}</span>`;}).join('');
}
function euFilteredClinics(){
  const p=euCur().penetration; let list=p.clinics;
  if(euBrand!=='all') list=list.filter(c=>euBrandsOf(c).includes(euBrand));
  if(euCountry) list=list.filter(c=>c.country===euCountry);
  return list;
}
function renderEUPen(){
  const cur=euCur(); if(!cur) return;
  const p=cur.penetration;
  if(!p){ document.getElementById('eu-pen-cards').innerHTML='<div class="na-msg">첫 스캔(2026-W30 · 7/24) 이전 주 — 레지스트리 미수집 (트렌드만 표시)</div>'; ['eu-brand-bar','eu-pen-body','eu-clinic-table'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML='';}); return; }
  const newSub=p.first_scan?'첫 스캔 — 전체 신규 등재':'직전 스캔 대비 신규 <b>발견</b> · 도입 시점과 무관';
  const rjShare=p.total?Math.round(p.rejuran_total/p.total*100):0;
  const cards=[
    `<div class="card"><div class="k">리쥬란 명시 클리닉</div><div class="v lime">${p.rejuran_total!=null?p.rejuran_total:p.total}<span style="font-size:14px;font-weight:600"> 곳</span></div><div class="s">PN 시장 내 점유 <b style="color:var(--lime-txt)">${rjShare}%</b> · 웹 풋프린트</div></div>`];
  if(p.pn_total!=null) cards.push(`<div class="card" style="border-top-color:var(--purple)"><div class="k" style="color:var(--purple)">PN 계열 타 브랜드</div><div class="v">${p.pn_total}<span style="font-size:14px;font-weight:600"> 곳</span></div><div class="s">Nucleofill·PhilArt·Plinest·Ameela 등</div></div>`,
    `<div class="card"><div class="k">PN 시장 전체</div><div class="v">${p.total}<span style="font-size:14px;font-weight:600"> 곳</span></div><div class="s">확인분 하한선 · 실제는 이보다 많음</div></div>`);
  cards.push(`<div class="card"><div class="k">이번주 신규</div><div class="v">+${p.new_this_week}</div><div class="s">${newSub}</div></div>`,
    `<div class="card"><div class="k">확인 국가</div><div class="v">${p.n_countries}<span style="font-size:14px;font-weight:600"> 개국</span></div><div class="s">${(p.by_country||[]).slice(0,4).map(x=>x.name).join('·')||'—'} 상위</div></div>`);
  document.getElementById('eu-pen-cards').innerHTML=cards.join('');
  renderEUBrandBar(); renderEUPenBody(); renderEUClinics();
}
// 브랜드 점유 바 + 브랜드 필터 칩
function renderEUBrandBar(){
  const p=euCur().penetration; const el=document.getElementById('eu-brand-bar'); if(!el) return;
  const cnt={}; EU_BRANDS.forEach(b=>cnt[b.id]=0);
  p.clinics.forEach(c=>euBrandsOf(c).forEach(id=>cnt[id]++));
  const named=EU_BRANDS.filter(b=>b.id!=='unspec'); const namedTot=named.reduce((s,b)=>s+cnt[b.id],0);
  const segs=named.filter(b=>cnt[b.id]).map(b=>`<div title="${b.label} ${cnt[b.id]}곳" style="flex:${cnt[b.id]};background:${b.color};height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10.5px;font-weight:700;overflow:hidden;white-space:nowrap;cursor:pointer" onclick="euSetBrand('${b.id}')">${cnt[b.id]/namedTot>0.07?b.label+' '+cnt[b.id]:''}</div>`).join('');
  const chip=(id,label,n)=>`<span class="filter-chip ${euBrand===id?'on':''}" onclick="euSetBrand('${id}')" style="${euBrand!==id&&EU_BRAND_MAP[id]?`border-color:${EU_BRAND_MAP[id].color}88`:''}">${EU_BRAND_MAP[id]&&id!=='unspec'&&id!=='other'?`<span style="width:8px;height:8px;border-radius:50%;background:${EU_BRAND_MAP[id].color};display:inline-block"></span>`:''}${label} <b>${n}</b></span>`;
  el.innerHTML=`<div class="chart-box" style="padding:12px 16px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><div style="font-size:12.5px;font-weight:800;color:var(--green-d)">브랜드별 취급 클리닉 — 브랜드 표기 ${namedTot}곳 기준</div><div class="note" style="font-size:11px">복수 취급 시 각 브랜드에 중복 집계 · PN 미표기 ${cnt.unspec}곳 제외</div></div>
    <div style="display:flex;height:26px;border-radius:6px;overflow:hidden;margin-bottom:9px">${segs}</div>
    <div class="chips" style="gap:5px">${chip('all','전체',p.clinics.length)}${EU_BRANDS.map(b=>chip(b.id,b.label,cnt[b.id])).join('')}</div></div>`;
}
function euSetBrand(id){ euBrand=(euBrand===id&&id!=='all')?'all':id; renderEUBrandBar(); renderEUPenBody(); renderEUClinics(); }
function euSetCountry(cc){ euCountry=euCountry===cc?null:cc; renderEUPenBody(); renderEUClinics(); }
function euSetPenView(v){ euPenView=v; renderEUPenBody(); }
// 국가별 집계 (현재 브랜드 필터 반영)
function euCountryAgg(){
  const p=euCur().penetration; const m={};
  p.clinics.forEach(c=>{ const a=m[c.country]||(m[c.country]={cc:c.country,name:EU_CC_ALL[c.country]||c.country,n:0,rj:0,pn:0,nw:0,f:0,brands:{}});
    a.n++; if(c.tier==='rejuran')a.rj++; else a.pn++; if(c.new_this_week)a.nw++;
    const ids=euBrandsOf(c); ids.forEach(id=>a.brands[id]=(a.brands[id]||0)+1);
    if(euBrand==='all'||ids.includes(euBrand)) a.f++; });
  return Object.values(m).sort((a,b)=>b.f-a.f||b.n-a.n);
}
function renderEUPenBody(){
  const el=document.getElementById('eu-pen-body'); if(!el) return;
  const agg=euCountryAgg(); const bsel=EU_BRAND_MAP[euBrand];
  const tog=`<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 8px;flex-wrap:wrap;gap:6px">
    <div style="font-size:12.5px;color:var(--sub)">국가별 분포${bsel?` — <b style="color:${bsel.color}">${bsel.label}</b> 필터`:''}${euCountry?` · <b>${EU_CC_ALL[euCountry]||euCountry}</b> 선택 <span class="filter-chip" style="padding:1px 8px;font-size:11px" onclick="euSetCountry('${euCountry}')">해제 ✕</span>`:''}</div>
    <div class="toggle"><button class="${euPenView==='tiles'?'active':''}" onclick="euSetPenView('tiles')">국가 타일</button><button class="${euPenView==='matrix'?'active':''}" onclick="euSetPenView('matrix')">브랜드×국가</button></div></div>`;
  el.innerHTML=tog+(euPenView==='tiles'?euTilesHTML(agg):euMatrixHTML(agg));
}
function euTilesHTML(agg){
  const max=Math.max(...agg.map(a=>a.f),1);
  const tiles=agg.map(a=>{
    const sel=euCountry===a.cc, dim=a.f===0;
    const rjPct=a.n?Math.round(a.rj/a.n*100):0;
    const named=Object.entries(a.brands).filter(([k])=>k!=='unspec').sort((x,y)=>y[1]-x[1]);
    const top=named.slice(0,3).map(([k,v])=>`<span style="color:${EU_BRAND_MAP[k].color};font-weight:700">${EU_BRAND_MAP[k].label} ${v}</span>`).join(' · ');
    return `<div class="rev" onclick="euSetCountry('${a.cc}')" style="margin:0;padding:10px 12px;cursor:pointer;opacity:${dim?'.4':'1'};${sel?'border-color:var(--green);box-shadow:0 0 0 2px var(--lime-bg)':''}">
      <div style="display:flex;align-items:center;gap:7px"><span style="font-size:10px;font-weight:800;color:#fff;background:${sel?'var(--green)':'var(--sub)'};padding:1px 5px;border-radius:4px">${a.cc}</span><span style="font-weight:800;font-size:13.5px">${a.name}</span>
        <span style="margin-left:auto;font-size:18px;font-weight:800;letter-spacing:-.5px">${a.f}</span>${a.nw?`<span style="font-size:10.5px;color:var(--up);font-weight:700">+${a.nw}</span>`:''}</div>
      <div style="display:flex;height:7px;border-radius:4px;overflow:hidden;background:#eef1f3;margin:7px 0 5px"><div style="width:${a.rj/max*100}%;background:#8bc34a"></div><div style="width:${a.pn/max*100}%;background:#b39ddb"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub)"><span>리쥬란 <b style="color:var(--lime-txt)">${a.rj}</b> · PN타브랜드 <b style="color:var(--purple)">${a.pn}</b></span><span>RJ 점유 <b>${rjPct}%</b></span></div>
      <div style="font-size:10.5px;color:var(--dim);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${top||'브랜드 미표기'}</div></div>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:8px;margin-bottom:6px">${tiles}</div>
    <div class="unit" style="text-align:left">막대 = 국가 간 상대 규모(리쥬란 <span style="color:#8bc34a">■</span> / PN 타브랜드 <span style="color:#b39ddb">■</span>) · +n = 이번주 신규 발견 · 타일 클릭 시 아래 클리닉 목록 필터</div>`;
}
function euMatrixHTML(agg){
  const cols=EU_BRANDS;
  const rows=agg.filter(a=>a.n>0);
  const maxCell=Math.max(...rows.flatMap(a=>cols.map(b=>a.brands[b.id]||0)),1);
  const cell=(a,b)=>{const v=a.brands[b.id]||0; if(!v) return `<td style="text-align:center;color:#d5dade">·</td>`;
    const t=Math.min(1,Math.sqrt(v/maxCell)); const bg=b.id==='unspec'?`rgba(154,164,175,${.08+t*.35})`:`${b.color}${Math.round((0.12+t*.75)*255).toString(16).padStart(2,'0')}`;
    return `<td style="text-align:center;background:${bg};color:${t>.55&&b.id!=='unspec'?'#fff':'var(--txt)'};font-weight:${t>.4?'800':'600'};cursor:pointer" onclick="euBrand='${b.id}';euCountry='${a.cc}';renderEUBrandBar();renderEUPenBody();renderEUClinics()">${v}</td>`;};
  const tot={}; cols.forEach(b=>tot[b.id]=rows.reduce((s,a)=>s+(a.brands[b.id]||0),0));
  return `<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>국가</th><th style="text-align:center">전체</th>${cols.map(b=>`<th style="text-align:center;${euBrand===b.id?'text-decoration:underline':''}">${b.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(a=>`<tr${euCountry===a.cc?' style="outline:2px solid var(--green)"':''}><td style="white-space:nowrap"><span style="font-size:10px;color:var(--dim);margin-right:5px">${a.cc}</span><b>${a.name}</b></td><td style="text-align:center;font-weight:800">${a.n}</td>${cols.map(b=>cell(a,b)).join('')}</tr>`).join('')}
    <tr class="total"><td>합계</td><td style="text-align:center">${rows.reduce((s,a)=>s+a.n,0)}</td>${cols.map(b=>`<td style="text-align:center">${tot[b.id]}</td>`).join('')}</tr></tbody></table></div>
    <div class="unit" style="text-align:left">셀 = 해당 국가에서 브랜드를 명시 취급하는 클리닉 수(복수 취급 시 중복) · 셀 클릭 시 해당 브랜드·국가로 클리닉 목록 필터</div>`;
}
function renderEUClinics(){
  const p=euCur().penetration; const all=euFilteredClinics();
  const list=euClinicsOpen?all:all.slice(0,12);
  const bsel=EU_BRAND_MAP[euBrand];
  const head=`<div style="display:flex;align-items:center;gap:6px;margin:10px 0 6px;font-size:12.5px;color:var(--sub)"><b style="color:var(--txt)">클리닉 목록</b> ${all.length}곳${bsel?` · <span style="color:${bsel.color};font-weight:700">${bsel.label}</span>`:''}${euCountry?` · <b>${EU_CC_ALL[euCountry]||euCountry}</b>`:''}${(bsel||euCountry)?` <span class="filter-chip" style="padding:1px 8px;font-size:11px" onclick="euBrand='all';euCountry=null;renderEUBrandBar();renderEUPenBody();renderEUClinics()">필터 초기화</span>`:''}</div>`;
  const rows=list.map(c=>`<tr><td><a href="${c.url}" target="_blank" style="color:var(--txt);text-decoration:none">${c.domain}</a>${c.new_this_week?' <span class="senti pos" style="font-size:9px;padding:1px 5px">NEW</span>':''}</td><td>${c.name}</td><td style="white-space:nowrap">${euBrandTag(c)}</td><td>${EU_CC_ALL[c.country]||c.country}</td><td>${c.city||'—'}</td><td><a href="${c.url}" target="_blank" class="filter-chip" style="text-decoration:none;padding:2px 10px;font-size:11px;white-space:nowrap">시술 페이지↗</a></td></tr>`).join('');
  document.getElementById('eu-clinic-table').innerHTML=head+
    `<table><thead><tr><th style="text-align:left">클리닉 (도메인)</th><th style="text-align:left">이름</th><th style="text-align:left">브랜드</th><th style="text-align:left">국가</th><th style="text-align:left">도시</th><th>바로가기</th></tr></thead><tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--dim)">해당 조건 클리닉 없음</td></tr>'}</tbody></table>`+
    (all.length>12?`<div style="text-align:center;margin-top:8px"><span class="filter-chip" style="cursor:pointer" onclick="euClinicsOpen=!euClinicsOpen;renderEUClinics()">${euClinicsOpen?'접기':`전체 ${all.length}곳 보기`}</span></div>`:'');
}

let euRegOpen={};
function euRegToggle(r){ euRegOpen[r]=!euRegOpen[r]; renderEUReviews();
  if(euRegOpen[r]){ const el=document.getElementById('eu-reg-'+r); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); } }
function _euItem(x){ const t=typeof x==='string'?x:x.t, u=typeof x==='object'&&x.u?x.u:null;
  return `${t}${u?` <a href="${u}" target="_blank" style="font-size:11px;color:var(--blue);text-decoration:none;white-space:nowrap">원문↗</a>`:''}`; }
function renderEUReviews(){
  const rv=(euCur()||{}).reviews;
  if(!rv){ document.getElementById('eu-reviews').innerHTML='<div class="na-msg">첫 스캔(2026-W30 · 7/24) 이전 주 — 후기 수집분 없음</div>'; return; }
  const themeChips=(a,cls)=>a.map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--${cls});font-weight:700">${cls==='up'?'▲':'▼'}</span> ${_euItem(t)}</div>`).join('');
  const overall=`<div class="rev" style="margin-bottom:10px"><div class="top"><span style="font-size:14px;font-weight:800">유럽 소비자 반응 종합</span><span class="senti neu">브랜드 인지 초기</span></div><div class="body" style="margin-bottom:7px">${rv.overall.summary}</div>${themeChips(rv.overall.pos_themes,'up')}${themeChips(rv.overall.neg_themes,'down')}</div>`;
  const hasStatus=rv.regions.some(r=>r.status);
  const regionCard=r=>{
    const srcs=(r.sources||[]).map(s=>`<a href="${s.url}" target="_blank" class="filter-chip" style="text-decoration:none;padding:2px 9px;font-size:11px">${s.site}</a>`).join(' ');
    return `<div class="rev" id="eu-reg-${r.region}" style="margin-bottom:8px"><div class="top" ${hasStatus?`style="cursor:pointer" onclick="euRegToggle('${r.region}')"`:''}><span style="font-size:14px;font-weight:800">${r.name_ko}</span>${hasStatus?`<span class="src">▾ 접기</span>`:''}</div><div class="body" style="margin-bottom:6px;color:var(--sub)">${r.summary}</div>${themeChips(r.pos||[],'up')}${themeChips(r.neg||[],'down')}<div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--green-d);font-weight:800">SRC</span> ${srcs}</div></div>`;
  };
  if(!hasStatus){ // v1 호환
    document.getElementById('eu-reviews').innerHTML=overall+rv.regions.map(regionCard).join('')+(rv.notes?`<div class="unit" style="text-align:left">※ ${rv.notes}</div>`:'');
    return;
  }
  const dot={new:'#4e9d46',threads:'#e0a13c',none:'#c9d0d6'};
  const lab={new:'신규 발화',threads:'활성 스레드(날짜 미확정)',none:'신규 없음'};
  const cells=rv.regions.map(r=>{
    const st=r.status||'none';
    const brief=st==='none'?'기간 내 신규 발화 없음 — 클릭 시 확인 범위':(r.pos||[]).concat(r.neg||[]).length+'개 항목 — 클릭 시 상세';
    return `<div class="rev" style="margin:0;padding:10px 12px;opacity:${st==='none'?'.62':'1'};cursor:pointer" onclick="euRegToggle('${r.region}')">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><span style="width:9px;height:9px;border-radius:50%;background:${dot[st]};display:inline-block;flex:none"></span><span style="font-weight:800;font-size:13.5px">${r.name_ko}</span><span style="font-size:11px;color:var(--dim);margin-left:auto">${lab[st]}</span></div>
      <div style="font-size:12px;color:var(--sub)">${brief}</div></div>`;
  }).join('');
  const board=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-bottom:10px">${cells}</div>`;
  const opened=rv.regions.filter(r=>euRegOpen[r.region]).map(regionCard).join('');
  document.getElementById('eu-reviews').innerHTML=overall+board+opened+(rv.notes?`<div class="unit" style="text-align:left">※ ${rv.notes}</div>`:'');
}
function renderEUGeoToggle(){
  const names={GB:'영국',FR:'프랑스',ES:'스페인',PL:'폴란드',DE:'독일',IT:'이탈리아'};
  document.getElementById('eu-geo-toggle').innerHTML=euCur().trends.big6.map(cc=>`<button class="${cc===euGeo?'active':''}" data-geo="${cc}">${names[cc]||cc}</button>`).join('');
  document.querySelectorAll('#eu-geo-toggle button').forEach(b=>b.onclick=()=>{euGeo=b.dataset.geo;renderEUGeoToggle();renderEUTrend();});
}
function euWeekLabels(t,n,off){
  const start=new Date(t.start+'T00:00:00Z');
  return Array.from({length:n},(_,i)=>{const d=new Date(start);d.setUTCDate(start.getUTCDate()+(i+off)*7+6);return `${String(d.getUTCFullYear()).slice(2)}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}); // 라벨=주 종료 토요일
}
const EU_CC_KO={GB:'영국',FR:'프랑스',ES:'스페인',PL:'폴란드',DE:'독일',IT:'이탈리아'};
function _avg(a){ return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0; }
function renderEUTrend(){
  const t=euCur().trends; const s=t.series[euGeo]; if(!s) return;
  const N=s[0].length, w=Math.min(euPeriodW,N), off=N-w;
  const labels=euWeekLabels(t,w,off);
  const ds=t.keywords.map((k,i)=>({label:k,data:s[i].slice(off),borderColor:EU_KW_COLORS[k]||'#888',backgroundColor:'transparent',tension:.3,borderWidth:k==='Rejuran'?3:1.5,pointRadius:0}));
  try{
    if(euTrendChart)euTrendChart.destroy();
    euTrendChart=new Chart(document.getElementById('euTrendChart'),{type:'line',data:{labels,datasets:ds},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#67707b',font:{size:11}}}},scales:{x:{...axisOpt.x,ticks:{...axisOpt.x.ticks,maxTicksLimit:10}},y:{...axisOpt.y,min:0,max:100}}}});
  }catch(e){}
  const months=Math.round(w/4.33);
  const note=document.getElementById('eu-table-note');
  if(note) note.textContent=`표: 최근 ${months}개월 평균 검색지수 · 모멘텀 = 리쥬란 최근 12주 vs 직전 12주`;
  const rows=t.big6.filter(cc=>t.series[cc]).map(cc=>{
    const cs=t.series[cc];
    const avgs=t.keywords.map((k,i)=>_avg(cs[i].slice(cs[i].length-w)));
    const rj=cs[0]; const rec=_avg(rj.slice(-12)), prev=_avg(rj.slice(-24,-12));
    const m=prev?Math.round((rec-prev)/prev*100):0, mc=m>=0?'up':'down', ms=m>=0?'▲':'▼';
    return `<tr${cc===euGeo?' style="background:var(--lime-bg)"':''}><td>${EU_CC_KO[cc]||cc}</td>${avgs.map((v,i)=>`<td${i===0?' class="hl"':''}>${v}</td>`).join('')}<td class="${mc}">${ms} ${Math.abs(m)}%</td></tr>`;
  }).join('');
  const kwHead=t.keywords.map((k,i)=>`<th>${k}${i===0?' ★':''}</th>`).join('');
  document.getElementById('eu-trend-table').innerHTML=`<table><thead><tr><th>국가</th>${kwHead}<th>모멘텀</th></tr></thead><tbody>${rows}</tbody></table>`;
}
document.querySelectorAll('#eu-period-toggle button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#eu-period-toggle button').forEach(x=>x.classList.remove('active'));b.classList.add('active');euPeriodW=+b.dataset.w;renderEUTrend();});

