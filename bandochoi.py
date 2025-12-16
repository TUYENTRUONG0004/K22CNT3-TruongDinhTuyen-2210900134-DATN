from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pyodbc
from flask import send_from_directory

app = Flask(__name__)
CORS(app)  # Cho phép frontend gọi API

# ==============================
# 🔧 Kết nối SQL Server
# ==============================
def get_connection():
    return pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=DESKTOP-5491VFA;"  # Thay đổi với tên máy chủ của bạn
        "DATABASE=bandochoi;"  # Sử dụng database bandochoi của bạn
        "Trusted_Connection=yes;"
    )

# ==============================
# Trang chủ (frontend)
# ==============================
# @app.route('/')
# def home():
  #  return render_template('index.html')


# ==============================
# API: Lấy danh mục đồ chơi
# ==============================
@app.route('/api/danhmuc', methods=['GET'])
def api_danhmuc():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT MaDanhMuc, TenDanhMuc FROM DanhMuc ORDER BY TenDanhMuc")
        rows = cur.fetchall()
        conn.close()
        return jsonify([{"MaDanhMuc": r[0], "TenDanhMuc": r[1]} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# API: Lấy danh sách sản phẩm (DoChoi)
# ==============================
@app.route('/api/dochoi', methods=['GET'])
def api_dochoi_list():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT MaDoChoi, TenDoChoi, Gia, MoTa, AnhURL, MaNguoiBan, MaDanhMuc
            FROM DoChoi
            ORDER BY MaDoChoi DESC
        """)
        rows = cur.fetchall()
        conn.close()
        data = [{
            "MaDoChoi": r[0],
            "TenDoChoi": r[1],
            "Gia": r[2],
            "MoTa": r[3],
            "AnhURL": r[4],
            "MaNguoiBan": r[5],
            "MaDanhMuc": r[6]
        } for r in rows]
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# API: Lấy chi tiết sản phẩm (DoChoi)
# ==============================
@app.route('/api/dochoi/<int:ma_do_choi>', methods=['GET'])
def api_dochoi_detail(ma_do_choi):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT MaDoChoi, TenDoChoi, Gia, MoTa, AnhURL, MaNguoiBan, MaDanhMuc
            FROM DoChoi WHERE MaDoChoi = ?
        """, (ma_do_choi,))
        r = cur.fetchone()
        conn.close()
        if r:
            return jsonify({
                "MaDoChoi": r[0],
                "TenDoChoi": r[1],
                "Gia": r[2],
                "MoTa": r[3],
                "AnhURL": r[4],
                "MaNguoiBan": r[5],
                "MaDanhMuc": r[6]
            })
        else:
            return jsonify({"error": "Sản phẩm không tồn tại"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# API: Thêm sản phẩm (DoChoi)
# ==============================
@app.route('/api/dochoi', methods=['POST'])
def api_dochoi_create():
    data = request.get_json()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO DoChoi (TenDoChoi, Gia, MoTa, MaNguoiBan, MaDanhMuc, AnhURL)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (data['TenDoChoi'], data['Gia'], data['MoTa'], data['MaNguoiBan'], 
              data['MaDanhMuc'], data['AnhURL']))
        conn.commit()
        conn.close()
        return jsonify({"message": "Sản phẩm đã được thêm thành công"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# API: Sửa sản phẩm (DoChoi)
# ==============================
@app.route('/api/dochoi/<int:ma_do_choi>', methods=['PUT'])
def api_dochoi_update(ma_do_choi):
    data = request.get_json()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE DoChoi
            SET TenDoChoi = ?, Gia = ?, MoTa = ?, MaNguoiBan = ?, MaDanhMuc = ?, AnhURL = ?
            WHERE MaDoChoi = ?
        """, (data['TenDoChoi'], data['Gia'], data['MoTa'], data['MaNguoiBan'], 
              data['MaDanhMuc'], data['AnhURL'], ma_do_choi))
        conn.commit()
        conn.close()
        return jsonify({"message": "Sản phẩm đã được sửa thành công"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# API: Xóa sản phẩm (DoChoi)
# ==============================
@app.route('/api/dochoi/<int:ma_do_choi>', methods=['DELETE'])
def api_dochoi_delete(ma_do_choi):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM DoChoi WHERE MaDoChoi = ?", (ma_do_choi,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Sản phẩm đã được xóa thành công"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# Chạy ứng dụng Flask
# ==============================
if __name__ == '__main__':
    app.run(debug=True)
