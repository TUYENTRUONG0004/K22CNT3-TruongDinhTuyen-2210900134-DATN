let products = [];
let categories = [];
let currentProduct = null;

const API_BASE = 'http://127.0.0.1:5000/api';

// Load danh mục
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/danhmuc`);
        categories = await res.json();
        const select = document.getElementById('category-filter');
        select.innerHTML = '<option value="">Tất cả danh mục</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.MaDanhMuc;
            opt.textContent = cat.TenDanhMuc;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Lỗi load danh mục:", err);
    }
}

// Load sản phẩm theo bộ lọc
async function loadProducts() {
    const search = document.getElementById('search-input').value.trim().toLowerCase();
    const catId = document.getElementById('category-filter').value;

    let url = `${API_BASE}/dochoi`;
    const params = new URLSearchParams();
    if (search) params.append('ten', search);
    if (catId) params.append('madanhmuc', catId);
    if (params.toString()) url += '?' + params.toString();

    try {
        const res = await fetch(url);
        products = await res.json();

        const container = document.getElementById('product-list');
        container.innerHTML = '';

        if (products.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><h4>Không tìm thấy sản phẩm nào 😢</h4></div>';
            return;
        }

        products.forEach(product => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 mb-4';

            col.innerHTML = `
                <div class="product-card position-relative" onclick="openProductModal(${product.MaDoChoi})">
                    <img src="${product.AnhURL || '/anh/no-image.jpg'}" class="w-100" alt="${product.TenDoChoi}">
                    <div class="card-body">
                        <h5 class="card-title">${product.TenDoChoi}</h5>
                        <p class="card-text">${product.MoTa || 'Đồ chơi chất lượng cao, an toàn cho bé.'}</p>
                        <p class="price">${Number(product.Gia).toLocaleString('vi-VN')} ₫</p>
                        <button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); addToCart(${product.MaDoChoi}, 1)">
                            <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });

    } catch (err) {
        console.error("Lỗi load sản phẩm:", err);
        document.getElementById('product-list').innerHTML = 
            '<div class="col-12 text-center text-danger py-5">Lỗi kết nối server. Vui lòng thử lại sau.</div>';
    }
}

// Mở modal chi tiết sản phẩm
function openProductModal(maDoChoi) {
    currentProduct = products.find(p => p.MaDoChoi === maDoChoi);
    if (!currentProduct) return;

    document.getElementById('modal-image').src = currentProduct.AnhURL || '/anh/no-image.jpg';
    document.getElementById('modal-title').textContent = currentProduct.TenDoChoi;
    document.getElementById('modal-name').textContent = currentProduct.TenDoChoi;
    document.getElementById('modal-price').textContent = Number(currentProduct.Gia).toLocaleString('vi-VN') + ' ₫';
    document.getElementById('modal-description').textContent = currentProduct.MoTa || 'Sản phẩm chất lượng cao, phù hợp cho trẻ em.';
    document.getElementById('modal-category').textContent = 
        categories.find(c => c.MaDanhMuc === currentProduct.MaDanhMuc)?.TenDanhMuc || 'Chưa phân loại';

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// Thêm vào giỏ hàng
function addToCart(maDoChoi, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.ma === maDoChoi);

    if (existing) {
        existing.qty += quantity;
    } else {
        const product = products.find(p => p.MaDoChoi === maDoChoi);
        if (!product) return;
        cart.push({
            ma: maDoChoi,
            ten: product.TenDoChoi,
            gia: product.Gia,
            anh: product.AnhURL || '/anh/no-image.jpg',
            qty: quantity
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert('✅ Đã thêm "' + (products.find(p => p.MaDoChoi === maDoChoi)?.TenDoChoi) + '" vào giỏ hàng!');
}

// Cập nhật số lượng trên icon giỏ hàng
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').textContent = total;
}

// Khởi động trang
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
    updateCartCount();

    // Tìm kiếm khi nhấn nút hoặc Enter
    document.getElementById('search-btn').addEventListener('click', loadProducts);
    document.getElementById('search-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') loadProducts();
    });

    // Thêm từ modal
    document.getElementById('add-to-cart-modal').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('modal-quantity').value) || 1;
        if (currentProduct) {
            addToCart(currentProduct.MaDoChoi, qty);
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        }
    });
});