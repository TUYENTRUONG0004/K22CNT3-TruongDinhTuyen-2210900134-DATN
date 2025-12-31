// promotions.js - Quản lý Khuyến Mãi

const API_BASE = 'http://127.0.0.1:5000/api';
let promotions = [];

async function loadPromotions() {
    try {
        const res = await fetch(`${API_BASE}/khuyenmai`);
        if (!res.ok) throw new Error('Lỗi server');
        promotions = await res.json();
        renderPromotionTable();
    } catch (err) {
        showToast('Lỗi tải khuyến mãi', 'error');
        const table = document.getElementById('promotionTable');
        if (table) table.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Lỗi kết nối server</td></tr>`;
    }
}

function renderPromotionTable() {
    const table = document.getElementById('promotionTable');
    if (!table) return;

    if (promotions.length === 0) {
        table.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Chưa có khuyến mãi nào</td></tr>`;
        return;
    }

    table.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Mã code</th>
            <th>Tên khuyến mãi</th>
            <th>Loại</th>
            <th>Giá trị</th>
            <th>Điều kiện tối thiểu</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
        </tr>
    `;

    promotions.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.MaKhuyenMai}</td>
            <td><strong>${escapeHtml(p.MaCode)}</strong></td>
            <td>${escapeHtml(p.TenKhuyenMai)}</td>
            <td>${p.Loai === 'Percent' ? 'Phần trăm' : 'Số tiền'}</td>
            <td>${p.GiaTri.toLocaleString('vi-VN')} ${p.Loai === 'Percent' ? '%' : '₫'}</td>
            <td>${p.DieuKienToiThieu.toLocaleString('vi-VN')} ₫</td>
            <td><span class="badge ${p.TrangThai === 'Active' ? 'bg-success' : 'bg-secondary'}">${p.TrangThai === 'Active' ? 'Hoạt động' : 'Tạm dừng'}</span></td>
            <td>
                <button class="btn ghost small" onclick="editPromotion(${p.MaKhuyenMai}, '${escapeHtml(p.MaCode)}', '${escapeHtml(p.TenKhuyenMai)}', '${p.Loai}', ${p.GiaTri}, ${p.DieuKienToiThieu}, '${p.TrangThai}')">
                    Sửa
                </button>
                <button class="btn danger small" onclick="deletePromotion(${p.MaKhuyenMai})">
                    Xóa
                </button>
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

function editPromotion(id, code, name, type, value, min, status) {
    document.getElementById('editPromotionId').value = id;
    document.getElementById('maCode').value = code;
    document.getElementById('tenKhuyenMai').value = name;
    document.getElementById('loai').value = type;
    document.getElementById('giaTri').value = value;
    document.getElementById('dieuKien').value = min;
    document.getElementById('trangThai').value = status;
    document.getElementById('promotionSubmitBtn').textContent = 'Cập nhật khuyến mãi';
    showToast(`Đang sửa: ${code}`);
}

async function deletePromotion(id) {
    if (!confirm('Xóa khuyến mãi này? Các đơn hàng đã áp dụng sẽ không bị ảnh hưởng.')) return;

    try {
        const res = await fetch(`${API_BASE}/khuyenmai/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Xóa thất bại');
        const data = await res.json();
        showToast(data.message || 'Xóa thành công');
        loadPromotions();
    } catch (err) {
        showToast('Lỗi xóa khuyến mãi', 'error');
    }
}

document.getElementById('promotionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editPromotionId').value;
    const data = {
        MaCode: document.getElementById('maCode').value.trim().toUpperCase(),
        TenKhuyenMai: document.getElementById('tenKhuyenMai').value.trim(),
        Loai: document.getElementById('loai').value,
        GiaTri: parseInt(document.getElementById('giaTri').value),
        DieuKienToiThieu: parseInt(document.getElementById('dieuKien').value) || 0,
        TrangThai: document.getElementById('trangThai').value
    };

    if (!data.MaCode || !data.TenKhuyenMai || isNaN(data.GiaTri) || data.GiaTri <= 0) {
        showToast('Vui lòng điền đầy đủ thông tin hợp lệ', 'error');
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/khuyenmai/${id}` : `${API_BASE}/khuyenmai`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Thao tác thất bại');
        }

        const result = await res.json();
        showToast(result.message || (id ? 'Cập nhật thành công!' : 'Thêm khuyến mãi thành công!'));

        document.getElementById('promotionForm').reset();
        document.getElementById('editPromotionId').value = '';
        document.getElementById('promotionSubmitBtn').textContent = 'Thêm khuyến mãi';

        loadPromotions();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Load khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', loadPromotions);