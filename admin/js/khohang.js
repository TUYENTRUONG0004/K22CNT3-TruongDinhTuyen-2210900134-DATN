// inventory.js - Quản lý Kho Hàng

const API_BASE = 'http://127.0.0.1:5000/api';
let kho = [];

async function loadInventory() {
    try {
        const res = await fetch(`${API_BASE}/kho`);
        if (!res.ok) throw new Error('Lỗi server');
        kho = await res.json();
        renderInventoryTable();
    } catch (err) {
        showToast('Lỗi tải kho hàng', 'error');
        const table = document.getElementById('inventoryTable');
        if (table) table.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Lỗi kết nối server</td></tr>`;
    }
}

function renderInventoryTable() {
    const table = document.getElementById('inventoryTable');
    if (!table) return;

    if (kho.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Chưa có dữ liệu kho</td></tr>`;
        return;
    }

    table.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Ảnh</th>
            <th>Tên sản phẩm</th>
            <th>Số lượng tồn</th>
            <th>Hành động</th>
        </tr>
    `;

    kho.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.MaDoChoi}</td>
            <td><img src="${item.AnhURL || '/anh/no-image.jpg'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"></td>
            <td>${escapeHtml(item.TenDoChoi)}</td>
            <td><strong>${item.SoLuongTon}</strong></td>
            <td>
                <button class="btn ghost small" onclick="editKho(${item.MaDoChoi}, '${escapeHtml(item.TenDoChoi)}', ${item.SoLuongTon})">
                    Sửa số lượng
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

function editKho(id, name, current) {
    document.getElementById('editKhoId').value = id;
    document.getElementById('productInfo').value = name;  // Sửa textContent -> value nếu là input
    document.getElementById('currentStock').value = current;
    document.getElementById('newStock').value = current;
    showToast(`Đang chỉnh sửa kho cho: ${name}`);
}

document.getElementById('inventoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editKhoId').value;
    const newQty = parseInt(document.getElementById('newStock').value);

    if (!id || isNaN(newQty) || newQty < 0) {
        showToast('Số lượng không hợp lệ', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/kho/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ SoLuongTon: newQty })
        });
        if (!res.ok) throw new Error('Cập nhật thất bại');
        const data = await res.json();
        showToast(data.message || 'Cập nhật kho thành công!');
        document.getElementById('inventoryForm').reset();
        document.getElementById('editKhoId').value = '';
        document.getElementById('productInfo').value = 'Chọn sản phẩm từ bảng bên dưới';
        loadInventory();
    } catch (err) {
        showToast('Lỗi cập nhật kho', 'error');
    }
});

// Load khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', loadInventory);