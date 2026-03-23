document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('input-email').value.trim();
    const msg   = document.getElementById('form-msg');
    const btn   = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Enviando...';
    msg.className = 'hidden text-sm rounded-lg px-4 py-3';

    try {
        const res  = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        msg.textContent = data.message;
        msg.className = 'text-sm rounded-lg px-4 py-3 bg-emerald-500/20 text-emerald-400';
        e.target.reset();
    } catch {
        msg.textContent = 'Error de conexión. Intenta de nuevo.';
        msg.className = 'text-sm rounded-lg px-4 py-3 bg-red-500/20 text-red-400';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar enlace';
    }
});
