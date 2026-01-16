const API_BASE = 'http://127.0.0.1:5000/api';
let products = [];
let categories = [];
let users = [];

// ID người bán hiện tại (sẽ được lấy động từ danh sách người dùng)
let currentSellerId = null;

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Load dữ liệu sản phẩm, danh mục và người dùng
async function loadProducts() {
    try {
        const [prodRes, catRes, userRes] = await Promise.all([
            fetch(`${API_BASE}/dochoi`),
            fetch(`${API_BASE}/danhmuc`),
            fetch(`${API_BASE}/nguoidung`)
        ]);

        if (!prodRes.ok || !catRes.ok || !userRes.ok) {
            throw new Error('Lỗi tải dữ liệu từ server');
        }

        products = await prodRes.json();
        categories = await catRes.json();
        users = await userRes.json();

        // Tìm người bán đầu tiên (VaiTro = NguoiBan) hoặc dùng user đầu tiên
        const seller = users.find(u => u.VaiTro === 'NguoiBan') || users[0];
        if (seller) {
            currentSellerId = seller.MaNguoiDung;
            console.log('Using seller:', seller.TenNguoiDung, 'ID:', currentSellerId);
        } else {
            console.warn('Không tìm thấy người bán trong hệ thống!');
        }

        console.log('Loaded products:', products.length);
        console.log('Loaded categories:', categories.length);
        console.log('Loaded users:', users.length);

        renderCategorySelect();
        renderProductTable();
    } catch (err) {
        showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
        console.error('Load error:', err);
    }
}

// Render dropdown danh mục
function renderCategorySelect() {
    const select = document.getElementById('danhMuc');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Chọn danh mục --</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.MaDanhMuc;
        option.textContent = cat.TenDanhMuc;
        select.appendChild(option);
    });
}

// Render bảng sản phẩm
function renderProductTable() {
    const tbody = document.querySelector('#productTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Chưa có sản phẩm</td></tr>`;
        return;
    }

    products.forEach(p => {
        const catName = categories.find(c => c.MaDanhMuc === p.MaDanhMuc)?.TenDanhMuc || 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.MaDoChoi}</td>
            <td><img src="${p.AnhURL || '/anh/no-image.jpg'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" onerror="this.src='/anh/no-image.jpg'"></td>
            <td>${escapeHtml(p.TenDoChoi)}</td>
            <td>${Number(p.Gia || 0).toLocaleString('vi-VN')} ₫</td>
            <td>${escapeHtml(catName)}</td>
            <td>${p.SoLuongTon || 0}</td>
            <td>
                <button class="btn ghost small" onclick="editProduct(${p.MaDoChoi})">Sửa</button>
                <button class="btn danger small" onclick="deleteProduct(${p.MaDoChoi})">Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Preview ảnh khi chọn file
const anhInput = document.getElementById('anh');
if (anhInput) {
    anhInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const preview = document.getElementById('preview');
        if (!preview) return;
        
        if (file) {
            // Kiểm tra loại file
            if (!file.type.startsWith('image/')) {
                preview.innerHTML = '<p style="color:red;">Vui lòng chọn file ảnh!</p>';
                e.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<img src="${ev.target.result}" style="max-width:150px; border-radius:8px;">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '<p>Chưa chọn ảnh</p>';
        }
    });
}

// Load khi mở trang
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, fetching data...');
    loadProducts();
});

