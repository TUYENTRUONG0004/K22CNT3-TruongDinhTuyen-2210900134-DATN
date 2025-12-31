let cart = [];
let discountAmount = 0;
let promoCodeApplied = null;

const PROMO_CODES = [
    { code: "GIAM10", type: "percent", value: 10, min: 100000 },
    { code: "GIAM50K", type: "amount", value: 50000, min: 300000 },
    // Có thể thêm mã từ DB sau này
];

function loadCheckout() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Cập nhật số lượng giỏ hàng trên navbar
    updateCartCount();

    if (cart.length === 0) {
        alert('Giỏ hàng trống! Vui lòng thêm sản phẩm.');
        window.location.href = 'cart.html';
        return;
    }

    renderOrderItems();
    calculateTotal();
}

function renderOrderItems() {
    const container = document.getElementById('order-items');
    container.innerHTML = '';

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.innerHTML = `
            <img src="${item.anh || '/anh/no-image.jpg'}" alt="${item.ten}">
            <div class="order-item-info">
                <h6>${item.ten}</h6>
                <small>${item.qty} × ${item.gia.toLocaleString('vi-VN')} ₫</small>
            </div>
            <strong>${(item.gia * item.qty).toLocaleString('vi-VN')} ₫</strong>
        `;
        container.appendChild(div);
    });
}

function calculateTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.gia * item.qty, 0);
    const shipping = subtotal >= 500000 ? 0 : 30000;
    const finalTotal = subtotal + shipping - discountAmount;

    document.getElementById('subtotal').textContent = subtotal.toLocaleString('vi-VN') + ' ₫';
    document.getElementById('shipping').textContent = shipping === 0 ? 'Miễn phí' : shipping.toLocaleString('vi-VN') + ' ₫';
    document.getElementById('discount').textContent = '-' + discountAmount.toLocaleString('vi-VN') + ' ₫';
    document.getElementById('final-total').textContent = finalTotal.toLocaleString('vi-VN') + ' ₫';

    // Ẩn/hiện dòng giảm giá
    document.getElementById('discount-row').classList.toggle('d-none', discountAmount === 0);
}

function applyPromoCode() {
    const code = document.getElementById('promo-code').value.trim().toUpperCase();
    const successEl = document.getElementById('promo-success');
    const errorEl = document.getElementById('promo-error');

    successEl.classList.add('d-none');
    errorEl.classList.add('d-none');

    if (!code) return;

    const promo = PROMO_CODES.find(p => p.code === code);
    if (!promo) {
        errorEl.textContent = 'Mã giảm giá không hợp lệ';
        errorEl.classList.remove('d-none');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.gia * item.qty, 0);
    if (subtotal < promo.min) {
        errorEl.textContent = `Đơn hàng tối thiểu ${promo.min.toLocaleString('vi-VN')} ₫ để áp dụng mã này`;
        errorEl.classList.remove('d-none');
        return;
    }

    if (promo.type === 'percent') {
        discountAmount = Math.round(subtotal * promo.value / 100);
    } else {
        discountAmount = promo.value;
    }

    promoCodeApplied = promo.code;
    successEl.textContent = `Áp dụng thành công "${code}" - Giảm ${discountAmount.toLocaleString('vi-VN')} ₫`;
    successEl.classList.remove('d-none');

    calculateTotal();
}

function placeOrder() {
    const form = document.getElementById('checkout-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const order = {
        customer: {
            name: document.getElementById('full-name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            note: document.getElementById('note').value.trim()
        },
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        items: cart,
        subtotal: cart.reduce((sum, item) => sum + item.gia * item.qty, 0),
        shipping: cart.reduce((sum, item) => sum + item.gia * item.qty, 0) >= 500000 ? 0 : 30000,
        discount: discountAmount,
        promoCode: promoCodeApplied,
        total: cart.reduce((sum, item) => sum + item.gia * item.qty, 0) + 
               (cart.reduce((sum, item) => sum + item.gia * item.qty, 0) >= 500000 ? 0 : 30000) - 
               discountAmount,
        date: new Date().toISOString()
    };

    // Lưu đơn hàng vào localStorage
    let orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    // Xóa giỏ hàng
    localStorage.removeItem('cart');
    updateCartCount();

    // Hiện modal thành công
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();

    // Tự động chuyển sang trang lịch sử đơn hàng sau 4 giây
    setTimeout(() => {
        modal.hide();
        window.location.href = 'orders.html';
    }, 4000);
}

function updateCartCount() {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cartData.reduce((sum, item) => sum + item.qty, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = total;
    }
}

// Khởi động trang
document.addEventListener('DOMContentLoaded', () => {
    loadCheckout();

    // Áp dụng mã giảm giá khi nhấn Enter
    document.getElementById('promo-code').addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyPromoCode();
        }
    });

    // Nút áp dụng mã
    document.getElementById('apply-promo').addEventListener('click', applyPromoCode);

    // Nút đặt hàng – CHỈ GẮN 1 LẦN, CÓ preventDefault
    document.getElementById('place-order').addEventListener('click', (e) => {
        e.preventDefault(); // Quan trọng: ngăn form submit reload trang
        placeOrder();
    });
});