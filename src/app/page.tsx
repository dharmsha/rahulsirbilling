"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  getProducts,
  addProduct,
  deleteProduct,
  findProductByBarcode,
  bulkAddProducts,
  seedDefaultProducts,
} from '@/lib/productDatabase';
import { saveBill as saveBillToFirebase } from '@/lib/billDatabase';

export default function BillingPage() {
  const [billData, setBillData] = useState({
    shopName: 'Krishna Store',
    shopSubtitle: 'Fresh & Daily Needs',
    shopAddress: '123, Main Market, Near Temple, Vrindavan, UP 281121',
    shopPhone: '+91 98765 43210',
    shopEmail: 'krishnastore@gmail.com',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    invoiceNo: '',
    invoiceDate: '',
    items: [{ productName: '', quantity: 1, rate: 0, amount: 0, barcode: '' }],
    subtotal: 0,
    gstRate: 18,
    gstAmount: 0,
    discount: 0,
    discountType: 'amount',
    total: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    deliveryCharge: 0,
    platformFee: 0,
    handlingCharge: 0,
    convenienceFee: 0,
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [scanStatus, setScanStatus] = useState('');
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newProduct, setNewProduct] = useState({ barcode: '', name: '', rate: '', stock: '' });
  const [saving, setSaving] = useState(false);

  const html5QrcodeRef = useRef<any>(null);

  // ============================================================
  // LOAD FROM FIREBASE
  // ============================================================
  useEffect(() => {
    loadProducts();
    generateNewInvoice();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setDbStatus('connecting');
      const data = await getProducts();
      setProducts(data);
      setDbStatus('connected');

      if (data.length === 0) {
        console.log('Empty database — seeding defaults...');
        await seedDefaultProducts();
        const seeded = await getProducts();
        setProducts(seeded);
      }
    } catch (err: any) {
      console.error('Firebase load error:', err);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const generateNewInvoice = () => {
    const date = new Date();
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    setBillData(prev => ({
      ...prev,
      invoiceNo: 'KS-' + timestamp + '-' + random,
      invoiceDate: date.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) + ', ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      }),
    }));
  };

  // ============================================================
  // 📷 CAMERA SCANNER
  // ============================================================
  const startCameraScanner = async () => {
    setIsScannerOpen(true);
    setScanStatus('📷 Camera starting...');

    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5Qrcode = new Html5Qrcode('barcode-reader');
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 180 }, aspectRatio: 1.0 },
          (decodedText: string) => {
            handleBarcodeScan(decodedText);
            stopCameraScanner();
          },
          () => {}
        );
        setScanStatus('🎯 Barcode ko frame ke andar rakho');
      } catch (err: any) {
        console.error('Camera error:', err);
        setScanStatus('❌ Camera nahi khul raha. Permission check karo.');
      }
    }, 300);
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {}
      html5QrcodeRef.current = null;
    }
    setIsScannerOpen(false);
    setScanStatus('');
  };

  // ============================================================
  // 🔥 BARCODE SCAN
  // ============================================================
  const handleBarcodeScan = async (scannedCode: string) => {
    const code = String(scannedCode).trim();
    if (!code) return;

    setScanStatus('🔍 Firebase me dhundh raha hu...');

    const product = await findProductByBarcode(code);

    if (!product) {
      setNewProduct({ barcode: code, name: '', rate: '', stock: '' });
      setShowNewProductModal(true);
      setScanStatus(`⚠️ Naya product! Details bharo.`);
      return;
    }

    addProductToBill(product);
  };

  const addProductToBill = (product: any) => {
    const existingIndex = billData.items.findIndex(
      (item: any) => item.barcode === product.barcode
    );

    let newItems;
    if (existingIndex !== -1) {
      newItems = [...billData.items];
      newItems[existingIndex].quantity =
        (parseFloat(String(newItems[existingIndex].quantity)) || 1) + 1;
      setScanStatus(`✅ ${product.name} — Qty: ${newItems[existingIndex].quantity}`);
    } else {
      newItems = [...billData.items];
      const lastIndex = newItems.length - 1;
      const newItem = {
        productName: product.name,
        quantity: 1,
        rate: product.rate,
        amount: product.rate,
        barcode: product.barcode,
      };
      if (newItems[lastIndex].productName === '' && newItems[lastIndex].rate === 0) {
        newItems[lastIndex] = newItem;
      } else {
        newItems.push(newItem);
      }
      setScanStatus(`✅ Added: ${product.name} — ${formatCurrency(product.rate)}`);
    }

    setBillData(calculateTotals({ ...billData, items: newItems }));
    setLastScanned({ code: product.barcode, time: new Date().toLocaleTimeString() });
    setTimeout(() => setScanStatus(''), 2500);
  };

  // ============================================================
  // 🆕 SAVE NEW PRODUCT
  // ============================================================
  const saveNewProduct = async () => {
    if (!newProduct.name || !newProduct.rate) {
      alert('Product name aur rate dono bharo!');
      return;
    }

    const product = {
      barcode: newProduct.barcode,
      name: newProduct.name.trim(),
      rate: parseFloat(newProduct.rate) || 0,
      stock: parseInt(newProduct.stock) || 0,
    };

    try {
      setScanStatus('💾 Firebase me save ho raha hai...');
      await addProduct(product);
      const updated = await getProducts();
      setProducts(updated);
      addProductToBill(product);
      setShowNewProductModal(false);
      setNewProduct({ barcode: '', name: '', rate: '', stock: '' });
      setScanStatus(`✅ Save ho gaya: ${product.name}`);
      setTimeout(() => setScanStatus(''), 3000);
    } catch (err: any) {
      alert('❌ Firebase error: ' + err.message);
      setScanStatus('❌ Save nahi hua');
    }
  };

  // ============================================================
  // 🗑️ DELETE PRODUCT
  // ============================================================
  const handleDeleteProduct = async (barcode: string) => {
    if (!confirm('Ye product Firebase se delete karna hai?')) return;
    try {
      await deleteProduct(barcode);
      const updated = await getProducts();
      setProducts(updated);
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  // ============================================================
  // 📤 EXPORT CSV
  // ============================================================
  const exportProducts = () => {
    const csv = 'Barcode,Name,Rate,Stock\n' +
      products.map((p: any) => `${p.barcode},"${p.name}",${p.rate},${p.stock || 0}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // 📥 IMPORT CSV
  // ============================================================
  const importProducts = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').slice(1);
        const imported = lines
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const parts = line.split(',').map((p: string) => p.trim().replace(/^"|"$/g, ''));
            return {
              barcode: parts[0],
              name: parts[1],
              rate: parseFloat(parts[2]) || 0,
              stock: parseInt(parts[3]) || 0,
            };
          })
          .filter((p: any) => p.barcode && p.name);

        const count = await bulkAddProducts(imported);
        const updated = await getProducts();
        setProducts(updated);
        alert(`✅ ${count} products Firebase me import ho gaye!`);
      } catch (err: any) {
        alert('❌ Import error: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleReseed = async () => {
    if (!confirm('Default products dobara add karna hai?')) return;
    try {
      const count = await seedDefaultProducts();
      const updated = await getProducts();
      setProducts(updated);
      alert(`✅ ${count} default products add ho gaye!`);
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  // ============================================================
  // MANUAL BARCODE
  // ============================================================
  const handleManualBarcode = (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan(manualBarcode);
      setManualBarcode('');
    }
  };

  // ============================================================
  // SEARCH
  // ============================================================
  const handleProductSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    if (searchValue.length > 1) {
      const filtered = products.filter((product: any) =>
        product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        product.barcode.includes(searchValue)
      );
      setSuggestions(filtered.slice(0, 8));
    } else {
      setSuggestions([]);
    }
  };

  const selectProduct = (product: any) => {
    addProductToBill(product);
    setSuggestions([]);
    setSearchTerm('');
  };

  // ============================================================
  // CALCULATIONS
  // ============================================================
  const calculateTotals = (currentData: any) => {
    const updatedItems = currentData.items.map((item: any) => ({
      ...item,
      amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0)
    }));
    const subtotal = updatedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const gstAmount = (subtotal * (parseFloat(currentData.gstRate) || 0)) / 100;
    let discountAmount = 0;
    if (currentData.discountType === 'percentage') {
      discountAmount = (subtotal * (parseFloat(currentData.discount) || 0)) / 100;
    } else {
      discountAmount = parseFloat(currentData.discount) || 0;
    }
    const total = subtotal + gstAmount - discountAmount +
      parseFloat(currentData.deliveryCharge || 0) +
      parseFloat(currentData.platformFee || 0) +
      parseFloat(currentData.handlingCharge || 0) +
      parseFloat(currentData.convenienceFee || 0);
    return {
      ...currentData,
      items: updatedItems,
      subtotal,
      gstAmount,
      discountAmount,
      total: total > 0 ? total : 0
    };
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...billData.items];
    (newItems[index] as any)[field] = value;
    setBillData(calculateTotals({ ...billData, items: newItems }));
  };

  const handleDiscountChange = (value: any, type?: string) => {
    setBillData(calculateTotals({
      ...billData,
      discount: parseFloat(value) || 0,
      discountType: type || billData.discountType
    }));
  };

  const formatCurrency = (amount: number) => {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  };

  const addNewItem = () => {
    setBillData({
      ...billData,
      items: [...billData.items, { productName: '', quantity: 1, rate: 0, amount: 0, barcode: '' }]
    });
  };

  const removeItem = (index: number) => {
    if (billData.items.length > 1) {
      const newItems = billData.items.filter((_, i) => i !== index);
      setBillData(calculateTotals({ ...billData, items: newItems }));
    }
  };

  // ============================================================
  // 🖨️ PRINT
  // ============================================================
  const printInvoice = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice ${billData.invoiceNo}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 400px; margin: 0 auto; }
        .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
        .separator { border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 2px; border-bottom: 1px solid #ddd; } th { text-align: left; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; }
        @media print { body { margin: 0; padding: 10px; } .no-print { display: none; } }
      </style></head><body>
        <div class="center">
          <h3>${billData.shopName}</h3>
          <h4>${billData.shopSubtitle}</h4>
          <p style="font-size:10px;">${billData.shopAddress}</p>
          <p style="font-size:10px;">Phone: ${billData.shopPhone}</p>
        </div>
        <div class="separator"></div>
        <div><span class="bold">Invoice:</span> ${billData.invoiceNo}</div>
        <div><span class="bold">Date:</span> ${billData.invoiceDate}</div>
        <div style="margin:10px 0;"><span class="bold">Customer:</span> ${billData.customerName || 'Walk-in'}</div>
        <div class="separator"></div>
        <table><thead><tr><th>QTY</th><th>ITEM</th><th class="right">AMOUNT</th></tr></thead><tbody>
        ${billData.items.filter((i: any) => i.productName).map((item: any) => `
          <tr><td>${item.quantity}</td><td>${item.productName}</td><td class="right">${formatCurrency(item.amount)}</td></tr>
        `).join('')}
        </tbody></table>
        <div class="separator"></div>
        <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>${formatCurrency(billData.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span>GST (${billData.gstRate}%):</span><span>${formatCurrency(billData.gstAmount)}</span></div>
        <div class="separator"></div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.25rem;"><span>TOTAL:</span><span>${formatCurrency(billData.total)}</span></div>
        <div class="separator"></div>
        <div class="footer"><div class="bold">*** THANK YOU ***</div><div>Visit again</div></div>
        <div class="no-print" style="text-align:center;margin-top:20px;">
          <button onclick="window.print()" style="padding:10px 30px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;margin:5px;">🖨️ Print</button>
          <button onclick="window.close()" style="padding:10px 30px;background:#6b7280;color:white;border:none;border-radius:8px;cursor:pointer;margin:5px;">✕ Close</button>
        </div>
        <script>setTimeout(() => { window.print(); }, 500);<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // ============================================================
  // 💾 SAVE BILL TO FIREBASE
  // ============================================================
  const saveBill = async () => {
    const validItems = billData.items.filter((i: any) => i.productName);
    if (validItems.length === 0) {
      alert('⚠️ Pehle koi item add karo!');
      return;
    }

    if (saving) return;

    try {
      setSaving(true);
      setScanStatus('💾 Bill save ho raha hai...');
      await saveBillToFirebase(billData);
      setScanStatus('✅ Bill saved to Firebase!');
      alert('✅ Bill Firebase me save ho gaya!\n\nAdmin Panel me jaake dekho.');
      setTimeout(() => {
        setScanStatus('');
        resetBill();
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      alert('❌ Error: ' + err.message);
      setScanStatus('❌ Save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  const resetBill = () => {
    generateNewInvoice();
    setBillData(prev => ({
      ...prev,
      customerName: '', customerPhone: '', customerAddress: '',
      items: [{ productName: '', quantity: 1, rate: 0, amount: 0, barcode: '' }],
      subtotal: 0, gstAmount: 0, discount: 0, total: 0,
      paymentMethod: 'Cash', deliveryCharge: 0, platformFee: 0,
      handlingCharge: 0, convenienceFee: 0,
    }));
  };

  const handleNewBill = () => {
    if (billData.items.filter((i: any) => i.productName).length > 0) {
      if (!confirm('Current bill reset karna hai? (Save karna ho to pehle Save dabao)')) return;
    }
    resetBill();
  };

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">🛍️</span>
            </div>
            <div>
              <span className="text-lg font-black text-slate-900">Krishna <span className="text-red-600">Store</span></span>
              <span className={`block text-[10px] font-bold ${
                dbStatus === 'connected' ? 'text-green-600' :
                dbStatus === 'error' ? 'text-red-600' : 'text-amber-600'
              }`}>
                {dbStatus === 'connected' && '🟢 Firebase Connected'}
                {dbStatus === 'connecting' && '🟡 Connecting...'}
                {dbStatus === 'error' && '🔴 Connection Error'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
              ⚙️ Admin
            </Link>
            <button onClick={handleNewBill} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold">
              ➕ New Bill
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[9px] text-slate-400 font-bold uppercase">Items</p>
            <p className="text-lg font-black text-slate-800">{billData.items.filter((i: any) => i.productName).length}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[9px] text-slate-400 font-bold uppercase">Subtotal</p>
            <p className="text-lg font-black text-slate-800">{formatCurrency(billData.subtotal)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[9px] text-slate-400 font-bold uppercase">GST</p>
            <p className="text-lg font-black text-slate-800">{formatCurrency(billData.gstAmount)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-xl shadow-lg">
            <p className="text-[9px] text-red-200 font-bold uppercase">Total</p>
            <p className="text-lg font-black text-white">{formatCurrency(billData.total)}</p>
          </div>
        </div>

        {/* Scanner */}
        <div className="bg-white rounded-2xl border-2 border-red-300 p-5 shadow-lg">
          <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
            📷 Barcode Scanner
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-auto">
              {products.length} products in Firebase
            </span>
          </h3>

          <button
            onClick={startCameraScanner}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-base mb-3"
          >
            <span className="text-2xl">📷</span>
            Camera se Scan Karo
          </button>

          <input
            type="text"
            placeholder="Ya barcode number type karo + Enter"
            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={handleManualBarcode}
          />

          {scanStatus && (
            <div className={`mt-2 text-xs font-bold p-2 rounded-lg ${
              scanStatus.includes('❌') ? 'bg-red-100 text-red-700' :
              scanStatus.includes('✅') ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {scanStatus}
            </div>
          )}
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
            👤 Customer Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Customer Name"
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={billData.customerName}
              onChange={(e) => setBillData({ ...billData, customerName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Phone Number"
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={billData.customerPhone}
              onChange={(e) => setBillData({ ...billData, customerPhone: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address"
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={billData.customerAddress}
              onChange={(e) => setBillData({ ...billData, customerAddress: e.target.value })}
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-700 mb-3">
            📦 Items ({billData.items.filter((i: any) => i.productName).length})
          </h3>

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm"
              value={searchTerm}
              onChange={(e) => handleProductSearch(e.target.value)}
            />
            {suggestions.length > 0 && (
              <div className="absolute w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-20 max-h-56 overflow-y-auto">
                {suggestions.map((product: any, idx: number) => (
                  <div key={idx} className="p-2.5 hover:bg-red-50 cursor-pointer flex justify-between" onClick={() => selectProduct(product)}>
                    <span className="text-sm">{product.name}</span>
                    <span className="text-red-600 font-bold text-sm">{formatCurrency(product.rate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {billData.items.map((item: any, index: number) => (
              <div key={index} className={`border-2 rounded-xl p-2.5 ${item.productName ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input type="text" placeholder="Product" className="w-full px-2 py-1.5 border rounded-lg text-sm" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} />
                    {item.barcode && <span className="text-[9px] text-slate-400">📷 {item.barcode}</span>}
                  </div>
                  <input type="number" placeholder="Qty" className="col-span-2 px-2 py-1.5 border rounded-lg text-center text-sm font-bold" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} />
                  <input type="number" placeholder="Rate" className="col-span-2 px-2 py-1.5 border rounded-lg text-center text-sm font-bold" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)} />
                  <div className="col-span-2 text-right font-bold text-red-600 text-sm">{formatCurrency(item.amount)}</div>
                  <button onClick={() => removeItem(index)} className="col-span-1 w-6 h-6 bg-slate-200 hover:bg-red-500 hover:text-white rounded-lg text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addNewItem} className="mt-3 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">➕ Add Item</button>
        </div>

        {/* Payment + Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((method) => (
                <button
                  key={method}
                  onClick={() => setBillData({ ...billData, paymentMethod: method })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    billData.paymentMethod === method
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Discount</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleDiscountChange(billData.discount, 'amount')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${
                  billData.discountType === 'amount' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                ₹ Fixed
              </button>
              <button
                onClick={() => handleDiscountChange(billData.discount, 'percentage')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${
                  billData.discountType === 'percentage' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                % Percentage
              </button>
            </div>
            <input
              type="number"
              placeholder="Discount amount"
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm text-center font-bold"
              value={billData.discount}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border-2 border-red-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-600">TOTAL</span>
            <span className="text-3xl font-black text-red-600">{formatCurrency(billData.total)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={printInvoice}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all"
            >
              🖨️ Print
            </button>
            <button
              onClick={saveBill}
              disabled={saving}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              {saving ? '💾 Saving...' : '💾 Save Bill'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold">Firebase se products load ho rahe hain...</p>
          </div>
        </div>
      )}

      {/* NEW PRODUCT MODAL */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-3xl">🆕</span>
              </div>
              <h2 className="text-lg font-black text-slate-800">Naya Product!</h2>
              <p className="text-xs text-slate-500 mt-1">Barcode: <strong>{newProduct.barcode}</strong></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Product Name *</label>
                <input type="text" placeholder="e.g. Amul Butter 500g" className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Rate (₹) *</label>
                  <input type="number" placeholder="0" className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm" value={newProduct.rate} onChange={(e) => setNewProduct({ ...newProduct, rate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Stock</label>
                  <input type="number" placeholder="0" className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 focus:border-red-400 rounded-xl outline-none text-sm" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowNewProductModal(false); setNewProduct({ barcode: '', name: '', rate: '', stock: '' }); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={saveNewProduct} className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-sm">✅ Save to Firebase</button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black">📷 Barcode Scan</h3>
              <button onClick={stopCameraScanner} className="w-8 h-8 bg-red-100 text-red-600 rounded-lg font-bold">✕</button>
            </div>
            <div id="barcode-reader" className="rounded-xl overflow-hidden"></div>
            <p className="text-xs text-center text-slate-500 mt-2">{scanStatus || 'Barcode ko frame me rakho'}</p>
          </div>
        </div>
      )}

      {/* ADMIN PANEL (Products Quick View) */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black">📦 Products ({products.length})</h2>
              <button onClick={() => setShowAdminPanel(false)} className="w-8 h-8 bg-slate-100 rounded-lg">✕</button>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <label className="flex-1 bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold text-center cursor-pointer">
                📥 Import CSV
                <input type="file" accept=".csv" onChange={importProducts} className="hidden" />
              </label>
              <button onClick={exportProducts} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold">📤 Export CSV</button>
              <button onClick={handleReseed} className="bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold">🌱 Seed</button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {products.map((p: any) => (
                <div key={p.barcode} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-800">{p.name}</div>
                    <div className="text-[10px] text-slate-400">📷 {p.barcode} | Stock: {p.stock || 0}</div>
                  </div>
                  <div className="text-red-600 font-bold text-sm mr-3">{formatCurrency(p.rate)}</div>
                  <button onClick={() => handleDeleteProduct(p.barcode)} className="w-7 h-7 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-lg text-xs">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}