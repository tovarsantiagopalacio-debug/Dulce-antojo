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
    const sortSelect = getElement('sort-products');
    const mobileMenuButton = getElement('mobile-menu-button');
    const mainNav = getElement('main-nav');
    const lightboxModal = getElement('lightbox-modal');
    const lightboxImg = getElement('lightbox-img');
    const closeLightboxBtn = getElement('close-lightbox');
    const contactForm = getElement('contact-form');
    const noResultsMessage = getElement('no-results-message');
    const clearSearchBtn = getElement('clear-search-btn');

    // --- DEFINICIÓN DE FUNCIONES ---

    // Previene XSS al insertar datos de la API en innerHTML
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = String(str ?? '');
        return div.innerHTML;
    };

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
        const myOrdersLink = getElement('my-orders-link');
        if (adminLink) adminLink.classList.add('hidden');
        if (myOrdersLink) myOrdersLink.classList.add('hidden');
        if (token && user) {
            authButtonsContainer.classList.add('hidden');
            authButtonsContainer.classList.remove('md:flex');
            userInfoContainer.classList.remove('hidden');
            userInfoContainer.classList.add('md:flex');
            welcomeMessage.textContent = `Hola, ${user.businessName}`;
            if (user.role === 'admin' && adminLink) adminLink.classList.remove('hidden');
            if (myOrdersLink) myOrdersLink.classList.remove('hidden');
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

            // Aplicar ordenamiento
            const sortValue = sortSelect ? sortSelect.value : 'default';
            if (sortValue === 'price-asc') {
                filteredProducts.sort((a, b) => a.price - b.price);
            } else if (sortValue === 'price-desc') {
                filteredProducts.sort((a, b) => b.price - a.price);
            } else if (sortValue === 'name-asc') {
                filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortValue === 'name-desc') {
                filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
            }

            renderProducts(filteredProducts);

            // Mostrar/ocultar mensaje de sin resultados
            if (noResultsMessage) {
                if (filteredProducts.length === 0 && searchTerm) {
                    noResultsMessage.classList.remove('hidden');
                } else {
                    noResultsMessage.classList.add('hidden');
                }
            }
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
                    <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-full h-52 object-cover">
                    <div class="absolute top-0 right-0 bg-black/50 text-white text-lg font-bold p-2 px-4 m-3 rounded-full font-heading">${escapeHtml(product.priceFormatted)}</div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h4 class="text-xl font-bold text-white mb-2 font-heading">${escapeHtml(product.name)}</h4>
                    <p class="text-gray-400 text-sm mb-4 flex-grow">${escapeHtml(product.description)}</p>
                    
                    <div class="mt-auto flex items-center gap-2">
                        <div class="flex items-center border-2 border-gray-700 rounded-full">
                            <button class="quantity-btn p-2 text-lg leading-none" data-action="decrease" data-product-id="${productId}">−</button>
                            <input type="number" value="1" min="1" max="999"
                                class="quantity-input w-14 bg-transparent text-center font-bold text-white focus:outline-none"
                                data-product-id="${productId}">
                            <button class="quantity-btn p-2 text-lg leading-none" data-action="increase" data-product-id="${productId}">+</button>
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
                const quantity = Math.max(1, parseInt(input.value, 10) || 1);
                addToCart(productId, quantity);
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
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-16 h-16 rounded-md object-cover">
                    <div class="flex-grow">
                        <p class="font-semibold text-white">${escapeHtml(item.name)}</p>
                        <p class="text-sm text-gray-400">${escapeHtml(item.priceFormatted)}</p>
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
            products: cart.map(item => ({ product: item._id, quantity: item.quantity }))
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
            // Mostrar total real calculado por el servidor
            const totalEl = document.getElementById('confirmation-total');
            if (totalEl && data.totalAmount) {
                totalEl.textContent = formatCurrency(data.totalAmount);
            }
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

        // Ordenar productos
        sortSelect?.addEventListener('change', applyFilters);

        // Menú hamburguesa móvil
        mobileMenuButton?.addEventListener('click', () => {
            if (mainNav) {
                mainNav.classList.toggle('hidden');
                mainNav.classList.toggle('flex');
            }
        });

        // Cerrar menú móvil al hacer clic en un enlace
        mainNav?.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768 && mainNav) {
                    mainNav.classList.add('hidden');
                    mainNav.classList.remove('flex');
                }
            });
        });

        // Lightbox de galería
        document.querySelectorAll('.gallery-item img').forEach(img => {
            img.addEventListener('click', () => {
                if (lightboxModal && lightboxImg) {
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt;
                    lightboxModal.classList.remove('hidden');
                }
            });
        });
        closeLightboxBtn?.addEventListener('click', () => {
            lightboxModal?.classList.add('hidden');
        });
        lightboxModal?.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.classList.add('hidden');
            }
        });

        // Formulario de contacto con AJAX
        contactForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = getElement('submit-button');
            const submitText = getElement('submit-button-text');
            if (submitBtn) submitBtn.disabled = true;
            if (submitText) submitText.textContent = 'Enviando...';

            try {
                const formData = new FormData(contactForm);
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    showToastMessage('¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.');
                    contactForm.reset();
                } else {
                    throw new Error('Error al enviar');
                }
            } catch (error) {
                showToastMessage('Hubo un error al enviar el mensaje. Inténtalo de nuevo.', true);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitText) submitText.textContent = 'Enviar Mensaje';
            }
        });

        // Limpiar búsqueda
        clearSearchBtn?.addEventListener('click', () => {
            if (searchBar) searchBar.value = '';
            applyFilters();
        });
    };


    // --- REVEAL ON SCROLL ---
    const setupRevealOnScroll = () => {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        if (revealElements.length === 0) return;

        // Agregar estilos iniciales: invisibles y desplazados hacia abajo
        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(40px)';
            el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target); // Solo animar una vez
                }
            });
        }, { threshold: 0.1 });

        revealElements.forEach(el => observer.observe(el));
    };

    // --- AÑO DINÁMICO EN FOOTER ---
    const setupDynamicYear = () => {
        const yearSpan = getElement('current-year');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    };

    const main = async () => {
        cart = loadCartFromLocalStorage();
        updateAuthState();
        setupEventListeners();
        setupRevealOnScroll();
        setupDynamicYear();
        updateCartInfo();
        try {
            renderSkeletons();
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Error al cargar productos');
            allProducts = await response.json();
            if (allProducts.length === 0 && productList) {
                productList.innerHTML = `<p class="col-span-full text-center text-gray-500 py-16">Por ahora no hay productos disponibles.<br>¡Vuelve pronto!</p>`;
            } else {
                renderProducts(allProducts);
            }
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