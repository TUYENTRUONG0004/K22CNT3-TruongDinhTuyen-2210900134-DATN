const API_BASE = 'http://127.0.0.1:5000/api';
let addresses = [];

// Load danh sách địa chỉ
async function loadAddresses() {
    try {
        const res = await fetch(`${API_BASE}/diachigiaohang`);
        if (!res.ok) throw new Error('Lỗi server');
        addresses = await res.json();
        renderAddressTable();
    } catch (err) {
        showToast('Lỗi tải danh sách địa chỉ', 'error');
        const tbody = document.querySelector('#addressTable tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Lỗi kết nối server</td></tr>`;
    }
}

// Render bảng
function renderAddressTable() {
    const tbody = document.querySelector('#addressTable tbody');
    tbody.innerHTML = '';

    if (addresses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Chưa có địa chỉ giao hàng nào</td></tr>`;
        return;
    }

    addresses.forEach(addr => {
        // Lấy tên khách hàng từ MaNguoiDung (có thể join backend hoặc fetch riêng, tạm để ID + tên nếu có)
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${addr.MaDiaChi}</strong></td>
            <td>Khách ID: ${addr.MaNguoiDung}</td>
            <td>${escapeHtml(addr.TenNguoiNhan || 'Chưa đặt tên')}</td>
            <td>${escapeHtml(addr.SoDienThoai || '-')}</td>
            <td>${escapeHtml(addr.DiaChi)}</td>
            <td>
                <span class="badge ${addr.MacDinh ? 'bg-success' : 'bg-secondary'}">
                    ${addr.MacDinh ? 'Mặc định' : 'Không'}
                </span>
            </td>
            <td>
                <button class="btn ghost small" onclick="openEditModal(${addr.MaDiaChi})">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn danger small" onclick="deleteAddress(${addr.MaDiaChi})">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mở modal sửa
function openEditModal(id) {
    const addr = addresses.find(a => a.MaDiaChi === id);
    if (!addr) return;

    document.getElementById('editAddressId').value = id;
    document.getElementById('editTenNguoiNhan').value = addr.TenNguoiNhan || '';
    document.getElementById('editSoDienThoai').value = addr.SoDienThoai || '';
    document.getElementById('editDiaChi').value = addr.DiaChi;
    document.getElementById('editMacDinh').checked = addr.MacDinh == 1;

    document.getElementById('editModal').style.display = 'flex';
}

// Đóng modal
document.querySelector('.close-modal').onclick = () => {
    document.getElementById('editModal').style.display = 'none';
};

window.onclick = (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) modal.style.display = 'none';
};

// Xóa địa chỉ
async function deleteAddress(id) {
    if (!confirm('Xóa địa chỉ giao hàng này? Không thể hoàn tác!')) return;

    try {
        const res = await fetch(`${API_BASE}/diachigiaohang/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Xóa thất bại');
        showToast('Xóa địa chỉ thành công');
        loadAddresses();
    } catch (err) {
        showToast('Lỗi xóa địa chỉ', 'error');
    }
}

// Submit sửa địa chỉ
document.getElementById('editAddressForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editAddressId').value;
    const data = {
        TenNguoiNhan: document.getElementById('editTenNguoiNhan').value.trim() || null,
        SoDienThoai: document.getElementById('editSoDienThoai').value.trim() || null,
        DiaChi: document.getElementById('editDiaChi').value.trim(),
        MacDinh: document.getElementById('editMacDinh').checked ? 1 : 0
    };

    if (!data.DiaChi) {
        showToast('Địa chỉ không được để trống', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/diachigiaohang/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Cập nhật thất bại');
        }

        showToast('Cập nhật địa chỉ thành công!');
        document.getElementById('editModal').style.display = 'none';
        loadAddresses();
    } catch (err) {
        showToast(err.message || 'Lỗi kết nối server', 'error');
    }
});

// Load khi vào trang
document.addEventListener('DOMContentLoaded', loadAddresses);