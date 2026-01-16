from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app)

# Cấu hình upload ảnh
UPLOAD_FOLDER = os.path.join('static', 'anh')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_connection():
    return pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=DESKTOP-5491VFA;"  # Thay nếu server khác
        "DATABASE=bandochoi;"
        "Trusted_Connection=yes;"
    )

# Helper
def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    row = cursor.fetchone()
    if row:
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    return None

# =========================================
# NGƯỜI DÙNG - CRUD cơ bản (không xóa để an toàn)
# =========================================
@app.route('/api/nguoidung', methods=['GET'])
def nguoidung_list():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT MaNguoiDung, TenNguoiDung, Email, VaiTro, SoDienThoai, NgayTao FROM NguoiDung ORDER BY NgayTao DESC")
        return jsonify(dictfetchall(cur)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/nguoidung/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def nguoidung_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM NguoiDung WHERE MaNguoiDung = ?", (id,))
            data = dictfetchone(cur)
            return jsonify(data), 200 if data else ({"error": "Không tìm thấy"}, 404)

        if request.method == 'PUT':
            data = request.get_json()
            ten = data.get('TenNguoiDung')
            email = data.get('Email')
            vai_tro = data.get('VaiTro')
            sdt = data.get('SoDienThoai')
            mat_khau = data.get('MatKhau')

            if not ten or not email or not vai_tro:
                return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400

            # Check email unique
            cur.execute("SELECT 1 FROM NguoiDung WHERE Email = ? AND MaNguoiDung != ?", (email, id))
            if cur.fetchone():
                return jsonify({"error": "Email đã được sử dụng"}), 400

            if mat_khau:
                cur.execute("UPDATE NguoiDung SET TenNguoiDung=?, Email=?, VaiTro=?, SoDienThoai=?, MatKhauHash=? WHERE MaNguoiDung=?",
                              (ten, email, vai_tro, sdt, mat_khau, id))
            else:
                cur.execute("UPDATE NguoiDung SET TenNguoiDung=?, Email=?, VaiTro=?, SoDienThoai=? WHERE MaNguoiDung=?",
                              (ten, email, vai_tro, sdt, id))
            conn.commit()
            return jsonify({"message": "Cập nhật người dùng thành công"}), 200

        if request.method == 'DELETE':
            # Kiểm tra xem người dùng có đơn hàng không
            cur.execute("SELECT COUNT(*) FROM DonHang WHERE MaNguoiMua = ?", (id,))
            order_count = cur.fetchone()[0]

            if order_count > 0:
                return jsonify({"error": f"Không thể xóa người dùng này vì họ có {order_count} đơn hàng"}), 400

            # Xóa người dùng
            cur.execute("DELETE FROM NguoiDung WHERE MaNguoiDung = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa người dùng thành công"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# =========================================
# AUTH - Đăng nhập và đăng ký
# =========================================
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('Email')
    mat_khau = data.get('MatKhau')

    if not email or not mat_khau:
        return jsonify({"error": "Thiếu thông tin"}), 400

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT MaNguoiDung, TenNguoiDung, Email, VaiTro FROM NguoiDung WHERE Email = ? AND MatKhauHash = ?", (email, mat_khau))
        user = dictfetchone(cur)
        if user:
            return jsonify({"user": user}), 200
        else:
            return jsonify({"error": "Email hoặc mật khẩu không đúng"}), 401
    finally:
        conn.close()

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    ten = data.get('TenNguoiDung', '').strip()
    email = data.get('Email', '').strip()
    mat_khau = data.get('MatKhau', '').strip()

    if not ten or not email or not mat_khau:
        return jsonify({"error": "Thiếu thông tin"}), 400

    conn = get_connection()
    cur = conn.cursor()
    try:
        # Check email exists
        cur.execute("SELECT 1 FROM NguoiDung WHERE Email = ?", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email đã tồn tại"}), 400

        cur.execute("INSERT INTO NguoiDung (TenNguoiDung, Email, MatKhauHash, VaiTro, NgayTao) VALUES (?, ?, ?, 'NguoiMua', GETDATE())",
                    (ten, email, mat_khau))
        conn.commit()
        return jsonify({"message": "Đăng ký thành công"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# =========================================
# DANH MỤC - Đã hoàn thiện
# =========================================
@app.route('/api/danhmuc', methods=['GET', 'POST'])
def danhmuc():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM DanhMuc ORDER BY TenDanhMuc")
            return jsonify(dictfetchall(cur)), 200

        if request.method == 'POST':
            data = request.get_json()
            ten = data.get('TenDanhMuc', '').strip()
            if not ten:
                return jsonify({"error": "Tên danh mục không được để trống"}), 400
            cur.execute("SELECT 1 FROM DanhMuc WHERE TenDanhMuc = ?", (ten,))
            if cur.fetchone():
                return jsonify({"error": "Tên đã tồn tại"}), 400
            cur.execute("INSERT INTO DanhMuc (TenDanhMuc) VALUES (?)", (ten,))
            conn.commit()
            cur.execute("SELECT SCOPE_IDENTITY()")
            return jsonify({"message": "Thêm thành công", "MaDanhMuc": int(cur.fetchone()[0])}), 201
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
            return jsonify(data), 200 if data else ({"error": "Không tìm thấy"}, 404)

        if request.method == 'PUT':
            data = request.get_json()
            ten = data.get('TenDanhMuc', '').strip()
            if not ten:
                return jsonify({"error": "Tên không được để trống"}), 400
            cur.execute("SELECT 1 FROM DanhMuc WHERE TenDanhMuc = ? AND MaDanhMuc != ?", (ten, id))
            if cur.fetchone():
                return jsonify({"error": "Tên đã tồn tại"}), 400
            cur.execute("UPDATE DanhMuc SET TenDanhMuc = ? WHERE MaDanhMuc = ?", (ten, id))
            conn.commit()
            return jsonify({"message": "Cập nhật thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("SELECT 1 FROM DoChoi WHERE MaDanhMuc = ?", (id,))
            if cur.fetchone():
                return jsonify({"error": "Không thể xóa: Danh mục đang có sản phẩm"}), 400
            cur.execute("DELETE FROM DanhMuc WHERE MaDanhMuc = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# =========================================
# SẢN PHẨM (DoChoi) - ĐẦY ĐỦ CRUD
# =========================================
@app.route('/api/dochoi', methods=['GET', 'POST'])
def dochoi():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT d.*, ISNULL(k.SoLuongTon, 0) AS SoLuongTon
                FROM DoChoi d LEFT JOIN KhoHang k ON d.MaDoChoi = k.MaDoChoi
                WHERE d.TrangThai = N'Active'
                ORDER BY d.NgayDang DESC
            """)
            return jsonify(dictfetchall(cur)), 200

        if request.method == 'POST':
            ten = request.form.get('TenDoChoi', '').strip()
            gia_str = request.form.get('Gia', '').strip()
            mo_ta = request.form.get('MoTa', '').strip()
            ma_danh_muc_str = request.form.get('MaDanhMuc', '').strip()
            ma_nguoi_ban_str = request.form.get('MaNguoiBan', '').strip()

            print("=" * 80)
            print("DEBUG POST /api/dochoi")
            print("Form data:", dict(request.form))
            print("Files:", list(request.files.keys()))
            print(f"TenDoChoi: '{ten}'")
            print(f"Gia: '{gia_str}'")
            print(f"MaDanhMuc: '{ma_danh_muc_str}'")
            print(f"MaNguoiBan: '{ma_nguoi_ban_str}'")
            print("=" * 80)

            # Validate required fields
            missing_fields = []
            if not ten: missing_fields.append('TenDoChoi')
            if not gia_str: missing_fields.append('Gia')
            if not ma_danh_muc_str: missing_fields.append('MaDanhMuc')
            if not ma_nguoi_ban_str: missing_fields.append('MaNguoiBan')

            if missing_fields:
                return jsonify({
                    "error": f"Thiếu thông tin bắt buộc: {', '.join(missing_fields)}",
                    "received": {
                        "TenDoChoi": ten,
                        "Gia": gia_str,
                        "MaDanhMuc": ma_danh_muc_str,
                        "MaNguoiBan": ma_nguoi_ban_str
                    }
                }), 400

            # Additional validation for product name
            if len(ten) < 2:
                return jsonify({"error": "Tên sản phẩm phải có ít nhất 2 ký tự"}), 400
            if len(ten) > 200:
                return jsonify({"error": "Tên sản phẩm không được vượt quá 200 ký tự"}), 400

            # Validate data types and values
            try:
                gia = float(gia_str)
                if gia < 0:
                    return jsonify({"error": "Giá phải >= 0"}), 400
                gia = int(gia)  # Convert to int for database

                ma_danh_muc = int(ma_danh_muc_str)
                ma_nguoi_ban = int(ma_nguoi_ban_str)

                if ma_danh_muc <= 0 or ma_nguoi_ban <= 0:
                    return jsonify({"error": "Mã danh mục và mã người bán phải > 0"}), 400

            except ValueError as e:
                return jsonify({"error": f"Dữ liệu không hợp lệ: {str(e)}. Giá phải là số, mã phải là số nguyên"}), 400

            # Kiểm tra foreign keys với thông báo chi tiết hơn
            cur.execute("SELECT TenNguoiDung FROM NguoiDung WHERE MaNguoiDung = ?", (ma_nguoi_ban,))
            seller = cur.fetchone()
            if not seller:
                return jsonify({"error": f"Người bán với mã {ma_nguoi_ban} không tồn tại trong hệ thống"}), 400

            cur.execute("SELECT TenDanhMuc FROM DanhMuc WHERE MaDanhMuc = ?", (ma_danh_muc,))
            category = cur.fetchone()
            if not category:
                return jsonify({"error": f"Danh mục với mã {ma_danh_muc} không tồn tại trong hệ thống"}), 400

            # Upload ảnh
            anh_url = None
            if 'anh' in request.files:
                file = request.files['anh']
                if file and file.filename:
                    if not allowed_file(file.filename):
                        return jsonify({"error": f"Định dạng file không được hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

                    filename = secure_filename(file.filename)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

                    try:
                        file.save(file_path)
                        anh_url = f"/anh/{filename}"
                        print(f"Ảnh đã được upload: {anh_url}")
                    except Exception as e:
                        print(f"Lỗi upload ảnh: {str(e)}")
                        return jsonify({"error": f"Lỗi khi upload ảnh: {str(e)}"}), 500
                elif file and not file.filename:
                    # File được chọn nhưng không có tên
                    pass  # Bỏ qua, không có lỗi

            # Insert DoChoi
            cur.execute("""
                INSERT INTO DoChoi (TenDoChoi, Gia, MoTa, MaNguoiBan, MaDanhMuc, AnhURL, TrangThai)
                VALUES (?, ?, ?, ?, ?, ?, N'Active')
            """, (ten, gia, mo_ta, ma_nguoi_ban, ma_danh_muc, anh_url))
            conn.commit()

            cur.execute("SELECT SCOPE_IDENTITY()")
            new_id = int(cur.fetchone()[0])

            # Tạo KhoHang
            cur.execute("INSERT INTO KhoHang (MaDoChoi, SoLuongTon) VALUES (?, 0)", (new_id,))
            conn.commit()

            return jsonify({
                "message": "Thêm sản phẩm thành công", 
                "MaDoChoi": new_id,
                "TenDoChoi": ten,
                "Gia": gia
            }), 201

    except Exception as e:
        conn.rollback()
        print("=" * 80)
        print("LỖI POST /api/dochoi:", datetime.now())
        print("Dữ liệu nhận được:", {
            "TenDoChoi": ten,
            "Gia": gia_str,
            "MaDanhMuc": ma_danh_muc_str,
            "MaNguoiBan": ma_nguoi_ban_str
        })
        print(traceback.format_exc())
        print("=" * 80)

        # Provide more user-friendly error messages
        error_msg = str(e)
        if "UNIQUE KEY" in error_msg.upper() or "DUPLICATE" in error_msg.upper():
            return jsonify({"error": "Sản phẩm với tên này đã tồn tại"}), 400
        elif "FOREIGN KEY" in error_msg.upper() or "FK_" in error_msg.upper():
            return jsonify({"error": "Dữ liệu liên kết không hợp lệ"}), 400
        else:
            return jsonify({"error": f"Lỗi hệ thống: {error_msg}"}), 500
    finally:
        conn.close()


@app.route('/api/dochoi/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def dochoi_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM DoChoi WHERE MaDoChoi = ?", (id,))
        if not cur.fetchone():
            return jsonify({"error": f"Không tìm thấy MaDoChoi={id}"}), 404

        if request.method == 'GET':
            cur.execute("""
                SELECT d.*, ISNULL(k.SoLuongTon, 0) AS SoLuongTon
                FROM DoChoi d LEFT JOIN KhoHang k ON d.MaDoChoi = k.MaDoChoi
                WHERE d.MaDoChoi = ?
            """, (id,))
            return jsonify(dictfetchone(cur)), 200

        if request.method == 'PUT':
            ten = request.form.get('TenDoChoi', '').strip()
            gia_str = request.form.get('Gia', '')
            mo_ta = request.form.get('MoTa', '').strip()
            ma_danh_muc_str = request.form.get('MaDanhMuc', '')

            if not all([ten, gia_str, ma_danh_muc_str]):
                return jsonify({"error": "Thiếu thông tin"}), 400

            try:
                gia = int(float(gia_str))
                ma_danh_muc = int(ma_danh_muc_str)
                if gia < 0:
                    return jsonify({"error": "Giá phải >= 0"}), 400
            except ValueError:
                return jsonify({"error": "Dữ liệu không hợp lệ"}), 400

            cur.execute("SELECT 1 FROM DanhMuc WHERE MaDanhMuc = ?", (ma_danh_muc,))
            if not cur.fetchone():
                return jsonify({"error": f"MaDanhMuc={ma_danh_muc} không tồn tại"}), 400

            anh_url = None
            if 'anh' in request.files and request.files['anh'].filename:
                file = request.files['anh']
                if allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    anh_url = f"/anh/{filename}"

            if anh_url:
                cur.execute("""
                    UPDATE DoChoi SET TenDoChoi=?, Gia=?, MoTa=?, MaDanhMuc=?, AnhURL=?
                    WHERE MaDoChoi=?
                """, (ten, gia, mo_ta, ma_danh_muc, anh_url, id))
            else:
                cur.execute("""
                    UPDATE DoChoi SET TenDoChoi=?, Gia=?, MoTa=?, MaDanhMuc=?
                    WHERE MaDoChoi=?
                """, (ten, gia, mo_ta, ma_danh_muc, id))
            conn.commit()
            return jsonify({"message": "Cập nhật thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("SELECT COUNT(*) FROM ChiTietDonHang WHERE MaDoChoi = ?", (id,))
            count = cur.fetchone()[0]
            
            if count > 0:
                cur.execute("UPDATE DoChoi SET TrangThai = N'Inactive' WHERE MaDoChoi = ?", (id,))
                conn.commit()
                return jsonify({"message": "Đã đánh dấu Inactive (có trong đơn hàng)"}), 200
            else:
                cur.execute("DELETE FROM YeuThich WHERE MaDoChoi = ?", (id,))
                cur.execute("DELETE FROM NoiDungHuongDan WHERE MaDoChoi = ?", (id,))
                cur.execute("DELETE FROM GioHangChiTiet WHERE MaDoChoi = ?", (id,))
                cur.execute("DELETE FROM KhoHang WHERE MaDoChoi = ?", (id,))
                cur.execute("DELETE FROM DoChoi WHERE MaDoChoi = ?", (id,))
                conn.commit()
                return jsonify({"message": "Xóa thành công"}), 200

    except Exception as e:
        conn.rollback()
        print("=" * 80)
        print(f"LỖI /api/dochoi/{id}:", datetime.now())
        print(traceback.format_exc())
        print("=" * 80)
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
# =========================================
# KHO HÀNG - CRUD đầy đủ
# =========================================
@app.route('/api/kho', methods=['GET', 'POST'])
def kho_list():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT kh.*, dc.TenDoChoi, dc.AnhURL
                FROM KhoHang kh JOIN DoChoi dc ON kh.MaDoChoi = dc.MaDoChoi
                ORDER BY kh.NgayCapNhat DESC
            """)
            return jsonify(dictfetchall(cur)), 200

        if request.method == 'POST':
            data = request.get_json()
            ma_dochoi = data.get('MaDoChoi')
            so_luong = data.get('SoLuongTon', 0)

            if not ma_dochoi:
                return jsonify({"error": "Thiếu MaDoChoi"}), 400

            if so_luong is None or so_luong < 0:
                return jsonify({"error": "Số lượng tồn kho không hợp lệ"}), 400

            # Kiểm tra sản phẩm có tồn tại không
            cur.execute("SELECT 1 FROM DoChoi WHERE MaDoChoi = ?", (ma_dochoi,))
            if not cur.fetchone():
                return jsonify({"error": f"MaDoChoi={ma_dochoi} không tồn tại"}), 400

            # Kiểm tra đã có trong kho chưa
            cur.execute("SELECT 1 FROM KhoHang WHERE MaDoChoi = ?", (ma_dochoi,))
            if cur.fetchone():
                return jsonify({"error": "Sản phẩm đã có trong kho, vui lòng cập nhật thay vì thêm mới"}), 400

            cur.execute("""
                INSERT INTO KhoHang (MaDoChoi, SoLuongTon, NgayCapNhat)
                VALUES (?, ?, GETDATE())
            """, (ma_dochoi, so_luong))
            conn.commit()
            return jsonify({"message": "Thêm vào kho thành công", "MaDoChoi": ma_dochoi}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/kho/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def kho_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT kh.*, dc.TenDoChoi, dc.AnhURL
                FROM KhoHang kh JOIN DoChoi dc ON kh.MaDoChoi = dc.MaDoChoi
                WHERE kh.MaDoChoi = ?
            """, (id,))
            data = dictfetchone(cur)
            return jsonify(data), 200 if data else ({"error": "Không tìm thấy"}, 404)

        if request.method == 'PUT':
            data = request.get_json()
            sl = data.get('SoLuongTon')
            if sl is None or sl < 0:
                return jsonify({"error": "Số lượng tồn kho không hợp lệ"}), 400
            cur.execute("UPDATE KhoHang SET SoLuongTon = ?, NgayCapNhat = GETDATE() WHERE MaDoChoi = ?", (sl, id))
            conn.commit()
            return jsonify({"message": "Cập nhật kho thành công"}), 200

        if request.method == 'DELETE':
            # Kiểm tra có tồn tại không
            cur.execute("SELECT 1 FROM KhoHang WHERE MaDoChoi = ?", (id,))
            if not cur.fetchone():
                return jsonify({"error": "Không tìm thấy sản phẩm trong kho"}), 404

            cur.execute("DELETE FROM KhoHang WHERE MaDoChoi = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa khỏi kho thành công"}), 200

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
@app.route('/api/donhang', methods=['GET', 'POST'])
def donhang_list():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT dh.*,
                       COALESCE(dh.TenKhachHang, nd.TenNguoiDung) AS TenKhachHang
                FROM DonHang dh
                LEFT JOIN NguoiDung nd ON dh.MaNguoiMua = nd.MaNguoiDung
                ORDER BY dh.NgayDat DESC
            """)
            data = dictfetchall(cur)
            return jsonify(data), 200

        if request.method == 'POST':
            data = request.get_json()
            
            # Lấy thông tin từ request
            ma_nguoi_mua = data.get('MaNguoiMua')  # Có thể null cho khách vãng lai
            tong_tien = data.get('TongTien', 0)
            ten_khach_hang = data.get('TenKhachHang', '').strip()
            so_dien_thoai = data.get('SoDienThoai', '').strip()
            dia_chi_giao = data.get('DiaChiGiao', '').strip()
            ghi_chu = data.get('GhiChu', '').strip()
            trang_thai = data.get('TrangThai', 'Cho xac nhan')
            phuong_thuc_thanh_toan = data.get('PhuongThucThanhToan', 'COD')
            items = data.get('items', [])

            # Validate
            if not ten_khach_hang:
                return jsonify({"error": "Thiếu tên khách hàng"}), 400
            if not so_dien_thoai:
                return jsonify({"error": "Thiếu số điện thoại"}), 400
            if not dia_chi_giao:
                return jsonify({"error": "Thiếu địa chỉ giao hàng"}), 400
            if not items or len(items) == 0:
                return jsonify({"error": "Đơn hàng phải có ít nhất 1 sản phẩm"}), 400

            # Kiểm tra tồn kho và tính tổng tiền
            calculated_total = 0
            for item in items:
                ma_dochoi = item.get('MaDoChoi')
                so_luong = item.get('SoLuong', 1)
                
                # Kiểm tra sản phẩm tồn tại
                cur.execute("SELECT Gia FROM DoChoi WHERE MaDoChoi = ? AND TrangThai = N'Active'", (ma_dochoi,))
                product = cur.fetchone()
                if not product:
                    return jsonify({"error": f"Sản phẩm ID {ma_dochoi} không tồn tại hoặc đã ngừng bán"}), 400
                
                # Kiểm tra tồn kho
                cur.execute("SELECT SoLuongTon FROM KhoHang WHERE MaDoChoi = ?", (ma_dochoi,))
                kho = cur.fetchone()
                if not kho or kho[0] < so_luong:
                    return jsonify({"error": f"Sản phẩm ID {ma_dochoi} không đủ số lượng trong kho"}), 400
                
                calculated_total += product[0] * so_luong

            # Tạo đơn hàng và lấy ID ngay lập tức
            cur.execute("""
                INSERT INTO DonHang (MaNguoiMua, TenKhachHang, SoDienThoai, DiaChiGiao, GhiChu, TrangThai, TongTien)
                OUTPUT INSERTED.MaDonHang
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (ma_nguoi_mua, ten_khach_hang, so_dien_thoai, dia_chi_giao, ghi_chu, trang_thai, tong_tien))
            
            row = cur.fetchone()
            if not row:
                raise Exception("Không thể tạo đơn hàng")
            ma_don_hang = int(row[0])

            # Thêm chi tiết đơn hàng và cập nhật kho
            for item in items:
                ma_dochoi = item.get('MaDoChoi')
                so_luong = item.get('SoLuong', 1)
                don_gia = item.get('DonGia', 0)

                # Thêm chi tiết đơn hàng
                cur.execute("""
                    INSERT INTO ChiTietDonHang (MaDonHang, MaDoChoi, SoLuong, DonGia)
                    VALUES (?, ?, ?, ?)
                """, (ma_don_hang, ma_dochoi, so_luong, don_gia))

                # Trừ kho
                cur.execute("""
                    UPDATE KhoHang SET SoLuongTon = SoLuongTon - ?, NgayCapNhat = GETDATE()
                    WHERE MaDoChoi = ?
                """, (so_luong, ma_dochoi))

            # Tạo thanh toán
            trang_thai_thanh_toan = 'Pending' if phuong_thuc_thanh_toan == 'COD' else 'Pending'
            cur.execute("""
                INSERT INTO ThanhToan (MaDonHang, PhuongThuc, SoTien, TrangThai)
                VALUES (?, ?, ?, ?)
            """, (ma_don_hang, phuong_thuc_thanh_toan, tong_tien, trang_thai_thanh_toan))

            conn.commit()

            return jsonify({
                "message": "Đặt hàng thành công",
                "MaDonHang": ma_don_hang,
                "TongTien": tong_tien
            }), 201

    except Exception as e:
        conn.rollback()
        print("=" * 80)
        print("LỖI POST /api/donhang:", datetime.now())
        print(traceback.format_exc())
        print("=" * 80)
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/donhang/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def donhang_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("""
                SELECT dh.*,
                       COALESCE(dh.TenKhachHang, nd.TenNguoiDung) AS TenKhachHangFinal,
                       COALESCE(dh.SoDienThoai, nd.SoDienThoai) AS SoDienThoaiFinal,
                       COALESCE(dh.DiaChiGiao, dcg.DiaChi) AS DiaChiFinal
                FROM DonHang dh
                LEFT JOIN NguoiDung nd ON dh.MaNguoiMua = nd.MaNguoiDung
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

        if request.method == 'DELETE':
            # Kiểm tra đơn hàng tồn tại
            cur.execute("SELECT TrangThai FROM DonHang WHERE MaDonHang = ?", (id,))
            order = cur.fetchone()
            if not order:
                return jsonify({"error": "Không tìm thấy đơn hàng"}), 404
            
            status = order[0] if order[0] else ''
            status_lower = status.lower()
            
            # Các trạng thái cho phép xóa
            allowed_delete = ['cho xac nhan', 'chờ xác nhận', 'da huy', 'đã hủy', 'đã huỷ']
            can_delete = any(s in status_lower for s in allowed_delete)
            
            # Nếu không thuộc trạng thái cho phép, vẫn cho xóa nhưng cảnh báo
            # (Bỏ qua kiểm tra để admin có thể xóa mọi đơn hàng)
            
            # Hoàn lại kho nếu đơn chưa hủy
            is_cancelled = 'huy' in status_lower or 'hủy' in status_lower
            if not is_cancelled:
                cur.execute("SELECT MaDoChoi, SoLuong FROM ChiTietDonHang WHERE MaDonHang = ?", (id,))
                items = cur.fetchall()
                for item in items:
                    cur.execute("""
                        UPDATE KhoHang SET SoLuongTon = SoLuongTon + ?, NgayCapNhat = GETDATE()
                        WHERE MaDoChoi = ?
                    """, (item[1], item[0]))

            # Xóa các bản ghi liên quan
            cur.execute("DELETE FROM DonHang_KhuyenMai WHERE MaDonHang = ?", (id,))
            cur.execute("DELETE FROM ThanhToan WHERE MaDonHang = ?", (id,))
            cur.execute("DELETE FROM VanChuyen WHERE MaDonHang = ?", (id,))
            cur.execute("DELETE FROM ChiTietDonHang WHERE MaDonHang = ?", (id,))
            cur.execute("DELETE FROM DonHang WHERE MaDonHang = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa đơn hàng thành công"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
        
        
        #
# ====================== ĐỊA CHỈ GIAO HÀNG ======================
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
        
# ================================================
# YÊU THÍCH SẢN PHẨM (YeuThich) - Thêm/Xóa/Xem
# ================================================
@app.route('/api/yeuthich', methods=['GET', 'POST', 'DELETE'])
def yeuthich():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            ma_nguoi_dung = request.args.get('MaNguoiDung')
            if not ma_nguoi_dung:
                return jsonify({"error": "Thiếu MaNguoiDung"}), 400
            cur.execute("""
                SELECT y.MaNguoiDung, y.MaDoChoi, y.NgayThem, dc.TenDoChoi, dc.Gia, dc.AnhURL
                FROM YeuThich y JOIN DoChoi dc ON y.MaDoChoi = dc.MaDoChoi
                WHERE y.MaNguoiDung = ?
                ORDER BY y.NgayThem DESC
            """, (int(ma_nguoi_dung),))
            return jsonify(dictfetchall(cur)), 200

        if request.method == 'POST':
            data = request.get_json()
            ma_nguoi_dung = data.get('MaNguoiDung')
            ma_dochoi = data.get('MaDoChoi')
            if not all([ma_nguoi_dung, ma_dochoi]):
                return jsonify({"error": "Thiếu thông tin"}), 400
            cur.execute("SELECT 1 FROM YeuThich WHERE MaNguoiDung = ? AND MaDoChoi = ?", (ma_nguoi_dung, ma_dochoi))
            if cur.fetchone():
                return jsonify({"message": "Sản phẩm đã có trong yêu thích"}), 200
            cur.execute("INSERT INTO YeuThich (MaNguoiDung, MaDoChoi) VALUES (?, ?)", (ma_nguoi_dung, ma_dochoi))
            conn.commit()
            return jsonify({"message": "Thêm vào yêu thích thành công"}), 201

        if request.method == 'DELETE':
            ma_nguoi_dung = request.args.get('MaNguoiDung')
            ma_dochoi = request.args.get('MaDoChoi')
            if not all([ma_nguoi_dung, ma_dochoi]):
                return jsonify({"error": "Thiếu thông tin"}), 400
            cur.execute("DELETE FROM YeuThich WHERE MaNguoiDung = ? AND MaDoChoi = ?", (int(ma_nguoi_dung), int(ma_dochoi)))
            conn.commit()
            return jsonify({"message": "Xóa khỏi yêu thích thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ================================================
# NỘI DUNG HƯỚNG DẪN (NoiDungHuongDan) - CRUD
# ================================================
@app.route('/api/noidunghuongdan', methods=['GET', 'POST'])
def noidunghuongdan():
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            ma_dochoi = request.args.get('MaDoChoi')
            query = "SELECT * FROM NoiDungHuongDan"
            params = []
            if ma_dochoi:
                query += " WHERE MaDoChoi = ?"
                params.append(int(ma_dochoi))
            query += " ORDER BY NgayTao DESC"
            cur.execute(query, params)
            return jsonify(dictfetchall(cur)), 200

        if request.method == 'POST':
            data = request.get_json()
            required = ['MaDoChoi', 'TieuDe', 'NoiDung']
            if not all(k in data for k in required):
                return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400
            cur.execute("""
                INSERT INTO NoiDungHuongDan (MaDoChoi, TieuDe, Loai, LinkURL, NoiDung)
                VALUES (?, ?, ?, ?, ?)
            """, (data['MaDoChoi'], data['TieuDe'], data.get('Loai'), data.get('LinkURL'), data['NoiDung']))
            conn.commit()
            cur.execute("SELECT SCOPE_IDENTITY()")
            return jsonify({"message": "Thêm nội dung thành công", "MaNoiDung": int(cur.fetchone()[0])}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/noidunghuongdan/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def noidunghuongdan_detail(id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if request.method == 'GET':
            cur.execute("SELECT * FROM NoiDungHuongDan WHERE MaNoiDung = ?", (id,))
            data = dictfetchone(cur)
            return jsonify(data) if data else (jsonify({"error": "Không tìm thấy"}), 404)

        if request.method == 'PUT':
            data = request.get_json()
            cur.execute("""
                UPDATE NoiDungHuongDan 
                SET TieuDe=?, Loai=?, LinkURL=?, NoiDung=?, TrangThai=?
                WHERE MaNoiDung=?
            """, (data.get('TieuDe'), data.get('Loai'), data.get('LinkURL'), data.get('NoiDung'), 
                  data.get('TrangThai', 'Active'), id))
            conn.commit()
            return jsonify({"message": "Cập nhật nội dung thành công"}), 200

        if request.method == 'DELETE':
            cur.execute("DELETE FROM NoiDungHuongDan WHERE MaNoiDung = ?", (id,))
            conn.commit()
            return jsonify({"message": "Xóa nội dung thành công"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== THỐNG KÊ DASHBOARD ======================
@app.route('/api/thongke', methods=['GET'])
def thong_ke():
    conn = get_connection()
    cur = conn.cursor()
    try:
        stats = {}

        # Tổng số người dùng
        cur.execute("SELECT COUNT(*) FROM NguoiDung")
        stats['total_users'] = cur.fetchone()[0]

        # Tổng số sản phẩm active
        cur.execute("SELECT COUNT(*) FROM DoChoi WHERE TrangThai = N'Active'")
        stats['total_products'] = cur.fetchone()[0]

        # Tổng số danh mục
        cur.execute("SELECT COUNT(*) FROM DanhMuc")
        stats['total_categories'] = cur.fetchone()[0]

        # Thống kê đơn hàng
        cur.execute("""
            SELECT
                COUNT(*) as total_orders,
                SUM(TongTien) as total_revenue,
                COUNT(CASE WHEN TrangThai = N'Hoan thanh' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN TrangThai = N'Cho xac nhan' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN TrangThai = N'Da huy' THEN 1 END) as cancelled_orders
            FROM DonHang
        """)
        order_stats = dictfetchone(cur)
        stats.update(order_stats)

        # Sản phẩm sắp hết hàng (tồn kho < 10)
        cur.execute("""
            SELECT COUNT(*) FROM KhoHang
            WHERE SoLuongTon < 10 AND SoLuongTon > 0
        """)
        stats['low_stock_products'] = cur.fetchone()[0]

        # Doanh thu tháng này
        cur.execute("""
            SELECT ISNULL(SUM(TongTien), 0) FROM DonHang
            WHERE YEAR(NgayDat) = YEAR(GETDATE())
            AND MONTH(NgayDat) = MONTH(GETDATE())
            AND TrangThai = N'Hoan thanh'
        """)
        stats['monthly_revenue'] = cur.fetchone()[0]

        # Đơn hàng gần đây (7 ngày)
        cur.execute("""
            SELECT COUNT(*) FROM DonHang
            WHERE NgayDat >= DATEADD(DAY, -7, GETDATE())
        """)
        stats['recent_orders'] = cur.fetchone()[0]

        return jsonify(stats), 200

    except Exception as e:
        print(f"Lỗi thống kê: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== ĐƠN HÀNG GẦN ĐÂY ======================
@app.route('/api/donhang/recent', methods=['GET'])
def recent_orders():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT TOP 10 dh.MaDonHang,
                          COALESCE(dh.TenKhachHang, nd.TenNguoiDung, 'Khách vãng lai') AS TenKhachHang,
                          dh.TongTien,
                          dh.TrangThai,
                          dh.NgayDat
            FROM DonHang dh
            LEFT JOIN NguoiDung nd ON dh.MaNguoiMua = nd.MaNguoiDung
            ORDER BY dh.NgayDat DESC
        """)
        orders = dictfetchall(cur)
        return jsonify(orders), 200

    except Exception as e:
        print(f"Lỗi lấy đơn hàng gần đây: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== DỮ LIỆU BIỂU ĐỒ ======================
@app.route('/api/chart/revenue', methods=['GET'])
def revenue_chart():
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Lấy doanh thu theo ngày trong 30 ngày qua
        cur.execute("""
            SELECT
                CONVERT(date, NgayDat) as Ngay,
                SUM(TongTien) as DoanhThu
            FROM DonHang
            WHERE NgayDat >= DATEADD(DAY, -30, GETDATE())
            AND TrangThai = N'Hoan thanh'
            GROUP BY CONVERT(date, NgayDat)
            ORDER BY Ngay
        """)
        data = dictfetchall(cur)

        # Tạo dữ liệu cho 30 ngày (bao gồm cả ngày không có doanh thu)
        from datetime import datetime, timedelta

        result = []
        today = datetime.now().date()

        for i in range(29, -1, -1):
            date = today - timedelta(days=i)
            revenue = 0

            # Tìm doanh thu cho ngày này
            for item in data:
                if item['Ngay'].date() == date:
                    revenue = item['DoanhThu']
                    break

            result.append({
                'date': date.strftime('%d/%m'),
                'revenue': revenue
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"Lỗi lấy dữ liệu biểu đồ doanh thu: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== DỮ LIỆU TỒN KHO ======================
@app.route('/api/chart/inventory', methods=['GET'])
def inventory_chart():
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Lấy tổng tồn kho hiện tại
        cur.execute("SELECT SUM(SoLuongTon) as TongTonKho FROM KhoHang")
        current_inventory_result = cur.fetchone()
        current_inventory = current_inventory_result[0] if current_inventory_result[0] else 0

        # Tạo dữ liệu giả cho 30 ngày (hiển thị cùng giá trị cho tất cả các ngày)
        # Trong thực tế, bạn có thể lưu lịch sử tồn kho
        from datetime import datetime, timedelta

        result = []
        today = datetime.now().date()

        for i in range(29, -1, -1):
            date = today - timedelta(days=i)
            result.append({
                'date': date.strftime('%d/%m'),
                'inventory': current_inventory
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"Lỗi lấy dữ liệu biểu đồ tồn kho: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ====================== DỮ LIỆU NGƯỜI DÙNG ======================
@app.route('/api/chart/users', methods=['GET'])
def users_chart():
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Lấy tổng số người dùng tích lũy theo thời gian
        cur.execute("""
            SELECT COUNT(*) as TongNguoiDung FROM NguoiDung
        """)
        total_users_result = cur.fetchone()
        total_users = total_users_result[0] if total_users_result[0] else 0

        # Tạo dữ liệu giả cho 30 ngày (hiển thị tổng số người dùng cho tất cả các ngày)
        # Trong thực tế, bạn có thể lưu lịch sử số lượng người dùng
        from datetime import datetime, timedelta

        result = []
        today = datetime.now().date()

        for i in range(29, -1, -1):
            date = today - timedelta(days=i)
            result.append({
                'date': date.strftime('%d/%m'),
                'total_users': total_users
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"Lỗi lấy dữ liệu biểu đồ người dùng: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')