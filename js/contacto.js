// js/contacto.js (versión simplificada)
(function () {
  const form = document.getElementById('form-contacto');
  if (!form) return;
  // ===== Refs cache =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const $nombre   = $('#nombre');
  const $apellido = $('#apellido');
  const $email    = $('#email');
  const $tel      = $('#telefono');
  const $mensaje  = $('#mensaje');

  const $mcNombre = $('#mc_nombre');
  const $mcTel    = $('#mc_tel');
  const $mcMail   = $('#mc_mail');
  const $mcMsg    = $('#mc_msg');

  const modalContacto = document.getElementById('modalContacto');
  const modalExito    = document.getElementById('modalExito');

  // === Validador nativo con mensaje en el campo Teléfono ===
const telInput = document.getElementById('telefono');
if (telInput) {
  const telMsg = 'Teléfono en formato incorrecto. Ingrese solo números y símbolos válidos (+ - ( ) . espacios)';
  const re = /^[0-9+()\-. \t\r\n]{6,}$/; // mismo patrón que el HTML (pattern)

  // Cada vez que escribe, limpiamos o seteamos el mensaje
  telInput.addEventListener('input', () => {
    if (telInput.value === '' || re.test(telInput.value)) {
      telInput.setCustomValidity('');
    } else {
      telInput.setCustomValidity(telMsg);
    }
  });

  // Por si llega inválido al submit, aseguramos el mensaje
  telInput.addEventListener('invalid', () => {
    if (telInput.value !== '' && !re.test(telInput.value)) {
      telInput.setCustomValidity(telMsg);
    } else {
      telInput.setCustomValidity('');
    }
  });
}
  // ===== Toast (solo lo usamos para success/info, no errores de validación) =====
  let toastT = null;
  function showFormToast(msg, type = 'success', ms = 2200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.classList.remove('show', 'error', 'success');
    // reinicia animación
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.textContent = msg;
    el.classList.add(type === 'error' ? 'error' : 'success', 'show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show', 'error', 'success'), ms);
  }

  // ===== Helpers: abrir/cerrar modal =====
  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  // Cerrar modal por backdrop o data-close (delegado)
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.matches('[data-close], .modalc__backdrop')) {
      const m = t.closest('.modalc') || document.querySelector('.modalc[aria-hidden="false"]');
      m && closeModal(m);
    }
  });

  // ===== WhatsApp URL =====
  function buildWhatsAppHref() {
    const base = 'https://wa.me/541126060776';
    const texto = [
      `Hola Flow Dance! Soy ${($nombre.value || '—').trim()} ${($apellido.value || '').trim()}`.trim(),
      $tel.value ? `Tel: ${$tel.value.trim()}` : '',
      `Email: ${($email.value || '—').trim()}`,
      '',
      ($mensaje.value || 'Quiero info de clases y horarios.').trim()
    ].join('\n');
    return `${base}?text=${encodeURIComponent(texto)}`;
  }

  // ===== Submit: SOLO validación nativa + modal confirmación =====
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // HTML5 validation (required, minlength, type=email, pattern=tel, title del tel)
    if (!form.checkValidity()) {
      form.reportValidity(); // muestra globitos en el campo
      return;
    }

    // Completar resumen en modal
    $mcNombre.textContent = [($nombre.value || '').trim(), ($apellido.value || '').trim()].filter(Boolean).join(' ') || '—';
    $mcTel.textContent    = ($tel.value || '').trim() || '—';
    $mcMail.textContent   = ($email.value || '').trim() || '—';
    $mcMsg.textContent    = ($mensaje.value || '').trim() || '—';

    openModal(modalContacto);
  });

  // ===== Confirmar envío (abre WhatsApp) =====
  $('#mc_enviar')?.addEventListener('click', () => {
    window.open(buildWhatsAppHref(), '_blank', 'noopener,noreferrer');
    closeModal(modalContacto);
    form.reset();
    openModal(modalExito);
    showFormToast('Abrimos WhatsApp con tu consulta 👌', 'success', 2200);
  });
})();
