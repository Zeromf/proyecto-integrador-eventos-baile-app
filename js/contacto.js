// Manejo del formulario (envío directo a WhatsApp)
const form = document.getElementById('form-contacto');

function buildWhatsAppHref() {
  const nombre = (document.getElementById('nombre')?.value || '').trim();
  const telefono = (document.getElementById('telefono')?.value || '').trim();
  const mensaje = (document.getElementById('mensaje')?.value || '').trim();

  const base = 'https://wa.me/541126060776';
  const texto = `Hola Flow Dance! Soy ${nombre || '...'} (${telefono || 'sin teléfono'}). ${mensaje || 'Quiero info de clases y horarios.'}`;
  return `${base}?text=${encodeURIComponent(texto)}`;
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const faltan = ['nombre','email','mensaje'].filter(k => !String(data[k]||'').trim());

  if (faltan.length){
    alert('Completá: ' + faltan.join(', '));
    return;
  }

  // abrir WhatsApp con el mensaje armado
  const url = buildWhatsAppHref();
  window.open(url, '_blank');

  form.reset();
});
