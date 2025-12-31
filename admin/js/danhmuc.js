// categories.js - Quản lý Danh mục (tách riêng, hoàn chỉnh)

const API_BASE = 'http://127.0.0.1:5000/api';
let categories = [];

// Load danh mục khi vào view
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/danhmuc`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        categories = await res.json();
        renderCategoryTable();
    } catch (err) {
        showToast('Không thể tải danh mục. Kiểm tra server Flask đang chạy?', 'error');
        console.error('Lỗi load danh mục:', err);
        const table = document.getElementById('categoryTable');
        if (table) {
            table.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Lỗi kết nối server</td></tr>`;
        }
    }
}

// Render bảng danh mục
function renderCategoryTable() {
    const table = document.getElementById('categoryTable');
    if (!table) {
        console.error('Không tìm thấy bảng categoryTable');
        return;
    }

    if (categories.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Chưa có danh mục</td></tr>`;
        return;
    }

    table.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Tên danh mục</th>
            <th>Hành động</th>
        </tr>
    `;

    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat.MaDanhMuc}</strong></td>
            <td>${escapeHtml(cat.TenDanhMuc)}</td>
            <td>
                <button class="btn ghost small" onclick="editCategory(${cat.MaDanhMuc}, '${escapeHtml(cat.TenDanhMuc)}')">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn danger small" onclick="deleteCategory(${cat.MaDanhMuc})">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </td>
        `;
        table.appendChild(tr);
    });
}

// An toàn HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chuẩn bị sửa
function editCategory(id, name) {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categorySubmitBtn').textContent = 'Cập nhật danh mục';
    showToast(`Đang sửa: ${name}`);
}

// Xóa danh mục
async function deleteCategory(id) {
    if (!confirm('Xóa danh mục này?\nCảnh báo: Các sản phẩm thuộc danh mục sẽ bị ảnh hưởng!')) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/danhmuc/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Xóa thất bại');
        const data = await res.json();
        showToast(data.message || 'Xóa thành công!');
        loadCategories();
    } catch (err) {
        showToast('Lỗi xóa danh mục', 'error');
    }
}

// Submit form thêm/sửa
document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editCategoryId').value;
    const name = document.getElementById('categoryName').value.trim();

    if (!name) {
        showToast('Tên danh mục không được để trống!', 'error');
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/danhmuc/${id}` : `${API_BASE}/danhmuc`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ TenDanhMuc: name })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Thao tác thất bại');
        }

        const data = await res.json();
        showToast(data.message || (id ? 'Cập nhật thành công!' : 'Thêm danh mục thành công!'));

        // Reset form
        document.getElementById('categoryForm').reset();
        document.getElementById('editCategoryId').value = '';
        document.getElementById('categorySubmitBtn').textContent = 'Thêm danh mục';

        loadCategories(); // Reload bảng
    } catch (err) {
        showToast(err.message || 'Lỗi kết nối server', 'error');
    }
});

// Load khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', loadCategories);