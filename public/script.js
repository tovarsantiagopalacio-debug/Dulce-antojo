document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES ---
    let allProducts = [];
    let cart = [];
    let currentCategory = 'Todos';

    // --- ELEMENTOS DEL DOM ---
    const getElement = (id) => document.getElementById(id);
    const productList = getElement('product-list');
    // ... (el resto de tus elementos del DOM no cambian)
    const cartButton = getElement('cart-button');
    const cartCount = getElement('cart-count');
    const cartCountMobile = getElement('cart-count-mobile');
    const searchBar = getElement('search-bar');
    const categoryFilters = getElement('category-filters');
    const registerBtn = getElement('register-btn');
    const loginBtn = getElement('login-btn');
    const logoutBtn = getElement('logout-btn');
    const registerModal = getElement('register-modal');
    const loginModal = getElement('login-modal');
    const closeRegisterModalBtn = getElement('close-register-modal');
    const closeLoginModalBtn = getElement('close-login-modal');
    const registerForm = getElement('register-form');
    const loginForm = getElement('login-form');
    const authButtonsContainer = getElement('auth-buttons-container');
    const userInfoContainer = getElement('user-info-container');
    const welcomeMessage = getElement('welcome-message');
    const toastMessage = getElement('toast-message');
    const adminLink = getElement('admin-link');
    const cartModal = getElement('cart-modal');
    const cartSidebar = getElement('cart-sidebar');
    const closeCartModalBtn = getElement('close-cart-modal');
    const cartItemsContainer = getElement('cart-items-container');
    const cartEmptyMessage = getElement('cart-empty-message');
    const cartFooter = getElement('cart-footer');
    const cartTotal = getElement('cart-total');
    const checkoutBtn = getElement('checkout-btn');
    const confirmationModal = getElement('confirmation-modal');
    const closeConfirmationModalBtn = getElement('close-confirmation-modal');

    // --- DEFINICIÓN DE FUNCIONES ---

    const loadCartFromLocalStorage = () => { return JSON.parse(localStorage.getItem('dulceAntojoCart')) || []; };
    const saveCartToLocalStorage = () => { localStorage.setItem('dulceAntojoCart', JSON.stringify(cart)); };

    const hidePreloader = () => {
        const preloader = getElement('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => { preloader.style.display = 'none'; }, 500);
        }
    };

    const showToastMessage = (message, isError = false) => {
        if (!toastMessage) return;
        toastMessage.textContent = message;
        toastMessage.className = `fixed bottom-5 right-5 text-white py-3 px-6 rounded-full shadow-lg transform transition-all duration-500 z-50 ${isError ? 'bg-red-600' : 'bg-emerald-500'}`;
        toastMessage.classList.remove('opacity-0', 'translate-y-10');
        setTimeout(() => {
            toastMessage.classList.add('opacity-0', 'translate-y-10');
        }, 3000);
    };

    const updateAuthState = () => {
        if (!authButtonsContainer || !userInfoContainer || !welcomeMessage) return;
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user'));
        if (adminLink) adminLink.classList.add('hidden');
        if (token && user) {
            authButtonsContainer.classList.add('hidden');
            authButtonsContainer.classList.remove('md:flex');
            userInfoContainer.classList.remove('hidden');
            userInfoContainer.classList.add('md:flex');
            welcomeMessage.textContent = `Hola, ${user.businessName}`;
            if (user.role === 'admin' && adminLink) {
                adminLink.classList.remove('hidden');
            }
        } else {
            authButtonsContainer.classList.remove('hidden');
            authButtonsContainer.classList.add('md:flex');
            userInfoContainer.classList.add('hidden');
            userInfoContainer.classList.remove('md:flex');
        }
    };

    const applyFilters = () => {
        renderSkeletons();
        setTimeout(() => {
            if (!searchBar) return;
            const searchTerm = searchBar.value.toLowerCase().trim();
            let filteredProducts = allProducts.filter(p =>
                (currentCategory === 'Todos' || p.category === currentCategory) &&
                (p.name.toLowerCase().includes(searchTerm))
            );
            renderProducts(filteredProducts);
        }, 300);
    };

    const renderSkeletons = (count = 8) => {
        if (!productList) return;
        productList.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `<div class="skeleton-img"></div><div class="skeleton-content"><div class="skeleton-title"></div><div class="skeleton-text"></div></div>`;
            productList.appendChild(skeleton);
        }
    };

    const renderProducts = (productsToRender) => {
        if (!productList) return;
        productList.innerHTML = '';
        if (productsToRender.length === 0) {
            productList.innerHTML = `<p class="col-span-full text-center text-gray-500">No se encontraron productos.</p>`;
            return;
        }
        productsToRender.forEach(product => {
            const card = document.createElement('div');
            const productId = product._id;
            card.className = 'product-card bg-gray-900/50 rounded-2xl overflow-hidden flex flex-col border border-gray-800 transition-all duration-300 hover:border-emerald-500/50';
            card.innerHTML = `
                <div class="relative">
                    <img src="${product.image}" alt="${product.name}" class="w-full h-52 object-cover">
                    <div class="absolute top-0 right-0 bg-black/50 text-white text-lg font-bold p-2 px-4 m-3 rounded-full font-heading">${product.priceFormatted}</div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h4 class="text-xl font-bold text-white mb-2 font-heading">${product.name}</h4>
                    <p class="text-gray-400 text-sm mb-4 flex-grow">${product.description}</p>
                    
                    <div class="mt-auto flex items-center gap-2">
                        <div class="flex items-center border-2 border-gray-700 rounded-full">
                            <button class="quantity-btn p-2 text-lg" data-action="decrease" data-product-id="${productId}">-</button>
                            <input type="text" value="1" readonly class="quantity-input w-10 bg-transparent text-center font-bold" data-product-id="${productId}">
                            <button class="quantity-btn p-2 text-lg" data-action="increase" data-product-id="${productId}">+</button>
                        </div>
                        <button class="add-to-cart-btn flex-grow bg-emerald-500 text-white font-semibold py-3 px-4 rounded-full hover:bg-emerald-600 transition" data-product-id="${productId}">
                            Agregar
                        </button>
                    </div>
                    </div>`;
            productList.appendChild(card);
        });
    };
    
    // --- ¡NUEVA FUNCIÓN PARA MANEJAR CLICS EN EL CATÁLOGO! ---
    const handleProductListClick = (e) => {
        const target = e.target;

        // Si se hace clic en un botón de +/-
        if (target.matches('.quantity-btn')) {
            const action = target.dataset.action;
            const productId = target.dataset.productId;
            const input = productList.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            
            if (input) {
                let currentValue = parseInt(input.value, 10);
                if (action === 'increase') {
                    currentValue++;
                } else if (action === 'decrease' && currentValue > 1) {
                    currentValue--;
                }
                input.value = currentValue;
            }
        }

        // Si se hace clic en el botón de "Agregar"
        if (target.matches('.add-to-cart-btn')) {
            const productId = target.dataset.productId;
            const input = productList.querySelector(`.quantity-input[data-product-id="${productId}"]`);

            if (input) {
                const quantity = parseInt(input.value, 10);
                addToCart(productId, quantity);
                
                // Opcional: Resetear la cantidad a 1 después de agregar
                input.value = 1;
            }
        }
    };


    const updateCartInfo = () => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCount) cartCount.textContent = totalItems;
        if (cartCountMobile) cartCountMobile.textContent = totalItems;
        renderCart();
    };

    const addToCart = (productId, quantity) => {
        const product = allProducts.find(p => p._id === productId);
        if (!product) return;
        const existingItem = cart.find(item => item._id === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...product, quantity });
        }
        saveCartToLocalStorage();
        updateCartInfo();
        showToastMessage(`${quantity} x ${product.name} añadido(s)!`);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    const renderCart = () => {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartEmptyMessage.classList.remove('hidden');
            cartFooter.classList.add('hidden');
        } else {
            cartEmptyMessage.classList.add('hidden');
            cartFooter.classList.remove('hidden');
            cart.forEach(item => {
                const productId = item._id;
                const itemElement = document.createElement('div');
                itemElement.className = 'flex items-center gap-4 mb-4';
                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-md object-cover">
                    <div class="flex-grow">
                        <p class="font-semibold text-white">${item.name}</p>
                        <p class="text-sm text-gray-400">${item.priceFormatted}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="quantity-change-btn bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-white" data-product-id="${productId}" data-change="-1">-</button>
                        <span class="font-bold w-5 text-center text-white">${item.quantity}</span>
                        <button class="quantity-change-btn bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-white" data-product-id="${productId}" data-change="1">+</button>
                    </div>
                    <button class="remove-item-btn text-red-500 hover:text-red-400 font-bold text-2xl" data-product-id="${productId}">&times;</button>
                `;
                cartItemsContainer.appendChild(itemElement);
            });
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cartTotal.textContent = formatCurrency(total);
            checkoutBtn.disabled = false;
        }
    };

    const handleCartClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const productId = target.dataset.productId;
        if (target.classList.contains('quantity-change-btn')) {
            const change = parseInt(target.dataset.change);
            const item = cart.find(i => i._id === productId);
            if (item) {
                const newQuantity = item.quantity + change;
                if (newQuantity > 0) {
                    item.quantity = newQuantity;
                } else {
                    cart = cart.filter(i => i._id !== productId);
                }
                saveCartToLocalStorage();
                updateCartInfo();
            }
        }
        if (target.classList.contains('remove-item-btn')) {
            cart = cart.filter(i => i._id !== productId);
            saveCartToLocalStorage();
            updateCartInfo();
        }
    };

    const openCartModal = () => {
        if (!cartModal || !cartSidebar) return;
        cartModal.classList.remove('hidden');
        setTimeout(() => cartSidebar.classList.remove('translate-x-full'), 10);
    };

    const closeCartModal = () => {
        if (!cartModal || !cartSidebar) return;
        cartSidebar.classList.add('translate-x-full');
        setTimeout(() => cartModal.classList.add('hidden'), 300);
    };

    const openModal = (modal) => {
        if (!modal) return;
        modal.classList.remove('hidden');
        setTimeout(() => {
            const content = modal.querySelector('[id$="-content"]');
            if (content) content.classList.remove('opacity-0', 'scale-95');
        }, 10);
    };

    const closeModal = (modal) => {
        if (!modal) return;
        const content = modal.querySelector('[id$="-content"]');
        if (content) content.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const businessName = getElement('register-businessName').value;
        const email = getElement('register-email').value;
        const password = getElement('register-password').value;
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName, email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToastMessage('¡Registro exitoso! Ahora puedes iniciar sesión.');
            closeModal(registerModal);
            registerForm.reset();
        } catch (error) {
            showToastMessage(error.message || 'Error en el registro', true);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = getElement('login-email').value;
        const password = getElement('login-password').value;
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            updateAuthState();
            closeModal(loginModal);
            loginForm.reset();
            showToastMessage(`¡Bienvenido, ${data.user.businessName}!`);
        } catch (error) {
            showToastMessage(error.message || 'Error al iniciar sesión', true);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        updateAuthState();
        showToastMessage('Has cerrado sesión.');
    };

    const handleCheckout = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToastMessage('Debes iniciar sesión para finalizar el pedido.', true);
            closeCartModal();
            openModal(loginModal);
            return;
        }
        if (cart.length === 0) {
            showToastMessage('Tu carrito está vacío.', true);
            return;
        }
        const orderData = {
            products: cart.map(item => ({ product: item._id, quantity: item.quantity })),
            totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });
            if (response.status === 401) {
                showToastMessage('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', true);
                handleLogout();
                closeCartModal();
                setTimeout(() => openModal(loginModal), 500);
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Error del servidor');
            }
            cart = [];
            saveCartToLocalStorage();
            updateCartInfo();
            closeCartModal();
            openModal(confirmationModal);
        } catch (error) {
            showToastMessage(error.message || 'Error al procesar el pedido.', true);
        }
    };

    const setupEventListeners = () => {
        // --- ¡CONECTAMOS EL NUEVO MANEJADOR DE EVENTOS! ---
        productList?.addEventListener('click', handleProductListClick);

        searchBar?.addEventListener('input', applyFilters);
        categoryFilters?.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.category-btn');
            if (!clickedButton) return;
            currentCategory = clickedButton.dataset.category;
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active-category'));
            clickedButton.classList.add('active-category');
            applyFilters();
        });
        registerBtn?.addEventListener('click', () => openModal(registerModal));
        loginBtn?.addEventListener('click', () => openModal(loginModal));
        logoutBtn?.addEventListener('click', handleLogout);
        closeRegisterModalBtn?.addEventListener('click', () => closeModal(registerModal));
        closeLoginModalBtn?.addEventListener('click', () => closeModal(loginModal));
        registerModal?.addEventListener('click', (e) => e.target === registerModal && closeModal(registerModal));
        loginModal?.addEventListener('click', (e) => e.target === loginModal && closeModal(loginModal));
        registerForm?.addEventListener('submit', handleRegister);
        loginForm?.addEventListener('submit', handleLogin);
        cartButton?.addEventListener('click', openCartModal);
        closeCartModalBtn?.addEventListener('click', closeCartModal);
        cartModal?.addEventListener('click', (e) => e.target === cartModal && closeCartModal());
        cartItemsContainer?.addEventListener('click', handleCartClick);
        checkoutBtn?.addEventListener('click', handleCheckout);
        closeConfirmationModalBtn?.addEventListener('click', () => closeModal(confirmationModal));
        confirmationModal?.addEventListener('click', (e) => e.target === confirmationModal && closeModal(confirmationModal));
    };

    const setupCursor = () => {
        const cursorDot = document.getElementById('cursor-dot');
        const cursorOutline = document.getElementById('cursor-outline');
        if (!cursorDot || !cursorOutline) return;
        window.addEventListener('mousemove', e => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;
            cursorOutline.style.left = `${e.clientX}px`;
            cursorOutline.style.top = `${e.clientY}px`;
        });
        document.querySelectorAll('a, button, input, details, select').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
                cursorOutline.style.borderColor = '#6EE7B7';
            });
            el.addEventListener('mouseleave', () => {
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
                cursorOutline.style.borderColor = '';
            });
        });
    };

    const main = async () => {
        cart = loadCartFromLocalStorage();
        updateAuthState();
        setupCursor();
        setupEventListeners();
        updateCartInfo();
        try {
            renderSkeletons();
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Error al cargar productos');
            allProducts = await response.json();
            renderProducts(allProducts);
        } catch (error) {
            console.error("Error en fetch de productos:", error);
            if (productList) productList.innerHTML = `<p class="col-span-full text-center text-gray-500">Error al cargar el catálogo.</p>`;
        } finally {
            hidePreloader();
        }
    };

    // --- INICIAR LA APLICACIÓN ---
    main();
});