const token = new URLSearchParams(window.location.search).get('token');
if (!token) {
    document.getElementById('reset-form').innerHTML =
        '<p class="text-red-400 text-center">Enlace inválido. <a href="/forgot-password" class="text-emerald-400 underline">Solicita uno nuevo</a>.</p>';
}

document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('input-password').value;
    const confirm     = document.getElementById('input-confirm').value;
    const msg         = document.getElementById('form-msg');
    const btn         = e.target.querySelector('button[type="submit"]');

    if (newPassword !== confirm) {
        msg.textContent = 'Las contraseñas no coinciden.';
        msg.className = 'text-sm rounded-lg px-4 py-3 bg-red-500/20 text-red-400';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';
    msg.className = 'hidden text-sm rounded-lg px-4 py-3';

    try {
        const res  = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });
        const data = await res.json();
        if (res.ok) {
            msg.textContent = data.message;
            msg.className = 'text-sm rounded-lg px-4 py-3 bg-emerald-500/20 text-emerald-400';
            setTimeout(() => { window.location.href = '/'; }, 2000);
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        msg.textContent = err.message || 'Error. Intenta de nuevo.';
        msg.className = 'text-sm rounded-lg px-4 py-3 bg-red-500/20 text-red-400';
        btn.disabled = false;
        btn.textContent = 'Guardar contraseña';
    }
});
