/* =======================
   Favoritos + Historial (LocalStorage)
   ======================= */
const LS_KEYS = {
  FAVS: 'flowdance:favoritos',
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
  }
};

/* ===== Mapeo compacto de evento para listas ===== */
function mapEvt(evt){
  const lugar = evt?.venue?.address?.localized_address_display || "Online / Sin dirección";
  const fecha = formatDateTime(evt?.start?.local || evt?.start?.utc);
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
        <button class="icon-btn fav-btn ${Store.hasId(LS_KEYS.FAVS, it.id) ? 'is-fav' : ''}" data-id="${it.id}" title="Alternar favorito">
          <i class="${Store.hasId(LS_KEYS.FAVS, it.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
      </div>
    </div>
  `).join('');
  $container.html(html);
}

function renderFavoritos(){
  const favIds = Store.get(LS_KEYS.FAVS, []).map(String);
  const items = favIds.map(id => {
    const evt = (window._pagination?.data || []).find(e => String(e.id) === id);
    return evt ? mapEvt(evt) : { id, title:`Evento ${id}`, date:'—', place:'—', url:'#', img:FALLBACK_IMAGES?.default };
  });
  renderList($("#favoritosList"), items);
}

function renderHistorial(){
  renderList($("#historialList"), Store.get(LS_KEYS.HIST, []));
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

  $(this)
    .attr("aria-pressed", isFav)
    .toggleClass("is-fav", isFav)
    .attr("title", isFav ? "Quitar de favoritos" : "Agregar a favoritos")
    .find("i").toggleClass("fa-solid", isFav).toggleClass("fa-regular", !isFav);

  if ($("#drawerFavoritos[aria-hidden='false']").length) renderFavoritos();

  showSnack(isFav ? "Se añadió a favoritos" : "Se quitó de favoritos", isFav ? "success" : "error");
  setTimeout(() => {
    // Si tenías un modal de favoritos abierto, podrías cerrarlo aquí:
    // closeFavModal?.();
  }, 1600);
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
