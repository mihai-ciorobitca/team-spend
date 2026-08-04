export type OfflineExpenseDraft = {
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  paymentMethod: "cash" | "card" | "bank_transfer" | "wallet";
  spentAt: string;
  spenderId: string;
  notes: string;
  savePlace: boolean;
  proofBlob: Blob | null;
  proofName: string | null;
  proofType: string | null;
};

export type QueuedExpenseRecord = {
  id: string;
  ownerEmail: string;
  createdAt: number;
  uploadedProofPath?: string;
  draft: OfflineExpenseDraft;
};

const DATABASE_NAME = "peptiking-offline";
const DATABASE_VERSION = 1;
const EXPENSE_STORE = "expenseQueue";
const WORKSPACE_STORE = "workspace";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage"));
    request.onblocked = () => reject(new Error("Offline storage is currently in use by another tab"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(EXPENSE_STORE)) {
        const store = database.createObjectStore(EXPENSE_STORE, { keyPath: "id" });
        store.createIndex("ownerEmail", "ownerEmail", { unique: false });
      }
      if (!database.objectStoreNames.contains(WORKSPACE_STORE)) {
        database.createObjectStore(WORKSPACE_STORE, { keyPath: "email" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Offline storage operation failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Offline storage operation was cancelled"));
  });
}

export async function queueExpense(record: QueuedExpenseRecord) {
  const database = await openDatabase();
  const transaction = database.transaction(EXPENSE_STORE, "readwrite");
  transaction.objectStore(EXPENSE_STORE).put(record);
  await transactionDone(transaction);
  database.close();
}

export async function removeQueuedExpense(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(EXPENSE_STORE, "readwrite");
  transaction.objectStore(EXPENSE_STORE).delete(id);
  await transactionDone(transaction);
  database.close();
}

export async function getQueuedExpenses(ownerEmail: string) {
  const database = await openDatabase();
  const transaction = database.transaction(EXPENSE_STORE, "readonly");
  const request = transaction.objectStore(EXPENSE_STORE).index("ownerEmail").getAll(ownerEmail.toLocaleLowerCase());
  const records = await new Promise<QueuedExpenseRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as QueuedExpenseRecord[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Could not read offline expenses"));
  });
  await transactionDone(transaction);
  database.close();
  return records;
}

export async function saveWorkspaceSnapshot<T>(email: string, snapshot: T) {
  const database = await openDatabase();
  const transaction = database.transaction(WORKSPACE_STORE, "readwrite");
  transaction.objectStore(WORKSPACE_STORE).put({ email: email.toLocaleLowerCase(), updatedAt: Date.now(), snapshot });
  await transactionDone(transaction);
  database.close();
}

export async function loadLatestWorkspaceSnapshot<T>() {
  const database = await openDatabase();
  const transaction = database.transaction(WORKSPACE_STORE, "readonly");
  const request = transaction.objectStore(WORKSPACE_STORE).getAll();
  const records = await new Promise<Array<{ email: string; updatedAt: number; snapshot: T }>>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as Array<{ email: string; updatedAt: number; snapshot: T }>);
    request.onerror = () => reject(request.error ?? new Error("Could not read the offline workspace"));
  });
  await transactionDone(transaction);
  database.close();
  records.sort((a, b) => b.updatedAt - a.updatedAt);
  return records[0]?.snapshot ?? null;
}
