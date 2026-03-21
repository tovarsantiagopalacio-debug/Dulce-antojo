document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user) {
        window.location.href = '/';
        return;
    }

    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const loadingMessage = document.getElementById('loading-message');
    const ordersList = document.getElementById('orders-list');

    if (welcomeMessage) welcomeMessage.textContent = `Hola, ${user.businessName}`;

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

    const statusConfig = {
        pendiente:  { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Pendiente' },
        completado: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Completado' },
        cancelado:  { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelado' },
    };

    const fetchMyOrders = async () => {
        try {
            const response = await fetch('/api/orders/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            if (!response.ok) throw new Error('Error al obtener pedidos');

            const orders = await response.json();
            loadingMessage.style.display = 'none';

            if (orders.length === 0) {
                ordersList.innerHTML = `
                    <div class="text-center py-20 text-gray-500">
                        <svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <p class="text-lg">Aún no has realizado ningún pedido.</p>
                        <a href="/" class="mt-4 inline-block text-emerald-400 hover:underline">Ver catálogo →</a>
                    </div>`;
                return;
            }

            orders.forEach(order => {
                const cfg = statusConfig[order.status] || statusConfig.pendiente;
                const productsList = order.products.map(p => `
                    <li class="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-0">
                        <span class="text-gray-300">${p.product ? p.product.name : 'Producto no disponible'}</span>
                        <span class="text-gray-400 text-sm">× ${p.quantity}
                            <span class="text-emerald-400 ml-2 font-medium">${p.product ? formatCurrency(p.product.price * p.quantity) : ''}</span>
                        </span>
                    </li>`).join('');

                const card = document.createElement('div');
                card.className = 'bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-lg';
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4 gap-4">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">${formatDate(order.orderDate)}</p>
                            <p class="text-xs text-gray-600 font-mono">ID: ${order._id}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-xl font-bold text-emerald-400 font-heading">${formatCurrency(order.totalAmount)}</p>
                            <span class="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color} capitalize">${cfg.label}</span>
                        </div>
                    </div>
                    <ul class="mt-2">${productsList}</ul>`;
                ordersList.appendChild(card);
            });

        } catch (error) {
            loadingMessage.textContent = `Error: ${error.message}`;
            loadingMessage.style.color = '#F87171';
        }
    };

    fetchMyOrders();
});
