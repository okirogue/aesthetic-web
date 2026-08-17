let buzzChartObjs={}, buzzData=null;
const BUZZ_COLORS=['#e0a13c','#4a90d9','#57c00a','#d9536f','#8f68c9','#2fa6a6','#c96f9f','#6b8e23'];
const axisOpt={x:{ticks:{color:'#9aa4af',maxTicksLimit:14,autoSkip:true},grid:{color:'#eef1f3'}},y:{ticks:{color:'#9aa4af'},grid:{color:'#eef1f3'}}};
async function loadBuzzJson(){
  try{
    const r=await fetch('buzz.json',{cache:'no-store'});
    if(!r.ok) return;
    buzzData=await r.json();
    try{ // 검색지수 최신성 표시: 최신 주(데이터 기간)와 갱신 시각, 8일 이상 지연 시 경고
      const el=document.getElementById('buzz-idx-note');
      const g=Object.values(buzzData.groups||{})[0];
      if(el&&g&&g.labels&&g.labels.length){
        const l=g.labels[g.labels.length-1];
        const st=new Date('20'+l+'T00:00:00Z'), en=new Date(st); en.setUTCDate(st.getUTCDate()+6);
        const f=d=>`${d.getUTCMonth()+1}/${d.getUTCDate()}`;
        const stale=(Date.now()-en.getTime())/864e5>8;
        el.textContent=`주단위(월~일) · 최신 주 ${f(st)}~${f(en)}${buzzData.updated?` · ${buzzData.updated} 갱신`:''}${stale?' · ⚠ 갱신 지연 — 봇 확인 필요':''}`;
      }
    }catch(e){}
    if(document.getElementById('view-buzz').classList.contains('active')) renderBuzzTrends();
  }catch(e){}
}
let buzzWeeksN=52, buzzRangeDates=null;
function _sliceBuzz(group){
  if(!group||!group.labels) return null;
  let idx;
  if(buzzRangeDates){
    idx=group.labels.map((l,i)=>(l>=buzzRangeDates[0]&&l<=buzzRangeDates[1])?i:-1).filter(i=>i>=0);
  }else{
    idx=group.labels.map((_,i)=>i); idx=idx.slice(Math.max(0,idx.length-buzzWeeksN));
  }
  const labels=idx.map(i=>group.labels[i]);
  const series={}; Object.keys(group.series).forEach(k=>series[k]=idx.map(i=>group.series[k][i]));
  return {labels,series};
}
function _wkEnd(l){ // '26-07-20'(주 시작 월요일) -> '26-07-26'(주 종료 일요일) 표시용
  try{ const d=new Date('20'+l+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+6);
    return `${String(d.getUTCFullYear()).slice(2)}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  }catch(e){ return l; } }
function _buzzChart(canvasId,group,chartRef){
  const ctx=document.getElementById(canvasId); if(!ctx||!group) return chartRef;
  const ds=Object.keys(group.series).map((k,i)=>({label:k,data:group.series[k],borderColor:BUZZ_COLORS[i%BUZZ_COLORS.length],backgroundColor:'transparent',tension:.3,borderWidth:1.8,pointRadius:0}));
  if(chartRef)chartRef.destroy();
  return new Chart(ctx,{type:'line',data:{labels:group.labels.map(_wkEnd),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#67707b',font:{size:11},boxWidth:18}}},scales:{x:axisOpt.x,y:{...axisOpt.y,min:0,max:100}}}});
}
function renderBuzzTrends(){
  const groups=buzzData&&buzzData.groups?buzzData.groups:{};
  const cont=document.getElementById('buzz-charts'); if(!cont) return;
  const keys=Object.keys(groups);
  if(!keys.length){ cont.innerHTML='<div class="na-msg">데이터 수집 전 — 봇 배포 후 자동 생성됩니다</div>'; return; }
  const na=cont.querySelector('.na-msg'); if(na) na.remove();
  keys.forEach(k=>{
    if(!document.getElementById('bc-'+k)){
      const g=groups[k];
      const sec=document.createElement('div');
      sec.innerHTML=`<div class="sec-h"><div class="l"><h2>검색지수 · ${g.title}</h2></div><span class="note">${Object.keys(g.series||{}).join('·')} · DATALAB 주단위</span></div><div class="chart-box"><canvas id="bc-${k}"></canvas></div>`;
      cont.appendChild(sec);
    }
  });
  keys.forEach(k=>{ buzzChartObjs[k]=_buzzChart('bc-'+k,_sliceBuzz(groups[k]),buzzChartObjs[k]); });
}
function applyBuzzRange(){
  const f=document.getElementById('buzz-from').value, t=document.getElementById('buzz-to').value;
  if(f&&t&&f<=t){ buzzRangeDates=[f.slice(2),t.slice(2)]; document.querySelectorAll('#period-buzz button').forEach(x=>x.classList.remove('active')); renderBuzzTrends(); }
}
document.querySelectorAll('#period-buzz button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#period-buzz button').forEach(x=>x.classList.remove('active'));b.classList.add('active');buzzWeeksN=+b.dataset.w;buzzRangeDates=null;renderBuzzTrends();});
/* 제품별 정성 분석 (buzz_insights.json · 주차별 누적 · Claude 주간 요약) */
let insightDoc=null, insightWeek=null;
async function loadInsights(){
  try{
    const r=await fetch('buzz_insights.json',{cache:'no-store'});
    if(!r.ok) return;
    insightDoc=await r.json();
    if(insightDoc.weeks){
      insightWeek=insightDoc.latest||Object.keys(insightDoc.weeks).sort().pop();
      renderInsightWeeks(); renderInsights(insightDoc.weeks[insightWeek]);
    }else{ renderInsights(insightDoc); }   // 구버전(단일) 호환
  }catch(e){}
}
function isoWeekRange(w){ // '2026-W30' -> '7/20~7/26' (월~일)
  const m=/^(\d{4})-W(\d{1,2})$/.exec(w); if(!m) return w;
  const y=+m[1], wk=+m[2];
  const jan4=new Date(Date.UTC(y,0,4));
  const dow=jan4.getUTCDay()||7;
  const mon=new Date(jan4); mon.setUTCDate(jan4.getUTCDate()-dow+1+(wk-1)*7);
  const sun=new Date(mon); sun.setUTCDate(mon.getUTCDate()+6);
  const f=d=>`${d.getUTCMonth()+1}/${d.getUTCDate()}`;
  return `${f(mon)}~${f(sun)}`;
}
function renderInsightWeeks(){
  const el=document.getElementById('insight-weeks'); if(!el||!insightDoc||!insightDoc.weeks) return;
  const weeks=Object.keys(insightDoc.weeks).sort().reverse();
  el.innerHTML=weeks.map((w,i)=>{
    const range=isoWeekRange(w);
    const label=i===0?`이번주(${range})`:i===1?`지난주(${range})`:range;
    return `<span class="filter-chip ${w===insightWeek?'on':''}" onclick="setInsightWeek('${w}')">${label}</span>`;
  }).join('');
}
function setInsightWeek(w){ insightWeek=w; renderInsightWeeks(); renderInsights(insightDoc.weeks[w]); }
function _bzItem(x){ // pos/neg 항목: 문자열 or {t,u}
  const t=typeof x==='string'?x:x.t, u=typeof x==='object'&&x.u?x.u:null;
  return `${t}${u?` <a href="${u}" target="_blank" style="font-size:11px;color:var(--blue);text-decoration:none;white-space:nowrap">원문↗</a>`:''}`;
}
const BZ_TAG_CSS={seed:'background:#fbeaea;color:#c0392b',seedish:'background:#fdf3e3;color:#b9770e',ad:'background:#eaf2fb;color:#2e6da4',nat:'background:#e9f5e7;color:#3c7f36',risk:'background:#fbeaea;color:#c0392b',noise:'background:#eef0f2;color:#9aa4af',news:'background:#eef0f2;color:#67707b',viral:'background:#f3eafb;color:#7d3c98',mix:'background:#eef0f2;color:#67707b'};
function _bzTag(p,small){ if(!p.tag) return ''; const s=BZ_TAG_CSS[p.tag.k]||BZ_TAG_CSS.mix;
  return `<span style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;${s}">${p.tag.label}</span>`; }
function _bzPrevCounts(name){ // 현재 주 포함 최근 3개 주차 count 시계열(과거→현재)
  if(!insightDoc||!insightDoc.weeks) return [];
  const ws=Object.keys(insightDoc.weeks).sort();
  const upto=ws.filter(w=>w<=insightWeek).slice(-3);
  return upto.map(w=>{ const p=(insightDoc.weeks[w].products||[]).find(x=>x.name===name); return p&&p.count>0?p.count:0; });
}
function _bzSearchWow(name){
  if(!buzzData||!buzzData.groups) return null;
  for(const g of Object.values(buzzData.groups)){
    const v=g.series&&g.series[name];
    if(v&&v.length>=2&&v[v.length-2]) return Math.round((v[v.length-1]/v[v.length-2]-1)*1000)/10;
  }
  return null;
}
function _bzSpark(c){ const mx=Math.max(...c,1);
  return c.map((v,i)=>`<span style="display:inline-block;width:9px;margin-right:2px;background:${i===c.length-1?'#8bc34a':'#cfd8c7'};height:${Math.max(3,Math.round(v/mx*22))}px;border-radius:2px;vertical-align:bottom"></span>`).join(''); }
let bzOpen={};
function bzToggle(name){ bzOpen[name]=!bzOpen[name]; renderInsights(insightDoc.weeks?insightDoc.weeks[insightWeek]:insightDoc);
  if(bzOpen[name]){ const el=document.getElementById('bz-det-'+name); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); } }
let bzSumOpen=false;
function bzSumToggle(){ bzSumOpen=!bzSumOpen; renderInsights(insightDoc.weeks?insightDoc.weeks[insightWeek]:insightDoc); }
function renderInsights(d){
  const note=document.getElementById('insight-note');
  if(note&&d.updated) note.textContent=`네이버 카페·블로그 · ${d.window_note||`데이터 기간 ${isoWeekRange(insightWeek)}(월~일)`} · ${d.updated} 요약`;
  const sm=document.getElementById('insight-summary');
  const isLatest=insightDoc&&insightDoc.weeks&&insightWeek===(insightDoc.latest||Object.keys(insightDoc.weeks).sort().pop());
  const lbl=(isLatest?'이번주':'주간')+(insightWeek&&insightWeek.includes('-W')?`(${isoWeekRange(insightWeek)})`:'')+' 요약'+(d.estimated?' · 검색지수 기반 소급':'');
  if(sm){
    if(d.highlights&&d.highlights.length){ // v2: 핵심 이슈 카드 + 원문 접기
      const cards=d.highlights.map(h=>`<div class="rev" style="flex:1 1 240px;margin:0"><div style="font-size:13px;font-weight:800;margin-bottom:4px">${h.t}</div><div style="font-size:12.5px;color:var(--sub)">${h.d}</div></div>`).join('');
      sm.innerHTML=`<div class="sec-h" style="margin:4px 0 10px"><div class="l"><h2 style="font-size:14.5px">${lbl} — 핵심 이슈</h2></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">${cards}</div>
        <div style="text-align:center;margin:4px 0 10px"><span class="filter-chip" onclick="bzSumToggle()">${bzSumOpen?'요약 원문 접기 ▴':'전체 요약 원문 보기 ▾'}</span></div>
        ${bzSumOpen?`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg)"><div class="body">${d.summary}</div></div>`:''}`;
    }else if(d.summary){
      sm.innerHTML=`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg)"><div class="top"><span class="src" style="color:var(--green-d);font-weight:700">${lbl}</span></div><div class="body">${d.summary}</div></div>`;
    }else sm.innerHTML='';
  }
  const el=document.getElementById('insights');
  const prods=(d.products||[]).slice().sort((a,b)=>(b.count||b.idx||0)-(a.count||a.idx||0));
  if(!prods.length) return;
  const v2=prods.some(p=>p.hl||p.tag);
  if(!v2){ el.innerHTML=prods.map(p=>_bzLegacyCard(p)).join(''); return; }
  // ---- v2: 스코어보드 ----
  const act=prods.filter(p=>p.count>0), zero=prods.filter(p=>!(p.count>0));
  const rows=act.map(p=>{
    const c=_bzPrevCounts(p.name); const cur=c[c.length-1], prev=c.length>1?c[c.length-2]:0;
    let dtxt;
    if(!prev) dtxt='<span style="color:var(--dim);font-size:11px">신규</span>';
    else{ const dd=Math.round((cur/prev-1)*100);
      dtxt=Math.abs(dd)>500?`<span style="color:${dd>=0?'var(--up)':'var(--down)'};font-weight:700;font-size:11px">${dd>=0?'급증':'급감'}</span>`
        :`<span style="color:${dd>=0?'var(--up)':'var(--down)'};font-weight:700;font-size:11px">${dd>=0?'▲':'▼'} ${Math.abs(dd)}%</span>`; }
    const wv=_bzSearchWow(p.name);
    const wtxt=wv==null?'—':`<span style="color:${wv>=0?'var(--up)':'var(--down)'};font-weight:700">${wv>=0?'▲':'▼'} ${Math.abs(wv)}%</span>`;
    return `<tr onclick="bzToggle('${p.name}')" style="cursor:pointer">
      <td style="font-weight:800;white-space:nowrap">${p.name} <span style="font-size:10px;color:var(--dim);font-weight:400">${p.brand||''}</span></td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:700">${(p.count||0).toLocaleString()} ${dtxt}</td>
      <td style="white-space:nowrap">${_bzSpark(c)}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${wtxt}</td>
      <td>${_bzTag(p)}</td>
      <td style="font-size:12px;color:var(--sub)">${p.hl||''}</td></tr>`;
  }).join('');
  const zeroLine=zero.length?`<div style="font-size:11.5px;color:var(--dim);padding:8px">유효 0건: ${zero.map(p=>`${p.name}(${(p.obs||'').slice(0,28)}${(p.obs||'').length>28?'…':''})`).join(' · ')}</div>`:'';
  const board=`<div class="sec-h" style="margin:14px 0 10px"><div class="l"><h2 style="font-size:14.5px">품목 스코어보드</h2></div><span class="note">유효 신규글 · 3주 추이 · 검색지수 WoW · 행 클릭 시 상세</span></div>
    <div class="chart-box" style="padding:6px 10px;overflow-x:auto"><table class="bz-tbl"><thead><tr><th>품목</th><th style="text-align:right">유효 신규 (WoW)</th><th>3주 추이</th><th style="text-align:right">검색지수 WoW</th><th>성격</th><th>이번 주 한 줄</th></tr></thead><tbody>${rows}</tbody></table>${zeroLine}</div>`;
  // ---- v2: 상세 아코디언 ----
  const det=act.map(p=>{
    const open=!!bzOpen[p.name];
    const head=`<div class="top" style="margin:0;cursor:pointer" onclick="bzToggle('${p.name}')"><span style="font-size:${open?'14':'13.5'}px;font-weight:${open?'800':'700'}">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span> ${_bzTag(p)}</span><span class="src">${p.sample?`유효 ${p.sample.replace('유효 ','')}`:`~${(p.count||0).toLocaleString()}건`} · ${open?'▾ 접기':'▸ 펼치기'}</span></div>`;
    if(!open) return `<div class="rev" id="bz-det-${p.name}" style="margin-bottom:6px;padding:9px 14px">${head}</div>`;
    const pos=(p.pos||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--up);font-weight:700">▲</span> ${_bzItem(t)}</div>`).join('');
    const neg=(p.neg||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--down);font-weight:700">▼</span> ${_bzItem(t)}</div>`).join('');
    const keys=(p.keys||[]).map(k=>`<span class="filter-chip" style="cursor:default;padding:2px 9px;font-size:11px">${k}</span>`).join(' ');
    return `<div class="rev" id="bz-det-${p.name}" style="margin-bottom:8px">${head}<div style="margin-top:6px">${pos}${neg}</div>
      <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--green-d);font-weight:800">KEY</span> ${keys}</div>
      ${p.obs?`<div style="margin-top:6px;font-size:12px;color:var(--dim)">※ ${p.obs}</div>`:''}</div>`;
  }).join('');
  el.innerHTML=board+`<div class="sec-h" style="margin:16px 0 10px"><div class="l"><h2 style="font-size:14.5px">품목 상세</h2></div><span class="note">기본 접힘 · 스코어보드 행 또는 제목 클릭</span></div>`+det;
}
function _bzLegacyCard(p){ // v1 주차 호환 렌더 (기존 로직)
    if(p.idx!==undefined&&p.idx!==null&&!(p.count>0)){
      const wc=p.wow>=0?'up':'down', ws=p.wow>=0?'▲':'▼';
      const notes=(p.notes||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--dim);font-weight:700">·</span> ${t}</div>`).join('');
      return `<div class="rev" style="margin-bottom:10px"><div class="top">
        <span style="font-size:14px;font-weight:800">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span></span>
        <span class="src">검색지수 ${p.idx}${p.wow!=null?` · WoW <span class="${wc}" style="font-weight:700">${ws} ${Math.abs(p.wow)}%</span>`:''}</span></div>${notes}</div>`;
    }
    if(!(p.count>0)) return `<div class="rev" style="margin-bottom:8px;opacity:.7"><div class="top"><span style="font-size:14px;font-weight:700">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span></span><span class="src">${p.obs?`유효 0건${p.sample?` (${p.sample})`:''}`:'수집 대기'}</span></div><div style="font-size:12px;color:var(--dim)">${p.obs||'다음 /buzzraw 수집 후 분석됩니다'}</div></div>`;
    const pos=(p.pos||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--up);font-weight:700">▲</span> ${_bzItem(t)}</div>`).join('');
    const neg=(p.neg||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--down);font-weight:700">▼</span> ${_bzItem(t)}</div>`).join('');
    const keys=(p.keys||[]).map(k=>`<span class="filter-chip" style="cursor:default;padding:2px 9px;font-size:11px">${k}</span>`).join(' ');
    return `<div class="rev" style="margin-bottom:10px"><div class="top">
      <span style="font-size:14px;font-weight:800">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span></span>
      <span class="src">~${(p.count||0).toLocaleString()}건${p.sample?` (샘플 ${p.sample})`:''}</span></div>
      ${pos}${neg}
      <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--green-d);font-weight:800">KEY</span> ${keys}</div>
      ${p.obs?`<div style="margin-top:6px;font-size:12px;color:var(--dim)">※ ${p.obs}</div>`:''}</div>`;
}
