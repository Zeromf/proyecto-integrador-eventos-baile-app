// js/slider.js
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const $  = (sel, root = document) => root.querySelector(sel);

  const AUTO_MS = 6000;

  function initSlider(slider) {
    const track = $('.slides', slider);
    if (!track) return;

    const imgs  = $$('img', track);
    if (imgs.length === 0) return;

    const prev  = $('.slider-btn.prev', slider);
    const next  = $('.slider-btn.next', slider);
    const dotsC = $('.slider-dots', slider);

    // Overlay dinámico (solo para el héroe u otros con overlay)
    const container = slider.closest('.promo-image') || slider.parentElement;
    const ovTitle = container ? $('.promo-overlay .ov-title', container) : null;
    const ovSub   = container ? $('.promo-overlay .ov-sub', container)   : null;

    let index = 0;
    let timer = null;

    // Dots
    dotsC.innerHTML = '';
    imgs.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir a imagen ${i + 1}`);
      b.addEventListener('click', () => goTo(i, true));
      dotsC.appendChild(b);
    });
    const dots = $$('button', dotsC);

    function applyCaption() {
      if (!ovTitle || !ovSub) return;
      const img = imgs[index];
      ovTitle.textContent = img.dataset.title || '';
      ovSub.textContent   = img.dataset.sub   || '';
    }

    function update() {
        
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((d, i) => d.setAttribute('aria-current', i === index ? 'true' : 'false'));
      
      applyCaption();
    }

    function goTo(i, user = false) {
      index = (i + imgs.length) % imgs.length;
      update();
      if (user) restart();
    }

    function nextSlide(user = false) { goTo(index + 1, user); }
    function prevSlide(user = false) { goTo(index - 1, user); }

    function start() { timer = setInterval(nextSlide, AUTO_MS); }
    function stop()  { if (timer) clearInterval(timer); timer = null; }
    function restart(){ stop(); start(); }

    // Eventos
    if (next) next.addEventListener('click', () => nextSlide(true));
    if (prev) prev.addEventListener('click', () => prevSlide(true));

    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin',  stop);
    slider.addEventListener('focusout', start);

    // Swipe
    let x0 = null;
    slider.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const TH = 40;
      if (dx > TH)  prevSlide(true);
      if (dx < -TH) nextSlide(true);
      x0 = null;
    }, { passive: true });

    // Init
    update();
    start();

    // API mínima opcional
    slider._api = { next: nextSlide, prev: prevSlide, goTo, stop, start };
  }

  // Iniciar TODOS los sliders de la página
  $$('.slider').forEach(initSlider);
})();

