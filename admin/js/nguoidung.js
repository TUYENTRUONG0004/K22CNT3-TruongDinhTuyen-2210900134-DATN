const API_BASE = 'http://127.0.0.1:5000/api';
let users = [];

async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE}/nguoidung`);
        if (!res.ok) throw new Error('Lỗi server');
        users = await res.json();
        renderUserTable();
    } catch (err) {
        showToast('Lỗi tải người dùng', 'error');
    }
}

function renderUserTable() {
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Chưa có người dùng</td></tr>`;
        return;
    }

    users.forEach(user => {
        const badge = user.VaiTro === 'Admin' ? 'bg-success' : user.VaiTro === 'NguoiBan' ? 'bg-warning text-dark' : 'bg-secondary';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.MaNguoiDung}</td>
            <td>${escapeHtml(user.TenNguoiDung)}</td>
            <td>${escapeHtml(user.Email)}</td>
            <td><span class="badge ${badge}">${user.VaiTro}</span></td>
            <td>${user.SoDienThoai || '-'}</td>
            <td>${new Date(user.NgayTao).toLocaleDateString('vi-VN')}</td>
            <td>
                <button class="btn ghost small" onclick="openEditModal(${user.MaNguoiDung})">Sửa</button>
                <button class="btn danger small" onclick="deleteUser(${user.MaNguoiDung}, '${escapeHtml(user.TenNguoiDung)}')">Xóa</button>
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

function openEditModal(id) {
    const user = users.find(u => u.MaNguoiDung === id);
    if (!user) return;

    document.getElementById('editUserId').value = id;
    document.getElementById('editTen').value = user.TenNguoiDung;
    document.getElementById('editEmail').value = user.Email;
    document.getElementById('editVaiTro').value = user.VaiTro;
    document.getElementById('editSoDienThoai').value = user.SoDienThoai || '';

    document.getElementById('editModal').style.display = 'flex';
}

document.querySelector('.close-modal').onclick = () => {
    document.getElementById('editModal').style.display = 'none';
};

window.onclick = (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) modal.style.display = 'none';
};

document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editUserId').value;
    const matKhau = document.getElementById('editMatKhau').value.trim();
    const data = {
        TenNguoiDung: document.getElementById('editTen').value.trim(),
        Email: document.getElementById('editEmail').value.trim(),
        VaiTro: document.getElementById('editVaiTro').value,
        SoDienThoai: document.getElementById('editSoDienThoai').value.trim() || null
    };

    if (matKhau) {
        data.MatKhau = matKhau;
    }

    if (!data.TenNguoiDung || !data.Email) {
        showToast('Tên và email không được để trống', 'error');
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
        location.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ==================== XÓA NGƯỜI DÙNG ====================
async function deleteUser(id, name) {
    if (!confirm(`Bạn có chắc muốn xóa người dùng "${name}"?\n\nCảnh báo: Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn tài khoản này!`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/nguoidung/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Xóa thất bại');
        }

        showToast(data.message || 'Xóa người dùng thành công!', 'success');
        location.reload();
    } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
        console.error('Delete error:', err);
    }
};

document.addEventListener('DOMContentLoaded', loadUsers);
