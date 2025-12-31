const API_BASE = 'http://127.0.0.1:5000/api';

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Dashboard load
async function loadDashboard() {
    const statProducts = document.getElementById('statProducts');
    const statCategories = document.getElementById('statCategories');
    const statOrders = document.getElementById('statOrders');
    if (!statProducts || !statCategories || !statOrders) return;

    try {
        const [prodRes, catRes, orderRes] = await Promise.all([
            fetch(`${API_BASE}/dochoi`),
            fetch(`${API_BASE}/danhmuc`),
            fetch(`${API_BASE}/donhang`)
        ]);

        const prods = await prodRes.json();
        const cats = await catRes.json();
        const ords = await orderRes.json();

        statProducts.textContent = prods.length;
        statCategories.textContent = cats.length;
        statOrders.textContent = ords.length;
    } catch (err) {
        showToast('Lỗi tải dashboard', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});