const API_BASE = 'http://127.0.0.1:5000/api';
let kho = [];
let products = [];

// Load dữ liệu kho hàng và sản phẩm
async function loadInventory() {
    try {
        const [khoRes, prodRes] = await Promise.all([
            fetch(`${API_BASE}/kho`),
            fetch(`${API_BASE}/dochoi`)
        ]);

        if (!khoRes.ok || !prodRes.ok) throw new Error('Lỗi server');

        kho = await khoRes.json();
        products = await prodRes.json();

        console.log('Loaded inventory:', kho.length);
        console.log('Loaded products:', products.length);

        renderProductSelect();
        renderInventoryTable();
        renderNoStockTable();
    } catch (err) {
        showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
        console.error('Load error:', err);
    }
}

// Render dropdown sản phẩm
function renderProductSelect() {
    const select = document.getElementById('productSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';

    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.MaDoChoi;
        option.textContent = `${p.TenDoChoi} (ID: ${p.MaDoChoi})`;
        select.appendChild(option);
    });

    // Event khi chọn sản phẩm
    select.addEventListener('change', (e) => {
        const productId = parseInt(e.target.value);
        if (!productId) {
            document.getElementById('productInfo').value = '';
            document.getElementById('currentStock').value = '0';
            document.getElementById('newStock').value = '';
            return;
        }

        const product = products.find(p => p.MaDoChoi === productId);
        const khoItem = kho.find(k => k.MaDoChoi === productId);

        if (product) {
            document.getElementById('productInfo').value = `${product.TenDoChoi} - Giá: ${Number(product.Gia).toLocaleString('vi-VN')}₫`;
        }

        if (khoItem) {
            document.getElementById('currentStock').value = khoItem.SoLuongTon;
            document.getElementById('newStock').value = khoItem.SoLuongTon;
            document.getElementById('formMode').value = 'edit';
            document.getElementById('editKhoId').value = productId;
            document.getElementById('formTitle').textContent = 'Cập nhật tồn kho';
            document.getElementById('submitBtn').textContent = 'Cập nhật kho';
        } else {
            document.getElementById('currentStock').value = '0 (Chưa có trong kho)';
            document.getElementById('newStock').value = '0';
            document.getElementById('formMode').value = 'add';
            document.getElementById('editKhoId').value = productId;
            document.getElementById('formTitle').textContent = 'Thêm vào kho';
            document.getElementById('submitBtn').textContent = 'Thêm vào kho';
        }
    });
}

