/* 수출 데이터 (TRASS · exports_trass_raw.json / exports_insights.json) */
const _eLab=ym=>`${ym.slice(2,4)}.${ym.slice(4)}`;
const _eChart=(id,cfg)=>{const ctx=document.getElementById(id);if(expCharts[id])expCharts[id].destroy();expCharts[id]=new Chart(ctx,cfg);};
const _eLegend={labels:{color:'#67707b',font:{size:11},boxWidth:18}};
function _eMonths(fr,to){var out=[],y=+fr.slice(0,4),m=+fr.slice(4);while(true){var ym=''+y+String(m).padStart(2,'0');if(ym>to)break;out.push(ym);m++;if(m>12){y++;m=1}}return out;}
function _gnTotal(){const t={};Object.values(expData.gangneung.by_country).forEach(c=>{Object.entries(c.m).forEach(([k,v])=>t[k]=(t[k]||0)+v)});return t;}
function _gnLatest(){return Object.keys(_gnTotal()).sort().pop();}
async function loadExports(){
  try{const r=await fetch('exports_trass_raw.json',{cache:'no-store'});if(r.ok)expData=await r.json();}catch(e){}
  try{const r=await fetch('exports_insights.json',{cache:'no-store'});if(r.ok)expIns=await r.json();}catch(e){}
  if(!expData){document.getElementById('exp-cards').innerHTML='<div class="na-msg">exports_trass_raw.json 없음</div>';return;}
  renderExpCards();renderExpGn();renderExpShare();renderExpInsights();renderExpTCards();renderExpPace();renderExpTNat();
  const note=document.getElementById('exp-note');
  if(note&&expData.updated)note.textContent=`TRASS 무역통계 · ${expData.updated} 수집 · 확정 매월 15일 / 잠정 1·11·21일`;
}
function renderExpCards(){
  const gt=_gnTotal();
  const gl=_gnLatest();const y=gl.slice(0,4);const gPrevY=(+y-1)+gl.slice(4);
  const gYoY=gt[gPrevY]?(gt[gl]/gt[gPrevY]-1)*100:null;
  // 연누계 vs 전년 같은 개월수
  const mm=gl.slice(4);
  const ytd=Object.entries(gt).reduce((a,[k,v])=>a+(k.slice(0,4)===y&&k.slice(4)<=mm?v:0),0);
  const ytdPrev=Object.entries(gt).reduce((a,[k,v])=>a+(k.slice(0,4)===String(+y-1)&&k.slice(4)<=mm?v:0),0);
  const ytdYoY=ytdPrev?(ytd/ytdPrev-1)*100:null;
  const tops=_expTops();const top1=tops[0];
  const natCnt=tops.filter(t=>t.v>0).length;
  const f=v=>v==null?'':`<span class="${v>=0?'up':'down'}">${v>=0?'▲':'▼'} ${Math.abs(v).toFixed(1)}%</span> YoY`;
  document.getElementById('exp-cards').innerHTML=
    `<div class="card"><div class="k">강릉 수출 · ${_eLab(gl)} 확정</div><div class="v lime">${Math.round(gt[gl]/10).toLocaleString()}<span style="font-size:14px;font-weight:600">만 달러</span></div><div class="s">${f(gYoY)}</div></div>`+
    `<div class="card"><div class="k">${y}년 누계 (~${+mm}월)</div><div class="v">${Math.round(ytd/10).toLocaleString()}<span style="font-size:14px;font-weight:600">만 달러</span></div><div class="s">${f(ytdYoY)} <span style="color:var(--dim)">· 전년 동기간</span></div></div>`+
    `<div class="card"><div class="k">최대 시장 · ${top1?top1.nm:'-'}</div><div class="v">${top1?Math.round(top1.v/10).toLocaleString():'-'}<span style="font-size:14px;font-weight:600">만 달러</span></div><div class="s">${top1?`${y}년 누계 점유 <b>${(top1.v/ytd*100).toFixed(1)}%</b>`:''}</div></div>`+
    `<div class="card"><div class="k">수출 대상국</div><div class="v">${natCnt}<span style="font-size:14px;font-weight:600">개국</span></div><div class="s">${y}년 실적 발생 기준</div></div>`;
}
function _expTops(){
  const gl=_gnLatest();const y=gl.slice(0,4);
  const h1=c=>Object.entries(c.m).reduce((a,[k,v])=>a+(k.slice(0,4)===y?v:0),0);
  const arr=Object.entries(expData.gangneung.by_country).map(([cd,c])=>({cd,nm:c.nm,v:h1(c),c}));
  arr.sort((a,b)=>b.v-a.v);
  return arr;
}
function renderExpGn(){
  const gl=_gnLatest();const yms=_eMonths((+gl.slice(0,4)-1)+'01',gl);
  const tops=_expTops().slice(0,5);const gt=_gnTotal();
  const ds=tops.map(t=>({label:t.nm,data:yms.map(m=>t.c.m[m]||0),backgroundColor:EXP_NAT_COLORS[t.nm]||'#c96f9f',borderRadius:2}));
  ds.push({label:'기타',data:yms.map(m=>Math.max(0,(gt[m]||0)-tops.reduce((a,t)=>a+(t.c.m[m]||0),0))),backgroundColor:EXP_NAT_COLORS['기타'],borderRadius:2});
  _eChart('exp-gn-chart',{type:'bar',data:{labels:yms.map(_eLab),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_eLegend,tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw.toLocaleString()}천$`}}},scales:{x:{stacked:true,ticks:{color:'#9aa4af'},grid:{display:false}},y:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()},grid:{color:'#eef1f3'}}}}});
}
let expShareSel='ytd';
function setExpShare(s){expShareSel=s;renderExpShare();}
function renderExpShare(){
  const gl=_gnLatest();const y=gl.slice(0,4);
  const chips=document.getElementById('exp-share-chips');
  if(chips){
    const months=_eMonths((+y-1)+gl.slice(4),gl).reverse().slice(0,12);
    chips.innerHTML=[`<span class="filter-chip ${expShareSel==='ytd'?'on':''}" onclick="setExpShare('ytd')">${y}년 누계</span>`]
      .concat(months.map(m=>`<span class="filter-chip ${expShareSel===m?'on':''}" onclick="setExpShare('${m}')">${_eLab(m)}</span>`)).join('');
  }
  const val=c=>expShareSel==='ytd'
    ?Object.entries(c.m).reduce((a,[k,v])=>a+(k.slice(0,4)===y?v:0),0)
    :(c.m[expShareSel]||0);
  const arr=Object.entries(expData.gangneung.by_country).map(([cd,c])=>({nm:c.nm,v:val(c)})).filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  const tot=arr.reduce((a,r)=>a+r.v,0)||1;
  const rows=arr.slice(0,8);const etc=tot-rows.reduce((a,r)=>a+r.v,0);
  const labels=rows.map(r=>r.nm).concat(etc>0.5?['기타']:[]);const vals=rows.map(r=>r.v).concat(etc>0.5?[etc]:[]);
  const ttl=expShareSel==='ytd'?`${y}년 누계(~${_eLab(gl)})`:`${_eLab(expShareSel)} 월간`;
  document.getElementById('exp-share-ttl').textContent=`강릉 OUT 국가별 비중 · ${ttl} 합계 ${Math.round(tot/10).toLocaleString()}만 달러`;
  _eChart('exp-share-chart',{type:'bar',data:{labels:labels,datasets:[{data:vals,backgroundColor:labels.map(n=>EXP_NAT_COLORS[n]||'#b0b8c1'),borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.toLocaleString()}천$ (${(c.raw/tot*100).toFixed(1)}%)`}}},scales:{x:{ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()},grid:{color:'#eef1f3'}},y:{ticks:{color:'#67707b',font:{size:12}},grid:{display:false}}}}});
}
function renderExpInsights(){
  const box=document.getElementById('exp-insights'),chips=document.getElementById('exp-ins-months');
  if(!expIns||!expIns.months||!Object.keys(expIns.months).length){box.innerHTML='<div class="na-msg">아직 월간 분석이 없습니다</div>';return;}
  const months=Object.keys(expIns.months).sort().reverse();
  if(!expInsMonth||!expIns.months[expInsMonth])expInsMonth=expIns.latest||months[0];
  chips.innerHTML=months.map(mo=>`<span class="filter-chip ${mo===expInsMonth?'on':''}" onclick="setExpInsMonth('${mo}')">${mo.replace('-','.')}</span>`).join('');
  const d=expIns.months[expInsMonth];if(!d){box.innerHTML='';return;}
  const note=document.getElementById('exp-ins-note');
  if(note)note.textContent=`데이터 기준 ${expInsMonth.replace('-','.')} · ${d.updated||''} 작성`;
  const sec=(t,b)=>b?`<div class="rev" style="margin-bottom:10px"><div class="top"><span style="font-size:13px;font-weight:800;color:var(--green-d)">${t}</span></div><div style="font-size:13px">${b}</div></div>`:'';
  box.innerHTML=(d.summary?`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg);margin-bottom:10px"><div style="font-size:13px">${d.summary}</div></div>`:'')+
    sec('강릉(리쥬란 프록시)',d.gn)+sec('전국·잠정 페이스',d.natl);
}
function setExpInsMonth(m){expInsMonth=m;renderExpInsights();}
/* --- 잠정 뷰 --- */
const EXP_TNAT_COLORS={"미국":"#4a90d9","중국":"#d9536f","영국":"#8f68c9","일본":"#e0a13c","베트남":"#2fa6a6","러시아":"#c96f9f","기타":"#9aa4af"};
function _tuLast(){const ks=Object.keys(expData.tentative.total.usd).sort();return ks[ks.length-1];}
function _paceInfo(ym){
  const pace=(expData.tentative.pace||{})[ym]||{};const tu=expData.tentative.total.usd;
  const full=tu[ym];const p10=pace.p10||null,p20=pace.p20||null;
  // 진행 중인 달이면 tu[ym]은 누계 — 경과일 추정
  const isLast=ym===_tuLast();
  let elapsed=null;
  if(isLast){ if(p20&&Math.abs(p20-full)<1)elapsed=20; else if(p10&&Math.abs(p10-full)<1)elapsed=10; else elapsed=p20?20:(p10?10:null); }
  return {p10,p20,full,elapsed,isLast};
}
function renderExpTCards(){
  const tu=expData.tentative.total.usd;const last=_tuLast();const info=_paceInfo(last);
  const y=+last.slice(0,4),mo=+last.slice(4);const dim=new Date(y,mo,0).getDate();
  const prevY=(y-1)+last.slice(4);const prevM=mo===1?(y-1)+'12':y+String(mo-1).padStart(2,'0');
  const cum=tu[last];const pctPrevYFull=tu[prevY]?Math.round(cum/tu[prevY]*100):null;
  const runRate=info.elapsed?Math.round(cum/info.elapsed*dim):null;
  const dailyVs=info.elapsed&&tu[prevM]?((cum/info.elapsed)/(tu[prevM]/new Date(mo===1?y-1:y,mo===1?12:mo-1,0).getDate())-1)*100:null;
  const ytd=Object.entries(tu).reduce((a,[k,v])=>a+(k.slice(0,4)===String(y)?v:0),0);
  const fullPrevYear=Object.entries(tu).reduce((a,[k,v])=>a+(k.slice(0,4)===String(y-1)?v:0),0);
  const f=v=>v==null?'':`<span class="${v>=0?'up':'down'}">${v>=0?'▲':'▼'} ${Math.abs(v).toFixed(1)}%</span>`;
  document.getElementById('exp-tcards').innerHTML=
    `<div class="card"><div class="k">${mo}월 잠정 누계${info.elapsed?` · 1~${info.elapsed}일`:''}</div><div class="v lime">${(cum/1e5).toFixed(2)}<span style="font-size:14px;font-weight:600">억 달러</span></div><div class="s">전국 · TRASS 잠정</div></div>`+
    `<div class="card"><div class="k">전년 ${mo}월 대비</div><div class="v">${pctPrevYFull!=null?pctPrevYFull:'-'}<span style="font-size:14px;font-weight:600">%</span></div><div class="s">${info.elapsed?`${info.elapsed}일 만에 전년 한 달 전체 대비`:'전년 동월 전체 대비'}</div></div>`+
    `<div class="card"><div class="k">월 환산 페이스</div><div class="v">${runRate!=null?(runRate/1e5).toFixed(2):'-'}<span style="font-size:14px;font-weight:600">억 달러</span></div><div class="s">일평균 기준 · 전월 대비 ${f(dailyVs)}</div></div>`+
    `<div class="card"><div class="k">${y}년 누계(잠정)</div><div class="v">${(ytd/1e5).toFixed(1)}<span style="font-size:14px;font-weight:600">억 달러</span></div><div class="s">${fullPrevYear?`전년 연간의 <b class="up">${Math.round(ytd/fullPrevYear*100)}%</b>`:''}</div></div>`;
}
function renderExpPace(){
  const tu=expData.tentative.total.usd;const pace=expData.tentative.pace||{};
  const last=_tuLast();
  const start=(()=>{let y=+last.slice(0,4),m=+last.slice(4)-7;while(m<1){m+=12;y--}return ''+y+String(m).padStart(2,'0')})();
  const yms=_eMonths(start,last);
  const M=v=>v!=null?+(v/1e3).toFixed(1):null;
  const info=_paceInfo(last);
  const ds=[
    {label:'1~10일',data:yms.map(m=>M((pace[m]||{}).p10)),backgroundColor:'#cfe3f5',borderRadius:2},
    {label:'1~20일',data:yms.map(m=>M((pace[m]||{}).p20)),backgroundColor:'#6ba3dd',borderRadius:2},
    {label:'월 전체',data:yms.map(m=>m===last&&info.elapsed?null:M(tu[m])),backgroundColor:'#1d5b96',borderRadius:2}
  ];
  _eChart('exp-pace-chart',{type:'bar',data:{labels:yms.map(_eLab),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_eLegend,tooltip:{callbacks:{label:c=>c.raw==null?null:`${c.dataset.label}: ${c.raw.toLocaleString()}M$`}}},scales:{x:{ticks:{color:'#9aa4af'},grid:{display:false}},y:{ticks:{color:'#9aa4af',callback:v=>v+'M'},grid:{color:'#eef1f3'}}}}});
}
function renderExpTNat(){
  const nat=expData.tentative.by_country||{};const tu=expData.tentative.total.usd;const last=_tuLast();
  const y=last.slice(0,4);
  const sumY=c=>Object.entries(c.m).reduce((a,[k,v])=>a+(k.slice(0,4)===y?v:0),0);
  const arr=Object.values(nat).map(c=>({nm:c.nm,v:sumY(c),c}));arr.sort((a,b)=>b.v-a.v);
  const tops=arr.slice(0,6);
  const yms=_eMonths((+y-1)+'01',last);
  const M=v=>+((v||0)/1e3).toFixed(1);
  const ds=tops.map(t=>({label:t.nm,data:yms.map(m=>M(t.c.m[m])),backgroundColor:EXP_TNAT_COLORS[t.nm]||'#b0b8c1',borderRadius:2}));
  ds.push({label:'기타',data:yms.map(m=>{const tot=tu[m]||0;return M(Math.max(0,tot-tops.reduce((a,t)=>a+(t.c.m[m]||0),0)))}),backgroundColor:EXP_TNAT_COLORS['기타'],borderRadius:2});
  _eChart('exp-tnat-chart',{type:'bar',data:{labels:yms.map(_eLab),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_eLegend,tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw.toLocaleString()}M$`}}},scales:{x:{stacked:true,ticks:{color:'#9aa4af'},grid:{display:false}},y:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v+'M'},grid:{color:'#eef1f3'}}}}});
}


