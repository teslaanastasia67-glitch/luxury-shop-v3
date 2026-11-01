document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Скрипт успешно запущен!");

    // ==========================================
    // 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ПЕРЕМЕННЫЕ
    // ==========================================
    
    // Настройки
    const MASTER_PIN = '2026'; 
    const SESSION_KEY = 'luxury_session';
    const MASTER_KEY = 'luxury_master_session';

    // Утилиты
    const escapeHtml = (str) => String(str).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    const openModal = (el) => { if (el) { el.classList.add('active'); el.style.display = 'flex'; } };
    const closeModal = (el) => { if (el) { el.classList.remove('active'); el.style.display = 'none'; } };

    function getSession() { return localStorage.getItem(SESSION_KEY); }
    function setSession(l) { localStorage.setItem(SESSION_KEY, l); }
    function clearSession() { localStorage.removeItem(SESSION_KEY); }
    function getCurrentUser() { 
        const l = getSession(); 
        return l ? { login: l } : null; 
    }

    function isMasterUnlocked() { return localStorage.getItem(MASTER_KEY) === '1'; }
    function unlockMaster() { localStorage.setItem(MASTER_KEY, '1'); }
    function lockMaster() { localStorage.removeItem(MASTER_KEY); }

    // ==========================================
    // 2. АВТОРИЗАЦИЯ (СЕРВЕР)
    // ==========================================
    const authBtn = document.getElementById('open-auth-btn');
    const authModal = document.getElementById('auth-modal');
    const authCloseBtn = document.querySelector('.close-auth-btn');
    const authForm = document.getElementById('auth-form');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authModalTitle = document.getElementById('auth-modal-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authUsername = document.getElementById('auth-username');
    const authPassword = document.getElementById('auth-password');
    let isLoginMode = true;

    function setAuthMode(login) {
        isLoginMode = login;
        if (authModalTitle) authModalTitle.textContent = login ? 'Вход в систему' : 'Регистрация';
        if (authSubmitBtn) authSubmitBtn.textContent = login ? 'Войти' : 'Зарегистрироваться';
        if (authToggleText) authToggleText.textContent = login ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    }
    setAuthMode(true);

    function renderAuthButton() {
        const user = getCurrentUser();
        if (authBtn) {
            if (user) {
                authBtn.textContent = 'Выйти (' + user.login + ')';
                authBtn.dataset.mode = 'logout';
            } else {
                authBtn.textContent = 'Войти';
                authBtn.dataset.mode = 'login';
            }
        }
        const rn = document.getElementById('review-name');
        if (rn) rn.value = user ? user.login : '';
    }

    if (authBtn) {
        authBtn.addEventListener('click', () => {
            if (authBtn.dataset.mode === 'logout') {
                if (confirm('Выйти из аккаунта?')) {
                    clearSession();
                    cart = [];
                    renderAuthButton();
                    updateCart();
                }
            } else {
                openModal(authModal);
            }
        });
    }
    
    if (authToggleText) authToggleText.addEventListener('click', () => setAuthMode(!isLoginMode));
    if (authCloseBtn) authCloseBtn.addEventListener('click', () => closeModal(authModal));
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(authModal); });

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const login = authUsername.value.trim();
            const pw = authPassword.value;
            if (login.length < 3) return alert('Логин минимум 3 символа.');
            if (pw.length < 6) return alert('Пароль минимум 6 символов.');

            fetch('/api/users')
                .then(res => res.json())
                .then(usersData => {
                    let users = {};
                    usersData.forEach(u => users[u.login] = u);

                    if (!isLoginMode) {
                        // РЕГИСТРАЦИЯ
                        if (users[login]) return alert('Такой логин уже занят.');
                        fetch('/api/users', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ login: login, password: pw })
                        }).then(() => {
                            setSession(login);
                            alert('Аккаунт «' + login + '» создан. Добро пожаловать!');
                            authForm.reset();
                            closeModal(authModal);
                            renderAuthButton();
                        });
                    } else {
                        // ВХОД
                        const u = users[login];
                        if (!u) return alert('Пользователь не найден.');
                        if (pw !== u.password) return alert('Неверный пароль.');
                        setSession(login);
                        alert('С возвращением, ' + login + '!');
                        authForm.reset();
                        closeModal(authModal);
                        renderAuthButton();
                    }
                })
                .catch(() => alert('Ошибка сервера. Убедитесь, что node server.js запущен.'));
        });
    }

    // ==========================================
    // 3. КОРЗИНА
    // ==========================================
    const cartModal = document.getElementById('cart-modal');
    const cartBtn = document.querySelector('.cart-btn');
    const cartCloseBtn = document.querySelector('.cart-close-btn') || document.querySelector('.close-btn');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSum = document.getElementById('cart-total-sum');
    const checkoutBtn = document.getElementById('checkout-btn');
    let cart = [];

    if (cartBtn) cartBtn.addEventListener('click', () => {
        if (!getSession()) {
            alert('Войдите или зарегистрируйтесь, чтобы открыть корзину.');
            setAuthMode(true); openModal(authModal); return;
        }
        openModal(cartModal);
    });
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', () => closeModal(cartModal));
    if (cartModal) cartModal.addEventListener('click', (e) => { if (e.target === cartModal) closeModal(cartModal); });

    function updateCart() {
        if (cartBtn) cartBtn.textContent = 'Корзина (' + cart.length + ')';
        if (!cartItemsContainer || !cartTotalSum) return;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Корзина пока пуста</p>';
            cartTotalSum.textContent = '0 BYN';
            return;
        }
        cartItemsContainer.innerHTML = cart.map((it, i) => `
            <div class="cart-item">
                <span class="cart-item-title">${escapeHtml(it.title)}</span>
                <span class="cart-item-price">${it.price} BYN</span>
                <button class="remove-item-btn" data-index="${i}" style="background:none;border:none;color:#8c8c8c;cursor:pointer;font-size:1rem;margin-left:10px;">&times;</button>
            </div>`).join('');
        
        const total = cart.reduce((s, i) => s + i.price, 0);
        cartTotalSum.textContent = total + ' BYN';
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('buy-btn')) {
            e.stopPropagation();
            if (!getSession()) {
                alert('Чтобы добавить товар в корзину, войдите.');
                setAuthMode(true); openModal(authModal); return;
            }
            const card = e.target.closest('.product-card');
            const modal = e.target.closest('.product-modal-content');
            let title, priceText;
            if (card) {
                title = card.querySelector('h3').textContent;
                priceText = card.querySelector('.price').textContent;
            } else if (modal) {
                title = document.getElementById('modal-title').textContent;
                priceText = document.getElementById('modal-price').textContent;
            } else return;
            
            cart.push({ title: title, price: parseInt(priceText.replace(/\D/g,''), 10) || 0 });
            updateCart();
        }
        if (e.target.classList.contains('remove-item-btn')) {
            const i = parseInt(e.target.getAttribute('data-index'), 10);
            if (!isNaN(i)) { cart.splice(i, 1); updateCart(); }
        }
    });

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const user = getCurrentUser();
            if (!user) { setAuthMode(true); openModal(authModal); return; }
            if (cart.length === 0) return alert('Корзина пуста.');
            
            const total = cart.reduce((s, i) => s + i.price, 0);
            
            fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientLogin: user.login, items: cart.slice(), total: total })
            })
            .then(res => res.json())
            .then(data => {
                alert('Заказ ' + data.id + ' оформлен!\nСумма: ' + total + ' BYN\n\nЗаказ передан мастеру.');
                cart = [];
                updateCart();
                closeModal(cartModal);
            })
            .catch(() => alert('Ошибка связи с сервером.'));
        });
    }

    // ==========================================
    // 4. МОДАЛЬНОЕ ОКНО ТОВАРА
    // ==========================================
    const productModal = document.getElementById('product-modal');
    const closeProductModal = document.querySelector('.close-product-modal');
    const productCards = document.querySelectorAll('.product-card');
    const modalMainImg = document.getElementById('modal-main-img');
    const modalTitle = document.getElementById('modal-title');
    const modalPrice = document.getElementById('modal-price');
    const modalDesc = document.getElementById('modal-desc');
    const modalThumbnails = document.querySelectorAll('.modal-thumbnails img');

    const productsData = {
        "Панно «Аист на карте РБ»": { desc: "Эксклюзивное настенное панно ручной работы с контурной картой.", images: ["images/tovar1.jpeg", "images/tovar1.jpeg"] },
        "Глобус": { desc: "Интерьерный глобус премиум-класса с подставкой из массива дерева.", images: ["images/tovar2.jpeg", "images/tovar2.jpeg"] },
        "Карета": { desc: "Декоративная миниатюра кареты, выполненная мастерами художественной резьбы.", images: ["images/tovar3.jpeg", "images/tovar3.jpeg"] }
    };

    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('buy-btn')) return;
            const titleEl = card.querySelector('h3');
            const priceEl = card.querySelector('.price');
            const imgEl = card.querySelector('.product-image img');
            if (!titleEl) return;

            const title = titleEl.innerText;
            if (modalTitle) modalTitle.innerText = title;
            if (modalPrice) modalPrice.innerText = priceEl ? priceEl.innerText : "0 BYN";
            if (modalMainImg) modalMainImg.src = imgEl ? imgEl.src : "";

            if (productsData[title]) {
                if (modalDesc) modalDesc.innerText = productsData[title].desc;
                if (modalThumbnails.length >= 2) {
                    modalThumbnails[0].src = productsData[title].images[0];
                    modalThumbnails[1].src = productsData[title].images[1];
                }
            } else {
                if (modalDesc) modalDesc.innerText = "Уникальное изделие ручной работы.";
                if (modalThumbnails.length > 0) modalThumbnails[0].src = imgEl ? imgEl.src : "";
            }

            modalThumbnails.forEach((thumb, index) => { thumb.classList.toggle('active', index === 0); });
            openModal(productModal);
        });
    });

    modalThumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            if (modalMainImg) modalMainImg.src = thumb.src;
            modalThumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    if (closeProductModal) closeProductModal.addEventListener('click', () => closeModal(productModal));
    if (productModal) productModal.addEventListener('click', (e) => { if (e.target === productModal) closeModal(productModal); });

    // ==========================================
    // 5. ОТЗЫВЫ (СЕРВЕР)
    // ==========================================
    const reviewForm = document.getElementById('review-form');
    const reviewsList = document.getElementById('reviews-list');

    function loadReviews() {
        if (!reviewsList) return;
        fetch('/api/reviews')
            .then(res => res.json())
            .then(data => {
                reviewsList.innerHTML = data.map(r => `
                    <div class="review-card">
                        <div class="review-header">
                            <span class="review-author">${escapeHtml(r.author)}</span>
                            <span class="review-date">${r.date}</span>
                        </div>
                        <p class="review-text">${escapeHtml(r.text)}</p>
                    </div>
                `).join('');
            }).catch(() => {
                reviewsList.innerHTML = '<p style="color:red;">Ошибка загрузки отзывов.</p>';
            });
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) { setAuthMode(true); openModal(authModal); return; }
            const msg = document.getElementById('review-message').value.trim();
            if (!msg) return;

            fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author: user.login, text: msg })
            })
            .then(() => {
                reviewForm.reset();
                document.getElementById('review-name').value = user.login;
                loadReviews();
            });
        });
    }
    loadReviews();

    // ==========================================
    // 6. ПАНЕЛЬ МАСТЕРА И PIN-КОД
    // ==========================================
    const masterBtn = document.getElementById('open-master-btn');
    const pinModal = document.getElementById('pin-modal');
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');
    const pinCloseBtn = document.querySelector('.pin-close-btn');
    
    const masterPanel = document.getElementById('master-panel');
    const masterCloseBtn = document.querySelector('.master-close-btn');
    const masterLogoutBtn = document.getElementById('master-logout-btn');
    const ordersListEl = document.getElementById('orders-list');
    const ordersFilter = document.getElementById('orders-filter');
    let currentFilter = 'all';

    const LABELS = { new: 'Новый', in_progress: 'В работе', done: 'Выполнен', cancelled: 'Отменён' };

    function renderOrders() {
        if (!ordersListEl) return;
        fetch('/api/orders')
            .then(res => res.json())
            .then(all => {
                const list = currentFilter === 'all' ? all : all.filter(o => o.status === currentFilter);
                if (!list.length) {
                    ordersListEl.innerHTML = '<p style="color:#888;">Заказов нет.</p>';
                    return;
                }

                ordersListEl.innerHTML = list.map(o => {
                    const date = new Date(o.createdAt).toLocaleString('ru-RU');
                    const items = o.items.map(i => `${escapeHtml(i.title)} — ${i.price} BYN`).join('<br>');
                    const opts = Object.keys(LABELS).map(v => 
                        `<option value="${v}" ${v === o.status ? 'selected' : ''}>${LABELS[v]}</option>`
                    ).join('');
                    
                    return `
                        <div class="order-card">
                            <div class="order-head">
                                <div><strong>${o.id}</strong> — клиент: <b>${escapeHtml(o.clientLogin)}</b>
                                <div style="font-size:.8rem;color:#888;">${date}</div></div>
                                <span class="order-status status-${o.status}">${LABELS[o.status]}</span>
                            </div>
                            <div class="order-items">${items}</div>
                            <div><b>Итого: ${o.total} BYN</b></div>
                            <div class="order-actions">
                                <select class="status-select" data-id="${o.id}">${opts}</select>
                            </div>
                        </div>`;
                }).join('');

                Array.prototype.forEach.call(ordersListEl.querySelectorAll('.status-select'), sel => {
                    sel.addEventListener('change', () => {
                        fetch('/api/orders/' + sel.dataset.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: sel.value })
                        }).then(() => renderOrders());
                    });
                });
            }).catch(() => {
                ordersListEl.innerHTML = '<p style="color:red;">Ошибка загрузки заказов. Сервер выключен?</p>';
            });
    }

    if (masterBtn) masterBtn.addEventListener('click', () => {
        if (isMasterUnlocked()) {
            renderOrders();
            openModal(masterPanel);
        } else {
            if (pinInput) pinInput.value = '';
            if (pinError) pinError.textContent = '';
            openModal(pinModal);
            setTimeout(() => { if (pinInput) pinInput.focus(); }, 100);
        }
    });

    if (pinForm) pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (pinInput.value.trim() === MASTER_PIN) {
            unlockMaster();
            closeModal(pinModal);
            renderOrders();
            openModal(masterPanel);
        } else {
            if (pinError) pinError.textContent = 'Неверный PIN-код';
            pinInput.value = '';
            pinInput.focus();
        }
    });

    if (pinCloseBtn) pinCloseBtn.addEventListener('click', () => closeModal(pinModal));
    if (pinModal) pinModal.addEventListener('click', (e) => { if (e.target === pinModal) closeModal(pinModal); });

    if (masterCloseBtn) masterCloseBtn.addEventListener('click', () => closeModal(masterPanel));
    if (masterPanel) masterPanel.addEventListener('click', (e) => { if (e.target === masterPanel) closeModal(masterPanel); });
    if (masterLogoutBtn) masterLogoutBtn.addEventListener('click', () => {
        lockMaster();
        closeModal(masterPanel);
        alert('Вы вышли из панели мастера.');
    });

    if (ordersFilter) {
        ordersFilter.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-filter]');
            if (!b) return;
            Array.prototype.forEach.call(ordersFilter.querySelectorAll('button'), x => x.classList.remove('active'));
            b.classList.add('active');
            currentFilter = b.dataset.filter;
            renderOrders();
        });
    }

    // ==========================================
    // 7. СТАРТ
    // ==========================================
    renderAuthButton();
    updateCart();
});