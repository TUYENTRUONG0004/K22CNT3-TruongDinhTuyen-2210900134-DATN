const API_BASE = 'http://127.0.0.1:5000/api';
let orders = [];
let currentOrderId = null;

// Load danh sách đơn hàng
async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/donhang`);
        if (!res.ok) throw new Error('Lỗi server');
        orders = await res.json();
        renderOrderTable();
        updateStats();
    } catch (err) {
        showToast('Lỗi tải đơn hàng: ' + err.message, 'error');
        console.error('Load error:', err);
    }
}

// Cập nhật thống kê
function updateStats() {
    const pending = orders.filter(o => o.TrangThai.includes('Cho') || o.TrangThai.includes('xac nhan')).length;
    const processing = orders.filter(o => o.TrangThai.includes('xử lý')).length;
    const shipping = orders.filter(o => o.TrangThai.includes('giao') && !o.TrangThai.includes('Hoàn')).length;
    const completed = orders.filter(o => o.TrangThai.includes('Hoàn thành')).length;

    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-processing').textContent = processing;
    document.getElementById('stat-shipping').textContent = shipping;
    document.getElementById('stat-completed').textContent = completed;
}

// Render bảng đơn hàng
function renderOrderTable() {
    const tbody = document.querySelector('#orderTable tbody');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Chưa có đơn hàng</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const tr = document.createElement('tr');
        const statusClass = getStatusClass(o.TrangThai);
        
        tr.innerHTML = `
            <td><strong>#${o.MaDonHang}</strong></td>
            <td>${formatDate(o.NgayDat)}</td>
            <td>${escapeHtml(o.TenKhachHang || 'Khách lẻ')}</td>
            <td>${escapeHtml(o.SoDienThoai || 'N/A')}</td>
            <td><strong>${Number(o.TongTien || 0).toLocaleString('vi-VN')} ₫</strong></td>
            <td>
                <select class="form-select form-select-sm status-select ${statusClass}" onchange="updateStatus(${o.MaDonHang}, this.value, this)">
                    <option value="Cho xac nhan" ${o.TrangThai.includes('Cho') || o.TrangThai.includes('xac nhan') ? 'selected' : ''}>Chờ xác nhận</option>
                    <option value="Dang xu ly" ${o.TrangThai.includes('xử lý') ? 'selected' : ''}>Đang xử lý</option>
                    <option value="Dang giao" ${o.TrangThai.includes('giao') && !o.TrangThai.includes('Hoàn') ? 'selected' : ''}>Đang giao</option>
                    <option value="Hoan thanh" ${o.TrangThai.includes('Hoàn thành') ? 'selected' : ''}>Hoàn thành</option>
                    <option value="Da huy" ${o.TrangThai.includes('hủy') || o.TrangThai.includes('huy') ? 'selected' : ''}>Đã hủy</option>
                </select>
            </td>
            <td>
                <button class="btn ghost small" onclick="viewDetail(${o.MaDonHang})" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn danger small" onclick="deleteOrder(${o.MaDonHang}, '${escapeHtml(o.TenKhachHang || 'Khách lẻ')}')" title="Xóa đơn hàng">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Lấy class cho trạng thái
function getStatusClass(status) {
    if (status.includes('Cho') || status.includes('xac nhan')) return 'status-pending';
    if (status.includes('xử lý')) return 'status-processing';
    if (status.includes('giao') && !status.includes('Hoàn')) return 'status-shipping';
    if (status.includes('Hoàn thành')) return 'status-completed';
    if (status.includes('hủy') || status.includes('huy')) return 'status-cancelled';
    return '';
}

