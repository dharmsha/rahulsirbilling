"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStats, getAllBills, getCustomers, deleteBill } from "@/lib/billDatabase";
import { getProducts, deleteProduct, addProduct } from "@/lib/productDatabase";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchBill, setSearchBill] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Load data
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [statsData, billsData, customersData, productsData] = await Promise.all([
        getStats(),
        getAllBills(),
        getCustomers(),
        getProducts(),
      ]);
      setStats(statsData);
      setBills(billsData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return "₹" + Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ", " + d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter
  const filteredBills = bills.filter((b) => {
    if (!searchBill) return true;
    const s = searchBill.toLowerCase();
    return (
      b.invoiceNo?.toLowerCase().includes(s) ||
      b.customerName?.toLowerCase().includes(s) ||
      b.customerPhone?.includes(s)
    );
  });

  const filteredCustomers = customers.filter((c) => {
    if (!searchCustomer) return true;
    const s = searchCustomer.toLowerCase();
    return (
      c.name?.toLowerCase().includes(s) ||
      c.phone?.includes(s)
    );
  });

  const filteredProducts = products.filter((p) => {
    if (!searchProduct) return true;
    const s = searchProduct.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) ||
      p.barcode?.includes(s)
    );
  });

  // Delete bill
  const handleDeleteBill = async (id: string) => {
    if (!confirm("Ye bill delete karna hai?")) return;
    await deleteBill(id);
    loadAll();
  };

  // Delete product
  const handleDeleteProduct = async (barcode: string) => {
    if (!confirm("Ye product delete karna hai?")) return;
    await deleteProduct(barcode);
    loadAll();
  };

  // Save product (add/edit)
  const handleSaveProduct = async (product: any) => {
    if (!product.name || !product.rate) {
      alert("Name aur Rate bharo!");
      return;
    }
    await addProduct(product);
    setShowProductModal(false);
    setEditingProduct(null);
    loadAll();
  };

  // CSV Export
  const exportBillsCSV = () => {
    const csv = "Invoice,Date,Customer,Phone,Items,Subtotal,GST,Total,Payment\n" +
      bills.map((b: any) => 
        `${b.invoiceNo},"${formatDate(b.savedAt)}","${b.customerName || 'Walk-in'}","${b.customerPhone || '-'}",${b.items?.filter((i:any)=>i.productName).length || 0},${b.subtotal},${b.gstAmount},${b.total},${b.paymentMethod}`
      ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills_${Date.now()}.csv`;
    a.click();
  };

  const exportProductsCSV = () => {
    const csv = "Barcode,Name,Rate,Stock\n" +
      products.map((p: any) => `${p.barcode},"${p.name}",${p.rate},${p.stock || 0}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${Date.now()}.csv`;
    a.click();
  };

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Admin panel load ho raha hai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-lg">⚙️</span>
            </div>
            <div>
              <span className="text-lg font-black text-slate-900">
                Admin <span className="text-red-600">Panel</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">
                Krishna Store Management
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            🛍️ Billing Page
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 shadow-sm flex gap-1 overflow-x-auto">
          {[
            { id: "dashboard", label: "📊 Dashboard" },
            { id: "bills", label: "🧾 Bills" },
            { id: "customers", label: "👥 Customers" },
            { id: "products", label: "📦 Products" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* 📊 DASHBOARD TAB */}
        {/* ============================================================ */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Today's Stats */}
            <div>
              <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-red-600 rounded"></span>
                Aaj Ka Hisaab (Today)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-red-600 to-red-700 p-4 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-red-200 font-bold uppercase">
                    Aaj Ki Sale
                  </p>
                  <p className="text-2xl font-black text-white">
                    {formatCurrency(stats?.todayRevenue || 0)}
                  </p>
                  <p className="text-[10px] text-red-200 mt-1">
                    {stats?.todayBills || 0} bills
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Aaj Ke Customers
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.todayBills || 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    bills bane
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Products
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {products.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    database me
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Low Stock Alert
                  </p>
                  <p className="text-2xl font-black text-amber-600">
                    {products.filter((p: any) => (p.stock || 0) < 10).length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    products (10 se kam)
                  </p>
                </div>
              </div>
            </div>

            {/* This Month */}
            <div>
              <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded"></span>
                Is Mahine Ka Hisaab (This Month)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-blue-200 font-bold uppercase">
                    Mahine Ki Sale
                  </p>
                  <p className="text-2xl font-black text-white">
                    {formatCurrency(stats?.monthRevenue || 0)}
                  </p>
                  <p className="text-[10px] text-blue-200 mt-1">
                    {stats?.monthBills || 0} bills
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Bills (Month)
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.monthBills || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Unique Customers
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.uniqueCustomers || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Items Sold
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.totalItemsSold || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* All Time */}
            <div>
              <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-green-600 rounded"></span>
                Overall Hisaab (All Time)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-2xl shadow-lg">
                  <p className="text-[10px] text-green-200 font-bold uppercase">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-black text-white">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Bills
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.totalBills || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Customers
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.uniqueCustomers || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Avg Bill Value
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {stats?.totalBills
                      ? formatCurrency(stats.totalRevenue / stats.totalBills)
                      : "₹0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Bills */}
            <div>
              <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-purple-600 rounded"></span>
                Recent Bills (Last 5)
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {bills.slice(0, 5).map((bill: any) => (
                  <div
                    key={bill.id}
                    className="flex justify-between items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedBill(bill);
                      setActiveTab("bills");
                    }}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {bill.customerName || "Walk-in Customer"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {bill.invoiceNo} • {formatDate(bill.savedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-600">
                        {formatCurrency(bill.total)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {bill.items?.filter((i: any) => i.productName).length || 0} items
                      </p>
                    </div>
                  </div>
                ))}
                {bills.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">
                    Abhi tak koi bill save nahi hua
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 🧾 BILLS TAB */}
        {/* ============================================================ */}
        {activeTab === "bills" && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-800">
                🧾 All Bills ({bills.length})
              </h2>
              <button
                onClick={exportBillsCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold"
              >
                📤 Export CSV
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by Invoice, Name, Phone..."
              className="w-full px-4 py-2 bg-white border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm mb-4"
              value={searchBill}
              onChange={(e) => setSearchBill(e.target.value)}
            />

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] text-slate-500 font-bold uppercase">
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((bill: any) => (
                      <tr
                        key={bill.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="p-3 font-mono text-[10px] text-slate-600">
                          {bill.invoiceNo}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600">
                          {formatDate(bill.savedAt)}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-xs">
                            {bill.customerName || "Walk-in"}
                          </p>
                          {bill.customerPhone && (
                            <p className="text-[10px] text-slate-400">
                              {bill.customerPhone}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          {bill.items?.filter((i: any) => i.productName).length || 0}
                        </td>
                        <td className="p-3 text-right font-bold text-red-600 text-xs">
                          {formatCurrency(bill.total)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="w-7 h-7 bg-blue-100 hover:bg-blue-500 hover:text-white text-blue-600 rounded-lg text-xs"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="w-7 h-7 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-lg text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredBills.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">
                    {searchBill ? "Kuch nahi mila" : "Abhi tak koi bill save nahi hua"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 👥 CUSTOMERS TAB */}
        {/* ============================================================ */}
        {activeTab === "customers" && (
          <div>
            <h2 className="text-lg font-black text-slate-800 mb-4">
              👥 Customers ({customers.length})
            </h2>
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="w-full px-4 py-2 bg-white border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm mb-4"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCustomers.map((c: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-black text-lg">
                      {(c.name || "W")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        📞 {c.phone}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">
                        Total Spent
                      </p>
                      <p className="text-sm font-black text-red-600">
                        {formatCurrency(c.totalSpent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">
                        Bills
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {c.totalBills}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2">
                    Last visit: {formatDate(c.lastVisit)}
                  </p>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="col-span-full text-center text-slate-400 text-sm py-8">
                  {searchCustomer ? "Kuch nahi mila" : "Abhi tak koi customer nahi"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 📦 PRODUCTS TAB */}
        {/* ============================================================ */}
        {activeTab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-800">
                📦 Products ({products.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-bold"
                >
                  ➕ Add Product
                </button>
                <button
                  onClick={exportProductsCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold"
                >
                  📤 Export CSV
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Search by name or barcode..."
              className="w-full px-4 py-2 bg-white border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm mb-4"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
            />

            {/* Low Stock Alert */}
            {products.filter((p: any) => (p.stock || 0) < 10).length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-amber-800 mb-2">
                  ⚠️ Low Stock Alert ({products.filter((p: any) => (p.stock || 0) < 10).length} products)
                </p>
                <div className="flex flex-wrap gap-2">
                  {products
                    .filter((p: any) => (p.stock || 0) < 10)
                    .slice(0, 5)
                    .map((p: any) => (
                      <span
                        key={p.barcode}
                        className="bg-white px-2 py-1 rounded-lg text-[10px] font-bold text-amber-700 border border-amber-200"
                      >
                        {p.name} — {p.stock || 0} left
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] text-slate-500 font-bold uppercase">
                      <th className="p-3">Barcode</th>
                      <th className="p-3">Name</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p: any) => (
                      <tr
                        key={p.barcode}
                        className={`border-t border-slate-100 hover:bg-slate-50 ${
                          (p.stock || 0) < 10 ? "bg-amber-50" : ""
                        }`}
                      >
                        <td className="p-3 font-mono text-[10px] text-slate-600">
                          {p.barcode}
                        </td>
                        <td className="p-3 font-bold text-slate-800 text-xs">
                          {p.name}
                        </td>
                        <td className="p-3 text-right font-bold text-red-600 text-xs">
                          {formatCurrency(p.rate)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              (p.stock || 0) < 10
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {p.stock || 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setShowProductModal(true);
                              }}
                              className="w-7 h-7 bg-blue-100 hover:bg-blue-500 hover:text-white text-blue-600 rounded-lg text-xs"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.barcode)}
                              className="w-7 h-7 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-lg text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">
                    {searchProduct ? "Kuch nahi mila" : "Koi product nahi"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BILL DETAIL MODAL */}
      {/* ============================================================ */}
      {selectedBill && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black">🧾 Bill Details</h2>
              <button
                onClick={() => setSelectedBill(null)}
                className="w-8 h-8 bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono text-xs">{selectedBill.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-bold">{formatDate(selectedBill.savedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold">
                  {selectedBill.customerName || "Walk-in"}
                </span>
              </div>
              {selectedBill.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{selectedBill.customerPhone}</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-600 mb-2">Items:</p>
                {selectedBill.items
                  ?.filter((i: any) => i.productName)
                  .map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs py-1"
                    >
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedBill.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>GST:</span>
                  <span>{formatCurrency(selectedBill.gstAmount)}</span>
                </div>
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedBill.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-red-600 pt-2 border-t border-slate-100">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedBill.total)}</span>
                </div>
              </div>

              <div className="flex justify-between text-xs pt-2">
                <span className="text-slate-500">Payment:</span>
                <span className="font-bold">{selectedBill.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRODUCT MODAL (Add/Edit) */}
      {/* ============================================================ */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-lg font-black mb-4">
              {editingProduct ? "✏️ Edit Product" : "➕ Add Product"}
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Barcode"
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
                value={editingProduct?.barcode || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, barcode: e.target.value })
                }
                disabled={!!editingProduct?.barcode}
              />
              <input
                type="text"
                placeholder="Product Name *"
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
                value={editingProduct?.name || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Rate (₹) *"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
                  value={editingProduct?.rate || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, rate: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Stock"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
                  value={editingProduct?.stock || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, stock: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveProduct(editingProduct)}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-sm"
              >
                ✅ Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}