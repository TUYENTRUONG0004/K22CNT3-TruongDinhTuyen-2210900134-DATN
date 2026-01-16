// ==================== CHECKOUT.JS ====================

const API_BASE = 'http://127.0.0.1:5000/api';

let cart = [];
let discountAmount = 0;
let promoCodeApplied = null;
let availablePromos = [];
const FREE_SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE = 30000;

// ==================== KHỞI ĐỘNG ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadPromos();
    loadCheckout();
    setupEventListeners();
});

// ==================== LOAD KHUYẾN MÃI ====================
async function loadPromos() {
    try {
        const res = await fetch(`${API_BASE}/khuyenmai`);
        if (!res.ok) throw new Error('Không thể tải khuyến mãi');
        const data = await res.json();
        availablePromos = data.filter(p => p.TrangThai === 'Active');
        console.log('Khuyến mãi khả dụng:', availablePromos);
        renderAvailablePromos();
    } catch (err) {
        console.error("Lỗi load khuyến mãi:", err);
        availablePromos = [];
    }
}

// ==================== HIỂN THỊ MÃ KHUYẾN MÃI KHẢ DỤNG ====================
function renderAvailablePromos() {
    const container = document.getElementById('available-promos');
    if (!container || availablePromos.length === 0) return;

    let html = '<small class="text-muted">Mã khả dụng: ';
    html += availablePromos.map(p => {
        const desc = p.Loai === 'Percent' ? `Giảm ${p.GiaTri}%` : `Giảm ${p.GiaTri.toLocaleString('vi-VN')}₫`;
        return `<span class="badge bg-success me-1" style="cursor:pointer" onclick="applyPromoQuick('${p.MaCode}')">${p.MaCode}</span>`;
    }).join('');
    html += '</small>';
    container.innerHTML = html;
}

// ==================== ÁP DỤNG NHANH MÃ KHUYẾN MÃI ====================
function applyPromoQuick(code) {
    document.getElementById('promo-code').value = code;
    applyPromoCode();
}

// ==================== LOAD CHECKOUT ====================
function loadCheckout() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    updateCartCount();

    const emptyMessage = document.getElementById('empty-cart-message');
    const checkoutContent = document.getElementById('checkout-content');

    if (cart.length === 0) {
        emptyMessage.style.display = 'block';
        checkoutContent.style.display = 'none';
        return;
    }

    emptyMessage.style.display = 'none';
    checkoutContent.style.display = 'flex';

    renderOrderItems();
    calculateTotal();
}

// ==================== HIỂN THỊ SẢN PHẨM ====================
function renderOrderItems() {
    const container = document.getElementById('order-items');
    container.innerHTML = '';

    cart.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.innerHTML = `
            <img src="${item.anh || '/anh/no-image.jpg'}" alt="${item.ten}" onerror="this.src='/anh/no-image.jpg'">
            <div class="order-item-info">
                <h6>${escapeHtml(item.ten)}</h6>
                <small class="text-muted">${item.qty} × ${item.gia.toLocaleString('vi-VN')} ₫</small>
            </div>
            <strong class="text-danger">${(item.gia * item.qty).toLocaleString('vi-VN')} ₫</strong>
        `;
        container.appendChild(div);
    });

    // Cập nhật số lượng sản phẩm
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('item-count').textContent = totalItems;
}

// ==================== TÍNH TỔNG TIỀN ====================
function calculateTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.gia * item.qty, 0);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const finalTotal = Math.max(0, subtotal + shipping - discountAmount);

    document.getElementById('subtotal').textContent = subtotal.toLocaleString('vi-VN') + ' ₫';
    
    const shippingEl = document.getElementById('shipping');
    if (shipping === 0) {
        shippingEl.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Miễn phí</span>';
    } else {
        shippingEl.textContent = shipping.toLocaleString('vi-VN') + ' ₫';
    }
    
    document.getElementById('discount').textContent = '-' + discountAmount.toLocaleString('vi-VN') + ' ₫';
    document.getElementById('final-total').textContent = finalTotal.toLocaleString('vi-VN') + ' ₫';

    const discountRow = document.getElementById('discount-row');
    discountRow.style.display = discountAmount > 0 ? 'flex' : 'none';

    // Hiển thị thông báo miễn phí vận chuyển
    const freeShippingNotice = document.getElementById('free-shipping-notice');
    const remainingAmount = document.getElementById('remaining-amount');
    
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        freeShippingNotice.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i>Bạn đã được miễn phí vận chuyển!';
        freeShippingNotice.classList.add('achieved');
    } else {
        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
        freeShippingNotice.innerHTML = `<i class="fas fa-truck me-2"></i>Mua thêm <strong>${remaining.toLocaleString('vi-VN')} ₫</strong> để được miễn phí vận chuyển!`;
        freeShippingNotice.classList.remove('achieved');
    }
}

