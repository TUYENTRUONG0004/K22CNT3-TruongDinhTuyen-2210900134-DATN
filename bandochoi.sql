create database bandochoi
use bandochoi
CREATE TABLE NguoiDung (
    MaNguoiDung INT IDENTITY PRIMARY KEY,
    TenNguoiDung NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    MatKhauHash NVARCHAR(255) NOT NULL,
    VaiTro NVARCHAR(20) NOT NULL DEFAULT N'User', -- User / Admin
    SoDienThoai NVARCHAR(20),
    NgayTao DATETIME DEFAULT GETDATE()
);

-- 2) DanhMuc
CREATE TABLE DanhMuc (
    MaDanhMuc INT IDENTITY(1,1) PRIMARY KEY,
    TenDanhMuc NVARCHAR(100) NOT NULL UNIQUE
);

-- 3) DoChoi
CREATE TABLE DoChoi (
    MaDoChoi INT IDENTITY PRIMARY KEY,
    TenDoChoi NVARCHAR(150) NOT NULL,
    Gia INT NOT NULL CHECK (Gia >= 0),
    MoTa NVARCHAR(500),
    MaNguoiBan INT NOT NULL,
    MaDanhMuc INT NOT NULL,
    AnhURL NVARCHAR(300),
    TrangThai NVARCHAR(20) DEFAULT N'Active',
    NgayDang DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MaNguoiBan) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaDanhMuc) REFERENCES DanhMuc(MaDanhMuc)
);

-- 4) KhoHang
CREATE TABLE KhoHang (
    MaDoChoi INT PRIMARY KEY,
    SoLuongTon INT NOT NULL DEFAULT 0,
    NgayCapNhat DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_KhoHang_SoLuongTon CHECK (SoLuongTon >= 0),
    FOREIGN KEY (MaDoChoi) REFERENCES DoChoi(MaDoChoi)
);

-- 5) GioHang
CREATE TABLE GioHang (
    MaGioHang INT IDENTITY PRIMARY KEY,
    MaNguoiDung INT NOT NULL,
    TrangThai NVARCHAR(20) DEFAULT N'Active',
    NgayTao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE UNIQUE INDEX UX_GioHang_Active
ON GioHang(MaNguoiDung)
WHERE TrangThai = N'Active';

-- 6) GioHangChiTiet
CREATE TABLE GioHangChiTiet (
    MaGioHangCT INT IDENTITY PRIMARY KEY,
    MaGioHang INT NOT NULL,
    MaDoChoi INT NOT NULL,
    SoLuong INT NOT NULL CHECK (SoLuong > 0),
    FOREIGN KEY (MaGioHang) REFERENCES GioHang(MaGioHang),
    FOREIGN KEY (MaDoChoi) REFERENCES DoChoi(MaDoChoi),
    CONSTRAINT UQ_GHCT UNIQUE (MaGioHang, MaDoChoi)
);
-- Không cho 1 sản phẩm xuất hiện nhiều dòng trong cùng giỏ
CREATE UNIQUE INDEX UX_GHCT ON GioHangChiTiet(MaGioHang, MaDoChoi);

-- 7) DiaChiGiaoHang
CREATE TABLE DiaChiGiaoHang (
    MaDiaChi INT IDENTITY PRIMARY KEY,
    MaNguoiDung INT NOT NULL,
    TenNguoiNhan NVARCHAR(100),
    SoDienThoai NVARCHAR(20),
    DiaChi NVARCHAR(200) NOT NULL,
    MacDinh BIT DEFAULT 0,
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);
-- 1 user chỉ có 1 địa chỉ mặc định
CREATE UNIQUE INDEX UX_DiaChi_MacDinh ON DiaChiGiaoHang(MaNguoiDung) WHERE MacDinh = 1;

