const LS_KEY = 'fb_blog_posts_v1';
let state = { posts: [], q: '', tag: null, sort: 'newest', editingId: null };
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
document.addEventListener('DOMContentLoaded', () => { load(); bindUI(); render(); });
function bindUI(){
  $('#newPostBtn').addEventListener('click', () => openModal());
  $('#closeModal').addEventListener('click', closeModal);
  $('#postForm').addEventListener('submit', onSave);
  $('#deleteBtn').addEventListener('click', onDelete);
  $('#searchInput').addEventListener('input', e => { state.q = e.target.value.trim(); render(); });
  $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#contentInput').addEventListener('input', updatePreview);
  $('#titleInput').addEventListener('input', updatePreview);
  $('#tagsInput').addEventListener('input', updatePreview);
  $('#pinnedInput').addEventListener('change', updatePreview);
  $('#imageInput').addEventListener('change', handleImage);
}
function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    state.posts = raw ? JSON.parse(raw) : seed();
  }catch(e){
    console.warn('Failed to load posts', e);
    state.posts = seed();
  }
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state.posts)); }
function seed(){
  const now = Date.now();
  return [{
    id: crypto.randomUUID(),
    title: 'Üdv a blog üzenőfalon!',
    content: 'Ez egy **egyszerű, offline-barát** blogfal. Készíts bejegyzést, adj hozzá `címkéket`, és tölts fel képet is.\n\n- Markdown támogatás\n- Kártyás megjelenítés\n- Keresés, címke szűrés\n- Rögzítés (📌)',
    tags: ['bemutató','tippek'],
    pinned: true, image: null, createdAt: now, updatedAt: now
  }];
}
function render(){
  const grid = $('#postGrid'); grid.innerHTML = '';
  let posts = [...state.posts];
  if (state.q){
    const q = state.q.toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || (p.tags||[]).some(t => t.toLowerCase().includes(q)));
  }
  if (state.tag){
    posts = posts.filter(p => (p.tags||[]).map(t => t.toLowerCase()).includes(state.tag.toLowerCase()));
  }
  posts.sort((a,b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (state.sort === 'newest') return b.createdAt - a.createdAt;
    if (state.sort === 'oldest') return a.createdAt - b.createdAt;
    if (state.sort === 'title') return a.title.localeCompare(b.title);
    return 0;
  });
  renderChips();
  for (const p of posts){ grid.appendChild(postCard(p)); }
  if (posts.length === 0){ const empty = document.createElement('p'); empty.textContent = 'Nincs találat.'; empty.style.color = '#666'; grid.appendChild(empty); }
}
function renderChips(){
  const root = $('#tagChips'); const all = new Set();
  state.posts.forEach(p => (p.tags||[]).forEach(t => all.add(t))); root.innerHTML='';
  if (all.size === 0) return;
  const allChip = chip('Összes', !state.tag, () => { state.tag=null; render(); }); root.appendChild(allChip);
  [...all].sort((a,b)=>a.localeCompare(b)).forEach(t => {
    const el = chip(t, state.tag && state.tag.toLowerCase() === t.toLowerCase(), () => { state.tag = t; render(); });
    root.appendChild(el);
  });
}
function chip(text, active, onClick){
  const el = document.createElement('button'); el.type='button';
  el.className = 'fb-chip' + (active ? ' active' : '');
  el.textContent = text; el.addEventListener('click', onClick); return el;
}
function postCard(p){
  const tmpl = document.getElementById('postCardTmpl'); const node = tmpl.content.cloneNode(true);
  const img = node.querySelector('.fb-post-img'); const title = node.querySelector('.fb-post-title');
  const date = node.querySelector('.fb-post-date'); const content = node.querySelector('.fb-post-content');
  const pin = node.querySelector('.fb-pin'); const tags = node.querySelector('.fb-tags');
  const editBtn = node.querySelector('.edit'); const delBtn = node.querySelector('.del');
  if (p.image){ img.src = p.image; img.hidden = false; img.alt = p.title; } else { img.hidden = true; }
  title.textContent = p.title; date.textContent = fmtDate(p.createdAt); content.innerHTML = md(p.content || ''); pin.hidden = !p.pinned;
  (p.tags||[]).forEach(t => { const tag = document.createElement('span'); tag.className='fb-tag'; tag.textContent=t; tag.addEventListener('click',()=>{ state.tag=t; render(); }); tags.appendChild(tag); });
  editBtn.addEventListener('click', () => openModal(p.id));
  delBtn.addEventListener('click', () => { if(confirm('Biztosan törlöd?')) removePost(p.id); });
  return node;
}
function openModal(id=null){
  state.editingId = id; const p = id ? state.posts.find(x => x.id === id) : null;
  $('#modalTitle').textContent = id ? 'Bejegyzés szerkesztése' : 'Új bejegyzés';
  $('#titleInput').value = p?.title || ''; $('#contentInput').value = p?.content || '';
  $('#tagsInput').value = (p?.tags||[]).join(', '); $('#pinnedInput').checked = !!p?.pinned;
  $('#imageInput').value = ''; updatePreview(); $('#deleteBtn').style.display = id ? 'inline-flex' : 'none';
  const dlg = document.getElementById('postModal'); if (!dlg.open) dlg.showModal();
}
function closeModal(){ document.getElementById('postModal').close(); state.editingId = null; }
function onSave(e){
  e.preventDefault();
  const title = $('#titleInput').value.trim(); const content = $('#contentInput').value;
  const tags = $('#tagsInput').value.split(',').map(s=>s.trim()).filter(Boolean);
  const pinned = $('#pinnedInput').checked; const previewImg = document.querySelector('#preview img');
  const image = previewImg ? previewImg.src : null;
  if (!title){ alert('A cím megadása kötelező.'); return; }
  const now = Date.now();
  if (state.editingId){
    const p = state.posts.find(x => x.id === state.editingId);
    Object.assign(p, { title, content, tags, pinned, image, updatedAt: now });
  } else {
    state.posts.unshift({ id: crypto.randomUUID(), title, content, tags, pinned, image, createdAt: now, updatedAt: now });
  }
  save(); closeModal(); render();
}
function onDelete(){ if (!state.editingId) return; if (!confirm('Biztosan törlöd?')) return; removePost(state.editingId); closeModal(); }
function removePost(id){ state.posts = state.posts.filter(p => p.id !== id); save(); render(); }
function handleImage(e){
  const file = e.target.files?.[0]; if (!file) return;
  if (file.size > 1.5 * 1024 * 1024){ alert('A kép túl nagy (max. ~1.5 MB ajánlott).'); e.target.value=''; return; }
  const reader = new FileReader(); reader.onload = () => { ensurePreviewImage(reader.result); }; reader.readAsDataURL(file);
}
function ensurePreviewImage(src){
  const prev = document.getElementById('preview'); let img = prev.querySelector('img');
  if (!img){ img = document.createElement('img'); img.className='fb-post-img'; prev.prepend(img); }
  img.src = src; img.hidden = false;
}
function updatePreview(){
  const title = $('#titleInput').value.trim() || 'Cím nélkül';
  const content = $('#contentInput').value || ''; const tags = $('#tagsInput').value.split(',').map(s=>s.trim()).filter(Boolean);
  const pinned = $('#pinnedInput').checked; const prev = $('#preview'); prev.innerHTML='';
  const img = document.querySelector('#preview img'); if (img) prev.appendChild(img);
  const body = document.createElement('div'); body.className='fb-post-body';
  body.innerHTML = `
    <header class="fb-post-header">
      <h3 class="fb-post-title">${esc(title)}</h3>
      <div class="fb-post-meta">
        <time class="fb-post-date">Előnézet</time>
        <span class="fb-pin" ${pinned ? '' : 'hidden'}>📌 rögzített</span>
      </div>
    </header>
    <div class="fb-post-content">${md(content)}</div>
    <footer class="fb-post-footer">
      <div class="fb-tags">${tags.map(t=>`<span class="fb-tag">${esc(t)}</span>`).join(' ')}</div>
    </footer>`;
  prev.appendChild(body);
}
function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleString('hu-HU', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function esc(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function md(src){
  let s = esc(src);
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  s = s.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  s = s.replace(/^(?:- |\* )(.*)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  s = s.split(/\n\n+/).map(p => { if (/^<h\d|^<ul>|^<pre>/.test(p)) return p; return `<p>${p.replace(/\n/g,'<br>')}</p>`; }).join('\n');
  return s;
}
window._blog = { state };
