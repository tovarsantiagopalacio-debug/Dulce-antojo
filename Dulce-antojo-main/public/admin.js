document.addEventListener('DOMContentLoaded', () => {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const token = localStorage.getItem('authToken');
    const user  = JSON.parse(localStorage.getItem('user'));
    if (!token || !user || user.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // ── Helpers ─────────────────────────────────────────────────────────────
    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    const statusColors = {
        pendiente:  'bg-yellow-500/20 text-yellow-400',
        completado: 'bg-emerald-500/20 text-emerald-400',
        cancelado:  'bg-red-500/20 text-red-400',
    };

    // ── TABS ────────────────────────────────────────────────────────────────
    const tabPedidos   = document.getElementById('tab-pedidos');
    const tabProductos = document.getElementById('tab-productos');
    const panelPedidos   = document.getElementById('panel-pedidos');
    const panelProductos = document.getElementById('panel-productos');

    const activarTab = (tabActivo, panelActivo, tabInactivo, panelInactivo) => {
        tabActivo.setAttribute('aria-selected', 'true');
        tabActivo.classList.add('admin-tab-active');
        tabInactivo.setAttribute('aria-selected', 'false');
        tabInactivo.classList.remove('admin-tab-active');
        panelActivo.classList.remove('hidden');
        panelInactivo.classList.add('hidden');
    };

    tabPedidos.addEventListener('click', () => {
        activarTab(tabPedidos, panelPedidos, tabProductos, panelProductos);
    });

    tabProductos.addEventListener('click', () => {
        activarTab(tabProductos, panelProductos, tabPedidos, panelPedidos);
        if (!productosLoaded) fetchProducts();
    });

    // ── PEDIDOS ─────────────────────────────────────────────────────────────
    const loadingMessage   = document.getElementById('loading-message');
    const ordersContainer  = document.getElementById('orders-container');
    const dateLabel        = document.getElementById('date-label');
    const btnHoy           = document.getElementById('btn-hoy');
    const btnAyer          = document.getElementById('btn-ayer');
    const datePicker       = document.getElementById('date-picker');
    const btnExportar      = document.getElementById('btn-exportar-excel');

    // Fecha seleccionada actualmente (YYYY-MM-DD)
    const toLocalDateStr = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    let selectedDate = toLocalDateStr(new Date()); // hoy por defecto

    const setDateFilter = (dateStr, activeBtn) => {
        selectedDate = dateStr;
        datePicker.value = dateStr;
        [btnHoy, btnAyer].forEach(b => b?.classList.remove('date-filter-active'));
        activeBtn?.classList.add('date-filter-active');
        fetchOrders();
    };

    btnHoy?.addEventListener('click', () => setDateFilter(toLocalDateStr(new Date()), btnHoy));
    btnAyer?.addEventListener('click', () => {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        setDateFilter(toLocalDateStr(ayer), btnAyer);
    });
    datePicker?.addEventListener('change', (e) => {
        [btnHoy, btnAyer].forEach(b => b?.classList.remove('date-filter-active'));
        setDateFilter(e.target.value, null);
    });

    btnExportar?.addEventListener('click', () => {
        if (!selectedDate) return;
        const url = `/api/admin/orders/export?date=${selectedDate}`;
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `pedidos-${selectedDate}.xlsx`);
        // añadir el token en la URL no es posible directamente; usamos fetch con blob
        fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                a.href = blobUrl;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 1000);
            })
            .catch(() => alert('Error al exportar el Excel.'));
    });

    const fetchOrders = async () => {
        loadingMessage.style.display = 'block';
        ordersContainer.innerHTML = '';
        try {
            const url = selectedDate ? `/api/admin/orders?date=${selectedDate}` : '/api/admin/orders';
            const response = await fetch(url, { headers: authHeaders() });
            if (response.status === 403) {
                loadingMessage.textContent = 'Acceso denegado. Solo administradores.';
                loadingMessage.style.color = '#F87171';
                return;
            }
            if (response.status === 401) {
                loadingMessage.textContent = 'Tu sesión ha expirado. Inicia sesión de nuevo.';
                loadingMessage.style.color = '#FBBF24';
                return;
            }
            if (!response.ok) throw new Error('No se pudo acceder a los pedidos.');

            const orders = await response.json();
            loadingMessage.style.display = 'none';

            // Label de fecha
            if (dateLabel && selectedDate) {
                const d = new Date(selectedDate + 'T12:00:00');
                dateLabel.textContent = `${orders.length} pedido(s) — ${d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
            }

            if (orders.length === 0) {
                ordersContainer.innerHTML = '<p class="text-center text-gray-500 py-10">No hay pedidos para este día.</p>';
                return;
            }

            ordersContainer.innerHTML = '';
            orders.forEach(order => {
                const statusColor = statusColors[order.status] || statusColors.pendiente;
                const productsList = order.products.map(p => `
                    <li class="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                        <span class="font-medium text-white">${p.product ? p.product.name : 'Producto no disponible'}</span>
                        <span class="text-gray-400">× <strong class="text-emerald-400">${p.quantity}</strong></span>
                    </li>`).join('');

                const card = document.createElement('div');
                card.className = 'bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-lg';
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4 gap-4 flex-wrap">
                        <div>
                            <h2 class="text-lg font-bold font-heading text-white">
                                ${order.user ? order.user.businessName : 'Usuario desconocido'}
                            </h2>
                            <p class="text-sm text-gray-500">${order.user ? order.user.email : ''}</p>
                            <p class="text-xs text-gray-600 mt-1">${formatDate(order.orderDate)}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-xl font-bold text-emerald-400">${formatCurrency(order.totalAmount)}</p>
                            <span class="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColor} capitalize">
                                ${order.status || 'pendiente'}
                            </span>
                            <div class="mt-2">
                                <select class="status-select text-xs bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none"
                                    data-order-id="${order._id}">
                                    <option value="pendiente"  ${order.status === 'pendiente'  ? 'selected' : ''}>Pendiente</option>
                                    <option value="completado" ${order.status === 'completado' ? 'selected' : ''}>Completado</option>
                                    <option value="cancelado"  ${order.status === 'cancelado'  ? 'selected' : ''}>Cancelado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <ul>${productsList}</ul>`;
                ordersContainer.appendChild(card);
            });

            // Escuchar cambios de estado
            ordersContainer.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const orderId = e.target.dataset.orderId;
                    const newStatus = e.target.value;
                    try {
                        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                            method: 'PATCH',
                            headers: authHeaders(),
                            body: JSON.stringify({ status: newStatus })
                        });
                        if (!res.ok) throw new Error();
                        // Actualizar badge visualmente
                        const badge = e.target.closest('[class*="text-right"]').querySelector('span');
                        if (badge) {
                            badge.className = `inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[newStatus] || ''} capitalize`;
                            badge.textContent = newStatus;
                        }
                    } catch {
                        alert('Error al actualizar el estado. Intenta de nuevo.');
                        e.target.value = order.status; // revertir
                    }
                });
            });

        } catch (error) {
            if (loadingMessage) {
                loadingMessage.textContent = `Error: ${error.message}`;
                loadingMessage.style.color = '#F87171';
            }
        }
    };

    datePicker.value = selectedDate;
    fetchOrders();

    // ── PRODUCTOS ────────────────────────────────────────────────────────────
    let productosLoaded = false;
    const productsLoading        = document.getElementById('products-loading');
    const productsTableContainer = document.getElementById('products-table-container');
    const productsTbody          = document.getElementById('products-tbody');

    const fetchProducts = async () => {
        productsLoading.style.display = 'block';
        productsTableContainer.classList.add('hidden');
        try {
            const res = await fetch('/api/admin/products', { headers: authHeaders() });
            if (!res.ok) throw new Error('Error al cargar productos');
            const products = await res.json();
            productsLoading.style.display = 'none';
            productsTableContainer.classList.remove('hidden');
            renderProductsTable(products);
            productosLoaded = true;
        } catch (err) {
            productsLoading.textContent = `Error: ${err.message}`;
            productsLoading.style.color = '#F87171';
        }
    };

    const renderProductsTable = (products) => {
        productsTbody.innerHTML = '';
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-800/40 transition-colors';
            tr.innerHTML = `
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <img src="${p.image}" alt="${p.name}" class="w-10 h-10 rounded-lg object-cover bg-gray-800"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/>'">
                        <span class="font-medium text-white">${p.name}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-gray-400">${p.category}</td>
                <td class="px-4 py-3 text-emerald-400 font-medium">${formatCurrency(p.price)}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${p.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}">
                        ${p.active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button class="btn-editar text-blue-400 hover:text-blue-300 text-xs font-medium transition"
                        data-id="${p._id}">Editar</button>
                    <button class="btn-toggle text-xs font-medium transition ${p.active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}"
                        data-id="${p._id}" data-active="${p.active}">
                        ${p.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                </td>`;
            productsTbody.appendChild(tr);
        });

        // Botones editar
        productsTbody.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.id;
                const product = products.find(p => p._id === productId);
                if (product) abrirModal(product);
            });
        });

        // Botones toggle activo/inactivo
        productsTbody.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const productId  = btn.dataset.id;
                const activeNow  = btn.dataset.active === 'true';
                const accion     = activeNow ? 'desactivar' : 'reactivar';
                if (!confirm(`¿Seguro que quieres ${accion} este producto?`)) return;
                try {
                    const res = await fetch(`/api/admin/products/${productId}`, {
                        method: 'PUT',
                        headers: authHeaders(),
                        body: JSON.stringify({ active: !activeNow })
                    });
                    if (!res.ok) throw new Error();
                    fetchProducts(); // recargar tabla
                } catch {
                    alert(`Error al ${accion} el producto.`);
                }
            });
        });
    };

    // ── MODAL ────────────────────────────────────────────────────────────────
    const overlay        = document.getElementById('modal-overlay-producto');
    const modalTitulo    = document.getElementById('modal-titulo');
    const formProducto   = document.getElementById('form-producto');
    const inputId        = document.getElementById('input-id');
    const inputNombre    = document.getElementById('input-nombre');
    const inputCategoria = document.getElementById('input-categoria');
    const inputDesc      = document.getElementById('input-descripcion');
    const inputPrecio    = document.getElementById('input-precio');
    const inputImagen    = document.getElementById('input-imagen');
    const formError      = document.getElementById('form-error');

    const abrirModal = (producto = null) => {
        const esEdicion = producto !== null;
        modalTitulo.textContent = esEdicion ? 'Editar Producto' : 'Nuevo Producto';
        formError.classList.add('hidden');
        formError.textContent = '';

        if (esEdicion) {
            inputId.value        = producto._id;
            inputNombre.value    = producto.name;
            inputCategoria.value = producto.category;
            inputDesc.value      = producto.description;
            inputPrecio.value    = producto.price;
            inputImagen.value    = producto.image;
        } else {
            inputId.value = '';
            formProducto.reset();
        }

        overlay.classList.remove('hidden');
    };

    const cerrarModal = () => overlay.classList.add('hidden');

    document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModal());
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarModal(); });

    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        formError.classList.add('hidden');
        const id = inputId.value;
        const esEdicion = Boolean(id);
        const body = {
            name:        inputNombre.value.trim(),
            category:    inputCategoria.value,
            description: inputDesc.value.trim(),
            price:       Number(inputPrecio.value),
            image:       inputImagen.value.trim(),
        };

        try {
            const url    = esEdicion ? `/api/admin/products/${id}` : '/api/admin/products';
            const method = esEdicion ? 'PUT' : 'POST';
            const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
            const data   = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al guardar');
            cerrarModal();
            fetchProducts();
        } catch (err) {
            formError.textContent = err.message;
            formError.classList.remove('hidden');
        }
    });

    document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModal());
});
