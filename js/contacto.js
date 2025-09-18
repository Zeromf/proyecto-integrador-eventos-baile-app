// js/contacto.js
(function () {
  const form = document.getElementById('form-contacto');
  if (!form) return;

  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const getVal = id => (document.getElementById(id)?.value || '').trim();

  // ====== Validación adicional ======
  function validarCampos() {
    const nombre = getVal('nombre');
    const email  = getVal('email');
    const tel    = getVal('telefono');
    const msg    = getVal('mensaje');

    // Validaciones básicas
    const faltan = [];
    if (nombre.length < 2) faltan.push('nombre');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) faltan.push('email válido');
    if (msg.length < 5) faltan.push('mensaje');

    // Tel opcional, pero si viene, debe ser "razonable"
    if (tel && !/^[0-9+()\-.\s]{6,}$/.test(tel)) {
      faltan.push('teléfono válido (opcional)');
    }

    return { ok: faltan.length === 0, faltan };
  }

  // ====== Armar mensaje de WhatsApp ======
  function buildWhatsAppHref() {
    const nombre = getVal('nombre');
    const apellido = getVal('apellido');
    const email = getVal('email');
    const tel = getVal('telefono');
    const mensaje = getVal('mensaje');

    const base = 'https://wa.me/541126060776';
    const texto = [
      `Hola Flow Dance! Soy ${nombre || '—'} ${apellido || ''}`.trim(),
      tel ? `Tel: ${tel}` : '',
      `Email: ${email || '—'}`,
      '',
      mensaje || 'Quiero info de clases y horarios.'
    ].join('\n');

    return `${base}?text=${encodeURIComponent(texto)}`;
  }

  // ====== Modal utilitario ======
  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    // Evitar scroll del body
    document.documentElement.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  // ====== Refs a modales ======
  const modalContacto = document.getElementById('modalContacto');
  const modalExito    = document.getElementById('modalExito');

  // Cerrar por backdrop / botones con data-close
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches('[data-close], .modalc__backdrop')) {
      const m = target.closest('.modalc') || document.querySelector('.modalc[aria-hidden="false"]');
      m && closeModal(m);
    }
  });

  // ====== Submit: validación + modal confirmación ======
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Dejá que el HTML5 marque errores primero
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const { ok, faltan } = validarCampos();
    if (!ok) {
      alert('Revisá: ' + faltan.join(', '));
      return;
    }

    // Completar resumen del modal
    $('#mc_nombre').textContent = [getVal('nombre'), getVal('apellido')].filter(Boolean).join(' ') || '—';
    $('#mc_tel').textContent    = getVal('telefono') || '—';
    $('#mc_mail').textContent   = getVal('email') || '—';
    $('#mc_msg').textContent    = getVal('mensaje') || '—';

    openModal(modalContacto);
  });

  // ====== Confirmar envío (abre WhatsApp) ======
  $('#mc_enviar')?.addEventListener('click', () => {
    const url = buildWhatsAppHref();
    // Abrimos WhatsApp en nueva pestaña
    window.open(url, '_blank', 'noopener,noreferrer');

    // Cerramos confirmación, mostramos éxito y reseteamos
    closeModal(modalContacto);
    form.reset();
    openModal(modalExito);
  });

})();