// Edit sản phẩm - điền dữ liệu vào form
function editProduct(id) {
    const product = products.find(p => p.MaDoChoi === id);
    if (!product) {
        showToast('Không tìm thấy sản phẩm', 'error');
        return;
    }

    console.log('Editing product:', product);

    // Điền dữ liệu vào form
    document.getElementById('editProductId').value = id;
    document.getElementById('ten').value = product.TenDoChoi || '';
    document.getElementById('gia').value = product.Gia || '';
    document.getElementById('danhMuc').value = product.MaDanhMuc || '';
    document.getElementById('moTa').value = product.MoTa || '';

    // Preview ảnh hiện tại
    const preview = document.getElementById('preview');
    if (preview) {
        preview.innerHTML = product.AnhURL 
            ? `<img src="${product.AnhURL}" style="max-width:150px; border-radius:8px;" onerror="this.innerHTML='<p>Ảnh không tồn tại</p>'">` 
            : '<p>Chưa có ảnh</p>';
    }

    // Scroll lên form
    document.querySelector('.panel').scrollIntoView({ behavior: 'smooth' });
    showToast('Đang chỉnh sửa sản phẩm: ' + product.TenDoChoi, 'info');
}

// Xóa sản phẩm
async function deleteProduct(id) {
    const product = products.find(p => p.MaDoChoi === id);
    if (!product) {
        showToast('Không tìm thấy sản phẩm', 'error');
        return;
    }

    if (!confirm(`Bạn chắc chắn muốn xóa sản phẩm "${product.TenDoChoi}"?`)) {
        return;
    }

    try {
        console.log('Deleting product ID:', id);
        const res = await fetch(`${API_BASE}/dochoi/${id}`, { 
            method: 'DELETE' 
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Xóa thất bại');
        }

        showToast(data.message || 'Xóa sản phẩm thành công!', 'success');
        location.reload();
    } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
        console.error('Delete error:', err);
    }
}

// Reset form về trạng thái thêm mới
function resetForm() {
    const form = document.getElementById('productForm');
    if (form) form.reset();
    
    document.getElementById('editProductId').value = '';
    
    const preview = document.getElementById('preview');
    if (preview) preview.innerHTML = '<p>Chưa chọn ảnh</p>';
}

// Submit form - Thêm hoặc Sửa
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editProductId').value.trim();
        const ten = document.getElementById('ten').value.trim();
        const giaStr = document.getElementById('gia').value.trim();
        const maDanhMuc = document.getElementById('danhMuc').value.trim();
        const moTa = document.getElementById('moTa').value.trim();

        // Validation
        if (!ten) {
            showToast('Vui lòng nhập tên sản phẩm!', 'error');
            return;
        }

        if (!giaStr || isNaN(Number(giaStr)) || Number(giaStr) <= 0) {
            showToast('Giá phải là số dương!', 'error');
            return;
        }

        if (!maDanhMuc) {
            showToast('Vui lòng chọn danh mục!', 'error');
            return;
        }

        // Tạo FormData
        const formData = new FormData();
        formData.append('TenDoChoi', ten);
        formData.append('Gia', giaStr);
        formData.append('MaDanhMuc', maDanhMuc);
        formData.append('MoTa', moTa);

        // Nếu là thêm mới, cần gửi MaNguoiBan
        if (!id) {
            if (!currentSellerId) {
                showToast('Không tìm thấy người bán hợp lệ trong hệ thống!', 'error');
                return;
            }
            formData.append('MaNguoiBan', currentSellerId);
        }

        // Thêm file ảnh nếu có
        const file = document.getElementById('anh').files[0];
        if (file) {
            formData.append('anh', file);
        }

        // Log để debug
        console.log('=== SUBMIT FORM ===');
        console.log('Mode:', id ? 'UPDATE' : 'CREATE');
        console.log('Data:', {
            TenDoChoi: ten,
            Gia: giaStr,
            MaDanhMuc: maDanhMuc,
            MoTa: moTa,
            MaNguoiBan: id ? 'N/A' : currentSellerId,
            hasFile: !!file
        });

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/dochoi/${id}` : `${API_BASE}/dochoi`;

        try {
            const res = await fetch(url, { 
                method, 
                body: formData 
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Thao tác thất bại');
            }

            console.log('Response:', data);

            showToast(
                id ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!',
                'success'
            );

            location.reload();
        } catch (err) {
            showToast('Lỗi: ' + err.message, 'error');
            console.error('Submit error:', err);
        }
    });
}