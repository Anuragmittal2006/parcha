import { openDB } from "./db.js";
let currentOrder = null;

const orderId = Number(new URLSearchParams(location.search).get("id"));
let db;

async function init() {
  db = await openDB();
  loadOrder();
}

function loadOrder() {
   

  const tx = db.transaction("orders", "readonly");
  tx.objectStore("orders").get(orderId).onsuccess = e => {
    const o = e.target.result;
      currentOrder = o;
    if (!o) return;

    document.getElementById("dealer").textContent = o.dealerName;
    document.getElementById("date").textContent =
      new Date(o.createdAt).toLocaleString();

    const body = document.getElementById("items");
    o.items.forEach(it => {
      body.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${it.name}</td>
          <td class="qty">${it.qty}</td>
          <td class="rate">${it.rate}</td>
          <td class="amount">${it.amount}</td>
        </tr>
      `);
    });

    document.getElementById("subtotal").textContent = "₹" + o.subtotal;
    document.getElementById("adjustment").textContent = "₹" + o.adjustment;
    document.getElementById("total").textContent = "₹" + o.total;
  };


}

document.getElementById("back").onclick =
  () => history.back();

  document.getElementById("printBtn").onclick = () => {
  window.print();
};

document.getElementById("waImgBtn").onclick = async () => {
  const el = document.getElementById("parcha");

  const canvas = await html2canvas(el, {
    scale: 2,           // image clear ho
    backgroundColor: "#ffffff"
  });

  canvas.toBlob(blob => {
    const file = new File([blob], "parcha.png", { type: "image/png" });

    if (navigator.share) {
      navigator.share({
        files: [file],
        title: "Order Bill"
      });
    } else {
      alert("Sharing not supported on this device");
    }
  });
};

init();
