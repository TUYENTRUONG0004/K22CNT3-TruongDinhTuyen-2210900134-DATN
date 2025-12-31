// orders.js - Quản lý Đơn Hàng

const API_BASE = 'http://127.0.0.1:5000/api';
let orders = [];

async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/donhang`);
        if (!res.ok) throw new Error('Lỗi server');
        orders = await res.json();
        renderOrderTable();
    } catch (err) {
        showToast('Lỗi tải đơn hàng', 'error');
        const table = document.getElementById('orderTable');
        if (table) table.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Lỗi kết nối server</td></tr>`;
    }
}

function renderOrderTable() {
    const table = document.getElementById('orderTable');
    if (!table) return;

    if (orders.length === 0) {
        table.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Chưa có đơn hàng nào</td></tr>`;
        return;
    }

    table.innerHTML = `
        <tr>
            <th>Mã đơn</th>
            <th>Ngày đặt</th>
            <th>Khách hàng</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
        </tr>
    `;

    orders.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${o.MaDonHang}</strong></td>
            <td>${o.NgayDat}</td>
            <td>${escapeHtml(o.KhachHang)}</td>
            <td>${o.TongTien.toLocaleString('vi-VN')} ₫</td>
            <td>
                <select class="form-select form-select-sm" onchange="updateOrderStatus(${o.MaDonHang}, this.value)">
                    <option value="Cho xac nhan" ${o.TrangThai === 'Cho xac nhan' ? 'selected' : ''}>Chờ xác nhận</option>
                    <option value="Đang giao" ${o.TrangThai === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
                    <option value="Hoàn thành" ${o.TrangThai === 'Hoàn thành' ? 'selected' : ''}>Hoàn thành</option>
                </select>
            </td>
            <td>
                <button class="btn ghost small" onclick="viewOrderDetail(${o.MaDonHang})">Chi tiết</button>
            </td>
        `;
        table.appendChild(tr);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function updateOrderStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/donhang/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ TrangThai: status })
        });
        if (!res.ok) throw new Error('Cập nhật thất bại');
        const data = await res.json();
        showToast(data.message || 'Cập nhật trạng thái thành công!');
    } catch (err) {
        showToast('Lỗi cập nhật trạng thái', 'error');
    }
}

async function viewOrderDetail(id) {
    try {
        const res = await fetch(`${API_BASE}/donhang/${id}`);
        if (!res.ok) throw new Error('Lỗi load chi tiết');
        const data = await res.json();

        let itemsHtml = '';
        data.items.forEach(item => {
            itemsHtml += `<li>${item.Ten} x ${item.SoLuong} - ${item.DonGia.toLocaleString('vi-VN')} ₫</li>`;
        });

        const detailHtml = `
            <p><strong>Khách hàng:</strong> ${escapeHtml(data.header.KhachHang)}</p>
            <p><strong>SĐT:</strong> ${data.header.Phone || 'Không có'}</p>
            <p><strong>Địa chỉ:</strong> ${escapeHtml(data.header.DiaChi || 'Không có')}</p>
            <p><strong>Tổng tiền:</strong> ${data.header.TongTien.toLocaleString('vi-VN')} ₫</p>
            <hr>
            <strong>Sản phẩm:</strong>
            <ul>${itemsHtml}</ul>
        `;

        // Sử dụng alert tạm (sau này thay modal)
        alert(`Chi tiết đơn #${id}\n\n` + detailHtml.replace(/<[^>]*>/g, ''));
    } catch (err) {
        showToast('Lỗi xem chi tiết đơn hàng', 'error');
    }
}

// Load khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', loadOrders);