// ================= SẢN PHẨM =================
loadSanPham();
loadNguoiDung();
loadDonHang();

function loadSanPham() {
    fetch('/api/admin/dochoi')
        .then(res => res.json())
        .then(data => {
            let html = `
                <tr>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>Giá</th>
                    <th>Hành động</th>
                </tr>`;
            data.forEach(p => {
                html += `
                <tr>
                    <td>${p.MaDoChoi}</td>
                    <td>${p.TenDoChoi}</td>
                    <td>${p.Gia}</td>
                    <td>
                        <button class="admin-btn delete" onclick="xoaSanPham(${p.MaDoChoi})">Xóa</button>
                    </td>
                </tr>`;
            });
            document.getElementById('productTable').innerHTML = html;
        });
}

function themSanPham() {
    const data = {
        TenDoChoi: document.getElementById('ten').value,
        Gia: document.getElementById('gia').value,
        MoTa: document.getElementById('mota').value,
        AnhURL: document.getElementById('anh').value,
        MaNguoiBan: 2,
        MaDanhMuc: 1
    };

    fetch('/api/admin/dochoi', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(() => location.reload());
}

function xoaSanPham(id) {
    fetch('/api/admin/dochoi/' + id, { method: 'DELETE' })
        .then(() => location.reload());
}

// ================= NGƯỜI DÙNG =================
function loadNguoiDung() {
    fetch('/api/admin/nguoidung')
        .then(res => res.json())
        .then(data => {
            let html = `
                <tr>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                </tr>`;
            data.forEach(u => {
                html += `
                <tr>
                    <td>${u.MaNguoiDung}</td>
                    <td>${u.TenNguoiDung}</td>
                    <td>${u.Email}</td>
                    <td>${u.VaiTro}</td>
                </tr>`;
            });
            document.getElementById('userTable').innerHTML = html;
        });
}

// ================= ĐƠN HÀNG =================
function loadDonHang() {
    fetch('/api/admin/donhang')
        .then(res => res.json())
        .then(data => {
            let html = `
                <tr>
                    <th>ID</th>
                    <th>Người mua</th>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                </tr>`;
            data.forEach(d => {
                html += `
                <tr>
                    <td>${d.MaDonHang}</td>
                    <td>${d.NguoiMua}</td>
                    <td>${d.SanPham}</td>
                    <td>${d.SoLuong}</td>
                    <td>${d.TongTien}</td>
                    <td>${d.TrangThai}</td>
                </tr>`;
            });
            document.getElementById('orderTable').innerHTML = html;
        });
}
