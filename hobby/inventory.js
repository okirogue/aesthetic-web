/* 재고 — hobby/inventory.json 을 GitHub Contents API 로 직접 읽고 씀.
   토큰(fine-grained PAT, 이 레포 Contents 읽기/쓰기)은 이 브라우저의 localStorage 에만 저장. */
(function(){
  var CFG={owner:'okirogue',repo:'aesthetic-web',path:'hobby/inventory.json',branch:'main'};
  var API='https://api.github.com/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+CFG.path;
  var S={data:null,sha:null,dirty:false,busy:false,editing:null,loaded:false};
  var $=function(id){return document.getElementById(id);};

  function token(){ try{return localStorage.getItem('inv_token')||'';}catch(e){return '';} }
  function today(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function p2(n){ return (n<10?'0':'')+n; }
  function days(iso){ if(!iso) return null; var a=new Date(iso+'T00:00:00'), b=new Date(today()+'T00:00:00'); return Math.round((b-a)/86400000); }
  function fmtDate(iso){ if(!iso) return '-'; var s=iso.split('-'); return s[0]+'. '+Number(s[1])+'. '+Number(s[2])+'.'; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function b64enc(str){ var u=new TextEncoder().encode(str), s=''; for(var i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }
  function b64dec(b){ var s=atob(b.replace(/\n/g,'')), u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return new TextDecoder().decode(u); }
  function status(msg,kind){ var el=$('invStatus'); if(!el) return; el.textContent=msg||''; el.className='inv-status'+(kind?' '+kind:''); }

  /* ---------- 읽기 ---------- */
  function load(force){
    if(S.loaded&&!force){ render(); return; }
    status('불러오는 중…');
    var t=token();
    var p;
    if(t){
      p=fetch(API+'?ref='+CFG.branch+'&t='+Date.now(),{headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github+json'},cache:'no-store'})
        .then(function(r){ if(!r.ok) throw new Error('GitHub '+r.status); return r.json(); })
        .then(function(j){ S.sha=j.sha; return JSON.parse(b64dec(j.content)); });
    }else{
      p=fetch('inventory.json?t='+Date.now(),{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('파일 '+r.status); return r.json(); });
    }
    p.then(function(d){ S.data=d; S.loaded=true; S.dirty=false; status(t?'GitHub 에서 불러옴':'읽기 전용 (토큰 없음 — 설정에서 입력하면 저장 가능)', t?'':'warn'); render(); })
     .catch(function(e){ if(window.INV_SEED&&!S.data){ S.data=JSON.parse(JSON.stringify(window.INV_SEED)); S.loaded=true; } status('불러오기 실패: '+e.message+(t?' (토큰 확인)':''),'err'); render(); });
  }

  /* ---------- 쓰기 ---------- */
  function save(msg){
    var t=token();
    if(!t){ S.dirty=true; status('저장 안 됨 — 설정에서 GitHub 토큰을 넣어야 저장돼요 (이 화면에서 바꾼 건 새로고침하면 사라짐)','warn'); render(); return; }
    if(S.busy){ S.dirty=true; return; }
    S.busy=true; S.dirty=false; status('저장 중…'); render();
    S.data.updated=today();
    var body={message:'inventory: '+msg,content:b64enc(JSON.stringify(S.data,null,2)+'\n'),branch:CFG.branch};
    if(S.sha) body.sha=S.sha;
    var put=function(){ return fetch(API,{method:'PUT',headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify(body)}); };
    put().then(function(r){
      if(r.status===409||r.status===422){ /* sha 어긋남 → 최신 sha 받아 1회 재시도 */
        return fetch(API+'?ref='+CFG.branch+'&t='+Date.now(),{headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github+json'},cache:'no-store'})
          .then(function(r2){return r2.json();}).then(function(j){ body.sha=j.sha; return put(); });
      }
      return r;
    }).then(function(r){
      if(!r.ok) return r.json().then(function(j){ throw new Error('GitHub '+r.status+(j&&j.message?' · '+j.message:'')); });
      return r.json();
    }).then(function(j){ S.sha=j.content.sha; S.busy=false; status('저장됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}),'ok'); if(S.dirty) save('추가 변경'); else render(); })
      .catch(function(e){ S.busy=false; S.dirty=true; status('저장 실패: '+e.message,'err'); render(); });
  }

  /* ---------- 조작 ---------- */
  function find(id){ for(var i=0;i<S.data.items.length;i++) if(S.data.items[i].id===id) return S.data.items[i]; return null; }
  function smoke(id){
    var it=find(id); if(!it||it.qty<=0) return;
    it.qty-=1;
    S.data.log=S.data.log||[]; S.data.log.unshift({d:today(),name:it.name,delta:-1}); if(S.data.log.length>60) S.data.log.length=60;
    if(it.qty<=0){ S.data.items=S.data.items.filter(function(x){return x.id!==id;}); save(it.name+' 소진 (삭제)'); return; }
    save(it.name+' -1 ('+it.qty+')');
  }
  function plus(id){ var it=find(id); if(!it) return; it.qty+=1; save(it.name+' +1 ('+it.qty+')'); }
  function remove(id){ var it=find(id); if(!it) return; if(!confirm('"'+it.name+'" 삭제할까요?')) return; S.data.items=S.data.items.filter(function(x){return x.id!==id;}); S.editing=null; save(it.name+' 삭제'); }
  function startEdit(id){ S.editing=id||'__new__'; render(); }
  function cancelEdit(){ S.editing=null; render(); }
  function commitEdit(){
    var name=$('efName').value.trim(), qty=parseInt($('efQty').value,10), date=$('efDate').value, store=$('efStore').value.trim(), memo=$('efMemo').value.trim();
    if(!name){ alert('이름을 넣어주세요'); return; }
    if(isNaN(qty)||qty<0) qty=0;
    if(S.editing==='__new__'){
      var id=name.toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-|-$/g,'')||('c'+Date.now());
      if(find(id)) id+='-'+Date.now().toString(36);
      S.data.items.unshift({id:id,name:name,qty:qty,date:date,store:store,memo:memo});
      S.editing=null; save(name+' 추가 ('+qty+')');
    }else{
      var it=find(S.editing); if(!it) return;
      it.name=name; it.qty=qty; it.date=date; it.store=store; it.memo=memo;
      if(qty<=0) S.data.items=S.data.items.filter(function(x){return x.id!==it.id;});
      S.editing=null; save(name+(qty<=0?' 소진 (삭제)':' 수정 ('+qty+')'));
    }
  }

  /* ---------- 설정 ---------- */
  function toggleSettings(){ var p=$('invSettings'); p.classList.toggle('hidden'); if(!p.classList.contains('hidden')) $('invToken').value=token(); }
  function saveToken(){
    var v=$('invToken').value.trim();
    try{ if(v) localStorage.setItem('inv_token',v); else localStorage.removeItem('inv_token'); }catch(e){ alert('이 브라우저는 저장소를 쓸 수 없어요'); return; }
    $('invSettings').classList.add('hidden');
    load(true);
  }

  /* ---------- 그리기 ---------- */
  function editForm(it){
    it=it||{name:'',qty:1,date:today(),store:'락앤락',memo:''};
    return '<div class="inv-form">'
      +'<label>이름<input id="efName" value="'+esc(it.name)+'" placeholder="Montecristo Crafted by AJ Fernandez Toro"></label>'
      +'<div class="row"><label>수량<input id="efQty" type="number" min="0" inputmode="numeric" value="'+esc(it.qty)+'"></label>'
      +'<label>입고일<input id="efDate" type="date" value="'+esc(it.date)+'"></label></div>'
      +'<label>보관<input id="efStore" value="'+esc(it.store)+'" placeholder="락앤락 / 노바라(회사) / 케이스"></label>'
      +'<label>메모<input id="efMemo" value="'+esc(it.memo)+'" placeholder="구매처, 용도 등"></label>'
      +'<div class="btns"><button class="pri" onclick="INV.commitEdit()">저장</button><button onclick="INV.cancelEdit()">취소</button>'
      +(it.id?'<button class="danger" onclick="INV.remove(\''+it.id+'\')">삭제</button>':'')+'</div>'
      +'</div>';
  }
  function render(){
    var root=$('invList'); if(!root) return;
    if(!S.data){ root.innerHTML=''; return; }
    var items=S.data.items.filter(function(i){return i.qty>0;});
    var total=0, kinds=0; items.forEach(function(i){ total+=i.qty; if(i.qty>0) kinds++; });
    var sum=$('invSummary'); if(sum) sum.innerHTML='<b>'+total+'</b>개비 · <b>'+kinds+'</b>종'+(S.data.updated?' <small>갱신 '+fmtDate(S.data.updated)+'</small>':'');
    var h='';
    h+='<div class="inv-top"><button class="inv-add" onclick="INV.startEdit()">+ 시가 추가</button><button class="inv-gear" onclick="INV.toggleSettings()">설정</button></div>';
    if(S.editing==='__new__') h+=editForm(null);
    items.sort(function(a,b){ if((a.qty>0)!==(b.qty>0)) return a.qty>0?-1:1; return (b.date||'').localeCompare(a.date||''); });
    items.forEach(function(it){
      if(S.editing===it.id){ h+=editForm(it); return; }
      var d=days(it.date);
      var age=d==null?'':(d===0?'오늘 입고':d+'일째');
      h+='<div class="inv-card'+(it.qty<=0?' out':'')+'">'
        +'<div class="inv-qty">'+it.qty+'</div>'
        +'<div class="inv-body"><h3>'+esc(it.name)+'</h3>'
        +'<div class="inv-sub">'+(it.date?'입고 '+fmtDate(it.date)+' · '+age:'입고일 미입력')+(it.store?' · '+esc(it.store):'')+'</div>'
        +(it.memo?'<div class="inv-memo">'+esc(it.memo)+'</div>':'')
        +'</div>'
        +'<div class="inv-act">'
        +'<button class="smoke" '+(it.qty<=0||S.busy?'disabled':'')+' onclick="INV.smoke(\''+it.id+'\')">−1 피움</button>'
        +'<div class="mini"><button '+(S.busy?'disabled':'')+' onclick="INV.plus(\''+it.id+'\')">+1</button><button onclick="INV.startEdit(\''+it.id+'\')">수정</button></div>'
        +'</div></div>';
    });
    var log=(S.data.log||[]).slice(0,8);
    if(log.length){
      h+='<div class="inv-log"><div class="nt-h">최근 피움</div>';
      log.forEach(function(l){ h+='<div><span>'+fmtDate(l.d)+'</span>'+esc(l.name)+'</div>'; });
      h+='</div>';
    }
    root.innerHTML=h;
  }

  window.INV={load:load,smoke:smoke,plus:plus,remove:remove,startEdit:startEdit,cancelEdit:cancelEdit,commitEdit:commitEdit,toggleSettings:toggleSettings,saveToken:saveToken};
})();
