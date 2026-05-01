require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const axios = require("axios");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5500";
const STORE_CURRENCY = process.env.STORE_CURRENCY || "INR";
const ORDERS_FILE = path.join(__dirname, "..", "data", "orders.json");
const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "1mb" }));
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: "Login successful"
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
});
app.use(morgan("dev"));

function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Cart cannot be empty.";
  }

  for (const item of items) {
    if (!item.name || !item.variant || !item.size) return "Each cart item must include name, variant and size.";
    if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return "Each cart item must have a valid price.";
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) return "Each cart item must have a valid quantity.";
  }

  return null;
}

async function sendWhatsAppAlert(order) {
  try {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID || !ADMIN_WHATSAPP_NUMBER) {
      console.log("WhatsApp config missing");
      return;
    }

    const message = `
🛒 New Order Received

Order ID: ${order.id}
Amount: ₹${order.amount}

Items:
${order.items.map(i => `- ${i.name} (${i.size}) x${i.quantity}`).join("\n")}

Status: ${order.status}
`;

    await axios.post(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: ADMIN_WHATSAPP_NUMBER,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("WhatsApp alert sent");
  } catch (err) {
    console.error("WhatsApp error:", err.response?.data || err.message);
  }
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

async function readOrders() {
  try {
    const data = await fs.readFile(ORDERS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeOrders(orders) {
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}
async function readProducts() {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeProducts(products) {
  await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "jibreel-backend" });
});

app.post("/api/payments/create-order", async (req, res) => {
  try {
    const { items, customer = {} } = req.body;
    const validationError = validateCartItems(items);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const total = calculateTotal(items);
    const amountInPaise = Math.round(total * 100);
    const receipt = `jib_${Date.now()}`.slice(0, 40);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: STORE_CURRENCY,
      receipt,
      notes: {
        brand: "Jibreel Perfumes",
        item_count: String(items.reduce((sum, item) => sum + Number(item.quantity), 0))
      }
    });

    

    const localOrder = {
      id: crypto.randomUUID(),
      receipt,
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      amount: total,
      amountInPaise,
      currency: STORE_CURRENCY,
      items,
      customer,
      createdAt: new Date().toISOString(),
      payment: null
    };

    const orders = await readOrders();
    orders.push(localOrder);
    await writeOrders(orders);

    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      }
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Could not create payment order." });
  }
});

app.post("/api/payments/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment details." });
    }

    const orders = await readOrders();
    const orderIndex = orders.findIndex(order => order.razorpayOrderId === razorpay_order_id);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: "Local order not found." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orders[orderIndex].razorpayOrderId}|${razorpay_payment_id}`)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    orders[orderIndex].status = isAuthentic ? "paid" : "verification_failed";
    orders[orderIndex].payment = {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      verified: isAuthentic,
      verifiedAt: new Date().toISOString()
    };

    await writeOrders(orders);
    if (isAuthentic) {
  await sendWhatsAppAlert(orders[orderIndex]);
}

    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    res.json({
      success: true,
      message: "Payment verified successfully.",
      orderId: orders[orderIndex].id
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ success: false, message: "Could not verify payment." });
  }
});

function requireAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"];

  if (!process.env.ADMIN_API_KEY) {
    return res.status(500).json({ success: false, message: "Admin key not configured." });
  }

  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: "Unauthorized admin access." });
  }

  next();
}
// ✅ GET ALL ORDERS (ADMIN)
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let orders = await readOrders();

    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    orders = orders.slice().reverse();

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});


// ✅ DELETE ALL ORDERS
// ✅ DELETE ALL ORDERS
app.delete("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    await writeOrders([]);

    res.json({
      success: true,
      message: "All orders cleared"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to clear orders"
    });
  }
});


// ✅ DELETE SINGLE ORDER
app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let orders = await readOrders();
    const beforeCount = orders.length;

    orders = orders.filter(order =>
      order.id !== id && order.razorpayOrderId !== id
    );

    if (orders.length === beforeCount) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    await writeOrders(orders);

    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to delete order"
    });
  }
});
app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["created", "paid", "packed", "shipped", "delivered", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status."
      });
    }

    const orders = await readOrders();

    const orderIndex = orders.findIndex(order =>
      order.id === id || order.razorpayOrderId === id
    );

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    await writeOrders(orders);

    res.json({
      success: true,
      message: "Order status updated.",
      order: orders[orderIndex]
    });

  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update order status."
    });
  }
});

// ✅ GET PRODUCTS (PUBLIC)
app.get("/api/products", async (req, res) => {
  try {
    const products = await readProducts();
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products"
    });
  }
});

// ✅ UPDATE PRODUCTS (ADMIN)
app.put("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const products = req.body.products;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product data"
      });
    }

    await writeProducts(products);

    res.json({
      success: true,
      message: "Products updated successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update products"
    });
  }
});
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found." });
});

app.listen(PORT, () => {
  console.log(`Jibreel backend running on http://localhost:${PORT}`);
});
