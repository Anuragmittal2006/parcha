import { openDB } from "./db.js";

const dealerId = Number(new URLSearchParams(location.search).get("id"));

let db;
let products = [];
let selectedProduct = null;

/* ---------- helpers ---------- */

function normalize(str) {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* ---------- init ---------- */

async function init() {
  db = await openDB();
  await loadProducts();
  loadDealer();
   loadDraftIfExists();
}

function loadDraftIfExists() {
  const tx = db.transaction("draftOrders", "readonly");
  const store = tx.objectStore("draftOrders");

  store.get(dealerId).onsuccess = e => {
    const draft = e.target.result;

    if (draft && draft.items && draft.items.length) {
      render(draft);
    } else {
      // No draft → empty bill UI
      render({
        items: [],
        adjustmentRaw: ""
      });
    }
  };
}

async function loadProducts() {
  const res = await fetch("./data/products.json");
  const raw = await res.json();

  products = raw.filter(p => typeof p.name === "string");
}

/* ---------- dealer ---------- */

function loadDealer() {
  const tx = db.transaction("dealers", "readonly");
  tx.objectStore("dealers").get(dealerId).onsuccess = e => {
    document.getElementById("dealerName").textContent =
      e.target.result.name;
  };
}

/* ---------- draft ---------- */

function ensureDraft() {
  const tx = db.transaction("draftOrders", "readwrite");
  const store = tx.objectStore("draftOrders");

  store.get(dealerId).onsuccess = e => {
    if (!e.target.result) {
      store.put({ dealerId, items: [] });
      render({ items: [] });
    } else {
      render(e.target.result);
    }
  };
}

function updateDraft(mutator) {
  const tx = db.transaction("draftOrders", "readwrite");
  const store = tx.objectStore("draftOrders");

  store.get(dealerId).onsuccess = e => {
    const draft = e.target.result;
    mutator(draft);
    store.put(draft);
    render(draft);
  };
}

/* ---------- render ---------- */

function render(draft) {
  const body = document.getElementById("billBody");
  body.innerHTML = "";

  let subtotal = 0;

  draft.items.forEach((it, i) => {
    const amt = it.qty * it.rate;
    subtotal += amt;

    body.insertAdjacentHTML("beforeend", `
      <tr data-i="${i}">
        <td class="editable">${it.name}</td>
        <td class="qty editable">${it.qty}</td>
        <td class="rate editable">${it.rate}</td>
        <td class="amount">${amt}</td>
        <td class="delete">🗑️</td>
      </tr>
    `);
  });

  const adjustment = Number(draft.adjustment || 0);
  const total = subtotal + adjustment;

  document.getElementById("subtotal").textContent = "₹" + subtotal;
  document.getElementById("adjustmentInput").value = adjustment || "";
  document.getElementById("total").textContent = "₹" + total;
}


/* ---------- delete ---------- */

document.getElementById("billBody").onclick = e => {
  const row = e.target.closest("tr");
  if (!row) return;

  const i = row.dataset.i;

  // DELETE
  if (e.target.classList.contains("delete")) {
    updateDraft(d => d.items.splice(i, 1));
    return;
  }

  // EDIT
  if (e.target.classList.contains("editable")) {
    editItem(i);
  }
};
function editItem(index) {
  const tx = db.transaction("draftOrders", "readonly");
  tx.objectStore("draftOrders").get(dealerId).onsuccess = e => {
    const item = e.target.result.items[index];

    const qty = Number(prompt("Qty", item.qty));
    const rate = Number(prompt("Rate", item.rate));

    if (!qty || !rate) return;

    updateDraft(d => {
      d.items[index].qty = qty;
      d.items[index].rate = rate;
    });
  };
}


/* ---------- product search ---------- */

const productInput = document.getElementById("productInput");
const resultsBox = document.getElementById("results");
const qtyInput = document.getElementById("qtyInput");
const rateInput = document.getElementById("rateInput");

productInput.oninput = () => {
  const q = normalize(productInput.value);
  resultsBox.innerHTML = "";
  if (!q) return;

  products
    .filter(p => normalize(p.name).includes(q))
    .slice(0, 10)
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "result";
      div.textContent = p.name;
      div.onclick = () => selectProduct(p);
      resultsBox.appendChild(div);
    });
};