-- 8) DonHang
CREATE TABLE DonHang (
    MaDonHang INT IDENTITY PRIMARY KEY,
    MaNguoiMua INT NULL,                
    MaDiaChi INT NULL,
    TenKhachHang NVARCHAR(100),        
    SoDienThoai NVARCHAR(20),
    DiaChiGiao NVARCHAR(250),
    GhiChu NVARCHAR(500),
    TrangThai NVARCHAR(50) DEFAULT N'Cho xac nhan',
    TongTien INT NOT NULL CHECK (TongTien >= 0),
    NgayDat DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MaNguoiMua) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaDiaChi) REFERENCES DiaChiGiaoHang(MaDiaChi)
);

-- 9) ChiTietDonHang
/* ================== CHITIETDONHANG ================== */
CREATE TABLE ChiTietDonHang (
    MaCTDH INT IDENTITY PRIMARY KEY,
    MaDonHang INT NOT NULL,
    MaDoChoi INT NOT NULL,
    SoLuong INT NOT NULL CHECK (SoLuong > 0),
    DonGia INT NOT NULL CHECK (DonGia >= 0),
    ThanhTien AS (SoLuong * DonGia) PERSISTED,
    FOREIGN KEY (MaDonHang) REFERENCES DonHang(MaDonHang),
    FOREIGN KEY (MaDoChoi) REFERENCES DoChoi(MaDoChoi),
    CONSTRAINT UQ_CTDH UNIQUE (MaDonHang, MaDoChoi)
);
-- Tăng tốc + chống trùng sản phẩm trong 1 đơn
CREATE INDEX IX_CTDH_MaDonHang ON ChiTietDonHang(MaDonHang);
CREATE UNIQUE INDEX UX_CTDH_DonHang_DoChoi ON ChiTietDonHang(MaDonHang, MaDoChoi);

-- 10) KhuyenMai
CREATE TABLE KhuyenMai (
    MaKhuyenMai INT IDENTITY(1,1) PRIMARY KEY,
    MaCode NVARCHAR(50) NOT NULL UNIQUE,
    TenKhuyenMai NVARCHAR(100) NOT NULL,
    Loai NVARCHAR(20) NOT NULL DEFAULT N'Percent',  -- Percent/Amount
    GiaTri INT NOT NULL,
    DieuKienToiThieu INT NOT NULL DEFAULT 0,
    NgayBatDau DATE NULL,
    NgayKetThuc DATE NULL,
    TrangThai NVARCHAR(20) NOT NULL DEFAULT N'Active',
    CONSTRAINT CK_KhuyenMai_GiaTri CHECK (GiaTri >= 0),
    CONSTRAINT CK_KhuyenMai_DK CHECK (DieuKienToiThieu >= 0)
);

-- 11) DonHang_KhuyenMai
CREATE TABLE DonHang_KhuyenMai (
    MaDonHang INT NOT NULL,
    MaKhuyenMai INT NOT NULL,
    SoTienGiam INT NOT NULL,
    CONSTRAINT PK_DonHang_KhuyenMai PRIMARY KEY (MaDonHang, MaKhuyenMai),
    CONSTRAINT CK_DHKM_SoTienGiam CHECK (SoTienGiam >= 0),
    FOREIGN KEY (MaDonHang) REFERENCES DonHang(MaDonHang),
    FOREIGN KEY (MaKhuyenMai) REFERENCES KhuyenMai(MaKhuyenMai)
);

-- 12) ThanhToan
CREATE TABLE ThanhToan (
    MaThanhToan INT IDENTITY(1,1) PRIMARY KEY,
    MaDonHang INT NOT NULL,
    PhuongThuc NVARCHAR(50) NOT NULL,
    SoTien INT NOT NULL,
    TrangThai NVARCHAR(30) NOT NULL DEFAULT N'Pending',
    MaGiaoDich NVARCHAR(100) NULL,
    NgayThanhToan DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_ThanhToan_SoTien CHECK (SoTien >= 0),
    FOREIGN KEY (MaDonHang) REFERENCES DonHang(MaDonHang)
);


