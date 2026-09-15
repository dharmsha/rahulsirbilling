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
  const [dateFilter, setDateFilter] = useState("all");

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
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " • " + d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  // ============================================================
  // FILTERS
  // ============================================================
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
    return c.name?.toLowerCase().includes(s) || c.phone?.includes(s);
  });

  const filteredProducts = products.filter((p) => {
    if (!searchProduct) return true;
    const s = searchProduct.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.barcode?.includes(s);
  });

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleDeleteBill = async (id: string) => {
    if (!confirm("Delete this bill permanently?")) return;
    await deleteBill(id);
    loadAll();
  };

  const handleDeleteProduct = async (barcode: string) => {
    if (!confirm("Delete this product permanently?")) return;
    await deleteProduct(barcode);
    loadAll();
  };

  const handleSaveProduct = async (product: any) => {
    if (!product.name || !product.rate) {
      alert("Product name and rate are required.");
      return;
    }
    await addProduct(product);
    setShowProductModal(false);
    setEditingProduct(null);
    loadAll();
  };

  const exportBillsCSV = () => {
    const csv =
      "Invoice,Date,Customer,Phone,Items,Subtotal,GST,Total,Payment\n" +
      bills
        .map(
          (b: any) =>
            `${b.invoiceNo},"${formatDate(b.savedAt)}","${b.customerName || "Walk-in"}","${b.customerPhone || "-"}",${b.items?.filter((i: any) => i.productName).length || 0},${b.subtotal},${b.gstAmount},${b.total},${b.paymentMethod}`
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills_${Date.now()}.csv`;
    a.click();
  };

  const exportProductsCSV = () => {
    const csv =
      "Barcode,Name,Rate,Stock\n" +
      products
        .map((p: any) => `${p.barcode},"${p.name}",${p.rate},${p.stock || 0}`)
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${Date.now()}.csv`;
    a.click();
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* ==================== HEADER ==================== */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
              <span className="text-xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Krishna Store • Management Console
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="group bg-slate-900 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-slate-200 hover:shadow-red-200"
          >
            <span>🛍️</span>
            <span className="hidden sm:inline">Billing Page</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {/* ==================== TABS ==================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 mb-6 shadow-sm flex gap-1 overflow-x-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "bills", label: "Bills", icon: "🧾", count: bills.length },
            { id: "customers", label: "Customers", icon: "👥", count: customers.length },
            { id: "products", label: "Products", icon: "📦", count: products.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* DASHBOARD TAB */}
        {/* ============================================================ */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Today's Overview */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">
                  Today's Overview
                </h2>
                <span className="text-xs text-slate-400 font-medium ml-auto">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Today's Sales"
                  value={formatCurrency(stats?.todayRevenue || 0)}
                  subtitle={`${stats?.todayBills || 0} transactions`}
                  gradient="from-red-500 to-red-700"
                  icon="💰"
                />
                <StatCard
                  title="Today's Customers"
                  value={stats?.todayBills || 0}
                  subtitle="bills generated"
                  gradient="from-blue-500 to-blue-700"
                  icon="👤"
                />
                <StatCard
                  title="Total Products"
                  value={products.length}
                  subtitle="in inventory"
                  gradient="from-emerald-500 to-emerald-700"
                  icon="📦"
                />
                <StatCard
                  title="Low Stock Alert"
                  value={products.filter((p: any) => (p.stock || 0) < 10).length}
                  subtitle="items need restock"
                  gradient="from-amber-500 to-orange-600"
                  icon="⚠️"
                />
              </div>
            </section>

            {/* This Month */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">
                  This Month's Performance
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Monthly Sales"
                  value={formatCurrency(stats?.monthRevenue || 0)}
                  subtitle={`${stats?.monthBills || 0} bills`}
                  gradient="from-indigo-500 to-indigo-700"
                  icon="📈"
                />
                <StatCard
                  title="Monthly Bills"
                  value={stats?.monthBills || 0}
                  subtitle="transactions"
                  gradient="from-violet-500 to-violet-700"
                  icon="🧾"
                />
                <StatCard
                  title="Unique Customers"
                  value={stats?.uniqueCustomers || 0}
                  subtitle="all time"
                  gradient="from-pink-500 to-pink-700"
                  icon="🎯"
                />
                <StatCard
                  title="Items Sold"
                  value={stats?.totalItemsSold || 0}
                  subtitle="all time"
                  gradient="from-cyan-500 to-cyan-700"
                  icon="🛒"
                />
              </div>
            </section>

            {/* All Time */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">
                  All-Time Statistics
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(stats?.totalRevenue || 0)}
                  subtitle="lifetime earnings"
                  gradient="from-emerald-500 to-green-700"
                  icon="💎"
                />
                <StatCard
                  title="Total Bills"
                  value={stats?.totalBills || 0}
                  subtitle="lifetime"
                  gradient="from-slate-600 to-slate-800"
                  icon="📋"
                />
                <StatCard
                  title="Total Customers"
                  value={stats?.uniqueCustomers || 0}
                  subtitle="unique"
                  gradient="from-rose-500 to-rose-700"
                  icon="❤️"
                />
                <StatCard
                  title="Average Bill"
                  value={
                    stats?.totalBills
                      ? formatCurrency(stats.totalRevenue / stats.totalBills)
                      : "₹0"
                  }
                  subtitle="per transaction"
                  gradient="from-teal-500 to-teal-700"
                  icon="📊"
                />
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full"></div>
                <h2 className="text-base font-bold text-slate-800">
                  Recent Activity
                </h2>
                <button
                  onClick={() => setActiveTab("bills")}
                  className="ml-auto text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  View all →
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {bills.slice(0, 5).map((bill: any, idx: number) => (
                  <div
                    key={bill.id}
                    className={`flex justify-between items-center p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      idx !== 0 ? "border-t border-slate-100" : ""
                    }`}
                    onClick={() => {
                      setSelectedBill(bill);
                      setActiveTab("bills");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {(bill.customerName || "W")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {bill.customerName || "Walk-in Customer"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {bill.invoiceNo} • {formatShortDate(bill.savedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        {formatCurrency(bill.total)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {bill.items?.filter((i: any) => i.productName).length || 0} items
                      </p>
                    </div>
                  </div>
                ))}
                {bills.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-2">📭</p>
                    <p className="text-sm text-slate-400 font-medium">
                      No bills yet. Start billing to see activity here.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ============================================================ */}
        {/* BILLS TAB */}
        {/* ============================================================ */}
        {activeTab === "bills" && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Bills History
                </h2>
                <p className="text-xs text-slate-500">
                  {filteredBills.length} of {bills.length} bills
                </p>
              </div>
              <button
                onClick={exportBillsCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                📤 Export CSV
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by invoice number, customer name, or phone..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl outline-none text-sm transition-all"
                value={searchBill}
                onChange={(e) => setSearchBill(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-center">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.map((bill: any) => (
                      <tr
                        key={bill.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {bill.invoiceNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {formatDate(bill.savedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">
                            {bill.customerName || "Walk-in Customer"}
                          </p>
                          {bill.customerPhone && (
                            <p className="text-xs text-slate-400">
                              📞 {bill.customerPhone}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-lg">
                            {bill.items?.filter((i: any) => i.productName).length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(bill.total)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg text-sm transition-all"
                              title="View"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="w-8 h-8 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-sm transition-all"
                              title="Delete"
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
                  <div className="text-center py-16">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="text-sm text-slate-400 font-medium">
                      {searchBill
                        ? "No bills match your search"
                        : "No bills recorded yet"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CUSTOMERS TAB */}
        {/* ============================================================ */}
        {activeTab === "customers" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Customers Directory
              </h2>
              <p className="text-xs text-slate-500">
                {filteredCustomers.length} of {customers.length} customers
              </p>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by name or phone number..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl outline-none text-sm transition-all"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((c: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-100">
                      {(c.name || "W")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        📞 {c.phone}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Total Spent
                      </p>
                      <p className="text-base font-bold text-red-600 mt-0.5">
                        {formatCurrency(c.totalSpent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Total Bills
                      </p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {c.totalBills}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400">
                      Last visit: <span className="font-semibold text-slate-600">{formatDate(c.lastVisit)}</span>
                    </p>
                  </div>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <p className="text-4xl mb-2">👥</p>
                  <p className="text-sm text-slate-400 font-medium">
                    {searchCustomer
                      ? "No customers match your search"
                      : "No customers yet"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PRODUCTS TAB */}
        {/* ============================================================ */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Products Inventory
                </h2>
                <p className="text-xs text-slate-500">
                  {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  ➕ Add Product
                </button>
                <button
                  onClick={exportProductsCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  📤 Export
                </button>
              </div>
            </div>

            {/* Low Stock Alert */}
            {products.filter((p: any) => (p.stock || 0) < 10).length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 mb-2">
                      Low Stock Alert —{" "}
                      {products.filter((p: any) => (p.stock || 0) < 10).length}{" "}
                      products need restocking
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {products
                        .filter((p: any) => (p.stock || 0) < 10)
                        .slice(0, 6)
                        .map((p: any) => (
                          <span
                            key={p.barcode}
                            className="bg-white px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-800 border border-amber-200 shadow-sm"
                          >
                            {p.name} — {p.stock || 0} left
                          </span>
                        ))}
                      {products.filter((p: any) => (p.stock || 0) < 10).length > 6 && (
                        <span className="text-xs text-amber-700 font-semibold px-2 py-1">
                          +{products.filter((p: any) => (p.stock || 0) < 10).length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by product name or barcode..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl outline-none text-sm transition-all"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Barcode</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p: any) => {
                      const isLow = (p.stock || 0) < 10;
                      return (
                        <tr
                          key={p.barcode}
                          className={`hover:bg-slate-50 transition-colors ${
                            isLow ? "bg-amber-50/50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {p.barcode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                            {formatCurrency(p.rate)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                            {p.stock || 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isLow ? (
                              <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setShowProductModal(true);
                                }}
                                className="w-8 h-8 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg text-sm transition-all"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.barcode)}
                                className="w-8 h-8 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-sm transition-all"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-2">📦</p>
                    <p className="text-sm text-slate-400 font-medium">
                      {searchProduct
                        ? "No products match your search"
                        : "No products in inventory"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* BILL DETAIL MODAL */}
      {/* ============================================================ */}
      {selectedBill && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Bill Details
                </h2>
                <p className="text-xs text-slate-500">Invoice breakdown</p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Invoice No.</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {selectedBill.invoiceNo}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Date & Time</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {formatDate(selectedBill.savedAt)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBill.paymentMethod}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Customer
                </p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white font-bold">
                    {(selectedBill.customerName || "W")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedBill.customerName || "Walk-in Customer"}
                    </p>
                    {selectedBill.customerPhone && (
                      <p className="text-xs text-slate-500">
                        📞 {selectedBill.customerPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Items
                </p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  {selectedBill.items
                    ?.filter((i: any) => i.productName)
                    .map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-slate-700">
                          {item.productName}{" "}
                          <span className="text-slate-400">
                            × {item.quantity}
                          </span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(selectedBill.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GST</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(selectedBill.gstAmount)}
                  </span>
                </div>
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      -{formatCurrency(selectedBill.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-800">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(selectedBill.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRODUCT MODAL (Add/Edit) */}
      {/* ============================================================ */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingProduct
                    ? "Update product information"
                    : "Fill in the product details"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Barcode
                </label>
                <input
                  type="text"
                  placeholder="Enter barcode"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
                  value={editingProduct?.barcode || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, barcode: e.target.value })
                  }
                  disabled={!!editingProduct?.barcode}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amul Butter 500g"
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
                  value={editingProduct?.name || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Rate (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
                    value={editingProduct?.rate || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, rate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-red-400 focus:bg-white rounded-xl outline-none text-sm transition-all"
                    value={editingProduct?.stock || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveProduct(editingProduct)}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-200"
              >
                {editingProduct ? "Update Product" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD COMPONENT
// ============================================================
function StatCard({
  title,
  value,
  subtitle,
  gradient,
  icon,
}: {
  title: string;
  value: any;
  subtitle: string;
  gradient: string;
  icon: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden`}
    >
      <div className="absolute top-3 right-3 text-3xl opacity-20">
        {icon}
      </div>
      <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-[10px] text-white/70 font-medium">{subtitle}</p>
    </div>
  );
}