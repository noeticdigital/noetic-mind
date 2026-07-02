/* ───────────────────────────────────────────────────────────────────────────
   Noetic demo — single source of truth for the project switcher.

   Quench, Ledgerline and Moneytree Personal render their switchers from this
   list, so the cross-links between silos never go stale: change a project's
   name/sub here once and all update. KLPT (v3-klptproj.html) is a real-project learning surface edited
   elsewhere — it keeps its own hardcoded switcher for now and can adopt this
   file later. Keep its entry below in sync with its displayed name.
   ─────────────────────────────────────────────────────────────────────────── */
window.NOETIC_PROJECTS = [
  { id:'quench',     name:'Quench',             sub:'Daily hydration habit',       href:'v3.html' },
  { id:'ledgerline', name:'Ledgerline',         sub:'Bank-feed activation',        href:'v3-ledgerline.html' },
  { id:'klpt',       name:'KLPT',               sub:'Visual capture for learners', href:'v3-klptproj.html' },
  { id:'moneytree',  name:'Moneytree Personal', sub:'Stewardship, not data',       href:'v3-mtproj.html' },
];

window.renderProjMenu = function(currentId){
  const list = document.getElementById('projItems');
  if(!list || !window.NOETIC_PROJECTS) return;
  const check = '<svg class="po-check" width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  list.innerHTML = window.NOETIC_PROJECTS.map(function(p){
    return p.id === currentId
      ? '<button class="proj-opt active" role="menuitem" onclick="closeProjMenu()"><span class="proj-dot"></span><span class="po-txt"><b>'+p.name+'</b> · '+p.sub+'</span>'+check+'</button>'
      : '<a class="proj-opt" role="menuitem" href="'+p.href+'"><span class="proj-dot muted"></span><span class="po-txt"><b>'+p.name+'</b> · '+p.sub+'</span><span class="po-soon">demo</span></a>';
  }).join('');
};