// Render bảng tồn kho
function renderInventoryTable() {
    const tbody = document.querySelector('#inventoryTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (kho.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Chưa có dữ liệu kho</td></tr>`;
        return;
    }

    kho.forEach(item => {
        const tr = document.createElement('tr');
        const ngayCapNhat = item.NgayCapNhat ? new Date(item.NgayCapNhat).toLocaleString('vi-VN') : 'N/A';
        
        tr.innerHTML = `
            <td>${item.MaDoChoi}</td>
            <td><img src="${item.AnhURL || '/anh/no-image.jpg'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" onerror="this.src='/anh/no-image.jpg'"></td>
            <td>${escapeHtml(item.TenDoChoi)}</td>
            <td><strong style="color: ${item.SoLuongTon > 0 ? '#28a745' : '#dc3545'}">${item.SoLuongTon}</strong></td>
            <td>${ngayCapNhat}</td>
            <td>
                <button class="btn ghost small" onclick="editKho(${item.MaDoChoi})">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn danger small" onclick="deleteKho(${item.MaDoChoi}, '${escapeHtml(item.TenDoChoi)}')">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render bảng sản phẩm chưa có trong kho
function renderNoStockTable() {
    const tbody = document.querySelector('#noStockTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Tìm sản phẩm chưa có trong kho
    const khoIds = kho.map(k => k.MaDoChoi);
    const noStockProducts = products.filter(p => !khoIds.includes(p.MaDoChoi));

    if (noStockProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Tất cả sản phẩm đã có trong kho</td></tr>`;
        return;
    }

    noStockProducts.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.MaDoChoi}</td>
            <td><img src="${p.AnhURL || '/anh/no-image.jpg'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" onerror="this.src='/anh/no-image.jpg'"></td>
            <td>${escapeHtml(p.TenDoChoi)}</td>
            <td>${Number(p.Gia).toLocaleString('vi-VN')}₫</td>
            <td>
                <button class="btn primary small" onclick="addToKho(${p.MaDoChoi}, '${escapeHtml(p.TenDoChoi)}')">
                    <i class="fas fa-plus"></i> Thêm vào kho
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chọn sản phẩm để sửa
function editKho(id) {
    const item = kho.find(k => k.MaDoChoi === id);
    if (!item) {
        showToast('Không tìm thấy sản phẩm trong kho', 'error');
        return;
    }

    document.getElementById('productSelect').value = id;
    document.getElementById('editKhoId').value = id;
    document.getElementById('productInfo').value = `${item.TenDoChoi}`;
    document.getElementById('currentStock').value = item.SoLuongTon;
    document.getElementById('newStock').value = item.SoLuongTon;
    document.getElementById('formMode').value = 'edit';
    document.getElementById('formTitle').textContent = 'Cập nhật tồn kho';
    document.getElementById('submitBtn').textContent = 'Cập nhật kho';

    // Scroll lên form
    document.querySelector('.panel').scrollIntoView({ behavior: 'smooth' });
    showToast(`Đang chỉnh sửa kho cho: ${item.TenDoChoi}`, 'info');
}

// Thêm sản phẩm vào kho (từ bảng sản phẩm chưa có trong kho)
function addToKho(id, name) {
    document.getElementById('productSelect').value = id;
    document.getElementById('editKhoId').value = id;
    document.getElementById('productInfo').value = name;
    document.getElementById('currentStock').value = '0 (Chưa có trong kho)';
    document.getElementById('newStock').value = '0';
    document.getElementById('formMode').value = 'add';
    document.getElementById('formTitle').textContent = 'Thêm vào kho';
    document.getElementById('submitBtn').textContent = 'Thêm vào kho';

    // Scroll lên form
    document.querySelector('.panel').scrollIntoView({ behavior: 'smooth' });
    showToast(`Thêm sản phẩm vào kho: ${name}`, 'info');
}

// Xóa khỏi kho
async function deleteKho(id, name) {
    if (!confirm(`Bạn có chắc muốn xóa "${name}" khỏi kho?\nSản phẩm sẽ vẫn tồn tại nhưng số lượng tồn kho sẽ bị xóa.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/kho/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Xóa thất bại');
        }

        showToast(data.message || 'Xóa khỏi kho thành công!', 'success');
        location.reload();
    } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
        console.error('Delete error:', err);
    }
}

// Reset form
function resetForm() {
    const form = document.getElementById('inventoryForm');
    if (form) form.reset();

    document.getElementById('editKhoId').value = '';
    document.getElementById('productInfo').value = '';
    document.getElementById('currentStock').value = '0';
    document.getElementById('formMode').value = 'add';
    document.getElementById('formTitle').textContent = 'Thêm / Cập nhật tồn kho';
    document.getElementById('submitBtn').textContent = 'Lưu kho hàng';
}

// Submit form - Thêm hoặc Sửa
document.getElementById('inventoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editKhoId').value;
    const mode = document.getElementById('formMode').value;
    const newQty = parseInt(document.getElementById('newStock').value);

    if (!id) {
        showToast('Vui lòng chọn sản phẩm!', 'error');
        return;
    }

    if (isNaN(newQty) || newQty < 0) {
        showToast('Số lượng không hợp lệ (phải >= 0)', 'error');
        return;
    }

    try {
        let res;
        
        if (mode === 'add') {
            // Thêm mới vào kho
            res = await fetch(`${API_BASE}/kho`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    MaDoChoi: parseInt(id), 
                    SoLuongTon: newQty 
                })
            });
        } else {
            // Cập nhật kho
            res = await fetch(`${API_BASE}/kho/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ SoLuongTon: newQty })
            });
        }

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Thao tác thất bại');
        }

        showToast(
            mode === 'add' ? 'Thêm vào kho thành công!' : 'Cập nhật kho thành công!',
            'success'
        );

        location.reload();
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
        console.error('Submit error:', err);
    }
});

// Load khi mở trang
document.addEventListener('DOMContentLoaded', () => {
    console.log('KhoHang page loaded');
    loadInventory();
});
