/* =======================
   Favoritos + Historial (LocalStorage) – FIX cross-tab
   ======================= */
const LS_KEYS = {
  FAVS: 'flowdance:favoritos',           // [ "123", "456", ... ]
  FAV_ITEMS: 'flowdance:favoritos_items',// [ {id,title,date,place,url,img,savedAt}, ... ]
  HIST: 'flowdance:historial'
};

const Store = {
  get(key, fb = []) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } },
  set(key, val)     { localStorage.setItem(key, JSON.stringify(val)); },

  hasId(key, id) {
    const s = String(id);
    const arr = Store.get(key, []).map(String);
    return arr.includes(s);
  },

  toggleId(key, id) {
    const s = String(id);
    let arr = Store.get(key, []).map(String);
    if (arr.includes(s)) arr = arr.filter(x => x !== s); else arr.unshift(s);
    Store.set(key, arr);
    return arr; // strings
  },

  upsertArr(key, item, by = 'id', max = 50) {
    const arr = Store.get(key, []);
    const sItem = { ...item, [by]: String(item[by]) };
    const i = arr.findIndex(x => String(x[by]) === String(sItem[by]));
    if (i >= 0) arr[i] = sItem; else arr.unshift(sItem);
    if (max && arr.length > max) arr.length = max;
    Store.set(key, arr);
    return arr;
  },

  removeById(key, id, by = 'id') {
    const arr = Store.get(key, []);
    const out = arr.filter(x => String(x[by]) !== String(id));
    Store.set(key, out);
    return out;
  }
};

/* ===== Helpers ===== */
function formatDateTimeSafe(dt) {
  try {
    const d = new Date(dt);
    if (isNaN(d)) return '—';
    return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return '—'; }
}

/* ===== Mapeo compacto de evento ===== */
function mapEvt(evt){
  const lugar = evt?.venue?.address?.localized_address_display || "Online / Sin dirección";
  const fecha = formatDateTimeSafe(evt?.start?.local || evt?.start?.utc);
  return {
    id: String(evt?.id),
    title: evt?.name?.text || 'Evento',
    date: fecha,
    place: lugar,
    url: evt?.url || '#',
    img: (evt?.logo?.url || FALLBACK_IMAGES?.default || "https://via.placeholder.com/1200x675?text=Evento"),
    savedAt: Date.now()
  };
}

/* ===== Historial ===== */
function addToHistorialById(id){
  const s = String(id);
  const arr = (window._pagination?.data || []);
  const evt = arr.find(e => String(e.id) === s);
  if (!evt) return;
  Store.upsertArr(LS_KEYS.HIST, mapEvt(evt), 'id', 50);
}

/* ===== Render de listas mini ===== */
function renderList($container, items){
  if (!$container?.length) return;
  if (!items?.length) return $container.html('<p class="empty">Nada por aquí…</p>');

  const html = items.map(it => `
    <div class="mini-card">
      <img src="${it.img}" alt="${it.title}">
      <div>
        <h4>${it.title}</h4>
        <div class="meta">🗓️ ${it.date} · 📍 ${it.place}</div>
      </div>
      <div class="actions">
        <a class="icon-btn" href="${it.url}" target="_blank" rel="noopener" title="Ver en Eventbrite">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
        <button class="icon-btn fav-btn ${Store.hasId(LS_KEYS.FAVS, it.id) ? 'is-fav' : ''}" data-id="${it.id}" title="Alternar favorito" aria-pressed="${Store.hasId(LS_KEYS.FAVS, it.id)}">
          <i class="${Store.hasId(LS_KEYS.FAVS, it.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
      </div>
    </div>
  `).join('');
  $container.html(html);
}


/* ===== Favoritos (lee del store de objetos, no del paginador) ===== */
function renderFavoritos(){
  const favIds = Store.get(LS_KEYS.FAVS, []).map(String);
  const favObjs = Store.get(LS_KEYS.FAV_ITEMS, []);

  // Indexar objetos por id para acceso rápido
  const byId = Object.fromEntries(favObjs.map(o => [String(o.id), o]));

  // Armar lista en el orden de favIds, con fallback si falta el objeto
  const items = favIds.map(id => {
    if (byId[id]) return byId[id];

    // Fallback: intentar reconstruir desde _pagination.data
    const evt = (window._pagination?.data || []).find(e => String(e.id) === id);
    if (evt) {
      const m = mapEvt(evt);

      Store.upsertArr(LS_KEYS.FAV_ITEMS, m, 'id', 200);
      return m;
    }
    // Placeholder si no hay data
    return { id, title:`Evento ${id}`, date:'—', place:'—', url:'#', img:FALLBACK_IMAGES?.default || '' };
  });

  renderList($("#favoritosList"), items);
}