// Format ngày
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cập nhật trạng thái đơn hàng
async function updateStatus(id, status, selectEl) {
    try {
        const res = await fetch(`${API_BASE}/donhang/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ TrangThai: status })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Cập nhật thất bại');
        }

        showToast('Cập nhật trạng thái thành công!', 'success');
        
        // Cập nhật class cho select
        if (selectEl) {
            selectEl.className = 'form-select form-select-sm status-select ' + getStatusClass(status);
        }

        location.reload();
    } catch (err) {
        showToast('Lỗi cập nhật: ' + err.message, 'error');
        console.error('Update error:', err);
    }
}

// Xem chi tiết đơn hàng
async function viewDetail(id) {
    try {
        const res = await fetch(`${API_BASE}/donhang/${id}`);
        if (!res.ok) throw new Error('Lỗi load chi tiết');
        const data = await res.json();

        currentOrderId = id;
        document.getElementById('modal-order-id').textContent = '#' + id;

        // Render thông tin đơn hàng
        const header = data.header;
        const infoHtml = `
            <p><strong><i class="fas fa-user"></i> Khách hàng:</strong> ${escapeHtml(header.TenKhachHangFinal || header.TenKhachHang || 'Khách lẻ')}</p>
            <p><strong><i class="fas fa-phone"></i> Số điện thoại:</strong> ${escapeHtml(header.SoDienThoaiFinal || header.SoDienThoai || 'N/A')}</p>
            <p><strong><i class="fas fa-map-marker-alt"></i> Địa chỉ:</strong> ${escapeHtml(header.DiaChiFinal || header.DiaChiGiao || 'N/A')}</p>
            <p><strong><i class="fas fa-calendar"></i> Ngày đặt:</strong> ${formatDate(header.NgayDat)}</p>
            <p><strong><i class="fas fa-info-circle"></i> Trạng thái:</strong> <span class="status-badge ${getStatusClass(header.TrangThai)}">${header.TrangThai}</span></p>
            <p><strong><i class="fas fa-sticky-note"></i> Ghi chú:</strong> ${escapeHtml(header.GhiChu) || 'Không có'}</p>
            <p><strong><i class="fas fa-money-bill"></i> Tổng tiền:</strong> <span style="color: #e91e63; font-size: 1.2rem; font-weight: bold;">${Number(header.TongTien || 0).toLocaleString('vi-VN')} ₫</span></p>
        `;
        document.getElementById('modal-order-info').innerHTML = infoHtml;

        // Render sản phẩm
        let itemsHtml = '';
        data.items.forEach(item => {
            itemsHtml += `
                <div class="order-item">
                    <img src="${item.AnhURL || '/anh/no-image.jpg'}" alt="${escapeHtml(item.TenDoChoi)}" onerror="this.src='/anh/no-image.jpg'">
                    <div class="order-item-info">
                        <strong>${escapeHtml(item.TenDoChoi)}</strong><br>
                        <small>Số lượng: ${item.SoLuong} × ${Number(item.DonGia || 0).toLocaleString('vi-VN')} ₫</small>
                    </div>
                    <strong style="color: #e91e63;">${Number((item.SoLuong || 0) * (item.DonGia || 0)).toLocaleString('vi-VN')} ₫</strong>
                </div>
            `;
        });
        document.getElementById('modal-order-items').innerHTML = itemsHtml || '<p class="text-muted">Không có sản phẩm</p>';

        // Hiển thị nút xóa (bây giờ cho phép xóa mọi đơn hàng)
        const deleteBtn = document.getElementById('modal-delete-btn');
        deleteBtn.style.display = 'inline-block';

        // Hiển thị modal
        document.getElementById('orderModal').classList.add('show');
    } catch (err) {
        showToast('Lỗi xem chi tiết: ' + err.message, 'error');
        console.error('View detail error:', err);
    }
}

// Đóng modal
function closeModal() {
    document.getElementById('orderModal').classList.remove('show');
    currentOrderId = null;
}

// Xóa đơn hàng từ modal
function deleteOrderFromModal() {
    if (currentOrderId) {
        const order = orders.find(o => o.MaDonHang === currentOrderId);
        deleteOrder(currentOrderId, order?.TenKhachHang || 'Khách lẻ');
    }
}

// Xóa đơn hàng
async function deleteOrder(id, customerName) {
    const order = orders.find(o => o.MaDonHang === id);

    if (!confirm(`Bạn có chắc muốn xóa đơn hàng #${id} của "${customerName}"?\n\nLưu ý: Hành động này không thể hoàn tác và sẽ hoàn lại số lượng vào kho (nếu đơn chưa hủy).`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/donhang/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Xóa thất bại');
        }

        showToast(data.message || 'Xóa đơn hàng thành công!', 'success');
        location.reload();
    } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
        console.error('Delete error:', err);
    }
}

// Đóng modal khi click bên ngoài
document.getElementById('orderModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') {
        closeModal();
    }
});

// Đóng modal khi nhấn ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Load khi mở trang
document.addEventListener('DOMContentLoaded', () => {
    console.log('DonHang page loaded');
    loadOrders();
});
