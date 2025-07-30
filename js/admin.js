import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDosCykP-rrTVAlwfAOXDGgGioxtt-VrOs",
    authDomain: "quanlykinhdoanh-cb2b1.firebaseapp.com",
    projectId: "quanlykinhdoanh-cb2b1",
    storageBucket: "quanlykinhdoanh-cb2b1.firebasestorage.app",
    messagingSenderId: "478736931655",
    appId: "1:478736931655:web:b216ac919d9aeca334ca62"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const menuCollection = collection(db, "quan-anh-beo-menu");
const categoriesCollection = collection(db, "quan-anh-beo-categories");
const ordersCollection = collection(db, "quan-anh-beo-orders");

// --- DOM Elements ---
const soundModal = document.getElementById('sound-modal');
const enableSoundBtn = document.getElementById('enable-sound-btn');
const mainContainer = document.getElementById('main-container');
const notificationSound = document.getElementById('notification-sound');
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');
let allProducts = [];

// --- Utility Functions ---
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const normalizeCategory = (str) => {
    if (!str) return '';
    const trimmedStr = str.trim();
    if (trimmedStr.length === 0) return '';
    return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1);
};
const showToast = (message) => {
    toastMessage.textContent = message;
    toastNotification.classList.remove('hidden');
    setTimeout(() => {
        toastNotification.classList.add('hidden');
    }, 5000);
};

// --- Render Functions ---
const renderCategories = (categories) => {
    const categoryManagementList = document.getElementById('category-management-list');
    const productCategorySelect = document.getElementById('product-category-select');
    categoryManagementList.innerHTML = '';
    if (categories.length === 0) {
        categoryManagementList.innerHTML = '<p class="text-center text-gray-500">Chưa có phân loại nào.</p>';
    } else {
        categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
            const catEl = document.createElement('div');
            catEl.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
            catEl.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" data-name="${cat.name}" class="delete-category-btn text-red-500 hover:text-red-700 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors"><i class="fas fa-trash"></i></button>`;
            categoryManagementList.appendChild(catEl);
        });
    }
    productCategorySelect.innerHTML = '<option value="">-- Chọn loại món ăn --</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        productCategorySelect.appendChild(option);
    });
};
const renderProducts = (products) => {
    const productListDiv = document.getElementById('product-list');
    const loadingMessage = document.getElementById('loading-products');
    productListDiv.innerHTML = '';
    if (products.length === 0) {
        loadingMessage.textContent = 'Chưa có món ăn nào. Vui lòng thêm ở trên.';
        loadingMessage.style.display = 'block';
        return;
    }
    loadingMessage.style.display = 'none';
    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || 'Chưa phân loại';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {});
    Object.keys(groupedProducts).sort().forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.className = 'mb-6 bg-white p-5 rounded-lg shadow-md';
        categorySection.innerHTML = `<h3 class="text-xl font-bold text-gray-800 mb-3 pb-2 border-b">${category}</h3>`;
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'space-y-3';
        groupedProducts[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(product => {
            const productEl = document.createElement('div');
            productEl.className = 'flex justify-between items-center p-3 rounded-md hover:bg-gray-50';
            productEl.innerHTML = `<div><p class="font-bold text-lg">${product.name}</p><p class="text-gray-600 text-sm">${formatCurrency(product.price)}</p></div><div class="flex items-center gap-2"><button data-id="${product.id}" class="edit-btn text-blue-500 hover:text-blue-700 w-10 h-10 rounded-full hover:bg-blue-50 flex items-center justify-center"><i class="fas fa-edit"></i></button><button data-id="${product.id}" class="delete-btn text-red-500 hover:text-red-700 w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center"><i class="fas fa-trash"></i></button></div>`;
            itemsContainer.appendChild(productEl);
        });
        categorySection.appendChild(itemsContainer);
        productListDiv.appendChild(categorySection);
    });
};

// --- Firebase Listeners ---
const startDataListeners = () => {
    onSnapshot(query(categoriesCollection), (snapshot) => renderCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), console.error);
    onSnapshot(query(menuCollection), (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(allProducts);
    }, console.error);
};

const startNotificationListener = () => {
    onSnapshot(query(ordersCollection, where("status", "==", "new")), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const newOrder = change.doc.data();
                notificationSound.play().catch(e => console.log("Lỗi phát âm thanh:", e));
                showToast(`Có đơn hàng mới từ Bàn ${newOrder.table}!`);
            }
        });
    });
};

// --- Event Handlers & Main Execution ---

const unlockAudioAndStart = () => {
    notificationSound.play().then(() => {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        console.log("Âm thanh đã được kích hoạt.");
        startNotificationListener();
    }).catch(error => {
        console.warn("Không thể phát âm thanh để kích hoạt, nhưng vẫn tiếp tục vì người dùng đã tương tác.", error);
        startNotificationListener();
    });

    // Xóa banner và các event listener sau khi đã kích hoạt
    const banner = document.getElementById('sound-unlock-banner');
    if (banner) banner.remove();
    document.removeEventListener('click', unlockAudioAndStart);
    document.removeEventListener('keydown', unlockAudioAndStart);
};

