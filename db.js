const DB_NAME = "TyreAppDB";
const DB_VERSION = 5;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains("dealers")) {
        db.createObjectStore("dealers", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("draftOrders")) {
        db.createObjectStore("draftOrders", { keyPath: "dealerId" });
      }

      if (!db.objectStoreNames.contains("dealerRates")) {
        db.createObjectStore("dealerRates", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("orders")) {
  db.createObjectStore("orders", { keyPath: "id" });
}

    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
