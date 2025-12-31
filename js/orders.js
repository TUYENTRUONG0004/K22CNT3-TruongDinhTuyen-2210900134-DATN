let orders = [];

function loadOrders() {
    orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const container = document.getElementById('orders-list');
    const noOrders = document.getElementById('no-orders');

    updateCartCount();

    if (orders.length === 0) {
        noOrders.classList.remove('d-none');
        container.innerHTML = '';
        return;
    }

    noOrders.classList.add('d-none');
    container.innerHTML = '';

    orders.reverse().forEach((order, index) => {
        const orderId = 'DH' + String(orders.length - index).padStart(4, '0'); // DH0001, DH0002...
        const date = new Date(order.date).toLocaleString('vi-VN');

        const div = document.createElement('div');
        div.className = 'col-12';
        div.innerHTML = `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">${orderId}</div>
                        <div class="order-date"><i class="fas fa-calendar-alt me-2"></i>${date}</div>
                    </div>
                    <div class="text-end">
                        <div class="order-total">${order.total.toLocaleString('vi-VN')} ₫</div>
                        <span class="badge bg-warning order-status-badge">Đang xử lý</span>
                    </div>
                </div>

                <div class="order-items-preview">
                    ${order.items.map(item => `
                        <img src="${item.anh || '/anh/no-image.jpg'}" alt="${item.ten}">
                    `).join('')}
                </div>

                <button class="btn btn-outline-danger" onclick="showOrderDetail('${orderId}', ${index})">
                    Xem chi tiết
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

function showOrderDetail(orderId, originalIndex) {
    const order = orders[orders.length - 1 - originalIndex]; // vì đã reverse
    const date = new Date(order.date).toLocaleString('vi-VN');

    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('modal-date').textContent = date;
    document.getElementById('modal-total').textContent = order.total.toLocaleString('vi-VN') + ' ₫';

    document.getElementById('modal-customer').innerHTML = `
        <strong>Người nhận:</strong> ${order.customer.name}<br>
        <strong>SĐT:</strong> ${order.customer.phone}<br>
        <strong>Địa chỉ:</strong> ${order.customer.address}
    `;

    const itemsContainer = document.getElementById('modal-items');
    itemsContainer.innerHTML = '';
    order.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'd-flex align-items-center mb-3 pb-3 border-bottom';
        itemDiv.innerHTML = `
            <img src="${item.anh || '/anh/no-image.jpg'}" style="width:80px; height:80px; object-fit:cover; border-radius:10px;" class="me-3">
            <div class="flex-grow-1">
                <h6>${item.ten}</h6>
                <small>${item.qty} × ${item.gia.toLocaleString('vi-VN')} ₫</small>
            </div>
            <strong>${(item.qty * item.gia).toLocaleString('vi-VN')} ₫</strong>
        `;
        itemsContainer.appendChild(itemDiv);
    });

    document.getElementById('modal-payment').textContent = 
        order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng';

    const noteEl = document.getElementById('modal-note');
    if (order.customer.note) {
        noteEl.innerHTML = `<strong>Ghi chú:</strong> ${order.customer.note}`;
    } else {
        noteEl.innerHTML = '';
    }

    const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    modal.show();
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').textContent = total;
}

// Khởi động
document.addEventListener('DOMContentLoaded', loadOrders);