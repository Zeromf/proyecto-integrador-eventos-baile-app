// Utilidad global y minimalista para manejar el loader
window.Loader = {
  show() {
    const el = document.getElementById('loader');
    if (el) el.hidden = false;
  },
  hide() {
    const el = document.getElementById('loader');
    if (el) el.hidden = true;
  },
  // envuelve promesas/async para mostrar/ocultar automáticamente
  wrap(promiseOrFn) {
    this.show();
    try {
      const p = (typeof promiseOrFn === 'function') ? promiseOrFn() : promiseOrFn;
      return Promise.resolve(p).finally(() => this.hide());
    } catch (e) {
      this.hide();
      throw e;
    }
  }
};

// Cierre de emergencia por si algo rompe
window.addEventListener('error', () => Loader.hide());
window.addEventListener('unhandledrejection', () => Loader.hide());
