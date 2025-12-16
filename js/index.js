// scripts.js

// Lấy danh sách sản phẩm từ API Flask
fetch('http://127.0.0.1:5000/api/dochoi')
    .then(response => response.json())
    .then(data => {
        const productList = document.getElementById('product-list');
        
        // Duyệt qua danh sách sản phẩm và tạo thẻ HTML hiển thị
        data.forEach(product => {
            const productElement = document.createElement('div');
            productElement.classList.add('col-md-4');  // Thêm Bootstrap để hiển thị 3 cột
            productElement.classList.add('product');

            // Tạo HTML cho từng sản phẩm
            productElement.innerHTML = `
                <div class="card mb-4">
                    <img src="${product.AnhURL}" alt="${product.TenDoChoi}" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">${product.TenDoChoi}</h5>
                        <p class="card-text">${product.MoTa}</p>
                        <p class="price">${product.Gia} VND</p>
                        <button class="btn btn-primary btn-detail">Xem chi tiết</button>
                    </div>
                </div>
            `;
            
            // Append sản phẩm vào container
            productList.appendChild(productElement);
        });
    })
    .catch(error => console.log('Lỗi khi lấy dữ liệu sản phẩm: ', error));
