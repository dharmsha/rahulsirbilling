// src/lib/billDatabase.ts
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const BILLS_COLLECTION = 'bills';

// ============================================================
// 💾 SAVE BILL
// ============================================================
export const saveBill = async (billData: any) => {
  try {
    // Bill ID = invoiceNo (unique hai)
    const billRef = doc(db, BILLS_COLLECTION, billData.invoiceNo);
    await setDoc(billRef, {
      ...billData,
      savedAt: new Date().toISOString(),
    });
    return billData.invoiceNo;
  } catch (error) {
    console.error('Error saving bill:', error);
    throw error;
  }
};

// ============================================================
// 📥 GET ALL BILLS
// ============================================================
export const getAllBills = async () => {
  try {
    const snapshot = await getDocs(collection(db, BILLS_COLLECTION));
    const bills = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    // Newest first
    return bills.sort(
      (a: any, b: any) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return [];
  }
};

// ============================================================
// 📅 GET TODAY'S BILLS
// ============================================================
export const getTodayBills = async () => {
  try {
    const allBills = await getAllBills();
    const today = new Date().toDateString();
    return allBills.filter((bill: any) => {
      const billDate = new Date(bill.savedAt).toDateString();
      return billDate === today;
    });
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// ============================================================
// 🗑️ DELETE BILL
// ============================================================
export const deleteBill = async (billId: string) => {
  try {
    await deleteDoc(doc(db, BILLS_COLLECTION, billId));
  } catch (error) {
    console.error('Error deleting bill:', error);
    throw error;
  }
};

// ============================================================
// 📊 GET STATS (Dashboard ke liye)
// ============================================================
export const getStats = async () => {
  try {
    const allBills = await getAllBills();
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();

    const todayBills = allBills.filter(
      (b: any) => new Date(b.savedAt).toDateString() === today
    );

    const monthBills = allBills.filter(
      (b: any) => new Date(b.savedAt).getMonth() === thisMonth
    );

    // Total revenue
    const todayRevenue = todayBills.reduce(
      (sum: number, b: any) => sum + (b.total || 0),
      0
    );
    const monthRevenue = monthBills.reduce(
      (sum: number, b: any) => sum + (b.total || 0),
      0
    );
    const totalRevenue = allBills.reduce(
      (sum: number, b: any) => sum + (b.total || 0),
      0
    );

    // Unique customers (by phone number)
    const uniqueCustomers = new Set(
      allBills
        .filter((b: any) => b.customerPhone)
        .map((b: any) => b.customerPhone)
    ).size;

    // Total items sold
    const totalItemsSold = allBills.reduce((sum: number, b: any) => {
      const itemCount = b.items?.filter((i: any) => i.productName).length || 0;
      return sum + itemCount;
    }, 0);

    return {
      todayBills: todayBills.length,
      todayRevenue,
      monthBills: monthBills.length,
      monthRevenue,
      totalBills: allBills.length,
      totalRevenue,
      uniqueCustomers,
      totalItemsSold,
      allBills,
      todayBillsList: todayBills,
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      todayBills: 0,
      todayRevenue: 0,
      monthBills: 0,
      monthRevenue: 0,
      totalBills: 0,
      totalRevenue: 0,
      uniqueCustomers: 0,
      totalItemsSold: 0,
      allBills: [],
      todayBillsList: [],
    };
  }
};

// ============================================================
// 👥 GET CUSTOMERS (Aggregated)
// ============================================================
export const getCustomers = async () => {
  try {
    const allBills = await getAllBills();
    const customerMap = new Map();

    allBills.forEach((bill: any) => {
      const key = bill.customerPhone || bill.customerName || 'walk-in';
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: bill.customerName || 'Walk-in',
          phone: bill.customerPhone || '-',
          address: bill.customerAddress || '-',
          totalSpent: 0,
          totalBills: 0,
          lastVisit: bill.savedAt,
          firstVisit: bill.savedAt,
        });
      }
      const customer = customerMap.get(key);
      customer.totalSpent += bill.total || 0;
      customer.totalBills += 1;
      if (new Date(bill.savedAt) > new Date(customer.lastVisit)) {
        customer.lastVisit = bill.savedAt;
      }
      if (new Date(bill.savedAt) < new Date(customer.firstVisit)) {
        customer.firstVisit = bill.savedAt;
      }
    });

    return Array.from(customerMap.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent
    );
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
};