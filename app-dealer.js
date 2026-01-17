import { openDB } from "./db.js";

let db;

async function init() {
  db = await openDB();
  seedDealers();
  loadDealers();
}

async function seedDealers() {
  const tx = db.transaction("dealers", "readonly");
  tx.objectStore("dealers").count().onsuccess = async e => {
    if (e.target.result === 0) {
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

function loadDealers(filter = "") {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const tx = db.transaction("dealers", "readonly");
  tx.objectStore("dealers").getAll().onsuccess = e => {
    e.target.result
      .filter(d => d.name.toLowerCase().includes(filter))
      .forEach(d => {
        const card = document.createElement("div");
        card.className = "card";
        card.textContent = d.name;
        card.onclick = () =>
          location.href = `bill.html?id=${d.id}`;
        list.appendChild(card);
      });
  };
}

document.getElementById("search").oninput =
  e => loadDealers(e.target.value.toLowerCase());

document.getElementById("clear").onclick = () => {
  search.value = "";
  loadDealers();
};

document.getElementById("add").onclick = () => {
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

document.getElementById("back").onclick =
  () => location.href = "index.html";

init();
