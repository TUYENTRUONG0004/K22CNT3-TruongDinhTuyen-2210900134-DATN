from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import os
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Thư mục lưu ảnh sản phẩm
app.config['UPLOAD_FOLDER'] = 'static/anh'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def get_connection():
    return pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=DESKTOP-5491VFA;"  # Thay nếu cần
        "DATABASE=bandochoi;"
        "Trusted_Connection=yes;"
    )

# ====================== HELPER ======================
def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    row = cursor.fetchone()
    if row:
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    return None

# ====================== NGƯỜI DÙNG ======================
@app.route('/api/nguoidung', methods=['GET'])
def nguoidung_list():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT MaNguoiDung, TenNguoiDung, Email, VaiTro, SoDienThoai, NgayTao
            FROM NguoiDung
            ORDER BY NgayTao DESC
        """)
        rows = cur.fetchall()

        data = [{
            "MaNguoiDung": r.MaNguoiDung,
            "TenNguoiDung": r.TenNguoiDung,
            "Email": r.Email,
            "VaiTro": r.VaiTro,
            "SoDienThoai": r.SoDienThoai,
            "NgayTao": r.NgayTao.strftime('%Y-%m-%d %H:%M:%S')
        } for r in rows]

        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

        
# ====================== DANH MỤC ======================
@app.route('/api/danhmuc', methods=['GET', 'POST'])
def danhmuc():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT MaDanhMuc, TenDanhMuc FROM DanhMuc ORDER BY TenDanhMuc")
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            data = request.get_json()
            ten = data.get('TenDanhMuc', '').strip()
            if not ten:
                return jsonify({"error": "Tên danh mục không được để trống"}), 400
            cur.execute("SELECT 1 FROM DanhMuc WHERE TenDanhMuc = ?", (ten,))
            if cur.fetchone():
                return jsonify({"error": "Tên danh mục đã tồn tại"}), 400
            cur.execute("INSERT INTO DanhMuc (TenDanhMuc) VALUES (?)", (ten,))
            conn.commit()
            cur.execute("SELECT SCOPE_IDENTITY()")
            new_id = int(cur.fetchone()[0])
            return jsonify({"message": "Thêm thành công", "MaDanhMuc": new_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/danhmuc/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def danhmuc_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM DanhMuc WHERE MaDanhMuc = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            ten = request.get_json().get('TenDanhMuc', '').strip()
            if not ten: return jsonify({"error": "Tên không được để trống"}), 400
            cur.execute("SELECT 1 FROM DanhMuc WHERE TenDanhMuc = ? AND MaDanhMuc != ?", (ten, id))
            if cur.fetchone(): return jsonify({"error": "Tên đã tồn tại"}), 400
            cur.execute("UPDATE DanhMuc SET TenDanhMuc = ? WHERE MaDanhMuc = ?", (ten, id))
            conn.commit()
            return jsonify({"message": "Cập nhật thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("SELECT 1 FROM DoChoi WHERE MaDanhMuc = ?", (id,))
            if cur.fetchone(): return jsonify({"error": "Danh mục đang có sản phẩm"}), 400
            cur.execute("DELETE FROM DanhMuc WHERE MaDanhMuc = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== SẢN PHẨM (DOCHOI) ======================
@app.route('/api/dochoi', methods=['GET', 'POST'])
def dochoi():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT d.*, ISNULL(k.SoLuongTon, 0) AS SoLuongTon
                FROM DoChoi d LEFT JOIN KhoHang k ON d.MaDoChoi = k.MaDoChoi
                ORDER BY d.NgayDang DESC
            """)
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            ten = request.form.get('TenDoChoi')
            gia = request.form.get('Gia')
            mo_ta = request.form.get('MoTa', '')
            ma_danh_muc = request.form.get('MaDanhMuc')
            ma_nguoi_ban = request.form.get('MaNguoiBan', 2)  # mặc định admin/ban

            if not all([ten, gia, ma_danh_muc]):
                return jsonify({"error": "Thiếu thông tin"}), 400

            anh_url = None
            if 'anh' in request.files and request.files['anh'].filename:
                file = request.files['anh']
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                anh_url = f"/anh/{filename}"

            cur.execute("""
                INSERT INTO DoChoi (TenDoChoi, Gia, MoTa, MaNguoiBan, MaDanhMuc, AnhURL)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (ten.strip(), int(gia), mo_ta.strip(), int(ma_nguoi_ban), int(ma_danh_muc), anh_url))
            conn.commit()
            cur.execute("SELECT SCOPE_IDENTITY()")
            new_id = int(cur.fetchone()[0])
            cur.execute("INSERT INTO KhoHang (MaDoChoi, SoLuongTon) VALUES (?, 0)", (new_id,))
            conn.commit()
            return jsonify({"message": "Thêm sản phẩm thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/dochoi/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def dochoi_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM DoChoi WHERE MaDoChoi = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            ten = request.form.get('TenDoChoi')
            gia = request.form.get('Gia')
            mo_ta = request.form.get('MoTa', '')
            ma_danh_muc = request.form.get('MaDanhMuc')
            if not all([ten, gia, ma_danh_muc]): return jsonify({"error": "Thiếu thông tin"}), 400

            cur.execute("SELECT AnhURL FROM DoChoi WHERE MaDoChoi = ?", (id,))
            anh_url = cur.fetchone().AnhURL if cur.rowcount else None

            if 'anh' in request.files and request.files['anh'].filename:
                file = request.files['anh']
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                anh_url = f"/anh/{filename}"

            cur.execute("""
                UPDATE DoChoi SET TenDoChoi = ?, Gia = ?, MoTa = ?, MaDanhMuc = ?, AnhURL = ?
                WHERE MaDoChoi = ?
            """, (ten.strip(), int(gia), mo_ta.strip(), int(ma_danh_muc), anh_url, id))
            conn.commit()
            return jsonify({"message": "Cập nhật thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("DELETE FROM KhoHang WHERE MaDoChoi = ?", (id,))
            cur.execute("DELETE FROM DoChoi WHERE MaDoChoi = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== KHO HÀNG ======================
@app.route('/api/kho', methods=['GET'])
def kho_list():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT kh.*, dc.TenDoChoi, dc.AnhURL
            FROM KhoHang kh JOIN DoChoi dc ON kh.MaDoChoi = dc.MaDoChoi
        """)
        data = dictfetchall(cur)
        return jsonify(data), 200
    finally:
        conn.close()

