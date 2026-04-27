require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5500";
const STORE_CURRENCY = process.env.STORE_CURRENCY || "INR";
const ORDERS_FILE = path.join(__dirname, "..", "data", "orders.json");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "1mb" }));
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
      id: uuidv4(),
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

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await readOrders();
    res.json({ success: true, orders: orders.slice().reverse() });
  } catch (error) {
    console.error("Read orders error:", error);
    res.status(500).json({ success: false, message: "Could not read orders." });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found." });
});

app.listen(PORT, () => {
  console.log(`Jibreel backend running on http://localhost:${PORT}`);
});
