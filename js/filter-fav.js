// js/sociales-filter.js
(function () {
  // Activá solo en la página de "sociales"
  var IS_SOCIALES =
    /sociales\.html(\?|$)/i.test(location.pathname) ||
    (document.body && document.body.dataset && document.body.dataset.page === 'sociales');

  if (!IS_SOCIALES) return;

  // Filtro: social / sociales (en título o summary)
  var socialRegex = /\bsocial(es)?\b/i;
  function viewFilter(arr) {
    arr = Array.isArray(arr) ? arr : [];
    return arr.filter(function (e) {
      var title = (e && e.name && e.name.text) || '';
      var summary = (e && e.summary) || '';
      return socialRegex.test(title) || socialRegex.test(summary);
    });
  }

  // 1) Render inicial filtrado, apenas haya datos cargados
  if (window.jQuery) {
    jQuery(document).one('ajaxSuccess.sociales', function () {
      var all = (window._pagination && window._pagination.data) || [];
      var pageSize = (window._pagination && window._pagination.pageSize) || 6;
      if (window._pagination) window._pagination.page = 1;
      if (typeof window.renderEventos === 'function') {
        window.renderEventos(viewFilter(all), 1, pageSize);
      }
    });
  }

  // 2) Envolvemos renderEventos para que SIEMPRE aplique el filtro en esta pestaña
  var _origRender = window.renderEventos;
  if (typeof _origRender === 'function') {
    window.renderEventos = function (data, page, pageSize) {
      return _origRender.call(this, viewFilter(data), page, pageSize);
    };
  } else {
    // Si aún no existe, lo envolvemos cuando aparezca
    Object.defineProperty(window, 'renderEventos', {
      configurable: true,
      set: function (fn) {
        delete window.renderEventos;
        window.renderEventos = function (data, page, pageSize) {
          return fn.call(this, viewFilter(data), page, pageSize);
        };
      }
    });
  }

  // 3) (Opcional) Si tu flujo llama a buscarEventos y él mismo renderiza,
  // nuestro wrap de renderEventos ya mantiene el filtro. Igual dejamos el hook listo.
  var _origBuscar = window.buscarEventos;
  if (typeof _origBuscar === 'function') {
    window.buscarEventos = function () {
      return _origBuscar.apply(this, arguments);
    };
  } else {
    // Si aún no existe, lo enganchamos cuando aparezca (por compatibilidad)
    Object.defineProperty(window, 'buscarEventos', {
      configurable: true,
      set: function (fn) {
        delete window.buscarEventos;
        window.buscarEventos = function () {
          return fn.apply(this, arguments);
        };
      }
    });
  }
})();