// Vaciar todo el historial
$(document).on("click", "#clearHistorial", function(e){
  e.preventDefault();
  Store.set(LS_KEYS.HIST, []);     // limpia el localStorage
  renderHistorial();               // refresca la vista
  showSnack("Historial eliminado", "success");
});



function renderHistorial(){
  const items = Store.get(LS_KEYS.HIST, []);
  renderList($("#historialList"), items, "hist"); // 👈 ahora con "hist"

  // refrescar estado de favoritos en historial (se mantiene igual)
  $("#historialList .fav-btn").each(function(){
    const id = String($(this).data("id"));
    const isFav = Store.hasId(LS_KEYS.FAVS, id);
    $(this)
      .toggleClass("is-fav", isFav)
      .attr("aria-pressed", isFav)
      .find("i").toggleClass("fa-solid", isFav).toggleClass("fa-regular", !isFav);
  });

  const dr = document.querySelector("#drawerHistorial");
  if (dr && typeof dr._refreshScrollbar === "function") dr._refreshScrollbar();
}

/* =======================
   Drawer accesible + Header state
   ======================= */
let __lastDrawerTrigger = null;

const Drawer = {
  open(sel, trigger){
    const $d = $(sel), $o = $d.next(".drawer-overlay");
    __lastDrawerTrigger = trigger || __lastDrawerTrigger || document.activeElement;
    $d.attr("aria-hidden","false");
    $o.removeAttr("hidden");
    document.body.classList.add("no-scroll");

    if (sel === "#drawerFavoritos") setFavHeaderActive(true);
    if (sel === "#drawerHistorial") setHistHeaderActive(true);

    const $close = $d.find("[data-close]")[0] || $d.find("button,a,input,select,textarea")[0];
    if ($close) $close.focus();

    // 👉 Barrita de scroll SOLO para Historial
    if (sel === "#drawerHistorial") {
      initDrawerScrollbar($d[0]);
    }
  },
  close(sel){
    const $d = $(sel), $o = $d.next(".drawer-overlay");
    if (__lastDrawerTrigger && document.contains(__lastDrawerTrigger)) {
      __lastDrawerTrigger.focus();
    }
    $d.attr("aria-hidden","true");
    $o.attr("hidden", true);
    document.body.classList.remove("no-scroll");

    if (sel === "#drawerFavoritos") setFavHeaderActive(false);
    if (sel === "#drawerHistorial") setHistHeaderActive(false);
  }
};

function setFavHeaderActive(active){
  const $b = $("#btnFavoritos");
  const $i = $b.find("i");
  $b.toggleClass("active", !!active).attr("aria-pressed", active ? "true" : "false");
  $i.toggleClass("fa-solid", !!active).toggleClass("fa-regular", !active);
}
function setHistHeaderActive(active){
  const $b = $("#btnHistorial");
  $b.toggleClass("active", !!active).attr("aria-pressed", active ? "true" : "false");
}

/* =======================
   Snackbar
   ======================= */
function showSnack(msg, type = "success", timeout = 2300){
  const $sn = $("#snackbar");
  if (!$sn.length) return;
  $sn.toggleClass("error", type === "error");
  const icon = type === "success" ? "✔" : "✖";
  $sn.html(`<span class="icon">${icon}</span>${msg}`);

  $sn.removeClass("show");
  void $sn[0].offsetWidth;
  $sn.addClass("show");

  if (showSnack._t) clearTimeout(showSnack._t);
  showSnack._t = setTimeout(() => $sn.removeClass("show"), timeout + 300);
}

/* =======================
   Listeners: favoritos / historial / drawers
   ======================= */