-- 13) VanChuyen
CREATE TABLE VanChuyen (
    MaVanChuyen INT IDENTITY(1,1) PRIMARY KEY,
    MaDonHang INT NOT NULL,
    DonViVanChuyen NVARCHAR(100) NULL,
    MaVanDon NVARCHAR(100) NULL,
    PhiVanChuyen INT NOT NULL DEFAULT 0,
    TrangThai NVARCHAR(50) NOT NULL DEFAULT N'Dang xu ly',
    NgayDuKienGiao DATE NULL,
    NgayGiaoThucTe DATE NULL,
    CONSTRAINT CK_VanChuyen_Phi CHECK (PhiVanChuyen >= 0),
    FOREIGN KEY (MaDonHang) REFERENCES DonHang(MaDonHang)
);

-- 14) ThongBao
CREATE TABLE ThongBao (
    MaThongBao INT IDENTITY(1,1) PRIMARY KEY,
    MaNguoiDung INT NOT NULL,
    TieuDe NVARCHAR(200) NULL,
    NoiDung NVARCHAR(500) NULL,
    DaXem BIT NOT NULL DEFAULT 0,
    NgayTao DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung)
);

/* ================== YEU THICH ================== */
CREATE TABLE YeuThich (
    MaNguoiDung INT,
    MaDoChoi INT,
    NgayThem DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (MaNguoiDung, MaDoChoi),
    FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung),
    FOREIGN KEY (MaDoChoi) REFERENCES DoChoi(MaDoChoi)
);

/* ================== NOI DUNG HUONG DAN ================== */
CREATE TABLE NoiDungHuongDan (
    MaNoiDung INT IDENTITY PRIMARY KEY,
    MaDoChoi INT NOT NULL,
    TieuDe NVARCHAR(200),
    Loai NVARCHAR(50),
    LinkURL NVARCHAR(500),
    NoiDung NVARCHAR(MAX),
    NgayTao DATETIME DEFAULT GETDATE(),
    TrangThai NVARCHAR(20) DEFAULT N'Active',
    FOREIGN KEY (MaDoChoi) REFERENCES DoChoi(MaDoChoi)
);




-- ===== Index FK hay dùng để query nhanh =====
CREATE INDEX IX_DoChoi_MaDanhMuc ON DoChoi(MaDanhMuc);
CREATE INDEX IX_DoChoi_MaNguoiBan ON DoChoi(MaNguoiBan);
CREATE INDEX IX_DonHang_MaNguoiMua ON DonHang(MaNguoiMua);
CREATE INDEX IX_ThanhToan_MaDonHang ON ThanhToan(MaDonHang);
CREATE INDEX IX_VanChuyen_MaDonHang ON VanChuyen(MaDonHang);
CREATE INDEX IX_ThongBao_MaNguoiDung ON ThongBao(MaNguoiDung);

