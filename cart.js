document.addEventListener("DOMContentLoaded", function () {

    const cartItemsContainer = document.getElementById("cart-items");
    const emptyCartMessage = document.getElementById("empty-cart-message");
    const cartSummary = document.getElementById("cart-summary");
    const cartTotal = document.getElementById("cart-total");
    const checkoutBtn = document.getElementById("checkout-btn");
    const paymentStatus = document.getElementById("payment-status");
    const customerName = document.getElementById("customer-name");
    const customerPhone = document.getElementById("customer-phone");
    const customerEmail = document.getElementById("customer-email");
    const customerAddress = document.getElementById("customer-address");

    const BACKEND_API_URL = "https://name-jibreel-backend.onrender.com/api";

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        const cartCountEls = document.querySelectorAll(".cart-count");
        cartCountEls.forEach(el => {
            el.innerText = totalItems;
        });
    }

    function saveCart() {
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
    }

    function getCartTotal() {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function showPaymentStatus(message, type = "success") {
        if (!paymentStatus) return;

        paymentStatus.className = `payment-status ${type}`;
        paymentStatus.style.display = "block";
        paymentStatus.innerHTML = message;
    }

    function clearPaymentStatus() {
        if (!paymentStatus) return;

        paymentStatus.style.display = "none";
        paymentStatus.className = "payment-status";
        paymentStatus.innerHTML = "";
    }

    function renderCart() {
        cartItemsContainer.innerHTML = "";

        if (cart.length === 0) {
            emptyCartMessage.style.display = "block";
            cartSummary.style.display = "none";
            return;
        }

        emptyCartMessage.style.display = "none";
        cartSummary.style.display = "block";

        let total = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const cartItem = document.createElement("div");
            cartItem.classList.add("cart-item");

            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>

                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <p><strong>Variant:</strong> ${item.variant}</p>
                    <p><strong>Size:</strong> ${item.size}</p>
                    <p><strong>Price:</strong> ₹${item.price}</p>

                    <div class="cart-item-quantity">
                        <button class="qty-btn minus-btn" data-index="${index}">−</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn plus-btn" data-index="${index}">+</button>
                    </div>

                    <p><strong>Subtotal:</strong> ₹${itemTotal}</p>

                    <button class="remove-btn" data-index="${index}">Remove</button>
                </div>
            `;

            cartItemsContainer.appendChild(cartItem);
        });

        cartTotal.innerText = `₹${total}`;

        attachCartEvents();
    }

    function attachCartEvents() {
        const minusButtons = document.querySelectorAll(".minus-btn");
        const plusButtons = document.querySelectorAll(".plus-btn");
        const removeButtons = document.querySelectorAll(".remove-btn");

        minusButtons.forEach(button => {
            button.addEventListener("click", function () {
                const index = parseInt(this.dataset.index);

                if (cart[index].quantity > 1) {
                    cart[index].quantity -= 1;
                } else {
                    cart.splice(index, 1);
                }

                saveCart();
                renderCart();
            });
        });

        plusButtons.forEach(button => {
            button.addEventListener("click", function () {
                const index = parseInt(this.dataset.index);
                cart[index].quantity += 1;

                saveCart();
                renderCart();
            });
        });

        removeButtons.forEach(button => {
            button.addEventListener("click", function () {
                const index = parseInt(this.dataset.index);
                cart.splice(index, 1);

                saveCart();
                renderCart();
            });
        });
    }

    function buildCheckoutDescription() {
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        return `${itemCount} item${itemCount > 1 ? "s" : ""} from Jibreel Perfumes`;
    }

    function buildCheckoutNotes() {
        return {
            brand: "Jibreel Perfumes",
            source: "cart_page",
            items: cart.map(item => `${item.name} | ${item.variant} | ${item.size} x ${item.quantity}`).join(" || ")
        };
    }

    async function openRazorpayCheckout() {
        clearPaymentStatus();

        if (!window.Razorpay) {
            showPaymentStatus("Razorpay checkout could not load. Please check your internet connection and try again.", "error");
            return;
        }

        if (cart.length === 0) {
            showPaymentStatus("Your cart is empty. Add a fragrance before checkout.", "error");
            return;
        }
        if (!customerName.value.trim() || !customerPhone.value.trim() || !customerAddress.value.trim()) {
    showPaymentStatus("Please enter name, mobile number and delivery address before checkout.", "error");
    return;
}
        checkoutBtn.disabled = true;
        checkoutBtn.innerText = "Creating secure order...";

        try {
            const total = getCartTotal();
            const createOrderResponse = await fetch(`${BACKEND_API_URL}/payments/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
    items: cart,
    customer: {
        source: "cart_page",
        name: customerName.value.trim(),
        phone: customerPhone.value.trim(),
        email: customerEmail.value.trim(),
        address: customerAddress.value.trim()
    }
})
            });
            const createOrderData = await createOrderResponse.json();
            console.log("RAZORPAY ORDER DATA:", createOrderData);

            if (!createOrderResponse.ok || !createOrderData.success) {
                throw new Error(createOrderData.message || "Unable to create secure payment order.");
            }
console.log("CREATE ORDER DATA:", createOrderData);
            const options = {
                key: createOrderData.keyId,
                amount: createOrderData.order.amount,
                currency: createOrderData.order.currency,
                order_id: createOrderData.order.id,
                name: "Jibreel Perfumes",
                description: buildCheckoutDescription(),
                image: "jibreel-logo.png",
                theme: { color: "#08A7C5" },

                prefill: {
                    name: customerName.value.trim(),
                    contact: customerPhone.value.trim(),
                    email: customerEmail.value.trim()
                },

notes: buildCheckoutNotes(),

handler: async function (response) {
                    try {
                        showPaymentStatus("Payment received. Verifying securely...", "success");
                        const verifyResponse = await fetch(`${BACKEND_API_URL}/payments/verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(response)
                        });
                        const verifyData = await verifyResponse.json();

                        if (!verifyResponse.ok || !verifyData.success) {
                            throw new Error(verifyData.message || "Payment verification failed.");
                        }

                        const paymentRecord = {
                            paymentId: response.razorpay_payment_id || "",
                            orderId: response.razorpay_order_id || "",
                            signature: response.razorpay_signature || "",
                            amount: total,
                            items: cart,
                            backendOrderId: verifyData.orderId,
                            createdAt: new Date().toISOString()
                        };
localStorage.setItem("jibreel_last_payment", JSON.stringify(paymentRecord));

// clear cart
cart = [];
saveCart();

// redirect to success page
window.location.href = "success.html";
                    } catch (error) {
    showPaymentStatus(error.message, "error");
    checkoutBtn.disabled = false;
    checkoutBtn.innerText = "Proceed to Secure Checkout";
}
                },
                modal: {
    ondismiss: function () {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = "Proceed to Secure Checkout";
        showPaymentStatus("Checkout was closed before payment completion.", "error");
    }
}
            };

            const razorpayInstance = new Razorpay(options);
            razorpayInstance.on("payment.failed", function (response) {
                const reason = response.error && response.error.description ? response.error.description : "Payment failed in test mode.";
                showPaymentStatus(reason, "error");
                checkoutBtn.disabled = false;
checkoutBtn.innerText = "Proceed to Secure Checkout";
            });
            console.log("RAZORPAY FINAL OPTIONS:", options);
            razorpayInstance.open();
        } catch (error) {
    showPaymentStatus(error.message, "error");
} 
}

if (checkoutBtn) {
 
    checkoutBtn.addEventListener("click", function (event) {
        event.preventDefault();
        openRazorpayCheckout();
    });
}
    updateCartCount();
    renderCart();
});
