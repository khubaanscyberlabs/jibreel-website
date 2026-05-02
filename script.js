let selectedCategory = "all";
let selectedType = "all";
let searchTerm = "";

function renderPerfumes(list, showAll = false){

const grid = document.getElementById("perfumeGrid");
if (!grid) return;

grid.innerHTML = "";

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

// Type filter
if (selectedType !== "all") {
    filteredList = filteredList.filter(p => p.variants && p.variants[selectedType]);
}

// Limit
const displayList = showAll ? filteredList : filteredList.slice(0, 4);

displayList.forEach(product => {

const card = document.createElement("div");
card.classList.add("perfume-card");

// Card click → product page
card.addEventListener("click", function(e) {
    if (e.target.closest("button")) return;
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

<button class="perfume-card-btn add-to-cart-btn" aria-label="Add to cart">
+
</button>

</div>

<div class="perfume-card-body">

<h3 class="perfume-card-name">${product.name}</h3>
<p class="perfume-price">₹${firstPrice}</p>

</div>
`;

grid.appendChild(card);

// =======================
// ADD TO CART (HOMEPAGE)
// =======================

const addBtn = card.querySelector(".add-to-cart-btn");

addBtn.addEventListener("click", function(e){
    e.stopPropagation();

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const item = {
        name: product.name,
        price: firstPrice,
        image: variant?.images ? variant.images[firstSize] : (variant?.image || product.image),
        size: firstSize,
        quantity: 1
    };

    // Check if already exists
    const existing = cart.find(i => i.name === item.name && i.size === item.size);

    if(existing){
        existing.quantity += 1;
    } else {
        cart.push(item);
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    updateCartCount();
});

});

}

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
    const toggle = document.getElementById("menuToggle");

    if (!menu) return;

    menu.classList.toggle("active");

    if (toggle) {
        toggle.classList.toggle("active");
    }
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

const navSearchBtn = document.getElementById("navSearchBtn");
const searchPanel = document.getElementById("searchPanel");
const navSearchInput = document.getElementById("navSearchInput");

if (navSearchBtn && searchPanel && navSearchInput) {

    navSearchBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        searchPanel.classList.toggle("active");

        if (searchPanel.classList.contains("active")) {
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

    // OPTIONAL: close when clicking outside (premium behavior)
    document.addEventListener("click", function (e) {
        if (!searchPanel.contains(e.target) && !navSearchBtn.contains(e.target)) {
            searchPanel.classList.remove("active");
        }
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