// ==================== ÁP DỤNG MÃ KHUYẾN MÃI ====================
async function applyPromoCode() {
    const code = document.getElementById('promo-code').value.trim().toUpperCase();
    const messageEl = document.getElementById('promo-message');

    // Reset
    messageEl.innerHTML = '';
    discountAmount = 0;
    promoCodeApplied = null;

    if (!code) {
        calculateTotal();
        return;
    }

    // Tìm mã khuyến mãi
    const promo = availablePromos.find(p => p.MaCode.toUpperCase() === code);
    
    if (!promo) {
        messageEl.innerHTML = '<div class="alert alert-danger py-2 px-3"><i class="fas fa-times-circle me-2"></i>Mã giảm giá không hợp lệ hoặc đã hết hạn</div>';
        calculateTotal();
        return;
    }

    // Kiểm tra điều kiện tối thiểu
    const subtotal = cart.reduce((sum, item) => sum + item.gia * item.qty, 0);
    
    if (subtotal < promo.DieuKienToiThieu) {
        messageEl.innerHTML = `<div class="alert alert-warning py-2 px-3"><i class="fas fa-exclamation-triangle me-2"></i>Đơn hàng tối thiểu ${promo.DieuKienToiThieu.toLocaleString('vi-VN')} ₫ để áp dụng mã này</div>`;
        calculateTotal();
        return;
    }

    // Tính số tiền giảm
    if (promo.Loai === 'Percent') {
        discountAmount = Math.round(subtotal * promo.GiaTri / 100);
    } else {
        discountAmount = promo.GiaTri;
    }

    // Giới hạn giảm không quá tổng tiền
    discountAmount = Math.min(discountAmount, subtotal);

    promoCodeApplied = promo.MaCode;
    messageEl.innerHTML = `<div class="alert alert-success py-2 px-3"><i class="fas fa-check-circle me-2"></i>Áp dụng thành công mã "<strong>${code}</strong>" - Giảm ${discountAmount.toLocaleString('vi-VN')} ₫</div>`;
    
    calculateTotal();
}

// ==================== CHỌN PHƯƠNG THỨC THANH TOÁN ====================
function selectPayment(method, element) {
    // Remove active class from all
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('active');
    });
    
    // Add active class to selected
    element.classList.add('active');
    
    // Check radio button
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    // Hiển thị thông tin chuyển khoản nếu chọn Bank
    const bankInfo = document.getElementById('bank-info');
    if (method === 'Bank') {
        bankInfo.style.display = 'block';
        const phone = document.getElementById('phone').value || 'SĐT của bạn';
        document.getElementById('transfer-content').textContent = `DH ${phone}`;
    } else {
        bankInfo.style.display = 'none';
    }
}

// ==================== VALIDATE FORM ====================
function validateForm() {
    const form = document.getElementById('checkout-form');
    const name = document.getElementById('full-name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();

    let isValid = true;

    // Validate name
    if (!name) {
        document.getElementById('full-name').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('full-name').classList.remove('is-invalid');
    }

    // Validate phone
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phone || !phoneRegex.test(phone)) {
        document.getElementById('phone').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('phone').classList.remove('is-invalid');
    }

    // Validate address
    if (!address) {
        document.getElementById('address').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('address').classList.remove('is-invalid');
    }

    return isValid;
}

