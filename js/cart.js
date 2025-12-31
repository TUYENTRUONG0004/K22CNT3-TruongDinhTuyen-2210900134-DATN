function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartEmpty = document.getElementById('cart-empty');
    const totalItemsEl = document.getElementById('total-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalPriceEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');

    // Cập nhật số lượng trên navbar
    updateCartCount();

    if (cart.length === 0) {
        cartEmpty.classList.remove('d-none');
        cartItemsContainer.innerHTML = '';
        totalItemsEl.textContent = '0';
        subtotalEl.textContent = '0 ₫';
        totalPriceEl.textContent = '0 ₫';
        checkoutBtn.disabled = true;
        return;
    }

    cartEmpty.classList.add('d-none');
    cartItemsContainer.innerHTML = '';

    let subtotal = 0;
    let totalItems = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.gia * item.qty;
        subtotal += itemTotal;
        totalItems += item.qty;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.anh || '/anh/no-image.jpg'}" alt="${item.ten}">
            <div class="cart-item-info">
                <h5>${item.ten}</h5>
                <div class="cart-item-price">${item.gia.toLocaleString('vi-VN')} ₫</div>
            </div>
            <div class="quantity-control">
                <button onclick="updateQuantity(${index}, -1)">-</button>
                <input type="text" value="${item.qty}" readonly>
                <button onclick="updateQuantity(${index}, 1)">+</button>
            </div>
            <div class="text-end">
                <div class="fw-bold text-danger mb-2">${itemTotal.toLocaleString('vi-VN')} ₫</div>
                <a href="#" class="remove-item" onclick="removeItem(${index}); return false;">
                    <i class="fas fa-trash-alt"></i>
                </a>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });

    totalItemsEl.textContent = totalItems;
    subtotalEl.textContent = subtotal.toLocaleString('vi-VN') + ' ₫';
    totalPriceEl.textContent = subtotal.toLocaleString('vi-VN') + ' ₫';
    checkoutBtn.disabled = false;
}

function updateQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const newQty = cart[index].qty + change;

    if (newQty <= 0) {
        if (confirm('Xóa sản phẩm này khỏi giỏ hàng?')) {
            cart.splice(index, 1);
        }
    } else {
        cart[index].qty = newQty;
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

function removeItem(index) {
    if (confirm('Xóa sản phẩm này khỏi giỏ hàng?')) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
    }
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').textContent = total;
}

// Nút thanh toán
document.getElementById('checkout-btn')?.addEventListener('click', () => {
    // Kiểm tra giỏ hàng có sản phẩm không
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
    }
    // Chuyển hướng sang trang thanh toán
    window.location.href = '../html/check-out.html';
});

// Khởi động
document.addEventListener('DOMContentLoaded', () => {
    loadCart();

    // Nếu người dùng xóa hết sản phẩm trong shop rồi quay lại cart
    if (!localStorage.getItem('cart')) {
        localStorage.setItem('cart', '[]');
    }
});