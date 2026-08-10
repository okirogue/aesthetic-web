/* ================= 증권사 리포트 ================= */
let repInited=false, repData=null, repTrendMode='year', repSeason=null, repPeriod='2Q26E', repType=null;
let repChart=null, repTrendChart=null;
const REP_SEG_ORDER=['의료기기','화장품','의약품','기타'];
const REP_SEG_COLORS={'의료기기':'#4e9d46','화장품':'#d9536f','의약품':'#4a90d9','기타':'#c3ccd4'};
const REP_TYPE_COLORS={'실적리뷰':'#4a90d9','프리뷰':'#e0a13c','이슈':'#8f68c9','신규커버':'#2fa6a6'};
const repSeasonColor=(i,total)=>{const d=total-1-i;return d===0?'#4e9d46':d===1?'#b8c2cc':'#dfe4e8';}; // 최신=녹색, 과거=회색
const _rN=n=>n==null?'–':Math.round(n).toLocaleString();
const _rTp=n=>n==null?'–':(n/10000)+'만원';
const _rDir=d=>d==='상향'?'<span class="up">▲상향</span>':d==='하향'?'<span class="down">▼하향</span>':d==='신규'?'<span style="color:var(--green-d)">신규</span>':'유지';

async function loadReports(){
  try{
    const r=await fetch('reports.json',{cache:'no-store'});
    if(!r.ok){document.getElementById('rep-list').innerHTML='<div class="na-msg">reports.json 없음</div>';return;}
    repData=await r.json();
    repSeason=repSeasons().slice(-1)[0];   // 기본: 최신 시즌
    renderReports();
  }catch(e){document.getElementById('rep-list').innerHTML='<div class="na-msg">리포트 데이터를 불러오지 못했습니다</div>';}
}
function repSeasons(){
  if(repData.seasons) return repData.seasons;
  const m={};repData.reports.forEach(r=>{const d=m[r.season];m[r.season]=(!d||r.date<d)?r.date:d;});
  return Object.keys(m).sort((a,b)=>m[a].localeCompare(m[b]));
}
function repLatestPerBroker(rs){
  const m={};rs.forEach(r=>{if(!m[r.broker]||r.date>m[r.broker].date)m[r.broker]=r;});
  return Object.values(m);
}
function repSeasonReports(season){return repLatestPerBroker(repData.reports.filter(r=>r.season===season));}
function repCons(season,period,key){
  const v=repSeasonReports(season).map(r=>r.est&&r.est[period]&&r.est[period][key]).filter(x=>x!=null);
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
}
function repSegCons(season,period,seg){
  const v=repSeasonReports(season).map(r=>r.est&&r.est[period]&&r.est[period].seg&&r.est[period].seg[seg]).filter(x=>x!=null);
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
}
function repDxCons(season,period,seg,dx){
  const v=repSeasonReports(season).map(r=>r.segdx&&r.segdx[period]&&r.segdx[period][seg]&&r.segdx[period][seg][dx]).filter(x=>x!=null);
  return v.length?{avg:v.reduce((a,b)=>a+b,0)/v.length,n:v.length}:null;
}
function renderReports(){
  renderRepCards();renderRepTrend();renderRepEst();renderRepDx();renderRepList();
  const n=document.getElementById('rep-note');
  if(n)n.textContent=`PDF 원문 + 부문별 매출 추정 · ${repData.updated} 기준 ${repData.reports.length}건 · 커버리지 ${new Set(repData.reports.map(r=>r.broker)).size}개사`;
}