@app.route('/api/kho/<int:id>', methods=['PUT'])
def kho_update(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        data = request.get_json()
        sl = int(data.get('SoLuongTon', -1))
        if sl < 0: return jsonify({"error": "Số lượng không hợp lệ"}), 400
        cur.execute("UPDATE KhoHang SET SoLuongTon = ? WHERE MaDoChoi = ?", (sl, id))
        conn.commit()
        return jsonify({"message": "Cập nhật kho thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== KHUYẾN MÃI ======================
@app.route('/api/khuyenmai', methods=['GET', 'POST'])
def khuyenmai():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM KhuyenMai ORDER BY MaCode")
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            d = request.get_json()
            required = ['MaCode', 'TenKhuyenMai', 'Loai', 'GiaTri']
            if not all(k in d for k in required): return jsonify({"error": "Thiếu thông tin"}), 400
            cur.execute("SELECT 1 FROM KhuyenMai WHERE MaCode = ?", (d['MaCode'],))
            if cur.fetchone(): return jsonify({"error": "Mã code đã tồn tại"}), 400
            cur.execute("""
                INSERT INTO KhuyenMai (MaCode, TenKhuyenMai, Loai, GiaTri, DieuKienToiThieu, TrangThai)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (d['MaCode'], d['TenKhuyenMai'], d['Loai'], d['GiaTri'], d.get('DieuKienToiThieu', 0), d.get('TrangThai', 'Active')))
            conn.commit()
            return jsonify({"message": "Thêm khuyến mãi thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/khuyenmai/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def khuyenmai_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM KhuyenMai WHERE MaKhuyenMai = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            d = request.get_json()
            cur.execute("SELECT 1 FROM KhuyenMai WHERE MaCode = ? AND MaKhuyenMai != ?", (d.get('MaCode'), id))
            if cur.fetchone(): return jsonify({"error": "Mã code đã tồn tại"}), 400
            cur.execute("""
                UPDATE KhuyenMai SET MaCode = ?, TenKhuyenMai = ?, Loai = ?, GiaTri = ?, DieuKienToiThieu = ?, TrangThai = ?
                WHERE MaKhuyenMai = ?
            """, (d['MaCode'], d['TenKhuyenMai'], d['Loai'], d['GiaTri'], d.get('DieuKienToiThieu', 0), d.get('TrangThai', 'Active'), id))
            conn.commit()
            return jsonify({"message": "Cập nhật thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("DELETE FROM KhuyenMai WHERE MaKhuyenMai = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== ĐƠN HÀNG ======================
@app.route('/api/donhang', methods=['GET'])
def donhang_list():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT dh.*, nd.TenNguoiDung AS TenKhachHang
            FROM DonHang dh JOIN NguoiDung nd ON dh.MaNguoiMua = nd.MaNguoiDung
            ORDER BY dh.NgayDat DESC
        """)
        data = dictfetchall(cur)
        return jsonify(data), 200
    finally:
        conn.close()

@app.route('/api/donhang/<int:id>', methods=['GET', 'PUT'])
def donhang_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT dh.*, nd.TenNguoiDung AS TenKhachHang, nd.SoDienThoai, dcg.DiaChi
                FROM DonHang dh
                JOIN NguoiDung nd ON dh.MaNguoiMua = nd.MaNguoiDung
                LEFT JOIN DiaChiGiaoHang dcg ON dh.MaDiaChi = dcg.MaDiaChi
                WHERE dh.MaDonHang = ?
            """, (id,))
            header = dictfetchone(cur)
            if not header: return jsonify({"error": "Không tìm thấy"}), 404

            cur.execute("""
                SELECT ct.*, dc.TenDoChoi, dc.AnhURL
                FROM ChiTietDonHang ct
                JOIN DoChoi dc ON ct.MaDoChoi = dc.MaDoChoi
                WHERE ct.MaDonHang = ?
            """, (id,))
            items = dictfetchall(cur)

            return jsonify({"header": header, "items": items}), 200

        if request.method == 'PUT':
            data = request.get_json()
            trang_thai = data.get('TrangThai')
            if not trang_thai: return jsonify({"error": "Thiếu trạng thái"}), 400
            cur.execute("UPDATE DonHang SET TrangThai = ? WHERE MaDonHang = ?", (trang_thai, id))
            conn.commit()
            return jsonify({"message": "Cập nhật trạng thái thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== CÁC BẢNG KHÁC (Giỏ hàng, Địa chỉ, Thanh toán, Vận chuyển, Thông báo) ======================
# (Tương tự như trên – GET list/detail, POST, PUT, DELETE)
# Ví dụ ngắn gọn cho DiaChiGiaoHang
@app.route('/api/diachigiaohang', methods=['GET', 'POST'])
def diachigiaohang():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM DiaChiGiaoHang ORDER BY MaNguoiDung")
            return jsonify(dictfetchall(cur)), 200
        if request.method == 'POST':
            d = request.get_json()
            cur.execute("""
                INSERT INTO DiaChiGiaoHang (MaNguoiDung, TenNguoiNhan, SoDienThoai, DiaChi, MacDinh)
                VALUES (?, ?, ?, ?, ?)
            """, (d['MaNguoiDung'], d.get('TenNguoiNhan'), d.get('SoDienThoai'), d['DiaChi'], d.get('MacDinh', 0)))
            conn.commit()
            return jsonify({"message": "Thêm địa chỉ thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== GIỎ HÀNG ======================
@app.route('/api/giohang', methods=['GET', 'POST'])
def giohang():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT gh.*, nd.TenNguoiDung
                FROM GioHang gh
                JOIN NguoiDung nd ON gh.MaNguoiDung = nd.MaNguoiDung
                ORDER BY gh.NgayTao DESC
            """)
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            data = request.get_json()
            ma_nguoi_dung = data.get('MaNguoiDung')
            trang_thai = data.get('TrangThai', 'Active')
            if not ma_nguoi_dung:
                return jsonify({"error": "Thiếu MaNguoiDung"}), 400

            # Kiểm tra nếu user đã có giỏ Active thì không tạo mới (theo constraint DB)
            if trang_thai == 'Active':
                cur.execute("SELECT 1 FROM GioHang WHERE MaNguoiDung = ? AND TrangThai = 'Active'", (ma_nguoi_dung,))
                if cur.fetchone():
                    return jsonify({"error": "Người dùng đã có giỏ hàng Active"}), 400

            cur.execute("""
                INSERT INTO GioHang (MaNguoiDung, TrangThai)
                VALUES (?, ?)
            """, (ma_nguoi_dung, trang_thai))
            conn.commit()
            cur.execute("SELECT SCOPE_IDENTITY()")
            new_id = int(cur.fetchone()[0])
            return jsonify({"message": "Tạo giỏ hàng thành công", "MaGioHang": new_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/giohang/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def giohang_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM GioHang WHERE MaGioHang = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            data = request.get_json()
            trang_thai = data.get('TrangThai')
            if not trang_thai: return jsonify({"error": "Thiếu TrangThai"}), 400

            cur.execute("UPDATE GioHang SET TrangThai = ? WHERE MaGioHang = ?", (trang_thai, id))
            conn.commit()
            return jsonify({"message": "Cập nhật giỏ hàng thành công"}), 200

        if request.method == 'DELETE':
            # Xóa chi tiết trước
            cur.execute("DELETE FROM GioHangChiTiet WHERE MaGioHang = ?", (id,))
            cur.execute("DELETE FROM GioHang WHERE MaGioHang = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa giỏ hàng thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Chi tiết giỏ hàng
@app.route('/api/giohang/<int:id>/chitiet', methods=['GET'])
def giohang_chitiet(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT ct.*, dc.TenDoChoi, dc.Gia, dc.AnhURL
            FROM GioHangChiTiet ct
            JOIN DoChoi dc ON ct.MaDoChoi = dc.MaDoChoi
            WHERE ct.MaGioHang = ?
        """, (id,))
        data = dictfetchall(cur)
        return jsonify(data), 200
    finally:
        conn.close()

# Thêm/sửa/xóa sản phẩm trong giỏ
@app.route('/api/giohangchitiet', methods=['POST'])
def giohangchitiet_add():
    conn = get_connection()
    cur = conn.cursor()
    try:
        data = request.get_json()
        ma_gio = data.get('MaGioHang')
        ma_sp = data.get('MaDoChoi')
        sl = data.get('SoLuong', 1)
        if not all([ma_gio, ma_sp, sl > 0]):
            return jsonify({"error": "Thông tin không hợp lệ"}), 400

        # Nếu đã có thì update số lượng, chưa có thì insert
        cur.execute("SELECT SoLuong FROM GioHangChiTiet WHERE MaGioHang = ? AND MaDoChoi = ?", (ma_gio, ma_sp))
        row = cur.fetchone()
        if row:
            new_sl = row.SoLuong + sl
            cur.execute("UPDATE GioHangChiTiet SET SoLuong = ? WHERE MaGioHang = ? AND MaDoChoi = ?", (new_sl, ma_gio, ma_sp))
        else:
            cur.execute("INSERT INTO GioHangChiTiet (MaGioHang, MaDoChoi, SoLuong) VALUES (?, ?, ?)", (ma_gio, ma_sp, sl))
        conn.commit()
        return jsonify({"message": "Cập nhật giỏ hàng chi tiết thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/giohangchitiet/<int:id>', methods=['DELETE'])
def giohangchitiet_delete(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM GioHangChiTiet WHERE MaGioHangCT = ?", (id,))
        conn.commit()
        return jsonify({"message": "Xóa sản phẩm khỏi giỏ thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== THANH TOÁN ======================
@app.route('/api/thanhtoan', methods=['GET', 'POST'])
def thanhtoan():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT tt.*, dh.MaNguoiMua
                FROM ThanhToan tt
                JOIN DonHang dh ON tt.MaDonHang = dh.MaDonHang
                ORDER BY tt.NgayThanhToan DESC
            """)
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            data = request.get_json()
            required = ['MaDonHang', 'PhuongThuc', 'SoTien', 'TrangThai']
            if not all(k in data for k in required):
                return jsonify({"error": "Thiếu thông tin"}), 400

            cur.execute("""
                INSERT INTO ThanhToan (MaDonHang, PhuongThuc, SoTien, TrangThai, MaGiaoDich)
                VALUES (?, ?, ?, ?, ?)
            """, (data['MaDonHang'], data['PhuongThuc'], data['SoTien'], data['TrangThai'], data.get('MaGiaoDich')))
            conn.commit()
            return jsonify({"message": "Thêm thanh toán thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/thanhtoan/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def thanhtoan_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM ThanhToan WHERE MaThanhToan = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            data = request.get_json()
            cur.execute("""
                UPDATE ThanhToan SET PhuongThuc = ?, SoTien = ?, TrangThai = ?, MaGiaoDich = ?
                WHERE MaThanhToan = ?
            """, (data.get('PhuongThuc'), data.get('SoTien'), data.get('TrangThai'), data.get('MaGiaoDich'), id))
            conn.commit()
            return jsonify({"message": "Cập nhật thanh toán thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("DELETE FROM ThanhToan WHERE MaThanhToan = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa thanh toán thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== VẬN CHUYỂN ======================
@app.route('/api/vanchuyen', methods=['GET', 'POST'])
def vanchuyen():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT vc.*, dh.MaNguoiMua
                FROM VanChuyen vc
                JOIN DonHang dh ON vc.MaDonHang = dh.MaDonHang
                ORDER BY vc.NgayDuKienGiao DESC
            """)
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            data = request.get_json()
            required = ['MaDonHang', 'TrangThai']
            if not all(k in data for k in required):
                return jsonify({"error": "Thiếu thông tin"}), 400

            cur.execute("""
                INSERT INTO VanChuyen (MaDonHang, DonViVanChuyen, MaVanDon, PhiVanChuyen, TrangThai, NgayDuKienGiao)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (data['MaDonHang'], data.get('DonViVanChuyen'), data.get('MaVanDon'),
                  data.get('PhiVanChuyen', 0), data['TrangThai'], data.get('NgayDuKienGiao')))
            conn.commit()
            return jsonify({"message": "Thêm vận chuyển thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/vanchuyen/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def vanchuyen_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM VanChuyen WHERE MaVanChuyen = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            data = request.get_json()
            cur.execute("""
                UPDATE VanChuyen SET DonViVanChuyen = ?, MaVanDon = ?, PhiVanChuyen = ?, TrangThai = ?, NgayDuKienGiao = ?, NgayGiaoThucTe = ?
                WHERE MaVanChuyen = ?
            """, (data.get('DonViVanChuyen'), data.get('MaVanDon'), data.get('PhiVanChuyen'),
                  data.get('TrangThai'), data.get('NgayDuKienGiao'), data.get('NgayGiaoThucTe'), id))
            conn.commit()
            return jsonify({"message": "Cập nhật vận chuyển thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("DELETE FROM VanChuyen WHERE MaVanChuyen = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa vận chuyển thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== THÔNG BÁO ======================
@app.route('/api/thongbao', methods=['GET', 'POST'])
def thongbao():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT tb.*, nd.TenNguoiDung
                FROM ThongBao tb
                JOIN NguoiDung nd ON tb.MaNguoiDung = nd.MaNguoiDung
                ORDER BY tb.NgayTao DESC
            """)
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            data = request.get_json()
            required = ['MaNguoiDung', 'TieuDe', 'NoiDung']
            if not all(k in data for k in required):
                return jsonify({"error": "Thiếu thông tin"}), 400

            cur.execute("""
                INSERT INTO ThongBao (MaNguoiDung, TieuDe, NoiDung, DaXem)
                VALUES (?, ?, ?, 0)
            """, (data['MaNguoiDung'], data['TieuDe'], data['NoiDung']))
            conn.commit()
            return jsonify({"message": "Thêm thông báo thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/thongbao/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def thongbao_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM ThongBao WHERE MaThongBao = ?", (id,))
            data = dictfetchone(cur)
            if not data: return jsonify({"error": "Không tìm thấy"}), 404
            return jsonify(data), 200

        if request.method == 'PUT':
            data = request.get_json()
            cur.execute("""
                UPDATE ThongBao SET TieuDe = ?, NoiDung = ?, DaXem = ?
                WHERE MaThongBao = ?
            """, (data.get('TieuDe'), data.get('NoiDung'), data.get('DaXem', 0), id))
            conn.commit()
            return jsonify({"message": "Cập nhật thông báo thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("DELETE FROM ThongBao WHERE MaThongBao = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa thông báo thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
if __name__ == '__main__':
    app.run(debug=True, port=5000)