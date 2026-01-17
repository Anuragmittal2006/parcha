import { openDB } from "./db.js";

let db;

async function init() {
  db = await openDB();
  loadOrders();
}

function loadOrders() {
  const list = document.getElementById("ordersList");
  list.innerHTML = "";

  const tx = db.transaction("orders", "readonly");
  tx.objectStore("orders").getAll().onsuccess = e => {
    const orders = e.target.result
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!orders.length) {
      list.innerHTML = "<p style='padding:16px;'>No orders yet.</p>";
      return;
    }

    orders.forEach(o => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <strong>${o.dealerName}</strong><br>
        <small>${new Date(o.createdAt).toLocaleString()}</small><br>
        <b>₹${o.total}</b>
      `;
      card.onclick = () =>
        location.href = `order-view.html?id=${o.id}`;
      list.appendChild(card);
    });
  };
}

document.getElementById("back").onclick =
  () => location.href = "index.html";

init();
