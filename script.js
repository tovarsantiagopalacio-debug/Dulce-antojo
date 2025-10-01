document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES ---
    let allProducts = [];
    let currentCategory = 'Todos';
    let cart = loadCartFromLocalStorage();
    let currentProductId = null;

    // --- ELEMENTOS DEL DOM ---
    const getElement = (id) => document.getElementById(id);
    const productList = getElement('product-list');
    const cartButton = getElement('cart-button');
    const searchBar = getElement('search-bar');
    const sortProductsDropdown = getElement('sort-products');
    const noResultsMessage = getElement('no-results-message');
    const clearSearchBtn = getElement('clear-search-btn');
    const categoryFilters = getElement('category-filters');
    const contactForm = getElement('contact-form');

    const MIN_ORDER_QUANTITY = 20;

    // --- FUNCIÓN DE INICIO ---
    async function fetchProducts() {
        try {
            const response = await fetch('products.json');
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            allProducts = await response.json();
            initializeApp();
        } catch (error) {
            console.error("No se pudieron cargar los productos:", error);
            if (productList) productList.innerHTML = `<p class="text-center text-red-500 col-span-full">Error al cargar el catálogo.</p>`;
            hidePreloader();
        }
    }

    function initializeApp() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTermFromUrl = urlParams.get('search');
        if (searchTermFromUrl) {
            searchBar.value = searchTermFromUrl;
        }
        applyFilters();
        renderCart();
        setupEventListeners();
        setupScrollAnimations();
        setupActiveNavObserver();
        setupCursor();
        setupLightbox();
        setupScrollToTop();
        hidePreloader();
    }

    // --- LÓGICA DE RENDERIZADO (MOSTRAR CONTENIDO) ---
    const renderProducts = (productsToRender) => {
        if (!productList) return;
        productList.innerHTML = '';
        const searchTerm = searchBar.value.trim();
        const hasResults = productsToRender.length > 0;
        noResultsMessage.classList.toggle('hidden', hasResults);
        if (!hasResults && searchTerm) {
            noResultsMessage.querySelector('p').textContent = `No se encontraron sabores para "${searchTerm}".`;
        }
        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card bg-gray-900/50 rounded-2xl overflow-hidden flex flex-col border border-gray-800 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transform hover:-translate-y-1 reveal-on-scroll';
            card.dataset.productId = product.id;
            card.innerHTML = `
                <div class="relative cursor-pointer">
                    <img src="${product.image}" alt="${product.name}" class="w-full h-52 object-cover pointer-events-none">
                    <div class="absolute top-0 right-0 bg-black/50 text-white text-lg font-bold p-2 px-4 m-3 rounded-full font-heading pointer-events-none">${product.priceFormatted}</div>
                </div>
                <div class="p-5 flex flex-col flex-grow pointer-events-none">
                    <h4 class="text-xl font-bold text-white mb-2 font-heading">${product.name}</h4>
                    <p class="text-gray-400 text-sm mb-4 flex-grow">${product.description}</p>
                </div>
                <div class="p-5 pt-0 mt-auto flex items-center space-x-2">
                    <button class="view-product-btn w-full bg-gray-700/50 text-emerald-400 font-semibold py-3 px-4 rounded-full hover:bg-gray-700 transition duration-300">Ver Detalles</button>
                    <button class="quick-add-btn bg-emerald-500 text-white p-3 rounded-full hover:bg-emerald-600 transition duration-300" title="Agregar 1 al pedido">
                        <svg class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </button>
                </div>`;
            productList.appendChild(card);
        });
        setupScrollAnimations();
    };
    
    const renderCart = () => {
        const cartItemsContainer = getElement('cart-items');
        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            // Si el carrito está vacío, muestra el mensaje.
            cartItemsContainer.innerHTML = `
                <div id="empty-cart-message" class="text-center text-gray-500 mt-10 flex flex-col items-center h-full justify-center">
                    <svg class="w-20 h-20 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <p class="mt-4 text-lg">Tu carrito está vacío.</p>
                    <p class="text-sm">Agrega productos para empezar.</p>
                </div>`;
        } else {
            // Si el carrito tiene productos, los construye y los muestra.
            cartItemsContainer.innerHTML = cart.map(item => {
                const itemTotalPrice = (item.price * item.quantity).toLocaleString('es-CO');
                return `
                    <div class="flex items-center justify-between py-4 border-b border-gray-800">
                        <div class="flex items-center">
                            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md mr-4">
                            <div>
                                <p class="font-semibold text-white">${item.name}</p>
                                <p class="text-sm text-gray-400">${item.priceFormatted} c/u</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                            <div class="flex items-center space-x-3 bg-gray-800 rounded-full p-1">
                                <button data-id="${item.id}" class="decrease-qty w-8 h-8 flex items-center justify-center bg-gray-700 rounded-full font-bold hover:bg-gray-600">-</button>
                                <span class="font-semibold w-8 text-center text-lg">${item.quantity}</span>
                                <button data-id="${item.id}" class="increase-qty w-8 h-8 flex items-center justify-center bg-gray-700 rounded-full font-bold hover:bg-gray-600">+</button>
                            </div>
                            <p class="text-lg font-bold text-emerald-400 ml-4 w-24 text-right">$${itemTotalPrice}</p>
                        </div>
                    </div>`;
            }).join('');
        }
        
        updateCartInfo();
    };

    // --- LÓGICA DEL CARRITO Y PEDIDO ---
    function saveCartToLocalStorage() { localStorage.setItem('dulceAntojoCart', JSON.stringify(cart)); }
    function loadCartFromLocalStorage() { return JSON.parse(localStorage.getItem('dulceAntojoCart')) || []; }

    const updateCartInfo = () => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        getElement('cart-count').textContent = totalItems;
        getElement('cart-subtotal').textContent = `$${subtotal.toLocaleString('es-CO')}`;
        const meetsMinOrder = totalItems >= MIN_ORDER_QUANTITY;
        getElement('min-order-message').classList.toggle('hidden', meetsMinOrder || cart.length === 0);
        getElement('checkout-button').disabled = cart.length === 0 || !meetsMinOrder;
    };

    const addToCart = (productId, quantity, eventSourceElement) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product || !quantity || quantity <= 0) return;

        if (eventSourceElement) {
            const startRect = eventSourceElement.getBoundingClientRect();
            const endRect = cartButton.getBoundingClientRect();
            const flyingImage = document.createElement('img');
            flyingImage.src = product.image;
            flyingImage.className = 'flying-image';
            flyingImage.style.left = `${startRect.left + startRect.width / 2}px`;
            flyingImage.style.top = `${startRect.top + startRect.height / 2}px`;
            flyingImage.style.width = `${startRect.height}px`;
            flyingImage.style.height = `${startRect.height}px`;
            document.body.appendChild(flyingImage);
            requestAnimationFrame(() => {
                flyingImage.style.transform = `translate(${endRect.left - startRect.left}px, ${endRect.top - startRect.top}px) scale(0.2)`;
                flyingImage.style.opacity = '0';
            });
            setTimeout(() => flyingImage.remove(), 700);
        }

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...product, quantity });
        }
        
        saveCartToLocalStorage();
        renderCart();
        showToastMessage(`¡${quantity} x ${product.name} añadido(s)!`);

        if (cartButton) {
            cartButton.classList.add('animate-pulse');
            setTimeout(() => cartButton.classList.remove('animate-pulse'), 500);
        }
    };
    
    const updateQuantity = (productId, change) => {
        const itemInCart = cart.find(item => item.id === productId);
        if (itemInCart) {
            itemInCart.quantity += change;
            if (itemInCart.quantity <= 0) {
                cart = cart.filter(item => item.id !== productId);
            }
        }
        saveCartToLocalStorage();
        renderCart();
    };


    // --- LÓGICA DE FILTROS Y BÚSQUEDA ---
    const applyFilters = () => {
        const searchTerm = searchBar.value.toLowerCase().trim();
        const sortValue = sortProductsDropdown.value;
        let filteredProducts = [...allProducts];

        if (currentCategory !== 'Todos') {
            filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
        }

        if (searchTerm) {
            filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
        }
        
        switch (sortValue) {
            case 'price-asc':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
                break;
        }
        
        renderProducts(filteredProducts);
    };

    const handleCategoryFilter = (e) => {
        const clickedButton = e.target.closest('.category-btn');
        if (!clickedButton) return;
        currentCategory = clickedButton.dataset.category;
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active-category'));
        clickedButton.classList.add('active-category');
        applyFilters();
    };

    // --- LÓGICA DE MODALES Y UI ---
    const openProductModal = (productId) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        currentProductId = productId;
        const modal = getElement('product-modal');
        getElement('modal-product-name').textContent = product.name;
        getElement('modal-product-image').src = product.image;
        getElement('modal-product-description').textContent = product.description;
        getElement('modal-product-price').textContent = `${product.priceFormatted} / unidad`;
        getElement('modal-product-qty').value = 1;
        modal.classList.remove('hidden');
        setTimeout(() => getElement('product-modal-content').classList.remove('opacity-0', 'scale-95'), 10);
    };

    const closeProductModal = () => {
        const modal = getElement('product-modal');
        getElement('product-modal-content').classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };
    
    const showOrderConfirmation = () => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        getElement('summary-total-items').textContent = totalItems;
        getElement('summary-subtotal').textContent = `$${subtotal.toLocaleString('es-CO')}`;
        const modal = getElement('order-confirmation-modal');
        modal.classList.remove('hidden');
        setTimeout(() => getElement('order-confirmation-content').classList.remove('opacity-0', 'scale-95'), 10);
    };

    const closeOrderConfirmation = () => {
        const modal = getElement('order-confirmation-modal');
        getElement('order-confirmation-content').classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };
    
    const hidePreloader = () => {
        const preloader = getElement('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => { preloader.style.display = 'none'; }, 500);
        }
    };

    const showToastMessage = (message, isError = false) => {
        const toast = getElement('toast-message');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `fixed bottom-5 right-5 text-white py-3 px-6 rounded-full shadow-lg transform transition-all duration-500 z-50 ${isError ? 'bg-red-600' : 'bg-emerald-500'}`;
        toast.classList.remove('opacity-0', 'translate-y-10');
        setTimeout(() => toast.classList.add('opacity-0', 'translate-y-10'), 3000);
    };

    // --- LÓGICA DEL FORMULARIO ---
    const validateField = (field, errorField, validationFn, message) => {
        if (!validationFn(field.value)) {
            errorField.textContent = message;
            errorField.classList.remove('hidden');
            field.classList.add('border-red-500');
            return false;
        } else {
            errorField.classList.add('hidden');
            field.classList.remove('border-red-500');
            return true;
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const isNameValid = validateField(getElement('name'), getElement('name-error'), val => val.trim().length >= 2, 'Por favor, ingresa un nombre válido.');
        const isEmailValid = validateField(getElement('email'), getElement('email-error'), val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Por favor, ingresa un correo válido.');
        
        if (!isNameValid || !isEmailValid) {
            showToastMessage('Por favor, corrige los errores.', true);
            return;
        }

        const form = e.target;
        const submitButton = getElement('submit-button');
        const submitButtonText = getElement('submit-button-text');
        const data = new FormData(form);
        submitButton.disabled = true;
        submitButtonText.textContent = 'Enviando...';
        try {
            const response = await fetch(form.action, { method: form.method, body: data, headers: { 'Accept': 'application/json' } });
            if (response.ok) {
                showToastMessage('¡Gracias! Tu mensaje ha sido enviado.');
                form.reset();
            } else { throw new Error('Error en el envío'); }
        } catch (error) {
            showToastMessage('Hubo un error al enviar el mensaje.', true);
        } finally {
            submitButton.disabled = false;
            submitButtonText.textContent = 'Enviar Mensaje';
        }
    };

    // --- SETUP DE EVENT LISTENERS ---
    function setupEventListeners() {
        if (productList) {
            productList.addEventListener('click', e => {
                const viewBtn = e.target.closest('.view-product-btn');
                const addBtn = e.target.closest('.quick-add-btn');
                const card = e.target.closest('.product-card');
                if (viewBtn) {
                    openProductModal(parseInt(card.dataset.productId));
                } else if (addBtn) {
                    addToCart(parseInt(card.dataset.productId), 1, addBtn);
                } else if (card) {
                    openProductModal(parseInt(card.dataset.productId));
                }
            });
        }
        getElement('modal-add-to-cart-btn')?.addEventListener('click', (e) => {
            const quantity = parseInt(getElement('modal-product-qty').value);
            addToCart(currentProductId, quantity, e.currentTarget);
            closeProductModal();
        });
        getElement('close-product-modal-button')?.addEventListener('click', closeProductModal);
        getElement('product-modal')?.addEventListener('click', (e) => e.target === getElement('product-modal') && closeProductModal());
        
        const cartModal = getElement('cart-modal');
        const cartContent = getElement('cart-content');
        const openCart = () => {
            if (cartModal) cartModal.classList.remove('hidden');
            if (cartContent) setTimeout(() => cartContent.classList.remove('translate-x-full'), 10); // Desliza hacia adentro
        };
        const closeCart = () => {
            if (cartContent) cartContent.classList.add('translate-x-full'); // Desliza hacia afuera
            if (cartModal) setTimeout(() => cartModal.classList.add('hidden'), 300); // Oculta después de la animación
        };

        getElement('cart-button')?.addEventListener('click', openCart);
        getElement('close-cart-button')?.addEventListener('click', closeCart);
        cartModal?.addEventListener('click', e => e.target === cartModal && closeCart());

        getElement('cart-items')?.addEventListener('click', e => {
            const button = e.target.closest('button');
            if (!button) return;
            const id = parseInt(button.dataset.id);
            if (button.classList.contains('increase-qty')) updateQuantity(id, 1);
            if (button.classList.contains('decrease-qty')) updateQuantity(id, -1);
        });
        getElement('checkout-button')?.addEventListener('click', () => {
            closeCart();
            showOrderConfirmation();
        });
        getElement('close-confirmation-modal-button')?.addEventListener('click', () => {
            closeOrderConfirmation();
            cart = [];
            saveCartToLocalStorage();
            renderCart();
            showToastMessage('Pedido confirmado. ¡Gracias!');
        });
        if (searchBar) searchBar.addEventListener('input', applyFilters);
        if (sortProductsDropdown) sortProductsDropdown.addEventListener('change', applyFilters);
        if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => { searchBar.value = ''; applyFilters(); });
        if (categoryFilters) categoryFilters.addEventListener('click', handleCategoryFilter);
        if (contactForm) {
            contactForm.addEventListener('submit', handleFormSubmit);
            getElement('name').addEventListener('input', () => validateField(getElement('name'), getElement('name-error'), val => val.trim().length >= 2, 'Por favor, ingresa un nombre válido.'));
            getElement('email').addEventListener('input', () => validateField(getElement('email'), getElement('email-error'), val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Por favor, ingresa un correo válido.'));
        }
        const mobileMenuButton = getElement('mobile-menu-button');
        const mainNav = getElement('main-nav');
        if (mobileMenuButton && mainNav) {
            mobileMenuButton.addEventListener('click', () => {
                mainNav.classList.toggle('hidden');
                mainNav.classList.toggle('flex');
            });
            mainNav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (!mainNav.classList.contains('hidden')) {
                        mainNav.classList.add('hidden');
                        mainNav.classList.remove('flex');
                    }
                });
            });
        }
    }
    
    // --- OTRAS FUNCIONES SETUP ---
    const setupScrollAnimations = () => {
        const elements = document.querySelectorAll('.reveal-on-scroll:not(.visible)');
        if (elements.length === 0) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        elements.forEach(el => observer.observe(el));
    };

    const setupCursor = () => {
        const cursorDot = getElement('cursor-dot');
        const cursorOutline = getElement('cursor-outline');
        if (!cursorDot || !cursorOutline) return;
        window.addEventListener('mousemove', e => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;
            cursorOutline.style.left = `${e.clientX}px`;
            cursorOutline.style.top = `${e.clientY}px`;
        });
        document.querySelectorAll('a, button, .product-card, .gallery-item, details').forEach(el => {
            el.addEventListener('mouseenter', () => cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)');
            el.addEventListener('mouseleave', () => cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)');
        });
    };

    const setupLightbox = () => {
        const galleryItems = document.querySelectorAll('.gallery-item');
        const lightboxModal = getElement('lightbox-modal');
        const lightboxImage = getElement('lightbox-image');
        const closeLightboxButton = getElement('close-lightbox-button');
        if (!galleryItems.length || !lightboxModal) return;

        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) {
                    lightboxImage.src = img.src;
                    lightboxModal.classList.remove('hidden');
                }
            });
        });
        const closeLightbox = () => lightboxModal.classList.add('hidden');
        closeLightboxButton.addEventListener('click', closeLightbox);
        lightboxModal.addEventListener('click', e => e.target === lightboxModal && closeLightbox());
    };

    const setupScrollToTop = () => {
        const scrollToTopBtn = getElement('scroll-to-top-btn');
        if (!scrollToTopBtn) return;
        window.addEventListener('scroll', () => {
            const isVisible = window.scrollY > 300;
            scrollToTopBtn.classList.toggle('opacity-0', !isVisible);
            scrollToTopBtn.classList.toggle('translate-y-5', !isVisible);
        });
        scrollToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    };

    const setupActiveNavObserver = () => {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('#main-nav a');
        if (!sections.length || !navLinks.length) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.toggle('active-nav-link', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { rootMargin: '-50% 0px -50% 0px' });
        sections.forEach(section => observer.observe(section));
    };

    // --- EJECUCIÓN INICIAL ---
    fetchProducts();
});