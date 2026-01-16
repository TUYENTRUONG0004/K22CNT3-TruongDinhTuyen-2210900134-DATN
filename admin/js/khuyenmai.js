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
    }
}

function renderPromotionTable() {
    const tbody = document.querySelector('#promotionTable tbody');
    tbody.innerHTML = '';

    if (promotions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Chưa có khuyến mãi</td></tr>`;
        return;
    }

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
                <button class="btn ghost small" onclick="editPromotion(${p.MaKhuyenMai})">Sửa</button>
                <button class="btn danger small" onclick="deletePromotion(${p.MaKhuyenMai})">Xóa</button>
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

function editPromotion(id) {
    const p = promotions.find(x => x.MaKhuyenMai === id);
    if (!p) return;

    document.getElementById('editPromotionId').value = id;
    document.getElementById('maCode').value = p.MaCode;
    document.getElementById('tenKhuyenMai').value = p.TenKhuyenMai;
    document.getElementById('loai').value = p.Loai;
    document.getElementById('giaTri').value = p.GiaTri;
    document.getElementById('dieuKien').value = p.DieuKienToiThieu;
    document.getElementById('trangThai').value = p.TrangThai;
    document.getElementById('promotionSubmitBtn').textContent = 'Cập nhật khuyến mãi';
}

async function deletePromotion(id) {
    if (!confirm('Xóa khuyến mãi này?')) return;

    try {
        const res = await fetch(`${API_BASE}/khuyenmai/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Xóa thất bại');
        showToast('Xóa khuyến mãi thành công!');
        location.reload();
    } catch (err) {
        showToast('Lỗi xóa', 'error');
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

        showToast(id ? 'Cập nhật thành công!' : 'Thêm khuyến mãi thành công!');
        location.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.addEventListener('DOMContentLoaded', loadPromotions);