/* ================= 증권사 리포트 ================= */
let repInited=false, repData=null, repPeriod='2Q26E', repType=null, repChart=null;
const REP_SEG_ORDER=['의료기기','화장품','의약품','기타'];
const REP_SEG_COLORS={'의료기기':'#4e9d46','화장품':'#d9536f','의약품':'#4a90d9','기타':'#c3ccd4'};
const REP_TYPE_COLORS={'실적리뷰':'#4a90d9','프리뷰':'#e0a13c','이슈':'#8f68c9','신규커버':'#2fa6a6'};
const _rN=n=>n==null?'–':Math.round(n).toLocaleString();
const _rTp=n=>n==null?'–':(n/10000)+'만원';
const _rDir=d=>d==='상향'?'<span class="up">▲상향</span>':d==='하향'?'<span class="down">▼하향</span>':d==='신규'?'<span style="color:var(--green-d)">신규</span>':'유지';

async function loadReports(){
  try{
    const r=await fetch('reports.json',{cache:'no-store'});
    if(!r.ok){document.getElementById('rep-list').innerHTML='<div class="na-msg">reports.json 없음</div>';return;}
    repData=await r.json();
    renderReports();
  }catch(e){document.getElementById('rep-list').innerHTML='<div class="na-msg">리포트 데이터를 불러오지 못했습니다</div>';}
}
function renderReports(){renderRepCards();renderRepEst();renderRepList();
  const n=document.getElementById('rep-note');if(n)n.textContent=`PDF 원문 + 부문별 매출 추정 · ${repData.updated} 기준 ${repData.reports.length}건`;}