async function selectProduct(p) {
  selectedProduct = p;
  productInput.value = p.name;
  resultsBox.innerHTML = "";

  qtyInput.value = 0;
  qtyInput.focus();

  // rate autofill
  const key = `${dealerId}_${normalize(p.name)}`;
  const tx = db.transaction("dealerRates", "readonly");
  tx.objectStore("dealerRates").get(key).onsuccess = e => {
    rateInput.value = e.target.result?.rate || "";
  };
}

/* ---------- enter navigation ---------- */

qtyInput.onkeydown = e => {
  if (e.key === "Enter") rateInput.focus();
};

rateInput.onkeydown = e => {
  if (e.key === "Enter") addItem();
};

document.getElementById("addBtn").onclick = addItem;

/* ---------- add item ---------- */

function addItem() {
  // HARD GUARD
  if (!selectedProduct || !selectedProduct.name) {
    productInput.focus();
    return;
  }

  const qty = Number(qtyInput.value);
  const rate = Number(rateInput.value);

  if (!qty || !rate) {
    return;
  }

  // snapshot product (important)
  const productName = selectedProduct.name;

 const tx = db.transaction("draftOrders", "readwrite");
  const store = tx.objectStore("draftOrders");

  store.get(dealerId).onsuccess = e => {
    let draft = e.target.result;

    // 👉 FIRST ITEM = CREATE DRAFT
    if (!draft) {
      draft = {
        dealerId,
        items: [],
        adjustmentRaw: "",
        updatedAt: Date.now()
      };
    }

    draft.items.push({ name: productName, qty, rate });
    draft.updatedAt = Date.now();

    store.put(draft);
    render(draft);
  };


  // reset safely AFTER save
  selectedProduct = null;
  productInput.value = "";
  qtyInput.value = "";
  rateInput.value = "";
  productInput.focus();
}


document.getElementById("back").onclick =
  () => location.href = "index.html";

  const adjustmentInput = document.getElementById("adjustmentInput");

adjustmentInput.oninput = () => {
  const val = Number(adjustmentInput.value || 0);

  updateDraft(d => {
    d.adjustment = val;
  });
};
document.getElementById("acceptOrder").onclick = acceptOrder;
function acceptOrder() {
  const tx = db.transaction(
    ["draftOrders", "orders", "dealerRates"],
    "readwrite"
  );

  const draftStore = tx.objectStore("draftOrders");
  const orderStore = tx.objectStore("orders");
  const rateStore = tx.objectStore("dealerRates");

  draftStore.get(dealerId).onsuccess = e => {
    const draft = e.target.result;
    if (!draft || !draft.items.length) return;

    // calculate totals again (safe)
    let subtotal = 0;
    draft.items.forEach(it => {
      it.amount = it.qty * it.rate;
      subtotal += it.amount;
    });

    const adjRaw = draft.adjustmentRaw || "";
    const adj = parseFloat(adjRaw);
    const adjustment = isNaN(adj) ? 0 : adj;

    const total = subtotal + adjustment;

    // save final order
    orderStore.put({
      id: Date.now(),
      dealerId,
      dealerName: document.getElementById("dealerName").textContent,
      items: draft.items,
      subtotal,
      adjustment,
      total,
      createdAt: new Date().toISOString()
    });

    // 🔥 UPDATE DEALER-WISE RATES (IMPORTANT)
    draft.items.forEach(it => {
      const key = `${dealerId}_${normalize(it.name)}`;
      rateStore.put({
        key,
        dealerId,
        productKey: normalize(it.name),
        rate: it.rate,
        updatedAt: Date.now()
      });
    });

    // ❌ delete draft
    draftStore.delete(dealerId);

    tx.oncomplete = () => {
      alert("Order saved successfully ✅");
      location.href = "index.html";
    };
  };
}

init();
