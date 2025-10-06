// public/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const ordersContainer = document.getElementById('orders-container');
    const loadingMessage = document.getElementById('loading-message');

    // Función para dar formato a la moneda
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            minimumFractionDigits: 0 
        }).format(amount);
    };

    // Función para dar formato a la fecha
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-CO', options);
    };

    // Función para obtener y mostrar los pedidos
    const fetchOrders = async () => {
        try {
            // Pedimos los pedidos a la nueva ruta del API que crearemos en server.js
            const response = await fetch('/api/admin/orders');
            
            if (!response.ok) {
                // Si la respuesta no es exitosa, podría ser un problema de permisos o de servidor
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo acceder a los pedidos.');
            }

            const orders = await response.json();
            loadingMessage.style.display = 'none';

            if (orders.length === 0) {
                ordersContainer.innerHTML = '<p class="text-center text-gray-500">Aún no se han realizado pedidos.</p>';
                return;
            }

            // Limpiamos el contenedor antes de agregar los nuevos pedidos
            ordersContainer.innerHTML = '';

            // Por cada pedido, creamos una tarjeta visual
            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-lg';

                // Creamos una lista de los productos del pedido
                const productsList = order.products.map(p => `
                    <li class="flex justify-between items-center py-2 border-b border-gray-600">
                        <span class="font-medium text-white">${p.product ? p.product.name : 'Producto no disponible'}</span>
                        <span class="text-gray-400">Cantidad: <strong class="text-emerald-400">${p.quantity}</strong></span>
                    </li>
                `).join('');

                orderCard.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-xl font-bold font-heading text-white">Pedido de: ${order.user ? order.user.businessName : 'Usuario desconocido'}</h2>
                            <p class="text-sm text-gray-500">${order.user ? order.user.email : ''}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold text-emerald-400">${formatCurrency(order.totalAmount)}</p>
                            <p class="text-xs text-gray-500">${formatDate(order.orderDate)}</p>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-md font-semibold mb-2 text-gray-300">Detalles del Pedido:</h3>
                        <ul class="list-none">
                            ${productsList}
                        </ul>
                    </div>
                `;
                ordersContainer.appendChild(orderCard);
            });

        } catch (error) {
            loadingMessage.textContent = `Error: ${error.message}`;
            loadingMessage.style.color = '#F87171'; // Rojo para errores
        }
    };

    // Llamamos a la función al cargar la página
    fetchOrders();
});