// --- Main Application Logic ---
function initializeApp() {
    // Luôn bắt đầu bằng cách lắng nghe dữ liệu không cần âm thanh
    startDataListeners();

    // Kiểm tra xem người dùng đã từng cho phép chưa
    if (localStorage.getItem('soundPermissionGranted') === 'true') {
        // Nếu đã cho phép, ẩn modal và hiện nội dung chính
        soundModal.classList.add('hidden');
        mainContainer.classList.remove('hidden');

        // Tạo một banner nhỏ để thông báo
        const banner = document.createElement('div');
        banner.id = 'sound-unlock-banner';
        banner.className = 'bg-yellow-400 text-yellow-900 text-center p-2 font-medium sticky top-0 z-20';
        banner.textContent = 'Âm thanh đang tắt. Nhấn vào bất cứ đâu để bật lại.';
        document.body.prepend(banner);

        // Chờ hành động đầu tiên của người dùng để kích hoạt âm thanh
        document.addEventListener('click', unlockAudioAndStart, { once: true });
        document.addEventListener('keydown', unlockAudioAndStart, { once: true });

    } else {
        // Nếu là lần đầu tiên, hiển thị modal yêu cầu
        mainContainer.classList.add('hidden');
        soundModal.classList.remove('hidden');
        
        enableSoundBtn.addEventListener('click', () => {
            localStorage.setItem('soundPermissionGranted', 'true'); // Lưu lựa chọn vĩnh viễn
            soundModal.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            unlockAudioAndStart();
        });
    }
}

initializeApp();


// --- Các Event Handler khác cho form (giữ nguyên) ---
const addCategoryForm = document.getElementById('add-category-form');
addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newCategoryNameInput = document.getElementById('new-category-name');
    const categoryName = normalizeCategory(newCategoryNameInput.value);
    if (!categoryName) return;
    const q = query(categoriesCollection, where("name", "==", categoryName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        alert('Phân loại này đã tồn tại!');
        return;
    }
    try {
        await addDoc(categoriesCollection, { name: categoryName });
        addCategoryForm.reset();
    } catch (error) {
        console.error("Lỗi khi thêm phân loại: ", error);
        alert("Không thể thêm phân loại mới.");
    }
});

const categoryManagementList = document.getElementById('category-management-list');
categoryManagementList.addEventListener('click', async (e) => {
    const target = e.target.closest('.delete-category-btn');
    if (!target) return;
    const categoryId = target.dataset.id;
    const categoryName = target.dataset.name;
    const isCategoryInUse = allProducts.some(p => p.category === categoryName);
    if (isCategoryInUse) {
        alert(`Không thể xóa! Phân loại "${categoryName}" đang được sử dụng cho một hoặc nhiều món ăn.`);
        return;
    }
    if (confirm(`Bạn có chắc muốn xóa phân loại "${categoryName}"?`)) {
        try {
            await deleteDoc(doc(db, "quan-anh-beo-categories", categoryId));
        } catch (error) {
            console.error("Lỗi khi xóa phân loại: ", error);
            alert("Không thể xóa phân loại.");
        }
    }
});

const resetProductForm = () => {
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const formTitle = document.getElementById('form-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const productNameInput = document.getElementById('product-name');
    productForm.reset();
    productIdInput.value = '';
    formTitle.textContent = 'Thêm Món Ăn Mới';
    saveBtnText.textContent = 'Lưu Món';
    cancelEditBtn.classList.add('hidden');
    productNameInput.focus();
};

const productForm = document.getElementById('product-form');
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productCategorySelect = document.getElementById('product-category-select');
    const id = productIdInput.value;
    const productData = {
        name: productNameInput.value,
        price: Number(productPriceInput.value),
        category: productCategorySelect.value
    };
    if (!productData.category) {
        alert("Vui lòng chọn phân loại cho món ăn!");
        return;
    }
    try {
        if (id) {
            await updateDoc(doc(db, "quan-anh-beo-menu", id), productData);
        } else {
            await addDoc(menuCollection, productData);
        }
        resetProductForm();
    } catch (error) {
        console.error("Lỗi khi lưu món ăn: ", error);
        alert("Đã có lỗi xảy ra, không thể lưu món ăn!");
    }
});

const productListDiv = document.getElementById('product-list');
productListDiv.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    const productDocRef = doc(db, "quan-anh-beo-menu", id);
    if (target.classList.contains('delete-btn')) {
        if (confirm('Bạn có chắc muốn xóa món ăn này?')) {
            await deleteDoc(productDocRef).catch(console.error);
        }
    } else if (target.classList.contains('edit-btn')) {
        const docSnap = await getDocs(query(menuCollection, where('__name__', '==', id)));
        if (!docSnap.empty) {
            const product = docSnap.docs[0].data();
            const productIdInput = document.getElementById('product-id');
            const productNameInput = document.getElementById('product-name');
            const productPriceInput = document.getElementById('product-price');
            const productCategorySelect = document.getElementById('product-category-select');
            const formTitle = document.getElementById('form-title');
            const saveBtnText = document.getElementById('save-btn-text');
            const cancelEditBtn = document.getElementById('cancel-edit-btn');
            productIdInput.value = id;
            productNameInput.value = product.name;
            productPriceInput.value = product.price;
            productCategorySelect.value = product.category;
            formTitle.textContent = 'Chỉnh Sửa Món Ăn';
            saveBtnText.textContent = 'Cập Nhật';
            cancelEditBtn.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            productNameInput.focus();
        }
    }
});

const cancelEditBtn = document.getElementById('cancel-edit-btn');
cancelEditBtn.addEventListener('click', resetProductForm);
