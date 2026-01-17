import {
  dbCloud,
  collection,
  getDocs,
  setDoc,
  doc
} from "./firebase.js";

import { openDB } from "./db.js";

/* ---------- PRODUCTS & DEALERS ---------- */

export async function syncMasterData() {
  const db = await openDB();

  // PRODUCTS
  const prodSnap = await getDocs(collection(dbCloud, "products"));
  const prodTx = db.transaction("products", "readwrite");
  const prodStore = prodTx.objectStore("products");

  prodStore.clear();
  prodSnap.forEach(docu => {
    prodStore.put(docu.data());
  });

  // DEALERS
  const dealerSnap = await getDocs(collection(dbCloud, "dealers"));
  const dealerTx = db.transaction("dealers", "readwrite");
  const dealerStore = dealerTx.objectStore("dealers");

  dealerStore.clear();
  dealerSnap.forEach(docu => {
    dealerStore.put(docu.data());
  });

  console.log("✅ Master data synced");
}
export async function processSyncQueue() {
  if (!navigator.onLine) return;

  const db = await openDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  store.getAll().onsuccess = async e => {
    const items = e.target.result;

    for (const item of items) {
      try {
        await pushToFirebase(item);
        store.delete(item.id);
      } catch (err) {
        console.error("Sync failed, will retry", err);
      }
    }
  };
}
async function pushToFirebase(item) {
  switch (item.type) {

    case "ADD_ORDER":
      await setDoc(
        doc(dbCloud, "orders", String(item.payload.id)),
        item.payload
      );
      break;

    case "UPDATE_RATE":
      await setDoc(
        doc(
          dbCloud,
          "dealerRates",
          `${item.payload.dealerId}_${item.payload.productKey}`
        ),
        item.payload
      );
      break;

    case "ADD_DEALER":
      await setDoc(
        doc(dbCloud, "dealers", String(item.payload.id)),
        item.payload
      );
      break;

    case "ADD_PRODUCT":
      await setDoc(
        doc(dbCloud, "products", String(item.payload.id)),
        item.payload
      );
      break;
  }
}
