import { openDB } from "./db.js";

let db;
let currentDealerId = null;

const home = document.getElementById("homeScreen");
const dealerScreen = document.getElementById("dealerScreen");
const billScreen = document.getElementById("billScreen");

function show(screen) {
  home.classList.add("hidden");
  dealerScreen.classList.add("hidden");
  billScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

async function init() {
  db = await openDB();
  await seedDealers();
  show(home);
}

async function seedDealers() {
  const tx = db.transaction("dealers", "readonly");
  const countReq = tx.objectStore("dealers").count();

  countReq.onsuccess = async () => {
    if (countReq.result === 0) {
      const res = await fetch("./data/dealers.json");
      const dealers = await res.json();
      const tx2 = db.transaction("dealers", "readwrite");
      const store = tx2.objectStore("dealers");

      dealers.forEach((d, i) => {
        store.put({ id: i + 1, name: d.name, balance: 0 });
      });
    }
  };
}

/* HOME */
document.getElementById("newOrderBtn").onclick = () => {
  loadDealers();
  show(dealerScreen);
};

/* DEALERS */
async function loadDealers(filter = "") {
  const list = document.getElementById("dealerList");
  list.innerHTML = "";

  const tx = db.transaction("dealers", "readonly");
  const store = tx.objectStore("dealers");

  store.getAll().onsuccess = (e) => {
    e.target.result
      .filter(d => d.name.toLowerCase().includes(filter))
      .forEach(d => {
        const card = document.createElement("div");
        card.className = "card";
        card.textContent = d.name;
        card.onclick = () => openBill(d.id);
        list.appendChild(card);
      });
  };
}

document.getElementById("dealerSearch").oninput = e =>
  loadDealers(e.target.value.toLowerCase());

document.getElementById("clearSearch").onclick = () => {
  dealerSearch.value = "";
  loadDealers();
};

document.getElementById("addDealer").onclick = async () => {
  const name = prompt("Dealer name?");
  if (!name) return;

  const tx = db.transaction("dealers", "readwrite");
  tx.objectStore("dealers").put({
    id: Date.now(),
    name,
    balance: 0
  });
  loadDealers();
};

document.getElementById("backToHome").onclick = () => show(home);

/* BILL */
function openBill(dealerId) {
  currentDealerId = dealerId;

  const tx = db.transaction("dealers", "readonly");
  tx.objectStore("dealers").get(dealerId).onsuccess = (e) => {
    const dealer = e.target.result;
    document.getElementById("billDealerName").textContent = dealer.name;
    document.getElementById("billDate").textContent =
      new Date().toLocaleDateString();

    loadDraft(dealerId);
    show(billScreen);
  };
}

function loadDraft(dealerId) {
  const tx = db.transaction("draftOrders", "readonly");
  tx.objectStore("draftOrders").get(dealerId).onsuccess = (e) => {
    const draft = e.target.result || {
      items: [],
      subtotal: 0,
      total: 0
    };
    renderBill(draft);
  };
}

function ensureDraft(dealerId) {
  const tx = db.transaction("draftOrders", "readwrite");
  const store = tx.objectStore("draftOrders");

  store.get(dealerId).onsuccess = (e) => {
    if (!e.target.result) {
      store.put({
        dealerId,
        items: [],
        subtotal: 0,
        total: 0,
        updatedAt: Date.now()
      });
    }
  };
}

document.getElementById("backToHomeFromBill").onclick = () => show(home);
function renderBill(draft) {
  const tbody = document.getElementById("billItems");
  tbody.innerHTML = "";

  let subtotal = 0;

  draft.items.forEach((item, index) => {
    item.amount = item.qty * item.rate;
    subtotal += item.amount;

    tbody.insertAdjacentHTML(
      "beforeend",
      createBillRow(item, index)
    );
  });

  document.getElementById("subtotal").textContent = "₹" + subtotal;
  document.getElementById("total").textContent = "₹" + subtotal;

  attachRowEvents();
}

document.getElementById("addItemBtn").onclick = () => {
  const tx = db.transaction("draftOrders", "readwrite");
  const store = tx.objectStore("draftOrders");

  store.get(currentDealerId).onsuccess = (e) => {
    const draft = e.target.result;

    draft.items.push({
      name: "Sample Tyre",
      qty: 1,
      rate: 1000,
      amount: 1000
    });

    draft.updatedAt = Date.now();
    store.put(draft);
    renderBill(draft);
  };
};
function createBillRow(item, index) {
  return `
    <tr data-index="${index}">
      <td class="name editable">${item.name}</td>
      <td class="qty editable">${item.qty}</td>
      <td class="rate editable">${item.rate}</td>
      <td class="amount">${item.amount}</td>
      <td class="delete">🗑️</td>
    </tr>
  `;
}

function attachRowEvents() {
  document.querySelectorAll(".bill-table tr").forEach(row => {
    const index = row.dataset.index;

    // DELETE
    row.querySelector(".delete").onclick = () => {
      updateDraft(draft => {
        draft.items.splice(index, 1);
      });
    };

    // EDIT
    row.querySelectorAll(".editable").forEach(cell => {
      cell.onclick = () => editItem(index);
    });
  });
}
function editItem(index) {
  const tx = db.transaction("draftOrders", "readonly");
  tx.objectStore("draftOrders").get(currentDealerId).onsuccess = (e) => {
    const draft = e.target.result;
    const item = draft.items[index];

    const qty = prompt("Qty", item.qty);
    const rate = prompt("Rate", item.rate);

    if (!qty || !rate) return;

    updateDraft(d => {
      d.items[index].qty = Number(qty);
      d.items[index].rate = Number(rate);
    });
  };
}
function updateDraft(mutator) {
  const tx = db.transaction("draftOrders", "readwrite");
  const store = tx.objectStore("draftOrders");

  store.get(currentDealerId).onsuccess = (e) => {
    const draft = e.target.result;
    mutator(draft);
    draft.updatedAt = Date.now();
    store.put(draft);
    renderBill(draft);
  };
}
async function getLastRate(dealerId, productId) {
  return new Promise(resolve => {
    const key = `${dealerId}_${productId}`;
    const tx = db.transaction("dealerRates", "readonly");
    tx.objectStore("dealerRates").get(key).onsuccess = e =>
      resolve(e.target.result?.rate || 0);
  });
}
function finalizeOrder(draft) {
  const tx = db.transaction("dealerRates", "readwrite");
  const store = tx.objectStore("dealerRates");

  draft.items.forEach(item => {
    store.put({
      key: `${draft.dealerId}_${item.productId}`,
      dealerId: draft.dealerId,
      productId: item.productId,
      rate: item.rate,
      updatedAt: Date.now()
    });
  });

  // draft delete later
}


init();
