/* =======================================================================
   Favoritos + Historial (LocalStorage)
   - Mantiene el corazón activo tras paginar y recargar
   - Cross-tab sync (si abrís otra pestaña)
   - Drawer accesible con barrita de scroll flotante historial y favoritos
   ======================================================================= */

(function ($) {
  /* =======================
     Claves de LocalStorage
     ======================= */
  const LS_KEYS = {
    FAVS: 'flowdance:favoritos',
    FAV_ITEMS: 'flowdance:favoritos_items', // [ {id,title,date,place,url,img,savedAt}, ... ]
    HIST: 'flowdance:historial'
  };
  window.LS_KEYS = LS_KEYS;

  // Asegura un FALLBACK_IMAGES.default si no está definido en otro archivo
  const DEFAULT_FALLBACK = "https://via.placeholder.com/1200x675?text=Evento";
  const FALLBACK_IMAGES_SAFE = (typeof FALLBACK_IMAGES !== 'undefined' && FALLBACK_IMAGES)
    ? { default: FALLBACK_IMAGES.default || DEFAULT_FALLBACK, ...FALLBACK_IMAGES }
    : { default: DEFAULT_FALLBACK };

  /* ==============
     Mini Store LS
     ============== */
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
  window.Store = Store;

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
      img: (evt?.logo?.url || FALLBACK_IMAGES_SAFE.default),
      savedAt: Date.now()
    };
  }

  /* ===== Historial: add ===== */
  function addToHistorialById(id){
    const s = String(id);
    const arr = (window._pagination?.data || []);
    const evt = arr.find(e => String(e.id) === s);
    if (!evt) return;
    Store.upsertArr(LS_KEYS.HIST, mapEvt(evt), 'id', 50);
  }
  window.addToHistorialById = addToHistorialById;

  /* ===== Render de listas mini (para favoritos/historial) ===== */
  /* ===== Render de listas mini (para favoritos/historial) ===== */
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
        <!-- Antes: <a href="..." target="_blank"> -->
        <!-- Ahora: botón que abre el modal del evento -->
        <button class="icon-btn btn-detalle" data-id="${it.id}" title="Ver detalle del evento">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>

        <button class="icon-btn fav-btn ${Store.hasId(LS_KEYS.FAVS, it.id) ? 'is-fav' : ''}"
                data-id="${it.id}" title="Alternar favorito" aria-pressed="${Store.hasId(LS_KEYS.FAVS, it.id)}">
          <i class="${Store.hasId(LS_KEYS.FAVS, it.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
      </div>
    </div>
  `).join('');
  $container.html(html);
}


  /* ===== Favoritos ===== */
  function renderFavoritos(){
    const favIds = Store.get(LS_KEYS.FAVS, []).map(String);
    const favObjs = Store.get(LS_KEYS.FAV_ITEMS, []);
    const byId = Object.fromEntries(favObjs.map(o => [String(o.id), o]));

    const items = favIds.map(id => {
      if (byId[id]) return byId[id];
      const evt = (window._pagination?.data || []).find(e => String(e.id) === id);
      if (evt) {
        const m = mapEvt(evt);
        Store.upsertArr(LS_KEYS.FAV_ITEMS, m, 'id', 200);
        return m;
      }
      return { id, title:`Evento ${id}`, date:'—', place:'—', url:'#', img:FALLBACK_IMAGES_SAFE.default, savedAt: Date.now() };
    });

    renderList($("#favoritosList"), items);
  }
  window.renderFavoritos = renderFavoritos;

  /* ===== Historial (render + limpiar) ===== */
  $(document).on("click", "#clearHistorial", function(e){
    e.preventDefault();
    Store.set(LS_KEYS.HIST, []);
    renderHistorial();
    showSnack("Historial eliminado", "success");
  });

  function renderHistorial(){
    const items = Store.get(LS_KEYS.HIST, []);
    renderList($("#historialList"), items);

    // refrescar estado de favoritos en historial
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
  window.renderHistorial = renderHistorial;

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
  window.Drawer = Drawer;

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
  window.showSnack = showSnack;

  /* ======================================================
     Barra de scroll flotante SOLO para #drawerHistorial
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

      const ratio  = vh / (h || 1);
      const tH     = Math.max(24, Math.round(vh * ratio));
      const maxTop = Math.max(0, vh - tH);
      const top    = (h > vh) ? Math.round((st / (h - vh)) * maxTop) : 0;

      thumb.style.height = tH + 'px';
      thumb.style.transform = `translateY(${top}px)`;
    };

    refresh();

    const onScroll = () => {
      drawerEl.classList.add('show-scroll');
      refresh();
      clearTimeout(body._scrollT);
      body._scrollT = setTimeout(() => drawerEl.classList.remove('show-scroll'), 300);
    };

    body.removeEventListener('scroll', onScroll);
    body.addEventListener('scroll', onScroll);
    window.addEventListener('resize', refresh);

    drawerEl._refreshScrollbar = refresh;
  }
  window.initDrawerScrollbar = initDrawerScrollbar;

  /* ======================================================
     Sincronización visual de favoritos en tarjetas (♥)
     ====================================================== */
  function syncFavIcons(root = document) {
    const $scope = root === document ? $(document) : $(root);
    $scope.find('.fav-btn').each(function () {
      const id = String($(this).data('id') ?? $(this).attr('data-id'));
      if (!id) return;
      const isFav = Store.hasId(LS_KEYS.FAVS, id);
      $(this)
        .toggleClass('is-fav', isFav)
        .attr('aria-pressed', isFav ? 'true' : 'false')
        .attr('title', isFav ? 'Quitar de favoritos' : 'Agregar a favoritos')
        .find('i')
        .toggleClass('fa-solid', isFav)
        .toggleClass('fa-regular', !isFav);
    });
  }
  window.syncFavIcons = syncFavIcons;

  // Envolver renderEventos si existe, para sincronizar luego de cada render
  if (typeof window.renderEventos === 'function' && !window.renderEventos.__wrapped) {
    const __origRenderEventos = window.renderEventos;
    window.renderEventos = function (...args) {
      const res = __origRenderEventos.apply(this, args);
      requestAnimationFrame(() => syncFavIcons());
      return res;
    };
    window.renderEventos.__wrapped = true;
  }

  // Al cargar la página, sincronizar por si ya hay cards
  $(document).ready(() => {
    syncFavIcons();
  });

  // Si tenés botones de paginación, sincroniza después de usarlos
  $(document).on('click', '.btn-next, .btn-prev, [data-page]', function () {
    requestAnimationFrame(() => syncFavIcons());
  });

  /* =======================
     Listeners globales
     ======================= */
  // Alternar favorito (desde tarjetas y mini-listas, incluso historial)
  $(document).on("click", ".fav-btn", function(e){
    e.preventDefault();
    const id = String($(this).attr("data-id") ?? $(this).data("id"));
    if (!id) return;

    const nowFavs = Store.toggleId(LS_KEYS.FAVS, id);
    const isFav = nowFavs.includes(id);

    if (isFav) {
      const evt = (window._pagination?.data || []).find(e => String(e.id) === id);
      if (evt) {
        Store.upsertArr(LS_KEYS.FAV_ITEMS, mapEvt(evt), 'id', 200);
      } else {
        Store.upsertArr(LS_KEYS.FAV_ITEMS, { id, title:`Evento ${id}`, date:'—', place:'—', url:'#', img:FALLBACK_IMAGES_SAFE.default, savedAt: Date.now() }, 'id', 200);
      }
    } else {
      Store.removeById(LS_KEYS.FAV_ITEMS, id, 'id');
    }

    $(this)
      .attr("aria-pressed", isFav)
      .toggleClass("is-fav", isFav)
      .attr("title", isFav ? "Quitar de favoritos" : "Agregar a favoritos")
      .find("i").toggleClass("fa-solid", isFav).toggleClass("fa-regular", !isFav);

    renderFavoritos();
    if ($("#drawerHistorial[aria-hidden='false']").length) renderHistorial();
    syncFavIcons();
    showSnack(isFav ? "Se añadió a favoritos" : "Se quitó de favoritos", isFav ? "success" : "error");
  });

  // Guardar en historial y abrir modal de detalle (si existe esa función global)
$(document).on("click", ".btn-detalle", function (e) {
  e.preventDefault();
  const id = String($(this).data("id") ?? $(this).attr("data-id"));
  if (!id) return;

  addToHistorialById(id);

  // Si hay un drawer abierto, cerralo para quitar su overlay oscuro
  const $openDrawer = $(".drawer[aria-hidden='false']");
  if ($openDrawer.length) {
    Drawer.close("#" + $openDrawer.attr("id"));
  }

  // Ahora abrí el modal del evento
  if (typeof abrirDetalleEvento === "function") abrirDetalleEvento(id);
});


 // Botones del header (delegado)
$(document).off("click", "#btnFavoritos").on("click", "#btnFavoritos", function (e) {
  e.preventDefault();
  renderFavoritos();
  Drawer.open("#drawerFavoritos", this);
});
$(document).off("click", "#btnHistorial").on("click", "#btnHistorial", function (e) {
  e.preventDefault();
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

  /* =======================
     Cross-tab: refleja cambios de favoritos/historial
     ======================= */
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEYS.FAVS || e.key === LS_KEYS.FAV_ITEMS) {
      renderFavoritos();
      syncFavIcons();
      if ($("#drawerHistorial[aria-hidden='false']").length) renderHistorial();
    }
    if (e.key === LS_KEYS.HIST) {
      if ($("#drawerHistorial[aria-hidden='false']").length) renderHistorial();
    }
  });

})(window.jQuery);
