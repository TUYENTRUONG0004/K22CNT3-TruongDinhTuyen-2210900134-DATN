const API_BASE = 'http://127.0.0.1:5000/api';
let categories = [];

// Load danh mục
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/danhmuc`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        categories = await res.json();
        renderCategoryTable();
    } catch (err) {
        showToast('Lỗi tải danh mục. Kiểm tra server Flask!', 'error');
        console.error(err);
    }
}

// Render bảng
function renderCategoryTable() {
    const table = document.getElementById('categoryTable');
    if (categories.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Chưa có danh mục</td></tr>`;
        return;
    }

    let html = `<tr><th>ID</th><th>Tên danh mục</th><th>Hành động</th></tr>`;
    categories.forEach(cat => {
        html += `
            <tr>
                <td>${cat.MaDanhMuc}</td>
                <td>${escapeHtml(cat.TenDanhMuc)}</td>
                <td>
                    <button class="btn ghost small" onclick="editCategory(${cat.MaDanhMuc}, '${escapeHtml(cat.TenDanhMuc)}')">Sửa</button>
                    <button class="btn danger small" onclick="deleteCategory(${cat.MaDanhMuc})">Xóa</button>
                </td>
            </tr>
        `;
    });
    table.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Edit
function editCategory(id, name) {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categorySubmitBtn').textContent = 'Cập nhật danh mục';
}

// Delete
async function deleteCategory(id) {
    if (!confirm('Xóa danh mục này? Các sản phẩm liên quan sẽ bị ảnh hưởng!')) return;

    try {
        const res = await fetch(`${API_BASE}/danhmuc/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error || 'Xóa thất bại');
        showToast('Xóa danh mục thành công!');
        location.reload();
    } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
    }
}

// Submit form
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
            const err = await res.json();
            throw new Error(err.error || 'Thao tác thất bại');
        }

        showToast(id ? 'Cập nhật thành công!' : 'Thêm danh mục thành công!');
        location.reload();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
    }
});

document.addEventListener('DOMContentLoaded', loadCategories);