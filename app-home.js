import { openDB } from "./db.js";

let db;

async function init() {
  db = await openDB();
  loadDrafts();
}

function loadDrafts() {
  const list = document.getElementById("draftList");
  list.innerHTML = "";

  const tx = db.transaction(["draftOrders", "dealers"], "readonly");
  const draftStore = tx.objectStore("draftOrders");
  const dealerStore = tx.objectStore("dealers");

  draftStore.getAll().onsuccess = e => {
    const drafts = e.target.result;

    if (!drafts.length) {
      list.innerHTML = `
        <div class="welcome">
          <p>No draft orders</p>
          <p>Tap + to create new order</p>
        </div>`;
      return;
    }

    drafts
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach(draft => {
  dealerStore.get(draft.dealerId).onsuccess = ev => {
    const dealer = ev.target.result;

    const card = document.createElement("div");
    card.className = "card draft-card";

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `
      <strong>${dealer?.name || "Unknown Dealer"}</strong><br>
      <small>Draft saved</small>
    `;

    info.onclick = () =>
      location.href = `bill.html?id=${draft.dealerId}`;

    const del = document.createElement("span");
    del.textContent = "🗑️";
    del.style.cursor = "pointer";

    del.onclick = (e) => {
      e.stopPropagation();
      if (!confirm("Delete this draft?")) return;

      const tx2 = db.transaction("draftOrders", "readwrite");
      tx2.objectStore("draftOrders").delete(draft.dealerId);
      tx2.oncomplete = loadDrafts;
    };

    card.appendChild(info);
    card.appendChild(del);
    list.appendChild(card);
  };
});
  };
}


document.getElementById("newOrder").onclick = () => {
  location.href = "dealer.html";
};

document.getElementById("recentOrders").onclick = () => {
  location.href = "orders.html";
};
let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").style.display = "block";
});

document.getElementById("installBtn").onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
};

init();
