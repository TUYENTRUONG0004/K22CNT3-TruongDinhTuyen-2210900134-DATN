const API_BASE = 'http://127.0.0.1:5000/api';
let users = [];

// Load danh sách
async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE}/nguoidung`);
        if (!res.ok) throw new Error('Lỗi server');
        users = await res.json();
        renderUserTable();
    } catch (err) {
        showToast('Lỗi tải danh sách người dùng', 'error');
    }
}

// Render bảng
function renderUserTable() {
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Chưa có người dùng nào</td></tr>`;
        return;
    }

    users.forEach(user => {
        const vaiTroBadge = user.VaiTro === 'Admin' ? 'bg-success' : 
                           user.VaiTro === 'NguoiBan' ? 'bg-warning text-dark' : 'bg-secondary';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.MaNguoiDung}</strong></td>
            <td>${escapeHtml(user.TenNguoiDung)}</td>
            <td>${escapeHtml(user.Email)}</td>
            <td><span class="badge ${vaiTroBadge}">${user.VaiTro}</span></td>
            <td>${user.SoDienThoai || '-'}</td>
            <td>${new Date(user.NgayTao).toLocaleDateString('vi-VN')}</td>
            <td>
                <button class="btn ghost small" onclick="openEditModal(${user.MaNguoiDung})">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn danger small" onclick="deleteUser(${user.MaNguoiDung})">
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
    const user = users.find(u => u.MaNguoiDung === id);
    if (!user) return;

    document.getElementById('editUserId').value = id;
    document.getElementById('editTen').value = user.TenNguoiDung;
    document.getElementById('editEmail').value = user.Email;
    document.getElementById('editVaiTro').value = user.VaiTro;
    document.getElementById('editSoDienThoai').value = user.SoDienThoai || '';
    document.getElementById('editMatKhau').value = '';

    document.getElementById('editModal').style.display = 'flex';
}

// Đóng modal
document.querySelector('.close-modal').onclick = () => {
    document.getElementById('editModal').style.display = 'none';
};

// Click ngoài modal để đóng
window.onclick = (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) modal.style.display = 'none';
};

// Xóa người dùng
async function deleteUser(id) {
    if (!confirm('Xóa người dùng này? Không thể hoàn tác!')) return;

    try {
        const res = await fetch(`${API_BASE}/nguoidung/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Xóa thất bại');
        showToast('Xóa người dùng thành công');
        loadUsers();
    } catch (err) {
        showToast('Lỗi xóa người dùng', 'error');
    }
}

// Submit sửa (modal)
document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editUserId').value;
    const data = {
        TenNguoiDung: document.getElementById('editTen').value.trim(),
        Email: document.getElementById('editEmail').value.trim(),
        VaiTro: document.getElementById('editVaiTro').value,
        SoDienThoai: document.getElementById('editSoDienThoai').value.trim() || null
    };

    const matKhau = document.getElementById('editMatKhau').value.trim();
    if (matKhau) data.MatKhauHash = matKhau;

    if (!data.TenNguoiDung || !data.Email) {
        showToast('Họ tên và email không được để trống', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/nguoidung/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Cập nhật thất bại');
        }

        showToast('Cập nhật người dùng thành công!');
        document.getElementById('editModal').style.display = 'none';
        loadUsers();
    } catch (err) {
        showToast(err.message || 'Lỗi kết nối server', 'error');
    }
});

// Load khi vào trang
document.addEventListener('DOMContentLoaded', loadUsers);