const API_BASE = 'http://127.0.0.1:5000/api';
let products = [];
let categories = [];

async function loadProducts() {
    try {
        const [prodRes, catRes] = await Promise.all([
            fetch(`${API_BASE}/dochoi`),
            fetch(`${API_BASE}/danhmuc`)
        ]);
        products = await prodRes.json();
        categories = await catRes.json();
        renderCategorySelect();
        renderProductTable();
    } catch (err) {
        showToast('Lỗi tải dữ liệu sản phẩm', 'error');
    }
}

function renderCategorySelect() {
    const select = document.getElementById('danhMuc');
    select.innerHTML = '<option value="">-- Chọn danh mục --</option>';
    categories.forEach(cat => {
        select.innerHTML += `<option value="${cat.MaDanhMuc}">${cat.TenDanhMuc}</option>`;
    });
}

function renderProductTable() {
    const table = document.getElementById('productTable');
    table.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Ảnh</th>
            <th>Tên sản phẩm</th>
            <th>Giá</th>
            <th>Danh mục</th>
            <th>Tồn kho</th>
            <th>Hành động</th>
        </tr>
    `;

    if (products.length === 0) {
        table.innerHTML += `<tr><td colspan="7" class="text-center text-muted py-4">Chưa có sản phẩm</td></tr>`;
        return;
    }

    products.forEach(p => {
        const catName = categories.find(c => c.MaDanhMuc === p.MaDanhMuc)?.TenDanhMuc || 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.MaDoChoi}</td>
            <td><img src="${p.AnhURL || '/anh/no-image.jpg'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"></td>
            <td>${escapeHtml(p.TenDoChoi)}</td>
            <td>${p.Gia.toLocaleString('vi-VN')} ₫</td>
            <td>${escapeHtml(catName)}</td>
            <td>${p.SoLuongTon || 0}</td>
            <td>
                <button class="btn ghost small" onclick="editProduct(${p.MaDoChoi})">Sửa</button>
                <button class="btn danger small" onclick="deleteProduct(${p.MaDoChoi})">Xóa</button>
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

async function editProduct(id) {
    const product = products.find(p => p.MaDoChoi === id);
    if (!product) return;

    document.getElementById('editProductId').value = id;
    document.getElementById('ten').value = product.TenDoChoi;
    document.getElementById('gia').value = product.Gia;
    document.getElementById('danhMuc').value = product.MaDanhMuc;
    document.getElementById('moTa').value = product.MoTa || '';

    if (product.AnhURL) {
        document.getElementById('preview').innerHTML = `<img src="${product.AnhURL}">`;
    }

    showToast(`Đang sửa sản phẩm: ${product.TenDoChoi}`);
}

async function deleteProduct(id) {
    if (!confirm('Xóa sản phẩm này? Thao tác không thể hoàn tác!')) return;

    try {
        const res = await fetch(`${API_BASE}/dochoi/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Xóa thất bại');
        showToast('Xóa sản phẩm thành công');
        loadProducts();
    } catch (err) {
        showToast('Lỗi xóa sản phẩm', 'error');
    }
}

// Preview ảnh khi chọn file
document.getElementById('anh')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('preview').innerHTML = `<img src="${ev.target.result}">`;
        };
        reader.readAsDataURL(file);
    }
});

// Submit form
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editProductId').value;
    const formData = new FormData();
    formData.append('TenDoChoi', document.getElementById('ten').value.trim());
    formData.append('Gia', document.getElementById('gia').value);
    formData.append('MaDanhMuc', document.getElementById('danhMuc').value);
    formData.append('MoTa', document.getElementById('moTa').value.trim());

    const fileInput = document.getElementById('anh');
    if (fileInput.files[0]) {
        formData.append('anh', fileInput.files[0]);
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/dochoi/${id}` : `${API_BASE}/dochoi`;

    try {
        const res = await fetch(url, {
            method,
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Thao tác thất bại');
        }

        showToast(id ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
        document.getElementById('productForm').reset();
        document.getElementById('preview').innerHTML = '';
        document.getElementById('editProductId').value = '';
        loadProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Load khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', loadProducts);