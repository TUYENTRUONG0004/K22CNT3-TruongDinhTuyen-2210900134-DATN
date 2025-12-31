// index.js
fetch('http://127.0.0.1:5000/api/dochoi')
  .then(res => res.json())
  .then(data => {
    const productList = document.getElementById('product-list');
    productList.innerHTML = "";

    data.forEach(product => {
      const col = document.createElement('div');
      col.className = "col-lg-4 col-md-6 mb-4";

      col.innerHTML = `
        <div class="product-card">
          <img src="${product.AnhURL}" alt="${product.TenDoChoi}" class="w-100">
          <div class="card-body">
            <h5 class="card-title">${product.TenDoChoi}</h5>
            <p class="card-text">${product.MoTa || 'Đồ chơi chất lượng cao, an toàn cho bé.'}</p>
            <p class="price">${Number(product.Gia).toLocaleString('vi-VN')} ₫</p>
            <button class="btn-detail">Xem chi tiết</button>
          </div>
        </div>
      `;

      productList.appendChild(col);
    });
  })
  .catch(err => {
    console.error("Lỗi khi lấy dữ liệu:", err);
    document.getElementById('product-list').innerHTML = 
      `<div class="col-12 text-center text-danger">Không thể tải sản phẩm. Vui lòng thử lại sau.</div>`;
  });