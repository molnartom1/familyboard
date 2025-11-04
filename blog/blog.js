const $=s=>document.querySelector(s);
const postsRef=firebase.firestore().collection('blog_posts');
let posts=[]; let ui={q:'',tag:null,sort:'newest',editingId:null}; let unsubAll=null;

document.addEventListener('DOMContentLoaded',()=>{
  firebase.auth().onAuthStateChanged(user=>{ if(user) subscribeAllPosts(); else firebase.auth().signInAnonymously().catch(console.log); });
  bindUI();
});
function bindUI(){
  $('#newPostBtn').addEventListener('click',()=>openModal());
  $('#closeModal').addEventListener('click',closeModal);
  $('#postForm').addEventListener('submit',onSave);
  $('#deleteBtn').addEventListener('click',onDelete);
  $('#searchInput').addEventListener('input',e=>{ui.q=e.target.value.trim();render();});
  $('#sortSelect').addEventListener('change',e=>{ui.sort=e.target.value;render();});
  $('#contentInput').addEventListener('input',updatePreview);
  $('#titleInput').addEventListener('input',updatePreview);
  $('#tagsInput').addEventListener('input',updatePreview);
  $('#pinnedInput').addEventListener('change',updatePreview);
  $('#imageInput').addEventListener('change',handleImage);
}
function subscribeAllPosts(){
  if (unsubAll) unsubAll();
  unsubAll = postsRef.orderBy('sortPin','desc').orderBy('createdAt','desc').onSnapshot(snap=>{
    posts=[]; snap.forEach(doc=>posts.push({id:doc.id,...doc.data()})); render();
  },err=>console.log('onSnapshot hiba:',err));
}
async function onSave(e){
  e.preventDefault();
  const title=$('#titleInput').value.trim();
  const content=$('#contentInput').value||'';
  const tags=$('#tagsInput').value.split(',').map(s=>s.trim()).filter(Boolean);
  const pinned=$('#pinnedInput').checked;
  const previewImg=document.querySelector('#preview img');
  const image=previewImg?previewImg.src:null;
  if(!title){ alert('A cím megadása kötelező.'); return; }
  if(image && image.length>300000){ alert('A kép túl nagy (ajánlott < 300 kB).'); return; }
  const payload={title,content,tags,pinned,sortPin:pinned?1:0,image:image||null,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
  try{
    if (ui.editingId){ await postsRef.doc(ui.editingId).update(payload); }
    else { await postsRef.add({...payload,createdAt:firebase.firestore.FieldValue.serverTimestamp()}); }
    closeModal();
  }catch(e){ console.log(e); alert('Mentési hiba: '+(e.message||e)); }
}
async function onDelete(){
  if(!ui.editingId) return;
  if(!confirm('Biztosan törlöd?')) return;
  try{ await postsRef.doc(ui.editingId).delete(); closeModal(); }
  catch(e){ console.log(e); alert('Törlési hiba: '+(e.message||e)); }
}
function render(){
  renderChips();
  const grid=$('#postGrid'); grid.innerHTML='';
  let view=[...posts];
  if(ui.q){
    const q=ui.q.toLowerCase();
    view=view.filter(p=>(p.title||'').toLowerCase().includes(q)||(p.content||'').toLowerCase().includes(q)||(p.tags||[]).some(t=>(t||'').toLowerCase().includes(q)));
  }
  if(ui.tag){ view=view.filter(p=>(p.tags||[]).map(t=>String(t).toLowerCase()).includes(ui.tag.toLowerCase())); }
  if(ui.sort==='oldest'){ view.sort((a,b)=>(a.sortPin===b.sortPin?ts(a.createdAt)-ts(b.createdAt):(b.sortPin-a.sortPin))); }
  else if(ui.sort==='title'){ view.sort((a,b)=>(a.sortPin===b.sortPin?(a.title||'').localeCompare(b.title||''):(b.sortPin-a.sortPin))); }
  for(const p of view){ grid.appendChild(postCard(p)); }
  if(view.length===0){ const empty=document.createElement('p'); empty.textContent='Nincs találat.'; empty.style.color='#666'; grid.appendChild(empty); }
}
function renderChips(){
  const root=$('#tagChips'); const all=new Set(); posts.forEach(p=>(p.tags||[]).forEach(t=>all.add(t)));
  root.innerHTML=''; if(all.size===0) return;
  const allChip=chip('Összes',!ui.tag,()=>{ui.tag=null;render();}); root.appendChild(allChip);
  [...all].sort((a,b)=>(a||'').localeCompare(b||'')).forEach(t=>{ const el=chip(t,ui.tag&&ui.tag.toLowerCase()===String(t).toLowerCase(),()=>{ui.tag=t;render();}); root.appendChild(el); });
}
function chip(text,active,onClick){ const el=document.createElement('button'); el.type='button'; el.className='fb-chip'+(active?' active':''); el.textContent=text; el.addEventListener('click',onClick); return el; }
function postCard(p){
  const tmpl=document.getElementById('postCardTmpl'); const node=tmpl.content.cloneNode(true);
  const img=node.querySelector('.fb-post-img'); const title=node.querySelector('.fb-post-title'); const date=node.querySelector('.fb-post-date');
  const content=node.querySelector('.fb-post-content'); const pin=node.querySelector('.fb-pin'); const tags=node.querySelector('.fb-tags');
  const editBtn=node.querySelector('.edit'); const delBtn=node.querySelector('.del');
  if(p.image){ img.src=p.image; img.hidden=false; img.alt=p.title||''; } else { img.hidden=true; }
  title.textContent=p.title||'Cím nélkül'; date.textContent=fmt(ts(p.createdAt)); content.innerHTML=md(p.content||''); pin.hidden=!p.pinned;
  (p.tags||[]).forEach(t=>{ const tag=document.createElement('span'); tag.className='fb-tag'; tag.textContent=t; tag.addEventListener('click',()=>{ui.tag=t;render();}); tags.appendChild(tag); });
  editBtn.addEventListener('click',()=>openModal(p.id));
  delBtn.addEventListener('click',async()=>{ if(confirm('Biztosan törlöd?')){ try{ await postsRef.doc(p.id).delete(); }catch(e){ alert('Törlési hiba: '+(e.message||e)); } } });
  return node;
}
function openModal(id=null){
  ui.editingId=id; const p=id?posts.find(x=>x.id===id):null;
  $('#modalTitle').textContent = id ? 'Bejegyzés szerkesztése' : 'Új bejegyzés';
  $('#titleInput').value=p?.title||''; $('#contentInput').value=p?.content||''; $('#tagsInput').value=(p?.tags||[]).join(', ');
  $('#pinnedInput').checked=!!p?.pinned; $('#imageInput').value=''; updatePreview(); $('#deleteBtn').style.display=id?'inline-flex':'none';
  const dlg=document.getElementById('postModal'); if(!dlg.open) dlg.showModal();
}
function closeModal(){ document.getElementById('postModal').close(); ui.editingId=null; }
function handleImage(e){ const file=e.target.files?.[0]; if(!file) return; if(file.size>350*1024){ alert('A kép túl nagy (max. ~350 kB ajánlott).'); e.target.value=''; return; }
  const reader=new FileReader(); reader.onload=()=>{ ensurePreviewImage(reader.result); }; reader.readAsDataURL(file); }
function ensurePreviewImage(src){ const prev=document.getElementById('preview'); let img=prev.querySelector('img'); if(!img){ img=document.createElement('img'); img.className='fb-post-img'; prev.prepend(img); } img.src=src; img.hidden=false; }
function updatePreview(){ const title=$('#titleInput').value.trim()||'Cím nélkül'; const content=$('#contentInput').value||''; const tags=$('#tagsInput').value.split(',').map(s=>s.trim()).filter(Boolean); const pinned=$('#pinnedInput').checked;
  const prev=document.getElementById('preview'); prev.innerHTML=''; const img=document.querySelector('#preview img'); if(img) prev.appendChild(img);
  const body=document.createElement('div'); body.className='fb-post-body'; body.innerHTML=`
    <header class="fb-post-header">
      <h3 class="fb-post-title">${esc(title)}</h3>
      <div class="fb-post-meta">
        <time class="fb-post-date">Előnézet</time>
        <span class="fb-pin" ${pinned?'':'hidden'}>📌 rögzített</span>
      </div>
    </header>
    <div class="fb-post-content">${md(content)}</div>
    <footer class="fb-post-footer">
      <div class="fb-tags">${tags.map(t=>`<span class="fb-tag">${esc(t)}</span>`).join(' ')}</div>
    </footer>`; prev.appendChild(body); }
function ts(v){ if(!v) return 0; if(typeof v.toDate==='function') return v.toDate().getTime(); if(v instanceof Date) return v.getTime(); return Number(v)||0; }
function fmt(ms){ if(!ms) return ''; const d=new Date(ms); return d.toLocaleString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function md(src){ let s=esc(src); s=s.replace(/^### (.*)$/gm,'<h3>$1</h3>'); s=s.replace(/^## (.*)$/gm,'<h2>$1</h2>'); s=s.replace(/^# (.*)$/gm,'<h1>$1</h1>');
  s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>'); s=s.replace(/\*(.+?)\*/g,'<em>$1</em>'); s=s.replace(/`([^`]+)`/g,'<code>$1</code>'); s=s.replace(/```([\s\S]*?)```/g,'<pre><code>$1</code></pre>');
  s=s.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  s=s.replace(/^(?:- |\* )(.*)$/gm,'<li>$1</li>'); s=s.replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`);
  s=s.split(/\n\n+/).map(p=>(/^<h\d|^<ul>|^<pre>/.test(p)?p:`<p>${p.replace(/\n/g,'<br>')}</p>`)).join('\n'); return s; }
