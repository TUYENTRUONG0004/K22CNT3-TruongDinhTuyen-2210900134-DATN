function register() {
    const msg = document.getElementById("msg")
    const name = document.getElementById("name").value.trim()
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value.trim()

    if (!name || !email || !password) {
        msg.innerText = "Vui lòng nhập đầy đủ thông tin"
        return
    }

    fetch("http://127.0.0.1:5000/api/auth/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            TenNguoiDung: name,
            Email: email,
            MatKhau: password
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            alert("🎉 Đăng ký thành công!")
            window.location.href = "login.html"
        } else {
            msg.innerText = data.error
        }
    })
}