BEGIN TRY
    BEGIN TRAN;

    /* =========================
       1) NGUOIDUNG
    ========================= */
    INSERT INTO NguoiDung (TenNguoiDung, Email, MatKhauHash, VaiTro, SoDienThoai)
    VALUES
    (N'Minh Phúc', 'phuc@gmail.com',  N'hash_phuc', N'NguoiMua', '0901234567'),
    (N'Thanh Hà',  'ha@gmail.com',    N'hash_ha',   N'NguoiBan', '0902345678'),
    (N'Bảo Anh',   'anh@gmail.com',   N'hash_anh',  N'NguoiMua', '0903456789'),
    (N'Kim Ngân',  'ngan@gmail.com',  N'hash_ngan', N'NguoiBan', '0904567890'),
    (N'Tuấn Việt', 'viet@gmail.com',  N'hash_viet', N'NguoiMua', '0905678901');

    DECLARE @UserPhuc INT = (SELECT MaNguoiDung FROM NguoiDung WHERE Email='phuc@gmail.com');
    DECLARE @UserHa   INT = (SELECT MaNguoiDung FROM NguoiDung WHERE Email='ha@gmail.com');
    DECLARE @UserAnh  INT = (SELECT MaNguoiDung FROM NguoiDung WHERE Email='anh@gmail.com');
    DECLARE @UserNgan INT = (SELECT MaNguoiDung FROM NguoiDung WHERE Email='ngan@gmail.com');
    DECLARE @UserViet INT = (SELECT MaNguoiDung FROM NguoiDung WHERE Email='viet@gmail.com');

    /* =========================
       2) DANHMUC
    ========================= */
    INSERT INTO DanhMuc (TenDanhMuc)
    VALUES
    (N'Lego'),
    (N'Robot'),
    (N'Búp bê'),
    (N'Xe điều khiển'),
    (N'Xếp hình');

    DECLARE @DM_Lego INT = (SELECT MaDanhMuc FROM DanhMuc WHERE TenDanhMuc=N'Lego');
    DECLARE @DM_Robot INT = (SELECT MaDanhMuc FROM DanhMuc WHERE TenDanhMuc=N'Robot');
    DECLARE @DM_BupBe INT = (SELECT MaDanhMuc FROM DanhMuc WHERE TenDanhMuc=N'Búp bê');
    DECLARE @DM_Xe INT = (SELECT MaDanhMuc FROM DanhMuc WHERE TenDanhMuc=N'Xe điều khiển');
    DECLARE @DM_XepHinh INT = (SELECT MaDanhMuc FROM DanhMuc WHERE TenDanhMuc=N'Xếp hình');

    /* =========================
       3) DOCHOI
       (người bán: Hà + Ngân)
    ========================= */
    INSERT INTO DoChoi (TenDoChoi, Gia, MoTa, MaNguoiBan, MaDanhMuc, AnhURL, TrangThai)
    VALUES
    (N'Lego Thành Phố - Đồn Cảnh Sát', 850000, N'Bộ Lego xây dựng đồn cảnh sát đầy đủ phụ kiện.', @UserHa,   @DM_Lego,   N'/anh/lego_don_canh_sat.jpg', N'Active'),
    (N'Robot Biến Hình Optimus Prime',  450000, N'Robot biến hình 25cm, chất liệu bền đẹp.',        @UserNgan, @DM_Robot,  N'/anh/robot_optimus.jpg',      N'Active'),
    (N'Búp Bê Barbie Công Chúa',       320000, N'Búp bê Barbie váy công chúa màu hồng.',           @UserHa,   @DM_BupBe,  N'/anh/barbie_cong_chua.jpg',   N'Active'),
    (N'Xe Điều Khiển Đua Tốc Độ Cao',  600000, N'Xe điều khiển từ xa 40km/h.',                      @UserNgan, @DM_Xe,     N'/anh/xe_rc_dua.jpg',          N'Active'),
    (N'Bộ Ghép Hình Động Vật 100 Mảnh',150000, N'Bộ ghép hình phù hợp cho trẻ 5 tuổi trở lên.',     @UserHa,   @DM_XepHinh, N'/anh/ghep_hinh_dong_vat.jpg', N'Active');

    DECLARE @P1 INT = (SELECT MaDoChoi FROM DoChoi WHERE TenDoChoi=N'Lego Thành Phố - Đồn Cảnh Sát');
    DECLARE @P2 INT = (SELECT MaDoChoi FROM DoChoi WHERE TenDoChoi=N'Robot Biến Hình Optimus Prime');
    DECLARE @P3 INT = (SELECT MaDoChoi FROM DoChoi WHERE TenDoChoi=N'Búp Bê Barbie Công Chúa');
    DECLARE @P4 INT = (SELECT MaDoChoi FROM DoChoi WHERE TenDoChoi=N'Xe Điều Khiển Đua Tốc Độ Cao');
    DECLARE @P5 INT = (SELECT MaDoChoi FROM DoChoi WHERE TenDoChoi=N'Bộ Ghép Hình Động Vật 100 Mảnh');

    /* =========================
       4) KHOHANG
    ========================= */
    INSERT INTO KhoHang (MaDoChoi, SoLuongTon)
    VALUES
    (@P1, 20),
    (@P2, 15),
    (@P3, 30),
    (@P4, 10),
    (@P5, 50);

    /* =========================
       5) DIACHIGIAOHANG
       (mỗi user 1 địa chỉ mặc định)
    ========================= */
    INSERT INTO DiaChiGiaoHang (MaNguoiDung, TenNguoiNhan, SoDienThoai, DiaChi, MacDinh)
    VALUES
    (@UserPhuc, N'Minh Phúc', '0901234567', N'Hà Nội', 1),
    (@UserAnh,  N'Bảo Anh',   '0903456789', N'Đà Nẵng', 1),
    (@UserViet, N'Tuấn Việt', '0905678901', N'Hải Phòng', 1);

    DECLARE @DC_Phuc INT = (SELECT TOP 1 MaDiaChi FROM DiaChiGiaoHang WHERE MaNguoiDung=@UserPhuc AND MacDinh=1);
    DECLARE @DC_Anh  INT = (SELECT TOP 1 MaDiaChi FROM DiaChiGiaoHang WHERE MaNguoiDung=@UserAnh  AND MacDinh=1);
    DECLARE @DC_Viet INT = (SELECT TOP 1 MaDiaChi FROM DiaChiGiaoHang WHERE MaNguoiDung=@UserViet AND MacDinh=1);

    /* =========================
       6) GIOHANG + GIOHANGCHITIET
    ========================= */
    INSERT INTO GioHang (MaNguoiDung, TrangThai)
    VALUES (@UserPhuc, N'Active'),
           (@UserAnh,  N'Active');

    DECLARE @GH_Phuc INT = (SELECT TOP 1 MaGioHang FROM GioHang WHERE MaNguoiDung=@UserPhuc AND TrangThai=N'Active' ORDER BY MaGioHang DESC);
    DECLARE @GH_Anh  INT = (SELECT TOP 1 MaGioHang FROM GioHang WHERE MaNguoiDung=@UserAnh  AND TrangThai=N'Active' ORDER BY MaGioHang DESC);

    INSERT INTO GioHangChiTiet (MaGioHang, MaDoChoi, SoLuong)
    VALUES
    (@GH_Phuc, @P3, 1),
    (@GH_Phuc, @P4, 1),
    (@GH_Anh,  @P1, 2);

    /* =========================
       7) KHUYENMAI + DONHANG_KHUYENMAI
    ========================= */
    INSERT INTO KhuyenMai (MaCode, TenKhuyenMai, Loai, GiaTri, DieuKienToiThieu, NgayBatDau, NgayKetThuc, TrangThai)
    VALUES
    (N'GIAM10',  N'Giảm 10%',    N'Percent', 10,     100000, '2025-01-01', '2026-12-31', N'Active'),
    (N'GIAM50K', N'Giảm 50.000đ',N'Amount',  50000, 300000, '2025-01-01', '2026-12-31', N'Active');

    DECLARE @KM_GIAM10 INT  = (SELECT MaKhuyenMai FROM KhuyenMai WHERE MaCode=N'GIAM10');
    DECLARE @KM_GIAM50K INT = (SELECT MaKhuyenMai FROM KhuyenMai WHERE MaCode=N'GIAM50K');

    /* =========================
       8) DONHANG + CHITIETDONHANG
       (tạo 3 đơn mẫu)
    ========================= */
    DECLARE @DH1 INT, @DH2 INT, @DH3 INT;

    -- Đơn 1: Phúc mua P1 (850k) - áp GIAM10 => giảm 85k, thanh toán 765k
    INSERT INTO DonHang (MaNguoiMua, MaDiaChi, TrangThai, TongTien)
    VALUES (@UserPhuc, @DC_Phuc, N'Hoàn thành', 850000);
    SET @DH1 = SCOPE_IDENTITY();

    INSERT INTO ChiTietDonHang (MaDonHang, MaDoChoi, SoLuong, DonGia)
    VALUES (@DH1, @P1, 1, (SELECT Gia FROM DoChoi WHERE MaDoChoi=@P1));

    INSERT INTO DonHang_KhuyenMai (MaDonHang, MaKhuyenMai, SoTienGiam)
    VALUES (@DH1, @KM_GIAM10, 85000);

    -- Đơn 2: Bảo Anh mua P5 (150k)
    INSERT INTO DonHang (MaNguoiMua, MaDiaChi, TrangThai, TongTien)
    VALUES (@UserAnh, @DC_Anh, N'Đang xử lý', 150000);
    SET @DH2 = SCOPE_IDENTITY();

    INSERT INTO ChiTietDonHang (MaDonHang, MaDoChoi, SoLuong, DonGia)
    VALUES (@DH2, @P5, 1, (SELECT Gia FROM DoChoi WHERE MaDoChoi=@P5));

    -- Đơn 3: Tuấn Việt mua P2 (450k)
    INSERT INTO DonHang (MaNguoiMua, MaDiaChi, TrangThai, TongTien)
    VALUES (@UserViet, @DC_Viet, N'Đang giao', 450000);
    SET @DH3 = SCOPE_IDENTITY();

    INSERT INTO ChiTietDonHang (MaDonHang, MaDoChoi, SoLuong, DonGia)
    VALUES (@DH3, @P2, 1, (SELECT Gia FROM DoChoi WHERE MaDoChoi=@P2));

    /* =========================
       9) THANHTOAN
    ========================= */
    INSERT INTO ThanhToan (MaDonHang, PhuongThuc, SoTien, TrangThai, MaGiaoDich)
    VALUES
    (@DH1, N'COD',  765000, N'Paid',    N'TX001'),
    (@DH2, N'COD',  150000, N'Pending', NULL),
    (@DH3, N'Bank', 450000, N'Paid',    N'TX003');

    /* =========================
       10) VANCHUYEN
    ========================= */
    INSERT INTO VanChuyen (MaDonHang, DonViVanChuyen, MaVanDon, PhiVanChuyen, TrangThai, NgayDuKienGiao)
    VALUES
    (@DH1, N'GHTK',  N'VD001', 30000, N'Da giao',    '2025-12-10'),
    (@DH2, N'VNPost',N'VD002', 25000, N'Dang xu ly', '2025-12-25'),
    (@DH3, N'J&T',   N'VD003', 30000, N'Dang giao',  '2025-12-23');


    /* =========================
       11) THONGBAO
    ========================= */
    INSERT INTO ThongBao (MaNguoiDung, TieuDe, NoiDung, DaXem)
    VALUES
    (@UserPhuc, N'Đơn hàng hoàn thành', N'Đơn hàng #' + CAST(@DH1 AS NVARCHAR(20)) + N' đã hoàn thành. Cảm ơn bạn!', 0),
    (@UserAnh,  N'Đơn hàng đang xử lý', N'Đơn hàng #' + CAST(@DH2 AS NVARCHAR(20)) + N' đang được xử lý.', 0),
    (@UserViet, N'Đơn hàng đang giao',  N'Đơn hàng #' + CAST(@DH3 AS NVARCHAR(20)) + N' đang trên đường giao đến bạn.', 0);

    COMMIT TRAN;