function renderRepCards(){
  const rs=repData.reports, tps=rs.filter(r=>r.tp).map(r=>r.tp);
  const avg=tps.reduce((a,b)=>a+b,0)/tps.length;
  const buy=rs.filter(r=>/buy|매수/i.test(r.rating||'')).length;
  const latest=rs.map(r=>r.date).sort().slice(-1)[0];
  const opAvg=avgOf(rs,'2026E','op'), revAvg=avgOf(rs,'2026E','rev');
  document.getElementById('rep-cards').innerHTML=[
    ['리포트','<span class="v">'+rs.length+'건</span>','최근 '+latest],
    ['평균 목표주가','<span class="v lime">'+Math.round(avg/10000)+'만원</span>',`범위 ${Math.min(...tps)/10000}만~${Math.max(...tps)/10000}만`],
    ['투자의견','<span class="v">Buy '+buy+'</span>',(rs.length-buy)+'곳 중립·기타'],
    ['2026E 컨센서스','<span class="v">'+_rN(revAvg)+'</span>','매출 억원 · 영업이익 '+_rN(opAvg)+'억원']
  ].map(c=>`<div class="card"><div class="k">${c[0]}</div>${c[1]}<div class="s">${c[2]}</div></div>`).join('');
}
function avgOf(rs,p,k){const v=rs.map(r=>r.est&&r.est[p]&&r.est[p][k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}

function setRepPeriod(p){repPeriod=p;renderRepEst();}
function renderRepEst(){
  const chips=document.getElementById('rep-period-chips');
  chips.innerHTML=['2Q26E','2026E','2027E'].map(p=>
    `<span class="filter-chip ${repPeriod===p?'on':''}" onclick="setRepPeriod('${p}')">${p}</span>`).join('');
  const rs=repData.reports.filter(r=>r.est&&r.est[repPeriod]&&r.est[repPeriod].seg)
    .filter((r,i,a)=>a.findIndex(x=>x.broker===r.broker)===i)   // 증권사당 최신 1건
    .sort((a,b)=>(b.est[repPeriod].rev||0)-(a.est[repPeriod].rev||0));
  // 스택 바 차트
  const ctx=document.getElementById('rep-est-chart');
  if(repChart)repChart.destroy();
  repChart=new Chart(ctx,{type:'bar',
    data:{labels:rs.map(r=>r.broker),
      datasets:REP_SEG_ORDER.map(s=>({label:s,data:rs.map(r=>r.est[repPeriod].seg[s]||0),backgroundColor:REP_SEG_COLORS[s],stack:'s'}))},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:11},color:'#67707b'}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label} ${c.parsed.x.toLocaleString()}억`}}},
      scales:{x:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}},
              y:{stacked:true,ticks:{color:'#67707b',font:{size:11}},grid:{display:false}}}}});
  // 비교 테이블 (전 증권사, seg 없는 곳 포함)
  const all=repData.reports.filter(r=>r.est&&r.est[repPeriod])
    .filter((r,i,a)=>a.findIndex(x=>x.broker===r.broker)===i)
    .sort((a,b)=>(b.tp||0)-(a.tp||0));
  const seg=(r,s)=>r.est[repPeriod].seg?_rN(r.est[repPeriod].seg[s]):'–';
  const avgRow=k=>_rN(avgOf(all,repPeriod,k));
  const segAvg=s=>{const v=all.map(r=>r.est[repPeriod].seg&&r.est[repPeriod].seg[s]).filter(x=>x!=null);return v.length?_rN(v.reduce((a,b)=>a+b,0)/v.length):'–';};
  document.getElementById('rep-est-table').innerHTML=
    `<table><thead><tr><th>증권사</th><th>매출액</th><th>영업이익</th>${REP_SEG_ORDER.map(s=>`<th>${s}</th>`).join('')}<th>목표주가</th></tr></thead><tbody>`+
    all.map(r=>`<tr><td><b>${r.broker}</b></td><td>${_rN(r.est[repPeriod].rev)}</td><td>${_rN(r.est[repPeriod].op)}</td>${REP_SEG_ORDER.map(s=>`<td>${seg(r,s)}</td>`).join('')}<td><b>${_rTp(r.tp)}</b></td></tr>`).join('')+
    `<tr style="background:var(--panel2);font-weight:700"><td>평균</td><td>${avgRow('rev')}</td><td>${avgRow('op')}</td>${REP_SEG_ORDER.map(s=>`<td>${segAvg(s)}</td>`).join('')}<td></td></tr>`+
    `</tbody></table><div class="unit" style="margin-top:4px">단위: 억 원 · 증권사당 최신 리포트 기준 · – = 해당 추정 미제시</div>`;
}

function setRepType(t){repType=(repType===t)?null:t;renderRepList();}
function renderRepList(){
  const types=[...new Set(repData.reports.map(r=>r.type))];
  document.getElementById('rep-type-chips').innerHTML=
    `<span class="filter-chip ${repType===null?'on':''}" onclick="setRepType(null)">전체</span>`+
    types.map(t=>`<span class="filter-chip ${repType===t?'on':''}" onclick="setRepType('${t}')">${t}</span>`).join('');
  const rs=repData.reports.filter(r=>repType===null||r.type===repType)
    .slice().sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('rep-cnt').textContent=rs.length+'건';
  document.getElementById('rep-list').innerHTML=rs.map(r=>
    `<div class="rep-item"><div class="top">`+
    `<span class="rep-broker">${r.broker}</span>`+
    `<span class="rep-type" style="background:${REP_TYPE_COLORS[r.type]||'#9aa4af'}">${r.type}</span>`+
    `<a class="ttl" href="${r.file}" target="_blank" rel="noopener">${r.title}</a>`+
    `<span class="rep-meta">${r.date}${r.analyst?' · '+r.analyst:''}</span>`+
    `<span class="rep-tp">${r.rating||''} · TP ${_rTp(r.tp)} ${_rDir(r.tp_dir)}</span></div>`+
    `<div class="rep-sum">${r.summary}</div>`+
    (r.points&&r.points.length?`<ul class="rep-points">${r.points.map(p=>`<li>${p}</li>`).join('')}</ul>`:'')+
    `</div>`).join('')||'<div class="na-msg">해당 유형 리포트 없음</div>';
}