/* ---- KPI: 최신 시즌 기준 ---- */
function repFocusPeriod(season){
  // 시즌명에서 대상 분기 도출: "26Q2 Preview" → "2Q26E" (프리뷰든 어닝이든 해당 분기 컨센)
  const m=/(\d{2})Q([1-4])/.exec(season||'');
  return m?`${m[2]}Q${m[1]}E`:'2026E';
}
function renderRepCards(){
  const seasons=repSeasons(), latest=seasons.slice(-1)[0];
  const rs=repSeasonReports(latest), tps=rs.filter(r=>r.tp).map(r=>r.tp);
  const avg=tps.reduce((a,b)=>a+b,0)/tps.length;
  const buy=rs.filter(r=>/buy|매수|overweight|비중확대/i.test(r.rating||'')).length;
  const prev=seasons.length>1?seasons[seasons.length-2]:null;
  const focus=repFocusPeriod(latest);
  const rev=repCons(latest,focus,'rev'), op=repCons(latest,focus,'op');
  const revP=prev?repCons(prev,focus,'rev'):null;
  const chg=(rev!=null&&revP)?(rev/revP-1)*100:null;
  const isEarn=/Earnings/i.test(latest||'');
  const cards=[
    [`최신 시즌`,`<span class="v">${latest}</span>`,`${rs.length}개사 · 전체 ${repData.reports.length}건`],
    ['평균 목표주가',`<span class="v lime">${Math.round(avg/10000)}만원</span>`,`범위 ${Math.min(...tps)/10000}만~${Math.max(...tps)/10000}만`],
    ['투자의견',`<span class="v">Buy ${buy}</span>`,(rs.length-buy)?`${rs.length-buy}곳 중립·기타`:'전원 매수']
  ];
  const _bm=(a,c)=>{if(a==null||!c)return '';const p=(a/c-1)*100;return `<span class="${p>=0?'up':'down'}">${p>=0?'+':''}${p.toFixed(1)}% ${p>=0?'상회':'하회'}</span>`;};
  if(isEarn&&prev){
    // 어닝 시즌: 발표 실적 vs 직전(프리뷰) 컨센 미트/미스 표기
    const opP=repCons(prev,focus,'op');
    const q=/(\d)Q(\d{2})E/.exec(focus)||[];
    cards.push([`${q[1]}Q${q[2]} 실적 vs 프리뷰 컨센`,
      `<span class="v">${_rN(rev)} ${_bm(rev,revP)}</span>`,
      `억원 (컨센 ${_rN(revP)}억) · 영업이익 ${_rN(op)}억 ${_bm(op,opP)} (컨센 ${_rN(opP)}억)`]);
    // 다음 분기 컨센
    const nq=q.length?(q[1]==='4'?`1Q${+q[2]+1}E`:`${+q[1]+1}Q${q[2]}E`):null;
    const nRev=nq?repCons(latest,nq,'rev'):null, nOp=nq?repCons(latest,nq,'op'):null;
    const nN=nq?rs.filter(r=>r.est&&r.est[nq]&&r.est[nq].rev!=null).length:0;
    if(nRev!=null)cards.push([`다음 분기 ${nq} 컨센`,`<span class="v">${_rN(nRev)}</span>`,`억원 · 영업이익 ${_rN(nOp)}억 · ${nN}곳 평균`]);
  }else{
    cards.push([`${focus} 매출 컨센`,`<span class="v">${_rN(rev)}</span>`,`억원 · 영업이익 ${_rN(op)}억`+(chg!=null?` · 직전 시즌비 <span class="${chg>=0?'up':'down'}">${chg>=0?'+':''}${chg.toFixed(1)}%</span>`:'')]);
  }
  document.getElementById('rep-cards').innerHTML=cards.map(c=>`<div class="card"><div class="k">${c[0]}</div>${c[1]}<div class="s">${c[2]}</div></div>`).join('');
  // 부문별 내수/수출 컨센 (최신 시즌 · 대상 분기)
  const dxEl=document.getElementById('rep-dx-cards');
  if(dxEl){
    const q=/(\d)Q(\d{2})E/.exec(focus)||[];
    const nq=q.length?(q[1]==='4'?`1Q${+q[2]+1}E`:`${+q[1]+1}Q${q[2]}E`):null;
    const cards=['의료기기','화장품','의약품'].map(s=>{
      const d=repDxCons(latest,focus,s,'내수'), x=repDxCons(latest,focus,s,'수출');
      if(!d&&!x)return '';
      const tot=(d?d.avg:0)+(x?x.avg:0), share=x&&tot?Math.round(x.avg/tot*100):null;
      if(isEarn&&prev){
        // 어닝 시즌: 다음 분기 컨센을 헤드라인으로, 그 아래 실적 vs 컨센 → 내수/수출 순
        const act=repSegCons(latest,focus,s), pre=repSegCons(prev,focus,s);
        const nxt=nq?repSegCons(latest,nq,s):null;
        return `<div class="card"><div class="k"><i class="co-dot" style="background:${REP_SEG_COLORS[s]}"></i> ${s} · 다음 분기 ${nq} 컨센</div>`+
          `<span class="v" style="font-size:22px">${nxt!=null?_rN(nxt):'–'} <span style="font-size:12px;color:var(--dim);font-weight:600">억원</span></span>`+
          `<div class="s">${q[1]}Q${q[2]} 실적 <b>${_rN(act)}억</b> ${_bm(act,pre)} (컨센 ${_rN(pre)}억)</div>`+
          `<div class="s">${q[1]}Q 내수 ${d?_rN(d.avg):'–'} · 수출 ${x?_rN(x.avg):'–'} (비중 ${share!=null?share+'%':'–'}) · ${Math.max(d?d.n:0,x?x.n:0)}곳 평균</div></div>`;
      }
      return `<div class="card"><div class="k"><i class="co-dot" style="background:${REP_SEG_COLORS[s]}"></i> ${s} · ${focus} 내수/수출</div>`+
        `<span class="v" style="font-size:22px">${d?_rN(d.avg):'–'} <span style="font-size:12px;color:var(--dim);font-weight:600">내수</span> · ${x?_rN(x.avg):'–'} <span style="font-size:12px;color:var(--dim);font-weight:600">수출</span></span>`+
        `<div class="s">억원 · 수출 비중 ${share!=null?share+'%':'–'} · ${Math.max(d?d.n:0,x?x.n:0)}곳 평균</div></div>`;
    }).join('');
    dxEl.innerHTML=cards;
    dxEl.style.display=cards?'':'none';
  }
}