END TRY
BEGIN CATCH
    ROLLBACK TRAN;
    SELECT ERROR_MESSAGE() AS Loi;
END CATCH;

-- ====== CHECK NHANH (14 bảng bạn có data) ======
SELECT * FROM NguoiDung;
SELECT * FROM DanhMuc;
SELECT * FROM DoChoi;
SELECT * FROM KhoHang;
SELECT * FROM GioHang;
SELECT * FROM GioHangChiTiet;
SELECT * FROM DiaChiGiaoHang;
SELECT * FROM DonHang;
SELECT * FROM ChiTietDonHang;
SELECT * FROM KhuyenMai;
SELECT * FROM DonHang_KhuyenMai;
SELECT * FROM ThanhToan;
SELECT * FROM VanChuyen;
SELECT * FROM ThongBao;
SELECT * FROM YeuThich;
SELECT * FROM NoiDungHuongDan;
-- Chi tiết đơn có ảnh (JOIN DoChoi)
SELECT dh.MaDonHang, dh.NgayDat, dh.TrangThai, dh.TongTien,
       ct.MaDoChoi, dc.TenDoChoi, dc.AnhURL, ct.SoLuong, ct.DonGia, ct.ThanhTien
FROM DonHang dh
JOIN ChiTietDonHang ct ON dh.MaDonHang = ct.MaDonHang
JOIN DoChoi dc ON ct.MaDoChoi = dc.MaDoChoi
ORDER BY dh.MaDonHang;