// ==================== ĐẶT HÀNG ====================
async function placeOrder() {
    // Validate form
    if (!validateForm()) {
        showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
        return;
    }

    // Kiểm tra giỏ hàng
    if (cart.length === 0) {
        showToast('Giỏ hàng trống!', 'error');
        return;
    }

    // Lấy thông tin
    const subtotal = cart.reduce((sum, item) => sum + item.gia * item.qty, 0);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = Math.max(0, subtotal + shipping - discountAmount);

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const customerInfo = {
        name: document.getElementById('full-name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        note: document.getElementById('note').value.trim()
    };

    // Tạo dữ liệu đơn hàng
    const orderData = {
        MaNguoiMua: null, // Guest user
        TrangThai: 'Cho xac nhan',
        TongTien: total,
        TenKhachHang: customerInfo.name,
        SoDienThoai: customerInfo.phone,
        DiaChiGiao: customerInfo.address,
        GhiChu: customerInfo.note,
        MaCode: promoCodeApplied,
        PhuongThucThanhToan: paymentMethod,
        items: cart.map(item => ({
            MaDoChoi: item.ma,
            SoLuong: item.qty,
            DonGia: item.gia
        }))
    };

    console.log('Dữ liệu đơn hàng:', orderData);

    // Hiển thị loading
    showLoading();

    try {
        const response = await fetch(`${API_BASE}/donhang`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Không thể đặt hàng');
        }

        console.log('Đặt hàng thành công:', result);

        // Lưu đơn hàng vào localStorage
        saveOrderToLocalStorage(result, customerInfo, paymentMethod, total);

        // Xóa giỏ hàng
        localStorage.removeItem('cart');
        updateCartCount();

        // Ẩn loading
        hideLoading();

        // Hiển thị modal thành công
        showSuccessModal(result.MaDonHang, total, paymentMethod);

    } catch (error) {
        console.error('Lỗi đặt hàng:', error);
        hideLoading();
        showErrorModal(error.message);
    }
}

// ==================== LƯU ĐƠN HÀNG VÀO LOCALSTORAGE ====================
function saveOrderToLocalStorage(result, customerInfo, paymentMethod, total) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    orders.unshift({
        id: result.MaDonHang,
        date: new Date().toISOString(),
        total: total,
        status: 'Chờ xác nhận',
        paymentMethod: paymentMethod,
        customer: customerInfo,
        items: cart.map(item => ({
            ma: item.ma,
            ten: item.ten,
            gia: item.gia,
            anh: item.anh,
            qty: item.qty
        }))
    });
    
    localStorage.setItem('orders', JSON.stringify(orders));
}

// ==================== HIỂN THỊ MODAL THÀNH CÔNG ====================
function showSuccessModal(orderId, total, paymentMethod) {
    document.getElementById('order-id').textContent = '#' + orderId;
    document.getElementById('order-total').textContent = total.toLocaleString('vi-VN') + ' ₫';
    
    const paymentText = {
        'COD': 'Thanh toán khi nhận hàng',
        'Bank': 'Chuyển khoản ngân hàng',
        'Momo': 'Ví MoMo'
    };
    document.getElementById('order-payment').textContent = paymentText[paymentMethod] || paymentMethod;
    
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();
}

// ==================== HIỂN THỊ MODAL LỖI ====================
function showErrorModal(message) {
    document.getElementById('error-message').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
}

// ==================== LOADING ====================
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

// ==================== TOAST ====================
function showToast(message, type = 'info') {
    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-times-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} me-2"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Hiển thị
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Ẩn sau 3 giây
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== CẬP NHẬT SỐ LƯỢNG GIỎ HÀNG ====================
function updateCartCount() {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cartData.reduce((sum, item) => sum + item.qty, 0);
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.textContent = total;
}

// ==================== ESCAPE HTML ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
    // Nút áp dụng khuyến mãi
    const applyPromoBtn = document.getElementById('apply-promo');
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', applyPromoCode);
    }
    
    // Enter để áp dụng khuyến mãi
    const promoInput = document.getElementById('promo-code');
    if (promoInput) {
        promoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyPromoCode();
            }
        });
    }

    // Nút đặt hàng
    const placeOrderBtn = document.getElementById('place-order');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            placeOrder();
        });
    }

    // Cập nhật nội dung chuyển khoản khi nhập số điện thoại
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            const transferContent = document.getElementById('transfer-content');
            if (transferContent) {
                transferContent.textContent = `DH ${phoneInput.value || 'SĐT của bạn'}`;
            }
        });
    }

    // Xóa class invalid khi người dùng nhập
    const inputs = document.querySelectorAll('#checkout-form input, #checkout-form textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
        });
    });
}

// ==================== GLOBAL FUNCTIONS ====================
window.selectPayment = selectPayment;
window.applyPromoQuick = applyPromoQuick;