// Alternar favorito (desde tarjetas y mini-listas)
$(document).on("click", ".fav-btn", function(e){
  e.preventDefault();
  const id = String($(this).attr("data-id") ?? $(this).data("id"));
  if (!id) return;

  const nowFavs = Store.toggleId(LS_KEYS.FAVS, id);
  const isFav = nowFavs.includes(id);

  // Si se añadió, persistir objeto compacto del evento;
  // si se quitó, borrar el objeto.
  if (isFav) {
    // buscar en data viva (si existe) para guardar snapshot
    const evt = (window._pagination?.data || []).find(e => String(e.id) === id);
    if (evt) {
      Store.upsertArr(LS_KEYS.FAV_ITEMS, mapEvt(evt), 'id', 200);
    } else {
      // si no está en el paginador, mantenemos al menos un registro mínimo
      Store.upsertArr(LS_KEYS.FAV_ITEMS, { id, title:`Evento ${id}`, date:'—', place:'—', url:'#', img:FALLBACK_IMAGES?.default || '', savedAt: Date.now() }, 'id', 200);
    }
  } else {
    Store.removeById(LS_KEYS.FAV_ITEMS, id, 'id');
  }

  $(this)
    .attr("aria-pressed", isFav)
    .toggleClass("is-fav", isFav)
    .attr("title", isFav ? "Quitar de favoritos" : "Agregar a favoritos")
    .find("i").toggleClass("fa-solid", isFav).toggleClass("fa-regular", !isFav);

  if ($("#drawerFavoritos[aria-hidden='false']").length) renderFavoritos();
  if ($("#drawerHistorial[aria-hidden='false']").length) renderHistorial();

  showSnack(isFav ? "Se añadió a favoritos" : "Se quitó de favoritos", isFav ? "success" : "error");
});

// Guardar en historial y abrir modal de detalle (si existe esa función global)
$(document).on("click", ".btn-detalle", function(e){
  e.preventDefault();
  const id = String($(this).attr("data-id") ?? $(this).data("id"));
  if (!id) return;
  addToHistorialById(id);
  if (typeof abrirDetalleEvento === "function") abrirDetalleEvento(id);
});

// Botones del header
$("#btnFavoritos").off("click").on("click", function(){
  renderFavoritos();
  Drawer.open("#drawerFavoritos", this);
});
$("#btnHistorial").off("click").on("click", function(){
  renderHistorial();
  Drawer.open("#drawerHistorial", this);
});

// Cerrar drawer por botón/overlay
$(document).on("click", "[data-close]", function(){
  const sel = $(this).data("close");
  if (sel) Drawer.close(sel);
});

// Cerrar con ESC
$(document).on("keydown", function(e){
  if (e.key === "Escape") {
    $(".drawer[aria-hidden='false']").each(function(){
      Drawer.close("#" + this.id);
    });
  }
});

/* ======================================================
   Barra de scroll flotante SOLO para #drawerHistorial
   (necesita CSS: .drawer-scrollbar y .drawer-scrollbar__thumb)
   ====================================================== */
function initDrawerScrollbar(drawerEl){
  if (!drawerEl) return;
  const body = drawerEl.querySelector('.drawer-body');
  if (!body) return;

  // crear contenedor si no existe
  let track = drawerEl.querySelector('.drawer-scrollbar');
  if (!track){
    track = document.createElement('div');
    track.className = 'drawer-scrollbar';
    track.innerHTML = '<div class="drawer-scrollbar__thumb"></div>';
    drawerEl.appendChild(track);
  }
  const thumb = track.querySelector('.drawer-scrollbar__thumb');

  // función para actualizar tamaño/posición
  const refresh = () => {
    const h  = body.scrollHeight;
    const vh = body.clientHeight;
    const st = body.scrollTop;

    // altura del pulgar (mínimo 24px)
    const ratio  = vh / (h || 1);
    const tH     = Math.max(24, Math.round(vh * ratio));
    const maxTop = Math.max(0, vh - tH);
    const top    = (h > vh) ? Math.round((st / (h - vh)) * maxTop) : 0;

    thumb.style.height = tH + 'px';
    thumb.style.transform = `translateY(${top}px)`;
  };

  refresh();

  // listeners (scroll / resize)
  const onScroll = () => {
    drawerEl.classList.add('show-scroll');
    refresh();
    clearTimeout(body._scrollT);
    body._scrollT = setTimeout(() => drawerEl.classList.remove('show-scroll'), 300);
  };

  body.removeEventListener('scroll', onScroll);
  body.addEventListener('scroll', onScroll);
  window.addEventListener('resize', refresh);

  // exponer para recalcular cuando se renderiza la lista
  drawerEl._refreshScrollbar = refresh;
}
