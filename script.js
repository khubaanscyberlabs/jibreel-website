let selectedCategory = "all";
let selectedType = "all";
let searchTerm = "";

function renderPerfumes(list, showAll = false){

const grid = document.getElementById("perfumeGrid");

if (!grid) return;

grid.innerHTML = "";

// ✅ LIMIT ONLY HERE (CORRECT PLACE)
let filteredList = list;
// Search filter
if (searchTerm.trim() !== "") {
    filteredList = filteredList.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
}
// Category filter
if (selectedCategory !== "all") {
    filteredList = filteredList.filter(p => p.category === selectedCategory);
}

// Type filter (we’ll prepare for roll-on later)
if (selectedType !== "all") {
    filteredList = filteredList.filter(p => p.variants && p.variants[selectedType]);
}

// Apply limit AFTER filtering
const displayList = showAll ? filteredList : filteredList.slice(0, 4);

displayList.forEach(product => {

const card = document.createElement("div");
card.classList.add("perfume-card");

card.addEventListener('click', function(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;

    window.location.href = `product.html?perfume=${encodeURIComponent(product.name)}`;
});

const variant = selectedType === "all" 
    ? product.variants?.spray 
    : product.variants?.[selectedType] || product.variants?.spray;
const sizes = variant?.sizes || {};
const firstSize = Object.keys(sizes)[0];
const firstPrice = sizes[firstSize] || "";

card.innerHTML = `
<div class="perfume-card-image-wrapper">
<img src="${variant?.images ? variant.images[firstSize] : (variant?.image || product.image)}" alt="${product.name}" loading="lazy">
</div>

<div class="perfume-card-body">

<h3 class="perfume-card-name">${product.name}</h3>
<p class="perfume-price">₹${firstPrice}</p>

<div class="perfume-rating">
<i class="fas fa-star"></i>
<i class="fas fa-star"></i>
<i class="fas fa-star"></i>
<i class="fas fa-star"></i>
<i class="fas fa-star"></i>
</div>

<p class="perfume-card-description">${product.description}</p>

<div class="size-selector">
${Object.keys(variant?.sizes || {}).map((size, i) => `
    <button class="size-btn ${i === 0 ? 'active' : ''}" data-size="${size}">
        ${size}
    </button>
`).join("")}
</div>

<div class="quantity-selector">
<button class="qty-minus">−</button>
<span class="qty-value">1</span>
<button class="qty-plus">+</button>
</div>

<button class="perfume-card-btn add-to-cart-btn">
Add to Cart
</button>

<a href="product.html?perfume=${encodeURIComponent(product.name)}"
class="view-details-btn">
View Details
</a>

</div>
`;

grid.appendChild(card);

// ===== Quantity Logic =====
const qtyValue = card.querySelector(".qty-value");
const minusBtn = card.querySelector(".qty-minus");
const plusBtn = card.querySelector(".qty-plus");

let quantity = 1;

plusBtn.addEventListener("click", () => {
quantity++;
qtyValue.textContent = quantity;
});

minusBtn.addEventListener("click", () => {
if(quantity > 1){
quantity--;
qtyValue.textContent = quantity;
}
});

// ===== Size Logic =====
const sizeButtons = card.querySelectorAll(".size-btn");

sizeButtons.forEach(btn => {
    btn.addEventListener("click", () => {

        sizeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const selectedSize = btn.dataset.size;
        const newPrice = variant?.sizes?.[selectedSize];

        if(newPrice){
            card.querySelector(".perfume-price").innerText = `₹${newPrice}`;
        }
        const cardImage = card.querySelector(".perfume-card-image-wrapper img");

// 🔥 always fetch fresh variant
const currentVariant = selectedType === "all"
    ? product.variants?.spray
    : product.variants?.[selectedType] || product.variants?.spray;

if (currentVariant?.images && currentVariant.images[selectedSize]) {
    cardImage.src = currentVariant.images[selectedSize];
}

if (variant?.images && variant.images[selectedSize]) {
    cardImage.src = variant.images[selectedSize];
}
    });
});

}); // ✅ closes displayList.forEach

} // ✅ closes renderPerfumes


document.addEventListener("DOMContentLoaded", function(){

    renderPerfumes(perfumes);

    // ✅ FIXED: View All Button
    const viewAllBtn = document.querySelector(".view-all-btn");

    if(viewAllBtn){
        viewAllBtn.addEventListener("click", function(e){
            e.preventDefault();
            renderPerfumes(perfumes, true);
        });
    }

});
// ==============================
// CATEGORY FILTER (FIXED CLEAN)
// ==============================

const filterButtons = document.querySelectorAll(".category-filter button");

filterButtons.forEach(btn => {

    btn.addEventListener("click", (e) => {
        e.stopPropagation();

        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        selectedCategory = btn.dataset.category;

        renderPerfumes(perfumes, true);
    });

});
// ==============================
// NAVBAR SCROLL BEHAVIOR
// ==============================

const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
    if (!navbar) return;

    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// ==============================
// MOBILE MENU TOGGLE
// ==============================

function toggleMenu() {

    const menu = document.getElementById("mobileMenu");
    if (!menu) return;

    menu.classList.toggle("active");

}

// =======================
// GLOBAL CART COUNT SYNC
// =======================

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.innerText = totalItems;
    }
}

updateCartCount();

// ==============================
// TYPE FILTER (SPRAY / ROLL-ON)
// ==============================

const typeButtons = document.querySelectorAll(".type-filter .filter-btn");

typeButtons.forEach(btn => {

    btn.addEventListener("click", (e) => {
        e.stopPropagation();

        // remove active from all
        typeButtons.forEach(b => b.classList.remove("active"));

        // add active to clicked
        btn.classList.add("active");

        // update state
        selectedType = btn.dataset.type;

        console.log("Selected Type:", selectedType); // DEBUG

        // re-render
        renderPerfumes(perfumes, true);
        }); // closes click
}); // closes forEach

// ==============================
// NAVBAR SEARCH
// ==============================

const navSearch = document.querySelector(".nav-search");
const navSearchBtn = document.getElementById("navSearchBtn");
const navSearchInput = document.getElementById("navSearchInput");

if (navSearch && navSearchBtn && navSearchInput) {
    navSearchBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        navSearch.classList.toggle("active");

        if (navSearch.classList.contains("active")) {
            navSearchInput.focus();
        } else {
            navSearchInput.value = "";
            searchTerm = "";
            renderPerfumes(perfumes, false);
        }
    });

    navSearchInput.addEventListener("input", function () {
        searchTerm = navSearchInput.value;
        renderPerfumes(perfumes, true);
    });
}

// ==============================
// NEW PREMIUM COUNTDOWN (GLOBAL)
// ==============================

const targetDate = new Date();
targetDate.setDate(targetDate.getDate() + 5);

function updateCountdown() {
    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        daysEl.innerText = "00";
        hoursEl.innerText = "00";
        minutesEl.innerText = "00";
        secondsEl.innerText = "00";
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    daysEl.innerText = String(days).padStart(2, '0');
    hoursEl.innerText = String(hours).padStart(2, '0');
    minutesEl.innerText = String(minutes).padStart(2, '0');
    secondsEl.innerText = String(seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);
