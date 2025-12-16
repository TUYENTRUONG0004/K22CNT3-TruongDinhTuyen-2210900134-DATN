create database bandochoi
use bandochoi

CREATE TABLE NguoiDung (
    MaNguoiDung INT PRIMARY KEY IDENTITY(1,1),
    TenNguoiDung NVARCHAR(50),
    Email NVARCHAR(100),
    VaiTro NVARCHAR(20),
    SoDienThoai NVARCHAR(20),
    DiaChi NVARCHAR(200)
);
CREATE TABLE DanhMuc (
    MaDanhMuc INT PRIMARY KEY IDENTITY(1,1),
    TenDanhMuc NVARCHAR(100)
);
CREATE TABLE DoChoi (
    MaDoChoi INT PRIMARY KEY IDENTITY(1,1),
    TenDoChoi NVARCHAR(100),
    Gia INT,
    MoTa NVARCHAR(500),
    MaNguoiBan INT,
    MaDanhMuc INT,
    NgayDang DATE DEFAULT GETDATE(),
    AnhURL NVARCHAR(300),

    FOREIGN KEY (MaNguoiBan) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaDanhMuc) REFERENCES DanhMuc(MaDanhMuc)
);
CREATE TABLE DonHang (
    MaDonHang INT PRIMARY KEY IDENTITY(1,1),
    MaNguoiMua INT,
    MaDoChoi INT,
    SoLuong INT,
    TongTien INT,
    NgayDat DATETIME DEFAULT GETDATE(),
    TrangThai NVARCHAR(50),
    AnhURL NVARCHAR(300),

    FOREIGN KEY (MaNguoiMua) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaDoChoi) REFERENCES DoChoi(MaDoChoi)
);
CREATE TABLE YeuCauTraoDoi (
    MaYeuCau INT PRIMARY KEY IDENTITY(1,1),
    MaDoChoiDeNghi INT,
    MaDoChoiMuon INT,
    MaNguoiDung INT,
    NgayYeuCau DATETIME DEFAULT GETDATE(),
    TrangThai NVARCHAR(50),
    AnhDoNghi NVARCHAR(300),
    AnhDoMuon NVARCHAR(300),

    FOREIGN KEY (MaDoChoiDeNghi) REFERENCES DoChoi(MaDoChoi),
    FOREIGN KEY (MaDoChoiMuon) REFERENCES DoChoi(MaDoChoi),
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);
INSERT INTO NguoiDung (TenNguoiDung, Email, VaiTro, SoDienThoai, DiaChi) VALUES
(N'Minh Phúc', 'phuc@gmail.com', N'Người mua', '0901234567', N'Hà Nội'),
(N'Thanh Hà', 'ha@gmail.com', N'Người bán', '0902345678', N'TP. Hồ Chí Minh'),
(N'Bảo Anh', 'anh@gmail.com', N'Người mua', '0903456789', N'Đà Nẵng'),
(N'Kim Ngân', 'ngan@gmail.com', N'Người bán', '0904567890', N'Cần Thơ'),
(N'Tuấn Việt', 'viet@gmail.com', N'Người mua', '0905678901', N'Hải Phòng');
INSERT INTO DanhMuc (TenDanhMuc) VALUES
(N'Lego'),
(N'Robot'),
(N'Búp bê'),
(N'Xe điều khiển'),
(N'Xếp hình');
INSERT INTO DoChoi (TenDoChoi, Gia, MoTa, MaNguoiBan, MaDanhMuc, AnhURL) VALUES
(N'Lego Thành Phố - Đồn Cảnh Sát', 850000, N'Bộ Lego xây dựng đồn cảnh sát đầy đủ phụ kiện.', 2, 1, N'/anh/lego_don_canh_sat.jpg'),
(N'Robot Biến Hình Optimus Prime', 450000, N'Robot biến hình 25cm, chất liệu bền đẹp.', 4, 2, N'/anh/robot_optimus.jpg'),
(N'Búp Bê Barbie Công Chúa', 320000, N'Búp bê Barbie váy công chúa màu hồng.', 2, 3, N'/anh/barbie_cong_chua.jpg'),
(N'Xe Điều Khiển Đua Tốc Độ Cao', 600000, N'Xe điều khiển từ xa 40km/h.', 4, 4, N'/anh/xe_rc_dua.jpg'),
(N'Bộ Ghép Hình Động Vật 100 Mảnh', 150000, N'Bộ ghép hình phù hợp cho trẻ 5 tuổi trở lên.', 2, 5, N'/anh/ghep_hinh_dong_vat.jpg');
INSERT INTO DonHang (MaNguoiMua, MaDoChoi, SoLuong, TongTien, TrangThai, AnhURL) VALUES
(1, 1, 1, 850000, N'Hoàn thành', N'/anh/lego_don_canh_sat.jpg'),
(3, 5, 1, 150000, N'Đang xử lý', N'/anh/ghep_hinh_dong_vat.jpg'),
(5, 2, 1, 450000, N'Đang giao', N'/anh/robot_optimus.jpg');
INSERT INTO YeuCauTraoDoi (MaDoChoiDeNghi, MaDoChoiMuon, MaNguoiDung, TrangThai, AnhDoNghi, AnhDoMuon) VALUES
(3, 1, 1, N'Chờ duyệt', N'/anh/barbie_cong_chua.jpg', N'/anh/lego_don_canh_sat.jpg'),
(5, 2, 3, N'Đã chấp nhận', N'/anh/ghep_hinh_dong_vat.jpg', N'/anh/robot_optimus.jpg'),
(1, 4, 1, N'Từ chối', N'/anh/lego_don_canh_sat.jpg', N'/anh/xe_rc_dua.jpg');


Select * from NguoiDung
Select * from DanhMuc
Select * from DoChoi
Select * from DonHang
Select * from YeuCauTraoDoi

