const API_BASE = 'http://127.0.0.1:5000/api';

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.style.display = 'none';
        }, 400); // Wait for transition
    }, 3000);
}

async function loadDashboard() {
    try {
        const [statsRes, revenueRes, inventoryRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/thongke`),
            fetch(`${API_BASE}/chart/revenue`),
            fetch(`${API_BASE}/chart/inventory`),
            fetch(`${API_BASE}/chart/users`)
        ]);

        const stats = await statsRes.json();
        const revenueData = await revenueRes.json();
        const inventoryData = await inventoryRes.json();
        const usersData = await usersRes.json();

        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount || 0);
        };

        // Format date
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN');
        };

        // Update all statistics
        document.getElementById('statProducts').textContent = stats.total_products || 0;
        document.getElementById('statCategories').textContent = stats.total_categories || 0;
        document.getElementById('statOrders').textContent = stats.total_orders || 0;
        document.getElementById('statUsers').textContent = stats.total_users || 0;
        document.getElementById('statRevenue').textContent = formatCurrency(stats.total_revenue);
        document.getElementById('statCompleted').textContent = stats.completed_orders || 0;
        document.getElementById('statPending').textContent = stats.pending_orders || 0;
        document.getElementById('statLowStock').textContent = stats.low_stock_products || 0;
        document.getElementById('statMonthlyRevenue').textContent = formatCurrency(stats.monthly_revenue);
        document.getElementById('statRecentOrders').textContent = stats.recent_orders || 0;

        // Create all charts
        createRevenueChart(revenueData);
        createInventoryChart(inventoryData);
        createUsersChart(usersData);

    } catch (err) {
        console.error('Lỗi tải thống kê:', err);
        showToast('Lỗi tải thống kê', 'error');
    }
}

function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');

    const labels = data.map(item => item.date);
    const revenues = data.map(item => item.revenue);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu',
                data: revenues,
                borderColor: '#ff4081',
                backgroundColor: 'rgba(255, 64, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ff4081',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Doanh thu: ' + new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND'
                            }).format(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                notation: 'compact'
                            }).format(value);
                        },
                        color: '#777'
                    },
                    grid: {
                        color: 'rgba(255, 64, 129, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#777'
                    },
                    grid: {
                        color: 'rgba(255, 64, 129, 0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function createInventoryChart(data) {
    const ctx = document.getElementById('inventoryChart').getContext('2d');

    const labels = data.map(item => item.date);
    const inventories = data.map(item => item.inventory);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tổng tồn kho',
                data: inventories,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4CAF50',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Tổng tồn kho: ' + context.parsed.y + ' sản phẩm';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#777'
                    },
                    grid: {
                        color: 'rgba(76, 175, 80, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#777'
                    },
                    grid: {
                        color: 'rgba(76, 175, 80, 0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function createUsersChart(data) {
    const ctx = document.getElementById('usersChart').getContext('2d');

    const labels = data.map(item => item.date);
    const totalUsers = data.map(item => item.total_users);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tổng người dùng',
                data: totalUsers,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2196F3',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Tổng người dùng: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#777'
                    },
                    grid: {
                        color: 'rgba(33, 150, 243, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#777'
                    },
                    grid: {
                        color: 'rgba(33, 150, 243, 0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', loadDashboard);