/* ---- 컨센서스 추이 (시즌별 변화) ---- */
const _hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;};
function setRepTrend(m){repTrendMode=m;renderRepTrend();}
function renderRepTrend(){
  const modes=[['year','연간 매출·영업이익 (26/27/28E)'],['qseg','2026 분기별 · 부문별']];
  if(!modes.some(([k])=>k===repTrendMode))repTrendMode='year';
  document.getElementById('rep-trend-chips').innerHTML=modes.map(([k,l])=>
    `<span class="filter-chip ${repTrendMode===k?'on':''}" onclick="setRepTrend('${k}')">${l}</span>`).join('');
  const seasons=repSeasons();
  const ctx=document.getElementById('rep-trend-chart');
  ctx.parentElement.style.height='300px';
  if(repTrendChart)repTrendChart.destroy();
  let labels,chipFns,note='';
  if(repTrendMode==='qseg'){
    // 분기별 × 부문별: 시즌당 스택 하나 (이전 시즌은 연하게)
    labels=['2Q26E','3Q26E','4Q26E'];
    chipFns=[{name:'',f:(s,p)=>repCons(s,p,'rev')}];
    const ds=[];
    seasons.forEach((s,si)=>{
      const latest=si===seasons.length-1;
      REP_SEG_ORDER.forEach(g=>ds.push({label:g,stack:s,
        data:labels.map(q=>{const v=repSegCons(s,q,g);return v==null?0:Math.round(v);}),
        backgroundColor:_hexA(REP_SEG_COLORS[g],latest?0.95:0.35)}));
    });
    repTrendChart=new Chart(ctx,{type:'bar',data:{labels,datasets:ds},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:11},color:'#67707b',
            filter:(it,data)=>it.datasetIndex>=data.datasets.length-REP_SEG_ORDER.length}},
          tooltip:{callbacks:{title:c=>`${c[0].label} · ${c[0].dataset.stack}`,
            label:c=>`${c.dataset.label}: ${c.parsed.y.toLocaleString()}억`}}},
        scales:{x:{stacked:true,ticks:{color:'#67707b'},grid:{display:false}},
                y:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}}}}});
    note=` · 왼쪽 연한 막대 = 이전 시즌, 오른쪽 진한 막대 = 최신 시즌 · 변화율은 분기 매출 총액 기준`;
  }else{
    // 연간 매출(막대) + 영업이익(선) 통합
    labels=['2026E','2027E','2028E'];
    const rv=(s,p)=>repCons(s,p,'rev'), ov=(s,p)=>repCons(s,p,'op');
    chipFns=[{name:'매출',f:rv},{name:'영익',f:ov}];
    const ds=[];
    seasons.forEach((s,i)=>ds.push({type:'bar',label:`${s} · 매출`,order:2,
      data:labels.map(p=>{const v=rv(s,p);return v==null?null:Math.round(v);}),
      backgroundColor:repSeasonColor(i,seasons.length)}));
    seasons.forEach((s,i)=>{const latest=i===seasons.length-1, c=latest?'#2e6b2a':'#8a97a3';
      ds.push({type:'line',label:`${s} · 영업이익`,order:1,
        data:labels.map(p=>{const v=ov(s,p);return v==null?null:Math.round(v);}),
        borderColor:c,backgroundColor:c,borderWidth:2,pointRadius:4,borderDash:latest?[]:[6,4]});});
    repTrendChart=new Chart(ctx,{type:'bar',data:{labels,datasets:ds},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:11},color:'#67707b'}},
          tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y==null?'–':c.parsed.y.toLocaleString()+'억'}`}}},
        scales:{x:{ticks:{color:'#67707b'},grid:{display:false}},
                y:{ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}}}}});
    note=' · 막대 = 매출, 선 = 영업이익';
  }
  // 변화율 요약 라인
  const el=document.getElementById('rep-trend-delta');
  if(el&&seasons.length>1){
    const a=seasons[seasons.length-2],b=seasons[seasons.length-1];
    const fmt=(va,vb)=>{if(va==null||vb==null)return null;const d=(vb/va-1)*100;
      return `<b class="${d>=0?'up':'down'}">${d>=0?'+':''}${d.toFixed(1)}%</b>`;};
    el.innerHTML=labels.map(p=>{
      const parts=chipFns.map(({name,f})=>{const t=fmt(f(a,p),f(b,p));return t?(name?name+' ':'')+t:null;}).filter(Boolean);
      return parts.length?`<span class="filter-chip">${p} ${parts.join(' · ')}</span>`:`<span class="filter-chip zero">${p} –</span>`;
    }).join('')+`<span class="unit" style="margin-left:6px">${a} → ${b} 컨센 변화${note}</span>`;
  }else if(el){el.innerHTML='';}
}

/* ---- 부문별 매출 추정 비교 (시즌·기간 선택) ---- */
function setRepSeason(s){repSeason=s;renderRepEst();renderRepDx();}
function setRepPeriod(p){repPeriod=p;renderRepEst();renderRepDx();}
function renderRepEst(){
  document.getElementById('rep-season-chips').innerHTML=repSeasons().map(s=>
    `<span class="filter-chip ${repSeason===s?'on':''}" onclick="setRepSeason('${s}')">${s}</span>`).join('');
  document.getElementById('rep-period-chips').innerHTML=['2Q26E','2026E','2027E'].map(p=>
    `<span class="filter-chip ${repPeriod===p?'on':''}" onclick="setRepPeriod('${p}')">${p}</span>`).join('');
  const inSeason=repSeasonReports(repSeason);
  const rs=inSeason.filter(r=>r.est&&r.est[repPeriod]&&r.est[repPeriod].seg)
    .sort((a,b)=>(b.est[repPeriod].rev||0)-(a.est[repPeriod].rev||0));
  const ctx=document.getElementById('rep-est-chart');
  ctx.parentElement.style.height=(rs.length*36+100)+'px';   // 증권사 수만큼 확보 (autoSkip 방지)
  if(repChart)repChart.destroy();
  repChart=new Chart(ctx,{type:'bar',
    data:{labels:rs.map(r=>r.broker),
      datasets:REP_SEG_ORDER.map(s=>({label:s,data:rs.map(r=>r.est[repPeriod].seg[s]||0),backgroundColor:REP_SEG_COLORS[s],stack:'s'}))},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:11},color:'#67707b'}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label} ${c.parsed.x.toLocaleString()}억`}}},
      scales:{x:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}},
              y:{stacked:true,ticks:{color:'#67707b',font:{size:11},autoSkip:false},grid:{display:false}}}}});
  const all=inSeason.filter(r=>r.est&&r.est[repPeriod]).sort((a,b)=>(b.tp||0)-(a.tp||0));
  const seg=(r,s)=>r.est[repPeriod].seg?_rN(r.est[repPeriod].seg[s]):'–';
  const avg=k=>_rN(repCons(repSeason,repPeriod,k));
  const segAvg=s=>{const v=repSegCons(repSeason,repPeriod,s);return v==null?'–':_rN(v);};
  document.getElementById('rep-est-table').innerHTML=
    `<table><thead><tr><th>증권사</th><th>매출액</th><th>영업이익</th>${REP_SEG_ORDER.map(s=>`<th>${s}</th>`).join('')}<th>목표주가</th></tr></thead><tbody>`+
    all.map(r=>`<tr><td><b>${r.broker}</b></td><td>${_rN(r.est[repPeriod].rev)}</td><td>${_rN(r.est[repPeriod].op)}</td>${REP_SEG_ORDER.map(s=>`<td>${seg(r,s)}</td>`).join('')}<td><b>${_rTp(r.tp)}</b></td></tr>`).join('')+
    `<tr style="background:var(--panel2);font-weight:700"><td>평균</td><td>${avg('rev')}</td><td>${avg('op')}</td>${REP_SEG_ORDER.map(s=>`<td>${segAvg(s)}</td>`).join('')}<td></td></tr>`+
    `</tbody></table><div class="unit" style="margin-top:4px">단위: 억 원 · ${repSeason} 시즌, 증권사당 최신 1건 · – = 해당 추정 미제시</div>`;
}

