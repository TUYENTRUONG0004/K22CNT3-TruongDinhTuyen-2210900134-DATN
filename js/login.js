function login() {
    const msg = document.getElementById('msg')
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value.trim()

    if (!email || !password) {
        msg.innerText = "Vui lòng nhập đầy đủ thông tin"
        return
    }

    fetch("http://127.0.0.1:5000/api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ Email: email, MatKhau: password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user))
            alert("🎉 Đăng nhập thành công!")
            window.location.href = "index.html"
        } else {
            msg.innerText = data.error
        }
    })
}