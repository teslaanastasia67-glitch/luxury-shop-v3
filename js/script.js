document.addEventListener('DOMContentLoaded', () => {
    console.log("Скрипт успешно запущен!");

    const cartBtn = document.querySelector('.cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeBtn = document.querySelector('.close-btn');
    const buyBtns = document.querySelectorAll('.catalog .buy-btn');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSum = document.getElementById('cart-total-sum');

    let cart = [];

    // Открытие и закрытие корзины
    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', () => {
            cartModal.style.display = 'flex';
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                cartModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                cartModal.style.display = 'none';
            }
        });
    }

    // Клик по кнопкам «В корзину»
    buyBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            console.log("Кнопка нажата!");
            
            const card = e.target.closest('.product-card');
            if (!card) {
                console.log("Ошибка: карточка товара не найдена!");
                return;
            }

            const title = card.querySelector('h3').innerText;
            const priceText = card.querySelector('.price').innerText;
            const price = parseInt(priceText.replace(/\D/g, '')) || 0;

            console.log("Добавляем товар:", title, price);

            cart.push({ title, price });
            updateCart();
        });
    });

    // Функция обновления корзины
    function updateCart() {
        if (!cartBtn) return;
        cartBtn.innerText = `Корзина (${cart.length})`;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Корзина пока пуста</p>';
            cartTotalSum.innerText = '0 BYN';
            return;
        }

        cartItemsContainer.innerHTML = '';
        let total = 0;

        cart.forEach((item) => {
            total += item.price;
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <span class="cart-item-title">${item.title}</span>
                <span class="cart-item-price">${item.price} BYN</span>
            `;
            cartItemsContainer.appendChild(itemElement);
        });

        cartTotalSum.innerText = `${total} BYN`;
    }
});