/* ---- 내수/수출 컨센서스 ---- */
function renderRepDx(){
  const el=document.getElementById('rep-dx-table');if(!el)return;
  const rows=['의료기기','화장품','의약품'].map(s=>{
    const d=repDxCons(repSeason,repPeriod,s,'내수'), x=repDxCons(repSeason,repPeriod,s,'수출');
    if(!d&&!x)return null;
    const tot=(d?d.avg:0)+(x?x.avg:0);
    const share=x&&tot?Math.round(x.avg/tot*100):null;
    return `<tr><td><b style="color:${REP_SEG_COLORS[s]}">■</b> ${s}</td><td>${d?_rN(d.avg):'–'}</td><td>${x?_rN(x.avg):'–'}</td><td>${share!=null?share+'%':'–'}</td><td>${Math.max(d?d.n:0,x?x.n:0)}곳</td></tr>`;
  }).filter(Boolean);
  el.innerHTML=rows.length?
    `<table><thead><tr><th>부문</th><th>내수 컨센</th><th>수출 컨센</th><th>수출 비중</th><th>표본</th></tr></thead><tbody>${rows.join('')}</tbody></table>`+
    `<div class="unit" style="margin-top:4px">단위: 억 원 · ${repSeason} · ${repPeriod} · 내수/수출 구분을 제시한 증권사 평균</div>`
    :'<div class="na-msg">이 시즌·기간에는 내수/수출 구분 추정이 없습니다</div>';
}

/* ---- 리포트 목록 ---- */
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
    (r.file?`<a class="ttl" href="${r.file}" target="_blank" rel="noopener">${r.title}</a>`
           :`<span class="ttl" style="font-size:13px;font-weight:600">${r.title}</span><span class="rep-meta">(원문 미보유)</span>`)+
    `<span class="rep-meta">${r.date}${r.analyst?' · '+r.analyst:''} · ${r.season}</span>`+
    `<span class="rep-tp">${r.rating||''} · TP ${_rTp(r.tp)} ${_rDir(r.tp_dir)}</span></div>`+
    `<div class="rep-sum">${r.summary}</div>`+
    (r.points&&r.points.length?`<ul class="rep-points">${r.points.map(p=>`<li>${p}</li>`).join('')}</ul>`:'')+
    `</div>`).join('')||'<div class="na-msg">해당 유형 리포트 없음</div>';
}
