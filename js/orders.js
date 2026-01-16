// ==================== ORDERS.JS ====================

let orders = [];

// ==================== KHỞI ĐỘNG ====================
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    updateCartCount();
});

// ==================== LOAD ĐƠN HÀNG ====================
function loadOrders() {
    orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const container = document.getElementById('orders-list');
    const noOrders = document.getElementById('no-orders');

    if (orders.length === 0) {
        noOrders.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    noOrders.style.display = 'none';
    container.innerHTML = '';

    // Sắp xếp đơn hàng mới nhất lên đầu
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    orders.forEach((order, index) => {
        const col = document.createElement('div');
        col.className = 'col-12';
        
        // Format order ID
        const orderId = 'DH' + String(order.id).padStart(6, '0');
        const date = new Date(order.date).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Determine status class
        let statusClass = 'status-pending';
        let statusText = order.status || 'Đang xử lý';
        let canCancel = !statusText.includes('hoàn thành') && !statusText.includes('giao') && !statusText.includes('hủy');

        if (statusText.includes('hoàn thành') || statusText.includes('giao')) {
            statusClass = 'status-completed';
        } else if (statusText.includes('xử lý')) {
            statusClass = 'status-processing';
        } else if (statusText.includes('hủy')) {
            statusClass = 'status-cancelled';
        }

        // Render order card
        col.innerHTML = `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">${orderId}</div>
                        <div class="order-date">
                            <i class="fas fa-calendar-alt me-2"></i>${date}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="order-total">${order.total.toLocaleString('vi-VN')} ₫</div>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="order-items-preview">
                    ${renderItemsPreview(order.items)}
                </div>

                <div class="d-flex gap-2">
                    <button class="btn btn-detail" onclick="showOrderDetail(${index})">
                        <i class="fas fa-eye me-2"></i>Xem chi tiết
                    </button>
                    ${canCancel ? `<button class="btn btn-outline-danger" onclick="cancelOrder(${index})">
                        <i class="fas fa-times me-2"></i>Hủy đơn
                    </button>` : ''}
                </div>
            </div>
        `;
        
        container.appendChild(col);
    });
}

// ==================== HIỂN THỊ PREVIEW SẢN PHẨM ====================
function renderItemsPreview(items) {
    const maxDisplay = 4;
    let html = '';
    
    for (let i = 0; i < Math.min(items.length, maxDisplay); i++) {
        html += `<img src="${items[i].anh || '/anh/no-image.jpg'}" alt="${items[i].ten}" title="${items[i].ten}">`;
    }
    
    if (items.length > maxDisplay) {
        const remaining = items.length - maxDisplay;
        html += `<div class="item-count-badge">+${remaining}</div>`;
    }
    
    return html;
}

// ==================== HIỂN THỊ CHI TIẾT ĐƠN HÀNG ====================
function showOrderDetail(index) {
    const order = orders[index];
    const orderId = 'DH' + String(order.id).padStart(6, '0');
    const date = new Date(order.date).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Determine status
    let statusClass = 'status-pending';
    let statusText = order.status || 'Đang xử lý';

    if (statusText.includes('hoàn thành') || statusText.includes('giao')) {
        statusClass = 'status-completed';
    } else if (statusText.includes('xử lý')) {
        statusClass = 'status-processing';
    } else if (statusText.includes('hủy')) {
        statusClass = 'status-cancelled';
    }

    // Fill modal content
    document.getElementById('modal-order-id').textContent = order.id;
    document.getElementById('modal-order-code').textContent = orderId;
    document.getElementById('modal-date').textContent = date;
    document.getElementById('modal-status').innerHTML = `<span class="order-status ${statusClass}">${statusText}</span>`;
    document.getElementById('modal-total').textContent = order.total.toLocaleString('vi-VN') + ' ₫';

    // Customer info
    document.getElementById('modal-customer').innerHTML = `
        <div class="info-row">
            <span class="info-label">Người nhận:</span>
            <span class="info-value">${order.customer.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Số điện thoại:</span>
            <span class="info-value">${order.customer.phone}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Địa chỉ:</span>
            <span class="info-value">${order.customer.address}</span>
        </div>
    `;

    // Order items
    const itemsContainer = document.getElementById('modal-items');
    itemsContainer.innerHTML = '';
    
    order.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item-modal';
        itemDiv.innerHTML = `
            <img src="${item.anh || '/anh/no-image.jpg'}" alt="${item.ten}">
            <div class="order-item-modal-info">
                <h6>${item.ten}</h6>
                <small>${item.qty} × ${item.gia.toLocaleString('vi-VN')} ₫</small>
            </div>
            <div class="order-item-modal-price">
                ${(item.qty * item.gia).toLocaleString('vi-VN')} ₫
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    });

    // Payment method
    const paymentText = order.paymentMethod === 'COD' 
        ? '<i class="fas fa-money-bill-wave me-2 text-success"></i>Thanh toán khi nhận hàng (COD)'
        : '<i class="fas fa-university me-2 text-primary"></i>Chuyển khoản ngân hàng';
    document.getElementById('modal-payment').innerHTML = paymentText;

    // Note
    const noteSection = document.getElementById('modal-note-section');
    const noteEl = document.getElementById('modal-note');
    if (order.customer.note && order.customer.note.trim() !== '') {
        noteSection.style.display = 'block';
        noteEl.textContent = order.customer.note;
    } else {
        noteSection.style.display = 'none';
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    modal.show();
}

// ==================== CẬP NHẬT SỐ LƯỢNG GIỎ HÀNG ====================
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').textContent = total;
}

// ==================== HỦY ĐƠN HÀNG ====================
function cancelOrder(index) {
    const order = orders[index];
    const orderId = 'DH' + String(order.id).padStart(6, '0');

    if (!confirm(`Bạn có chắc muốn hủy đơn hàng ${orderId}?\nHành động này không thể hoàn tác.`)) {
        return;
    }

    // Update status
    order.status = 'Đã hủy';
    order.cancelledAt = new Date().toISOString();

    // Save to localStorage
    localStorage.setItem('orders', JSON.stringify(orders));

    // Reload orders
    loadOrders();

    // Show success message (you can add a toast if available)
    alert('Đơn hàng đã được hủy thành công!');
}

// ==================== GLOBAL FUNCTIONS ====================
window.showOrderDetail = showOrderDetail;
window.cancelOrder = cancelOrder;