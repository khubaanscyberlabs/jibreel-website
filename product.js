document.addEventListener("DOMContentLoaded", function () {

    const params = new URLSearchParams(window.location.search);
    const perfumeName = decodeURIComponent(params.get("perfume") || "");

    const product = perfumes.find(p => p.name.trim() === perfumeName.trim());

    console.log("URL Name:", perfumeName);
    console.log("Matched Product:", product);

    // ==============================
    // PRODUCT LOAD
    // ==============================

    let details = null;

    if (product) {

        const fullName = product.name.replace("Impression of", "").trim();

        let title = fullName;
        let brand = "";

        if (fullName.includes("-")) {
            const parts = fullName.split("-");
            title = parts[0].trim();
            brand = parts[1].trim();
        }

        document.getElementById("productTitle").textContent = title;
        document.getElementById("productBrand").textContent = brand;
        document.getElementById("productDescription").textContent = product.description;

        const cleanProductName = product.name
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

console.log("Looking for key:", cleanProductName);
console.log("Available keys:", Object.keys(productDetails));

      if (typeof productDetails !== "undefined") {
    if (productDetails[cleanProductName]) {
        details = productDetails[cleanProductName];
        console.log("Matched exact productDetails");
    } else {
        details = productDetails.default;
        console.warn("Using DEFAULT data for:", cleanProductName);
    }
}

        if (details) {
            document.getElementById("productScentStory").innerText = details.scentStory;

            document.getElementById("productIngredients").innerHTML = `
                <strong>Top Notes:</strong> ${details.topNotes}<br>
                <strong>Middle Notes:</strong> ${details.middleNotes}<br>
                <strong>Base Notes:</strong> ${details.baseNotes}
            `;

            document.getElementById("productUsageTips").innerText = details.sprayUsageTips;
        }

        // Inspired by field removed from new Amanzada-style product layout

        const defaultVariant = "spray";
        const defaultSize = Object.keys(product.variants[defaultVariant].sizes)[0];

        const img = document.getElementById("productImage");
        img.src = product.variants[defaultVariant].images
            ? product.variants[defaultVariant].images[defaultSize]
            : product.variants[defaultVariant].image;

        document.getElementById("productPrice").innerText =
            "Rs. " + product.variants[defaultVariant].sizes[defaultSize];

        document.getElementById("productMRP").innerText =
            "Rs. " + (product.variants[defaultVariant].sizes[defaultSize] + 800);

    } else {

        document.body.innerHTML = "<h1 style='color:black'>Product Not Found</h1>";
        return;
    }

    // ==============================
    // QUANTITY
    // ==============================

    let quantity = 1;

    const qty = document.getElementById("qty");
    const minusBtn = document.getElementById("minus");
    const plusBtn = document.getElementById("plus");
    const addToCartBtn = document.querySelector(".add-to-cart-btn");

    plusBtn.addEventListener("click", () => {
        quantity++;
        qty.innerText = quantity;
    });

    minusBtn.addEventListener("click", () => {
        if (quantity > 1) {
            quantity--;
            qty.innerText = quantity;
        }
    });

    // ==============================
    // VARIANT + SIZE SELECTOR
    // ==============================

    const variantButtons = document.querySelectorAll(".variant-btn");
    const sizeSelector = document.querySelector(".size-selector");

    let selectedVariant = "spray";
    let selectedSize = Object.keys(product.variants[selectedVariant].sizes)[0];

    function getVariantImage(variant, size) {
        const variantData = product.variants[variant];

        if (variantData.images && variantData.images[size]) {
            return variantData.images[size];
        }

        return variantData.image;
    }

    function applyImageFix(img, variant) {
        if (variant === "rollon") {
            img.style.objectFit = "contain";
            img.style.width = "75%";
            img.style.display = "block";
            img.style.margin = "0 auto";
        } else {
            img.style.objectFit = "";
            img.style.width = "";
            img.style.display = "";
            img.style.margin = "";
        }
    }

    function renderSizes(variant) {
        const sizes = product.variants[variant].sizes;
        sizeSelector.innerHTML = "";

        Object.keys(sizes).forEach((size, index) => {
            const btn = document.createElement("button");
            btn.className = index === 0 ? "size-btn active" : "size-btn";
            btn.dataset.size = size;
            btn.textContent = size.toUpperCase().replace("ML", " ML");

            btn.addEventListener("click", () => {
                document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                selectedSize = size;

                document.getElementById("productPrice").innerText = "Rs. " + sizes[size];
                document.getElementById("productMRP").innerText = "Rs. " + (sizes[size] + 800);

                const img = document.getElementById("productImage");
                img.src = getVariantImage(selectedVariant, selectedSize);
                applyImageFix(img, selectedVariant);
            });

            sizeSelector.appendChild(btn);
        });

        selectedSize = Object.keys(sizes)[0];

        document.getElementById("productPrice").innerText = "Rs. " + sizes[selectedSize];
        document.getElementById("productMRP").innerText = "Rs. " + (sizes[selectedSize] + 800);

        const img = document.getElementById("productImage");
        img.src = getVariantImage(variant, selectedSize);
        applyImageFix(img, variant);
    }

    variantButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            variantButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            selectedVariant = btn.dataset.variant;

            if (details) {
                document.getElementById("productUsageTips").innerText =
                    selectedVariant === "rollon" ? details.rollonUsageTips : details.sprayUsageTips;
            }

            renderSizes(selectedVariant);
        });
    });

    renderSizes(selectedVariant);

    addToCartBtn.addEventListener("click", () => {
        const price = product.variants[selectedVariant].sizes[selectedSize];
        const image = getVariantImage(selectedVariant, selectedSize);

        const item = {
            name: product.name,
            variant: selectedVariant,
            size: selectedSize,
            quantity: quantity,
            price: price,
            image: image
        };

        let cart = JSON.parse(localStorage.getItem("cart")) || [];

        const existingIndex = cart.findIndex(p =>
            p.name === item.name &&
            p.variant === item.variant &&
            p.size === item.size
        );

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push(item);
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();

        if (typeof renderCartDrawer === "function" && typeof openCartDrawer === "function") {
            renderCartDrawer();
            openCartDrawer();
        } else {
            alert("Added to cart ✅");
        }
    });

    // ==============================
    // ACCORDION
    // ==============================

    document.querySelectorAll(".accordion-header").forEach(header => {

        header.addEventListener("click", () => {

            const content = header.nextElementSibling;

            document.querySelectorAll(".accordion-content").forEach(c => {
                if (c !== content) c.classList.remove("open");
            });

            content.classList.toggle("open");

            header.querySelector("span").innerText =
                content.classList.contains("open") ? "−" : "+";
        });

    });

    // ==============================
    // RECOMMENDED PERFUMES
    // ==============================

    const recommendedGrid = document.getElementById("recommendedPerfumes");

    if (recommendedGrid) {

        const recommended = perfumes
            .filter(p => p.name !== perfumeName)
            .slice(0, 4);

        recommended.forEach(p => {

            const card = document.createElement("div");
            card.classList.add("perfume-card");

            card.innerHTML = `
                <div class="perfume-card-image-wrapper">
                    <img src="${p.variants.spray.images ? p.variants.spray.images["30ml"] : p.variants.spray.image}" alt="${p.name}">
                </div>

                <div class="perfume-card-body">
                    <h3 class="perfume-card-name">${p.name}</h3>

                    <a href="product.html?perfume=${encodeURIComponent(p.name)}"
                    class="view-details-btn">
                    View Details
                    </a>
                </div>
            `;

            recommendedGrid.appendChild(card);
        });
    }

});

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const cartCount = document.querySelector(".cart-count");
    if (cartCount) {
        cartCount.innerText = totalItems;
    }
}

updateCartCount();
