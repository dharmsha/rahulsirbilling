"use client";

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BillingPage() {
  const [billData, setBillData] = useState({
    companyName: 'Chingari Media',
    companyAddress: 'First Floor, Shakuntala Sagar, Ct Station Rd, PWD Colony, Purnia, Bihar 854301',
    companyPhone: '+91 91234 56789',
    customerName: '',
    customerAddress: '',
    invoiceNo: '',
    invoiceDate: '',
    items: [{ serviceName: '', description: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0,
    gstRate: 18,
    gstAmount: 0,
    discount: 0,
    discountType: 'amount', // 'amount' or 'percentage'
    total: 0,
    notes: 'Payment is due within 15 days. Thank you for choosing Chingari Media!',
  });

  // Set initial invoice number and date - this is fine as it runs once
  useEffect(() => {
    setBillData(prev => ({
      ...prev,
      invoiceNo: 'INV-' + Math.floor(1000 + Math.random() * 9000),
      invoiceDate: new Date().toLocaleDateString('en-GB'),
    }));
  }, []);

  // Separate calculation function that doesn't cause cascading updates
  const calculateTotals = (currentData) => {
    // Calculate item amounts
    const updatedItems = currentData.items.map(item => ({
      ...item,
      amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0)
    }));
    
    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = (subtotal * (parseFloat(currentData.gstRate) || 0)) / 100;
    
    // Calculate discount
    let discountAmount = 0;
    if (currentData.discountType === 'percentage') {
      discountAmount = (subtotal * (parseFloat(currentData.discount) || 0)) / 100;
    } else {
      discountAmount = parseFloat(currentData.discount) || 0;
    }
    
    const total = subtotal + gstAmount - discountAmount;
    
    return {
      ...currentData,
      items: updatedItems,
      subtotal,
      gstAmount,
      discountAmount, // Store the actual discount amount for display
      total: total > 0 ? total : 0
    };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...billData.items];
    newItems[index][field] = value;
    const updatedData = { ...billData, items: newItems };
    const calculatedData = calculateTotals(updatedData);
    setBillData(calculatedData);
  };

  const handleDiscountChange = (value, type) => {
    const updatedData = { 
      ...billData, 
      discount: value,
      discountType: type || billData.discountType
    };
    const calculatedData = calculateTotals(updatedData);
    setBillData(calculatedData);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 297, 'F');
    
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 55, 'F');

    try {
      doc.addImage('/abc.webp', 'WEBP', (pageWidth / 2) - 12, 8, 24, 24);
    } catch (e) {}

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(billData.companyName.toUpperCase(), pageWidth / 2, 40, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(billData.companyAddress, pageWidth / 2, 46, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 15, 70);
    doc.setDrawColor(37, 99, 235);
    doc.line(15, 72, 35, 72);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(billData.customerName || 'Valued Client', 15, 80);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const splitAddr = doc.splitTextToSize(billData.customerAddress || 'Address Details', 70);
    doc.text(splitAddr, 15, 85);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 75, 65, 60, 25, 3, 3, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`INVOICE NO:`, pageWidth - 70, 73);
    doc.setFont("helvetica", "normal");
    doc.text(`#${billData.invoiceNo}`, pageWidth - 20, 73, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text(`DATE:`, pageWidth - 70, 81);
    doc.setFont("helvetica", "normal");
    doc.text(billData.invoiceDate, pageWidth - 20, 81, { align: 'right' });

    autoTable(doc, {
      startY: 100,
      head: [["SERVICE", "DETAILED DESCRIPTION", "RATE", "TOTAL"]],
      body: billData.items.map(item => [
        item.serviceName.toUpperCase() || '-',
        item.description || '-',
        `Rs. ${parseFloat(item.rate).toLocaleString()}`,
        `Rs. ${item.amount.toLocaleString()}`
      ]),
      theme: 'plain',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 5, textColor: [51, 65, 85], valign: 'middle' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 85 }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [241, 245, 249] }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    const summaryX = pageWidth - 80;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal:", summaryX, finalY);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${billData.subtotal.toLocaleString()}`, pageWidth - 15, finalY, { align: 'right' });

    // Show discount if applied
    if (billData.discount > 0) {
      doc.setTextColor(100, 116, 139);
      doc.text("Discount:", summaryX, finalY + 6);
      doc.setTextColor(239, 68, 68);
      const discountDisplay = billData.discountType === 'percentage' 
        ? `- Rs. ${((billData.subtotal * billData.discount) / 100).toLocaleString()} (${billData.discount}%)`
        : `- Rs. ${billData.discount.toLocaleString()}`;
      doc.text(discountDisplay, pageWidth - 15, finalY + 6, { align: 'right' });
    }

    doc.setTextColor(100, 116, 139);
    doc.text(`GST (${billData.gstRate}%):`, summaryX, finalY + 12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${billData.gstAmount.toLocaleString()}`, pageWidth - 15, finalY + 12, { align: 'right' });

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(summaryX - 5, finalY + 18, 70, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL DUE", summaryX, finalY + 27);
    doc.text(`Rs. ${billData.total.toLocaleString()}`, pageWidth - 15, finalY + 27, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text("Authorized Signature", 15, finalY + 50);
    doc.line(15, finalY + 42, 60, finalY + 42);

    doc.save(`Invoice_${billData.invoiceNo}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* NAVBAR (unchanged) */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <img src="/abc.webp" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-black text-slate-900 tracking-tighter">CHINGARI<span className="text-blue-600">MEDIA</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Dashboard</a>
              <a href="#" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Invoices</a>
              <a href="#" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Clients</a>
              <button className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">NEW BILL</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
            
            <div className="p-8 md:p-12">
              {/* Form Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block">Client Information</label>
                  <input 
                    type="text" 
                    placeholder="Client Name" 
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700" 
                    value={billData.customerName}
                    onChange={(e) => setBillData({...billData, customerName: e.target.value})} 
                  />
                  <textarea 
                    placeholder="Client Address" 
                    rows="3" 
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl transition-all outline-none text-slate-600 text-sm"
                    value={billData.customerAddress}
                    onChange={(e) => setBillData({...billData, customerAddress: e.target.value})} 
                  />
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Invoice Settings</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500">Invoice ID</span>
                      <p className="text-lg font-black text-slate-800">{billData.invoiceNo}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500">GST %</span>
                      <input 
                        type="number" 
                        value={billData.gstRate} 
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold" 
                        onChange={(e) => {
                          const updatedData = { ...billData, gstRate: parseFloat(e.target.value) || 0 };
                          const calculatedData = calculateTotals(updatedData);
                          setBillData(calculatedData);
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-10">
                <div className="space-y-3">
                  {billData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-xl hover:shadow-slate-100 transition-all items-center group">
                      <input 
                        type="text" 
                        placeholder="Service Name" 
                        className="col-span-3 bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700" 
                        value={item.serviceName} 
                        onChange={(e) => handleItemChange(index, 'serviceName', e.target.value)} 
                      />
                      <textarea 
                        placeholder="Details..." 
                        className="col-span-5 bg-slate-50 p-3 rounded-xl outline-none text-sm h-12" 
                        value={item.description} 
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                      />
                      <input 
                        type="number" 
                        placeholder="Rate" 
                        className="col-span-2 bg-slate-50 p-3 rounded-xl outline-none text-center font-bold" 
                        value={item.rate} 
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)} 
                      />
                      <div className="col-span-2 text-right font-black text-blue-600 px-2">Rs. {item.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    const updatedData = {
                      ...billData, 
                      items: [...billData.items, {serviceName: '', description: '', quantity: 1, rate: 0, amount: 0}]
                    };
                    setBillData(updatedData);
                  }} 
                  className="w-full mt-4 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  + ADD NEW SERVICE
                </button>
              </div>

              {/* Discount and Total Section */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-10 border-t border-slate-100 pt-10">
                <div className="w-full md:w-80 space-y-4 bg-slate-50 p-6 rounded-3xl">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-4">Discount</h3>
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => handleDiscountChange(billData.discount, 'amount')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        billData.discountType === 'amount' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Fixed Amount
                    </button>
                    <button 
                      onClick={() => handleDiscountChange(billData.discount, 'percentage')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        billData.discountType === 'percentage' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Percentage
                    </button>
                  </div>
                  <input 
                    type="number" 
                    placeholder={billData.discountType === 'percentage' ? "Discount %" : "Discount Amount"}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                    value={billData.discount}
                    onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="w-full md:w-80 space-y-4 bg-slate-50 p-6 rounded-3xl ml-auto">
                  <div className="flex justify-between text-sm text-slate-500 font-medium px-2">
                    <span>Subtotal</span>
                    <span>Rs. {billData.subtotal.toLocaleString()}</span>
                  </div>
                  {billData.discount > 0 && (
                    <div className="flex justify-between text-sm px-2">
                      <span className="text-slate-500">Discount</span>
                      <span className="text-red-500 font-medium">
                        - Rs. {billData.discountType === 'percentage' 
                          ? ((billData.subtotal * billData.discount) / 100).toLocaleString() 
                          : billData.discount.toLocaleString()}
                        {billData.discountType === 'percentage' && ` (${billData.discount}%)`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-slate-500 font-medium px-2">
                    <span>GST ({billData.gstRate}%)</span>
                    <span>Rs. {billData.gstAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Total Amount</span>
                      <span className="text-2xl font-black text-blue-600 tracking-tighter">Rs. {billData.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={downloadPDF} className="w-full mt-10 py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-blue-600 hover:-translate-y-1 transition-all uppercase tracking-[0.2em] text-sm">
                GENERATE PDF INVOICE
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER (unchanged) */}
      <footer className="bg-slate-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/abc.webp" alt="Logo" className="w-10 h-10 object-contain brightness-0 invert" />
                <span className="text-2xl font-black tracking-tighter">CHINGARI MEDIA</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Providing premium digital media solutions and professional billing services for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Quick Links</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Support Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-all text-sm">FB</a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-all text-sm">IG</a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-all text-sm">TW</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
              © 2026 Chingari Media. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}