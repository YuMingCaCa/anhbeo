// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, query } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDosCykP-rrTVAlwfAOXDGgGioxtt-VrOs",
    authDomain: "quanlykinhdoanh-cb2b1.firebaseapp.com",
    projectId: "quanlykinhdoanh-cb2b1",
    storageBucket: "quanlykinhdoanh-cb2b1.firebasestorage.app",
    messagingSenderId: "478736931655",
    appId: "1:478736931655:web:b216ac919d9aeca334ca62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection references
const menuCollection = collection(db, "quan-anh-beo-menu");
const categoriesCollection = collection(db, "quan-anh-beo-categories");
const ordersCollection = collection(db, "quan-anh-beo-orders");

// State variables
let menuData = [];
let categoriesData = [];
let cart = [];
let activeCategory = 'Tất cả';

// DOM Elements
const menuListContainer = document.getElementById('menu-list');
const categoryFiltersContainer = document.getElementById('category-filters');
const totalPriceElement = document.getElementById('total-price');
const placeOrderBtn = document.getElementById('place-order-btn');
const successModal = document.getElementById('success-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tableNumberSpan = document.getElementById('table-number');

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const getTableNumber = () => new URLSearchParams(window.location.search).get('table') || '1';

// --- RENDER FUNCTIONS ---

// Render category filter buttons
const renderCategoryFilters = () => {
    categoryFiltersContainer.innerHTML = '';
    const allButton = document.createElement('button');
    allButton.textContent = 'Tất cả';
    allButton.className = 'filter-btn px-4 py-2 rounded-full text-sm font-medium border-2 border-gray-300 hover:bg-gray-200 transition-colors';
    if (activeCategory === 'Tất cả') {
        allButton.classList.add('active');
    }
    allButton.addEventListener('click', () => {
        activeCategory = 'Tất cả';
        renderMenuList();
        renderCategoryFilters();
    });
    categoryFiltersContainer.appendChild(allButton);

    categoriesData.sort((a,b) => a.name.localeCompare(b.name)).forEach(cat => {
        const button = document.createElement('button');
        button.textContent = cat.name;
        button.className = 'filter-btn px-4 py-2 rounded-full text-sm font-medium border-2 border-gray-300 hover:bg-gray-200 transition-colors';
        if (activeCategory === cat.name) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            activeCategory = cat.name;
            renderMenuList();
            renderCategoryFilters();
        });
        categoryFiltersContainer.appendChild(button);
    });
};


// Render the menu list based on current data and active category
const renderMenuList = () => {
    menuListContainer.innerHTML = '';
    
    const filteredMenu = activeCategory === 'Tất cả' 
        ? menuData 
        : menuData.filter(item => item.category === activeCategory);

    const groupedProducts = filteredMenu.reduce((acc, product) => {
        const category = product.category || 'Chưa phân loại';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {});

    if (Object.keys(groupedProducts).length === 0) {
        menuListContainer.innerHTML = '<p class="text-center text-gray-500">Không có món ăn nào trong mục này.</p>';
        return;
    }

    Object.keys(groupedProducts).sort().forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.className = 'mb-8';
        categorySection.innerHTML = `<h2 class="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2">${category}</h2>`;
        
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'space-y-4';

        groupedProducts[category].sort((a,b) => a.name.localeCompare(b.name)).forEach(item => {
            const cartItem = cart.find(ci => ci.id === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            const itemElement = document.createElement('div');
            itemElement.className = 'flex justify-between items-center bg-white p-4 rounded-lg shadow-sm';
            itemElement.innerHTML = `
                <div>
                    <p class="text-lg font-semibold text-gray-800">${item.name}</p>
                    <p class="text-gray-500">${formatCurrency(item.price)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button data-id="${item.id}" class="quantity-btn decrease-btn bg-gray-200 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-gray-300 transition-colors" ${quantity === 0 ? 'disabled' : ''}>-</button>
                    <span class="font-bold text-xl w-8 text-center">${quantity}</span>
                    <button data-id="${item.id}" class="quantity-btn increase-btn bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-blue-600 transition-colors">+</button>
                </div>
            `;
            itemsDiv.appendChild(itemElement);
        });
        categorySection.appendChild(itemsDiv);
        menuListContainer.appendChild(categorySection);
    });
    updateSummary();
};

// Update the bottom summary bar
const updateSummary = () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalPriceElement.innerText = formatCurrency(total);
    placeOrderBtn.disabled = cart.length === 0;
};

// --- EVENT HANDLERS ---

const handleQuantityChange = (itemId, change) => {
    let cartItem = cart.find(ci => ci.id === itemId);
    if (!cartItem) {
        if (change > 0) {
            const menuItem = menuData.find(mi => mi.id === itemId);
            cart.push({ ...menuItem, quantity: 1 });
        }
    } else {
        cartItem.quantity += change;
        if (cartItem.quantity <= 0) {
            cart = cart.filter(ci => ci.id !== itemId);
        }
    }
    renderMenuList();
};

const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `<span>Đang gửi...</span>`;

    const order = {
        table: getTableNumber(),
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: "new",
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(ordersCollection, order);
        successModal.classList.remove('hidden');
    } catch (error) {
        console.error("Error placing order: ", error);
        alert("Đã có lỗi xảy ra, vui lòng thử lại!");
    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = `<i class="fas fa-paper-plane"></i><span>Đặt Món</span>`;
    }
};

const resetOrder = () => {
    cart = [];
    renderMenuList();
    successModal.classList.add('hidden');
};

// --- EVENT LISTENERS ---

menuListContainer.addEventListener('click', (e) => {
    const button = e.target.closest('.quantity-btn');
    if (!button) return;
    const itemId = button.dataset.id;
    if (button.classList.contains('increase-btn')) {
        handleQuantityChange(itemId, 1);
    } else if (button.classList.contains('decrease-btn')) {
        handleQuantityChange(itemId, -1);
    }
});

placeOrderBtn.addEventListener('click', handlePlaceOrder);
closeModalBtn.addEventListener('click', resetOrder);

// --- INITIALIZATION ---

const init = () => {
    tableNumberSpan.textContent = getTableNumber();
    
    // Listen for real-time updates on categories
    onSnapshot(query(categoriesCollection), (snapshot) => {
        categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategoryFilters();
    });

    // Listen for real-time updates on the menu
    onSnapshot(query(menuCollection), (snapshot) => {
        menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMenuList();
    });
};

init();
