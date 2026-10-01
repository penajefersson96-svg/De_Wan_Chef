document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos
    const menuRes = await fetch('menu.json');
    const configRes = await fetch('config.json');
    const menuData = await menuRes.json();
    const configData = await configRes.json();

    const rate = configData.currency.usdToVes;
    const phone = configData.restaurant.whatsapp;
    
    // AQUÍ ESTÁ LA LÍNEA EXACTA: Dólares a Bolívares
    document.getElementById('exchange-rate').textContent = `1 USD = Bs. ${rate.toFixed(2)}`;

    const formatVES = (usd) => `Bs. ${(usd * rate).toFixed(2)}`;

    // 2. Renderizar pills de categorías
    const nav = document.getElementById('category-nav');
    menuData.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.category = cat.id;
        btn.textContent = cat.name;
        nav.appendChild(btn);
    });

    // 3. Renderizar menú
    const container = document.getElementById('menu-container');
    menuData.categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-section';
        section.id = cat.id;

        let html = `<h2>${cat.name}</h2>`;
        if (cat.description) html += `<p class="category-description">${cat.description}</p>`;
        html += `<div class="menu-grid">`;

        cat.items.forEach(item => {
            const hasSizes = item.half !== undefined && item.full !== undefined;
            const defaultPrice = hasSizes ? item.full : item.price;
            const priceLabel = hasSizes ? `$${item.full.toFixed(2)}` : `$${item.price.toFixed(2)}`;
            const vesLabel = hasSizes ? formatVES(item.full) : formatVES(item.price);

            html += `
                <div class="menu-item" data-id="${item.id}" data-name="${item.name}" data-price="${defaultPrice}" data-category="${cat.id}">
                    <h3>${item.name}</h3>
                    ${hasSizes ? `
                        <div class="size-selector">
                            <button class="size-btn" data-price="${item.half}">½ $${item.half.toFixed(2)}</button>
                            <button class="size-btn active" data-price="${item.full}">1 $${item.full.toFixed(2)}</button>
                        </div>
                    ` : ''}
                    <div class="price">${priceLabel}</div>
                    <div class="price-ves">${vesLabel}</div>
                    <button class="add-btn" onclick="addToCartFromBtn(this)">Agregar al pedido</button>
                </div>
            `;
        });

        html += `</div>`;
        section.innerHTML = html;
        container.appendChild(section);
    });

    // 4. Selectores de tamaño
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = btn.closest('.size-selector');
            parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const card = btn.closest('.menu-item');
            const price = parseFloat(btn.dataset.price);
            card.dataset.price = price;
            card.querySelector('.price').textContent = `$${price.toFixed(2)}`;
            card.querySelector('.price-ves').textContent = formatVES(price);
        });
    });

    // 5. Filtros de navegación (instantáneo)
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        showAllItems();
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Centrado instantáneo, sin animación
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        
        const cat = btn.dataset.category;
        if (cat === 'all') {
            document.querySelectorAll('.category-section').forEach(sec => sec.style.display = 'block');
            window.scrollTo({ top: 0, behavior: 'auto' });
        } else {
            document.querySelectorAll('.category-section').forEach(sec => {
                sec.style.display = (sec.id === cat) ? 'block' : 'none';
            });
            const section = document.getElementById(cat);
            if (section) section.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    });
});

    // 6. SCROLL SPY (centrado instantáneo)
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const sections = document.querySelectorAll('.category-section');
        const navBtns = document.querySelectorAll('.nav-btn');
        let current = 'all';
        const scrollPosition = window.scrollY + 150;
        
        sections.forEach(section => {
            if (section.style.display !== 'none') {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    current = section.id;
                }
            }
        });
        
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === current) {
                btn.classList.add('active');
                btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    }, 50);
});

    // 7. BÚSQUEDA (Oculta teclado y barra al buscar)
    const searchToggle = document.getElementById('search-toggle');
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    const searchClose = document.getElementById('search-close');

    searchToggle.addEventListener('click', () => {
        searchBar.classList.add('active');
        setTimeout(() => searchInput.focus(), 100);
    });

    searchClose.addEventListener('click', () => {
        searchBar.classList.remove('active');
        searchInput.value = '';
        searchInput.blur(); // Oculta el teclado
        showAllItems();
    });

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const term = e.target.value.toLowerCase().trim();
            if (term.length >= 2) {
                e.target.blur(); // Oculta el teclado
                searchBar.classList.remove('active'); // Oculta la barra
                performSearch(term);
            } else if (term.length === 0) {
                showAllItems();
            }
        }, 800); // Espera 0.8 segundos después de dejar de escribir
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
            searchBar.classList.remove('active');
            performSearch(e.target.value.toLowerCase().trim());
        }
    });

    function performSearch(term) {
        let foundCount = 0;
        document.querySelectorAll('.menu-item').forEach(item => {
            const name = item.dataset.name.toLowerCase();
            if (name.includes(term)) {
                item.style.display = 'block';
                foundCount++;
            } else {
                item.style.display = 'none';
            }
        });

        document.querySelectorAll('.category-section').forEach(section => {
            const visibleItems = section.querySelectorAll('.menu-item[style="display: block;"], .menu-item:not([style*="display: none"])');
            section.style.display = visibleItems.length > 0 ? 'block' : 'none';
        });
    }

    function showAllItems() {
        document.querySelectorAll('.menu-item').forEach(item => item.style.display = 'block');
        document.querySelectorAll('.category-section').forEach(section => section.style.display = 'block');
    }

    // 8. CARRITO PERSISTENTE
    window.cart = [];
    window.rate = rate;
    window.phone = phone;

    function loadCart() {
        const saved = localStorage.getItem('wanChefCart');
        if (saved) {
            const parsed = JSON.parse(saved);
            const hoursDiff = (new Date() - new Date(parsed.timestamp)) / (1000 * 60 * 60);
            if (hoursDiff < 24 && parsed.cart.length > 0) {
                if (confirm('🛒 Tienes un pedido pendiente. ¿Deseas recuperarlo?')) {
                    window.cart = parsed.cart;
                    updateCartUI();
                }
            }
        }
    }

    function saveCart() {
        localStorage.setItem('wanChefCart', JSON.stringify({
            cart: window.cart,
            timestamp: new Date().toISOString()
        }));
    }

    loadCart();

    // Event listeners del carrito
    document.getElementById('cart-toggle').addEventListener('click', openCart);
    document.getElementById('cart-bar-open').addEventListener('click', openCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('cart-continue').addEventListener('click', closeCart);
    document.getElementById('btn-whatsapp').addEventListener('click', sendWhatsApp);
});

