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
function renderEUAll(){ renderEUWeeks(); renderEUSummary(); renderEUPen(); renderEUReviews(); renderEUGeoToggle(); renderEUTrend(); }
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
function renderEUSummary(){
  const d=euCur(); if(!d) return;
  const isLatest=euWeek===(euDoc.latest||Object.keys(euDoc.weeks).sort().pop());
  document.getElementById('eu-updated').textContent=`${isLatest?'이번주':'주간'} ${isoWeekRange(euWeek)}(월~일) · 트렌드 주간은 구글 기준 일~토 · ${d.updated} 스캔`;
  document.getElementById('eu-summary').innerHTML=`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg)"><div class="top"><span class="src" style="color:var(--green-d);font-weight:700">유럽 시장 종합</span></div><div class="body">${d.summary}</div></div>`;
}
const EU_CC_ALL={GB:'영국',FR:'프랑스',DE:'독일',ES:'스페인',IT:'이탈리아',PL:'폴란드',NL:'네덜란드',CZ:'체코',SE:'스웨덴',NO:'노르웨이',FI:'핀란드',CH:'스위스',IE:'아일랜드',GR:'그리스',RO:'루마니아',LT:'리투아니아',HU:'헝가리',BE:'벨기에',BG:'불가리아',DK:'덴마크',EE:'에스토니아',SK:'슬로바키아',HR:'크로아티아',TR:'튀르키예',PT:'포르투갈',AT:'오스트리아'};
function renderEUPen(){
  const cur=euCur(); if(!cur) return;
  const p=cur.penetration;
  if(!p){ document.getElementById('eu-pen-cards').innerHTML='<div class="na-msg">첫 스캔(2026-W30 · 7/24) 이전 주 — 레지스트리 미수집 (트렌드만 표시)</div>'; document.getElementById('eu-clinic-table').innerHTML=''; try{if(euCountryChart){euCountryChart.destroy();euCountryChart=null;}}catch(e){} return; }
  const newSub=p.first_scan?'첫 스캔 — 전체 신규 등재':'직전 스캔 대비 신규 <b>발견</b> · 도입 시점과 무관';
  const cards=[
    `<div class="card"><div class="k">리쥬란 명시 클리닉</div><div class="v lime">${p.rejuran_total!=null?p.rejuran_total:p.total}<span style="font-size:14px;font-weight:600"> 곳</span></div><div class="s">브랜드 확인분 · 웹 풋프린트</div></div>`];
  if(p.pn_total!=null) cards.push(`<div class="card" style="border-top-color:var(--purple)"><div class="k" style="color:var(--purple)">PN 계열 타 브랜드</div><div class="v">${p.pn_total}<span style="font-size:14px;font-weight:600"> 곳</span></div><div class="s">Ameela·Plinest·Nucleofill·Vitaran 등</div></div>`,
    `<div class="card"><div class="k">PN 시장 전체</div><div class="v">${p.total}<span style="font-size:14px;font-weight:600"> 곳</span></div><div class="s">확인분 하한선 · 실제는 이보다 많음</div></div>`);
  cards.push(`<div class="card"><div class="k">이번주 신규</div><div class="v">+${p.new_this_week}</div><div class="s">${newSub}</div></div>`,
    `<div class="card"><div class="k">확인 국가</div><div class="v">${p.n_countries}<span style="font-size:14px;font-weight:600"> 개국</span></div><div class="s">${(p.by_country||[]).slice(0,4).map(x=>x.name).join('·')||'—'} 상위</div></div>`);
  document.getElementById('eu-pen-cards').innerHTML=cards.join('');
  const top=p.by_country.slice(0,12);
  try{
    const ctx=document.getElementById('euCountryChart');
    if(euCountryChart)euCountryChart.destroy();
    const ds=top[0]&&top[0].rj!=null
      ?[{label:'리쥬란 명시',data:top.map(x=>x.rj),backgroundColor:'#8bc34a',borderRadius:2,barThickness:14},
        {label:'PN 타 브랜드',data:top.map(x=>x.pn),backgroundColor:'#b39ddb',borderRadius:2,barThickness:14}]
      :[{data:top.map(x=>x.n),backgroundColor:'#8bc34a',borderRadius:3,barThickness:16}];
    euCountryChart=new Chart(ctx,{type:'bar',data:{labels:top.map(x=>x.name),datasets:ds},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:ds.length>1,labels:{color:'#67707b',font:{size:11}}},title:{display:true,text:'국가별 취급 클리닉 분포 (상위 12 · 누적)',color:'#67707b',font:{size:12}}},scales:{x:{...axisOpt.y,stacked:true},y:{...axisOpt.x,grid:{display:false},stacked:true}}}});
  }catch(e){}
  renderEUClinics();
}
function renderEUClinics(){
  const p=euCur().penetration;
  const list=euClinicsOpen?p.clinics:p.clinics.slice(0,12);
  const tag=c=>c.tier==='pn'
    ?`<span class="senti neu" style="font-size:10px">${c.brand||'PN'}</span>`
    :`<span class="senti pos" style="font-size:10px">리쥬란</span>`;
  const rows=list.map(c=>`<tr><td><a href="${c.url}" target="_blank" style="color:var(--txt);text-decoration:none">${c.domain}</a></td><td>${c.name}</td><td>${tag(c)}</td><td>${EU_CC_ALL[c.country]||c.country}</td><td>${c.city||'—'}</td></tr>`).join('');
  document.getElementById('eu-clinic-table').innerHTML=
    `<table><thead><tr><th>클리닉 (도메인)</th><th>이름</th><th>구분</th><th>국가</th><th>도시</th></tr></thead><tbody>${rows}</tbody></table>`+
    `<div style="text-align:center;margin-top:8px"><span class="filter-chip" style="cursor:pointer" onclick="euClinicsOpen=!euClinicsOpen;renderEUClinics()">${euClinicsOpen?'접기':`전체 ${p.clinics.length}곳 보기`}</span></div>`;
}
function renderEUReviews(){
  const rv=(euCur()||{}).reviews;
  if(!rv){ document.getElementById('eu-reviews').innerHTML='<div class="na-msg">첫 스캔(2026-W30 · 7/24) 이전 주 — 후기 수집분 없음</div>'; return; }
  const themeChips=(a,cls)=>a.map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--${cls});font-weight:700">${cls==='up'?'▲':'▼'}</span> ${t}</div>`).join('');
  const overall=`<div class="rev" style="margin-bottom:10px"><div class="top"><span style="font-size:14px;font-weight:800">유럽 소비자 반응 종합</span><span class="senti neu">브랜드 인지 초기</span></div><div class="body" style="margin-bottom:7px">${rv.overall.summary}</div>${themeChips(rv.overall.pos_themes,'up')}${themeChips(rv.overall.neg_themes,'down')}</div>`;
  const regions=rv.regions.map(r=>{
    const srcs=(r.sources||[]).map(s=>`<a href="${s.url}" target="_blank" class="filter-chip" style="text-decoration:none;padding:2px 9px;font-size:11px">${s.site}</a>`).join(' ');
    return `<div class="rev" style="margin-bottom:8px"><div class="top"><span style="font-size:14px;font-weight:800">${r.name_ko}</span></div><div class="body" style="margin-bottom:6px;color:var(--sub)">${r.summary}</div>${themeChips(r.pos||[],'up')}${themeChips(r.neg||[],'down')}<div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--green-d);font-weight:800">SRC</span> ${srcs}</div></div>`;
  }).join('');
  document.getElementById('eu-reviews').innerHTML=overall+regions+(rv.notes?`<div class="unit" style="text-align:left">※ ${rv.notes}</div>`:'');
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
    return `<tr${cc===euGeo?' style="background:var(--lime-bg)"':''}><td>${EU_CC_KO[cc]||cc}</td><td class="hl">${avgs[0]}</td><td>${avgs[1]}</td><td>${avgs[2]}</td><td>${avgs[3]}</td><td>${avgs[4]}</td><td class="${mc}">${ms} ${Math.abs(m)}%</td></tr>`;
  }).join('');
  document.getElementById('eu-trend-table').innerHTML=`<table><thead><tr><th>국가</th><th>Rejuran ★</th><th>Profhilo</th><th>Sculptra</th><th>Plinest</th><th>Sunekos</th><th>모멘텀</th></tr></thead><tbody>${rows}</tbody></table>`;
}
document.querySelectorAll('#eu-period-toggle button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#eu-period-toggle button').forEach(x=>x.classList.remove('active'));b.classList.add('active');euPeriodW=+b.dataset.w;renderEUTrend();});