window.addToCartFromBtn = (btn) => {
    const card = btn.closest('.menu-item');
    addToCart(card.dataset.id, card.dataset.name, parseFloat(card.dataset.price));
};

function addToCart(id, name, price) {
    const existing = window.cart.find(i => i.id === id);
    if (existing) existing.qty++;
    else window.cart.push({ id, name, price, qty: 1 });
    updateCartUI();
    renderCartItems();
    saveCart();
}

function updateQty(id, delta) {
    const item = window.cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) window.cart = window.cart.filter(i => i.id !== id);
    updateCartUI();
    renderCartItems();
    saveCart();
}

function removeFromCart(id) {
    window.cart = window.cart.filter(i => i.id !== id);
    updateCartUI();
    renderCartItems();
    saveCart();
}

function updateCartUI() {
    const count = window.cart.reduce((sum, item) => sum + item.qty, 0);
    const total = window.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    document.getElementById('cart-badge').textContent = count;
    document.getElementById('cart-bar-count').textContent = count;
    document.getElementById('cart-bar-total').textContent = `$${total.toFixed(2)}`;
    
    document.getElementById('cart-bar').classList.toggle('visible', count > 0);
}

function openCart() {
    renderCartItems();
    document.getElementById('cart-modal').classList.add('active');
}

function closeCart() {
    document.getElementById('cart-modal').classList.remove('active');
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    if (window.cart.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:40px 0;">Tu carrito está vacío</p>';
        return;
    }
    
    container.innerHTML = window.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-price">${item.qty} × $${item.price.toFixed(2)} = $${(item.qty * item.price).toFixed(2)}</div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">Quitar</button>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateQty('${item.id}', -1)">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
            </div>
        </div>
    `).join('');

    const total = window.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('cart-total-usd').textContent = `$${total.toFixed(2)}`;
    document.getElementById('cart-total-ves').textContent = `Bs. ${(total * window.rate).toFixed(2)}`;
}

function sendWhatsApp() {
    if (window.cart.length === 0) return alert('El carrito está vacío');
    
    let msg = "¡Hola! Quiero hacer el siguiente pedido:\n\n";
    window.cart.forEach(item => {
        msg += `• ${item.qty}x ${item.name} - $${(item.price * item.qty).toFixed(2)}\n`;
    });
    const total = window.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    msg += `\n*Total: $${total.toFixed(2)} (Bs. ${(total * window.rate).toFixed(2)})*`;
    msg += "\n\n📍 ¿Delivery o Pick up?";
    
    window.open(`https://wa.me/${window.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}
// PWA - Instalación de la app
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const addHomeBtn = document.getElementById('add-home-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
    addHomeBtn.style.display = 'none';
});

async function installApp() {
    if (!deferredPrompt) {
        showInstallInstructions();
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        installBtn.style.display = 'none';
        addHomeBtn.style.display = 'none';
    }
    deferredPrompt = null;
}

function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let msg = '';
    if (isIOS) {
        msg = '📱 Para instalar la app:\n\n1. Toca el botón "Compartir" (cuadrado con flecha) en Safari\n2. Desliza hacia abajo y toca "Agregar a pantalla de inicio"\n3. Toca "Agregar"';
    } else if (isAndroid) {
        msg = '📱 Para instalar la app:\n\n1. Toca el menú (⋮) en Chrome\n2. Selecciona "Agregar a pantalla de inicio" o "Instalar app"\n3. Confirma la instalación';
    } else {
        msg = '📱 Para instalar la app:\n\n1. Toca el ícono de instalación en la barra de direcciones del navegador\n2. Selecciona "Instalar"';
    }
    
    alert(msg);
}

// Detectar si ya está instalada
if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
    addHomeBtn.style.display = 'none';
    // Eliminar badge de Netlify completamente
function removeNetlifyBadge() {
    const selectors = [
        '#nf-banner',
        '[data-netlify-banner]',
        '.netlify-badge',
        'footer[aria-label*="Netlify"]',
        'iframe[src*="netlify"]',
        '[class*="netlify"]'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.remove();
            el.style.display = 'none';
            el.style.visibility = 'hidden';
        });
    });
    
    // Observar cambios en el DOM y eliminar si aparece
    const observer = new MutationObserver(() => {
        removeNetlifyBadge();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Ejecutar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeNetlifyBadge);
} else {
    removeNetlifyBadge();
}
}