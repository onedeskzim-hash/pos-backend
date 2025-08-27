import { useState, useEffect } from 'react';
import { FaFileInvoice, FaPlus, FaTrash, FaFilePdf, FaSave, FaSearch, FaWhatsapp, FaEnvelope, FaDownload, FaPrint, FaCalendarAlt, FaEye, FaEllipsisV } from 'react-icons/fa';
import { customersAPI, productsAPI, businessAPI, invoicesAPI, MEDIA_BASE_URL } from '../services/api';
import { debugLogo } from '../utils/logoDebug';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Toast from '../components/Toast';
import './InvoiceGeneration.css';

const InvoiceGeneration = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [invoice, setInvoice] = useState({
    customer: '',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [{ product: '', quantity: 1, unit_price: 0 }]
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearches, setProductSearches] = useState({});
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState({});
  const [pdfBlob, setPdfBlob] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showActionDropdown, setShowActionDropdown] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, productsRes, businessRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
        businessAPI.getProfile()
      ]);
      setCustomers(customersRes.data.results || customersRes.data || []);
      setProducts(productsRes.data.results || productsRes.data || []);
      const profiles = businessRes.data.results || businessRes.data || [];
      if (profiles.length > 0) setBusinessProfile(profiles[0]);
    } catch (error) {
      setToast({ message: 'Error loading data', type: 'error' });
    }
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setInvoice(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'product') {
        const product = products.find(p => p.id === parseInt(value));
        if (product) items[index].unit_price = product.default_sale_price;
      }
      return { ...prev, items };
    });
  };

  const calculateTotals = () => {
    const subtotal = invoice.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    const isZimraEnabled = businessProfile?.zimra_enabled || false;
    const taxRate = businessProfile?.zimra_tax_rate || 15;
    const taxAmount = isZimraEnabled ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total, isZimraEnabled };
  };

  const saveInvoiceToDatabase = async (invoiceData) => {
    try {
      const response = await invoicesAPI.create(invoiceData);
      return response.data;
    } catch (error) {
      console.error('Error saving invoice:', error);
      throw error;
    }
  };

  const generatePDF = async () => {
    // Validate required fields first
    if (!invoice.customer) {
      setToast({ message: 'Please select a customer', type: 'error' });
      return;
    }
    
    const validItems = invoice.items.filter(item => item.product && item.quantity > 0);
    if (validItems.length === 0) {
      setToast({ message: 'Please add at least one valid item', type: 'error' });
      return;
    }

    const doc = new jsPDF();
    const { subtotal, taxAmount, total, isZimraEnabled } = calculateTotals();
    const customer = customers.find(c => c.id === parseInt(invoice.customer));
    const invoiceNumber = `INV-${Date.now()}`;
    
    // Save invoice to database first
    try {
      const invoiceData = {
        customer: parseInt(invoice.customer),
        due_date: invoice.due_date,
        notes: invoice.notes,
        items: validItems.map(item => ({
          product: parseInt(item.product),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };
      await saveInvoiceToDatabase(invoiceData);
      setToast({ message: 'Invoice saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Invoice save error:', error);
      setToast({ message: 'Error saving invoice to database', type: 'error' });
      return;
    }
    
    // Add logo by converting to base64
    let logoLoaded = false;
    if (businessProfile?.logo) {
      // Debug logo loading
      await debugLogo(businessProfile, MEDIA_BASE_URL);
      try {
        // Use fetch to get the image as blob to avoid CORS issues
        const logoUrl = businessProfile.logo;
        const response = await fetch(logoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve) => {
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                doc.addImage(dataURL, 'JPEG', 20, 15, 30, 30);
                console.log('✅ Logo added to PDF successfully');
                logoLoaded = true;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = reader.result;
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn('Could not load business logo:', error);
        console.log('Logo loading failed - PDF will be generated without logo');
      }
    }
    
    // Header with customizable color
    const headerColor = businessProfile?.invoice_header_color || '#0064C8';
    const r = parseInt(headerColor.slice(1, 3), 16);
    const g = parseInt(headerColor.slice(3, 5), 16);
    const b = parseInt(headerColor.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Add logo after header background but before text
    if (logoLoaded && businessProfile?.logo) {
      try {
        const logoUrl = businessProfile.logo;
        const response = await fetch(logoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve) => {
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                doc.addImage(dataURL, 'PNG', 10, 10, 40, 30);
                console.log('✅ Logo added to PDF header successfully');
                resolve();
              };
              img.onerror = () => resolve();
              img.src = reader.result;
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn('Could not add logo to header:', error);
      }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    const businessNameX = logoLoaded ? 60 : 20;
    doc.text(businessProfile?.business_name || 'Business Name', businessNameX, 25);
    doc.setFontSize(14);
    doc.text('PROFESSIONAL INVOICE', businessNameX, 35);
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    // Business details box
    doc.setDrawColor(0, 100, 200);
    doc.rect(20, 60, 80, 40);
    doc.setFontSize(10);
    doc.text('From:', 25, 70);
    doc.text(businessProfile?.business_name || 'Business Name', 25, 80);
    doc.text(businessProfile?.address || 'Business Address', 25, 85);
    doc.text(`Phone: ${businessProfile?.phone || 'N/A'}`, 25, 90);
    doc.text(`Email: ${businessProfile?.email || 'N/A'}`, 25, 95);
    
    // Invoice details box
    doc.rect(110, 60, 80, 40);
    doc.text('Invoice Details:', 115, 70);
    doc.text(`Invoice #: ${invoiceNumber}`, 115, 80);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 115, 85);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 115, 90);
    
    // Customer details box
    doc.rect(20, 110, 170, 30);
    doc.text('Bill To:', 25, 120);
    doc.setFontSize(12);
    doc.text(customer?.name || 'Customer Name', 25, 130);
    doc.setFontSize(10);
    doc.text(customer?.address || 'Customer Address', 25, 135);
    doc.text(`Phone: ${customer?.phone_no || 'N/A'}`, 120, 130);
    doc.text(`Email: ${customer?.email || 'N/A'}`, 120, 135);
    
    // Items table with enhanced styling
    const tableData = invoice.items.map(item => {
      const product = products.find(p => p.id === parseInt(item.product));
      const unitPrice = parseFloat(item.unit_price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return [
        product?.name || 'Product',
        quantity.toString(),
        `$${unitPrice.toFixed(2)}`,
        `$${(quantity * unitPrice).toFixed(2)}`
      ];
    });
    
    autoTable(doc, {
      startY: 150,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 100, 200],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });
    
    // Totals section with box
    const finalY = doc.lastAutoTable.finalY + 10;
    const boxHeight = isZimraEnabled ? 40 : 30;
    doc.rect(130, finalY, 60, boxHeight);
    doc.setFontSize(10);
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 135, finalY + 10);
    if (isZimraEnabled) {
      doc.text(`Tax (${businessProfile?.zimra_tax_rate || 15}%): $${taxAmount.toFixed(2)}`, 135, finalY + 20);
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const totalY = isZimraEnabled ? finalY + 35 : finalY + 25;
    doc.text(`TOTAL: $${total.toFixed(2)}`, 135, totalY);
    
    // Notes section
    if (invoice.notes) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('Notes:', 20, finalY + 50);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, finalY + 60);
    }
    
    // Footer with invoice footer text
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerText = businessProfile?.invoice_footer_text || 'Thank you for your business!';
    doc.text(footerText, 20, 260);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 150, 260);
    
    const blob = doc.output('blob');
    setPdfBlob(blob);
    setShowPdfModal(true);
    setToast({ message: 'Invoice PDF generated successfully!', type: 'success' });
  };

  const downloadPDF = () => {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url);
    printWindow.onload = () => printWindow.print();
  };

  const shareWhatsApp = () => {
    const text = `Invoice generated for ${customers.find(c => c.id === parseInt(invoice.customer))?.name || 'Customer'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const shareEmail = () => {
    const customer = customers.find(c => c.id === parseInt(invoice.customer));
    const subject = `Invoice from ${businessProfile?.business_name || 'Business'}`;
    const body = `Dear ${customer?.name || 'Customer'},\n\nPlease find attached your invoice.\n\nBest regards,\n${businessProfile?.business_name || 'Business'}`;
    window.open(`mailto:${customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const fetchInvoices = async () => {
    try {
      const response = await invoicesAPI.getAll();
      setInvoices(response.data.results || response.data || []);
    } catch (error) {
      setToast({ message: 'Error loading invoices', type: 'error' });
    }
  };

  const viewInvoices = () => {
    fetchInvoices();
    setShowInvoicesModal(true);
  };

  const generateInvoicePDF = async (invoiceData) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === invoiceData.customer);
    
    // Logo will be added in header section
    let logoLoaded = !!businessProfile?.logo;
    
    // Header with customizable color
    const headerColor = businessProfile?.invoice_header_color || '#0064C8';
    const r = parseInt(headerColor.slice(1, 3), 16);
    const g = parseInt(headerColor.slice(3, 5), 16);
    const b = parseInt(headerColor.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Add logo after header background but before text
    if (logoLoaded && businessProfile?.logo) {
      try {
        const logoUrl = businessProfile.logo;
        const response = await fetch(logoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve) => {
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                doc.addImage(dataURL, 'PNG', 10, 10, 40, 30);
                console.log('✅ Logo added to saved invoice PDF header successfully');
                resolve();
              };
              img.onerror = () => resolve();
              img.src = reader.result;
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn('Could not add logo to saved invoice header:', error);
      }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    const businessNameX = logoLoaded ? 60 : 20;
    doc.text(businessProfile?.business_name || 'Business Name', businessNameX, 25);
    doc.setFontSize(14);
    doc.text('PROFESSIONAL INVOICE', businessNameX, 35);
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    // Business details
    doc.setDrawColor(0, 100, 200);
    doc.rect(20, 60, 80, 40);
    doc.setFontSize(10);
    doc.text('From:', 25, 70);
    doc.text(businessProfile?.business_name || 'Business Name', 25, 80);
    doc.text(businessProfile?.address || 'Business Address', 25, 85);
    doc.text(`Phone: ${businessProfile?.phone || 'N/A'}`, 25, 90);
    doc.text(`Email: ${businessProfile?.email || 'N/A'}`, 25, 95);
    
    // Invoice details
    doc.rect(110, 60, 80, 40);
    doc.text('Invoice Details:', 115, 70);
    doc.text(`Invoice #: ${invoiceData.invoice_number}`, 115, 80);
    doc.text(`Date: ${new Date(invoiceData.created_at).toLocaleDateString()}`, 115, 85);
    doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 115, 90);
    
    // Customer details
    doc.rect(20, 110, 170, 30);
    doc.text('Bill To:', 25, 120);
    doc.setFontSize(12);
    doc.text(customer?.name || 'Customer Name', 25, 130);
    doc.setFontSize(10);
    doc.text(customer?.address || 'Customer Address', 25, 135);
    doc.text(`Phone: ${customer?.phone_no || 'N/A'}`, 120, 130);
    doc.text(`Email: ${customer?.email || 'N/A'}`, 120, 135);
    
    // Items table
    const tableData = invoiceData.items?.map(item => {
      const product = products.find(p => p.id === item.product);
      return [
        product?.name || 'Product',
        item.quantity.toString(),
        `$${parseFloat(item.unit_price).toFixed(2)}`,
        `$${parseFloat(item.total_price).toFixed(2)}`
      ];
    }) || [];
    
    autoTable(doc, {
      startY: 150,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 100, 200],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });
    
    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    const isZimraEnabled = businessProfile?.zimra_enabled || false;
    const boxHeight = isZimraEnabled ? 40 : 30;
    doc.rect(130, finalY, 60, boxHeight);
    doc.setFontSize(10);
    doc.text(`Subtotal: $${parseFloat(invoiceData.subtotal).toFixed(2)}`, 135, finalY + 10);
    if (isZimraEnabled) {
      doc.text(`Tax: $${parseFloat(invoiceData.tax_amount).toFixed(2)}`, 135, finalY + 20);
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const totalY = isZimraEnabled ? finalY + 35 : finalY + 25;
    doc.text(`TOTAL: $${parseFloat(invoiceData.total_amount).toFixed(2)}`, 135, totalY);
    
    // Notes
    if (invoiceData.notes) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('Notes:', 20, finalY + 50);
      const splitNotes = doc.splitTextToSize(invoiceData.notes, 170);
      doc.text(splitNotes, 20, finalY + 60);
    }
    
    // Footer with invoice footer text
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerText = businessProfile?.invoice_footer_text || 'Thank you for your business!';
    doc.text(footerText, 20, 260);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 150, 260);
    
    return doc;
  };

  const downloadInvoicePDF = async (invoiceData) => {
    const doc = await generateInvoicePDF(invoiceData);
    doc.save(`invoice-${invoiceData.invoice_number}.pdf`);
  };

  const printInvoicePDF = async (invoiceData) => {
    const doc = await generateInvoicePDF(invoiceData);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    printWindow.onload = () => printWindow.print();
  };

  const shareInvoiceWhatsApp = (invoiceData) => {
    const customer = customers.find(c => c.id === invoiceData.customer);
    const text = `Invoice ${invoiceData.invoice_number} for ${customer?.name || 'Customer'} - Total: $${invoiceData.total_amount}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const shareInvoiceEmail = (invoiceData) => {
    const customer = customers.find(c => c.id === invoiceData.customer);
    const subject = `Invoice ${invoiceData.invoice_number} from ${businessProfile?.business_name || 'Business'}`;
    const body = `Dear ${customer?.name || 'Customer'},\n\nPlease find your invoice details:\n\nInvoice #: ${invoiceData.invoice_number}\nTotal Amount: $${invoiceData.total_amount}\nDue Date: ${new Date(invoiceData.due_date).toLocaleDateString()}\n\nBest regards,\n${businessProfile?.business_name || 'Business'}`;
    window.open(`mailto:${customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const deleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesAPI.delete(invoiceId);
        setInvoices(invoices.filter(inv => inv.id !== invoiceId));
        setToast({ message: 'Invoice deleted successfully', type: 'success' });
      } catch (error) {
        setToast({ message: 'Error deleting invoice', type: 'error' });
      }
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone_no.includes(customerSearch)
  );

  const getFilteredProducts = (searchTerm) => {
    if (!searchTerm) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_unique_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredInvoices = invoices.filter(inv => {
    const customer = customers.find(c => c.id === inv.customer);
    return customer?.name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
           inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase());
  });

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="invoice-generation">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <FaFileInvoice /> Invoice Generation
          </h1>
          <div className="invoice-actions">
            <button className="btn btn-info" onClick={viewInvoices}>
              <FaEye /> View Invoices
            </button>
            <button className="btn btn-success" onClick={generatePDF}>
              <FaFilePdf /> Generate PDF
            </button>
          </div>
        </div>
        
        <div className="card-content">
          <div className="invoice-form">
            <div className="invoice-header">
              <div className="form-group">
                <label className="form-label">Customer</label>
                <div className="searchable-dropdown">
                  <div className="search-input-container">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      className="form-input search-input"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                  </div>
                  {showCustomerDropdown && (
                    <div className="dropdown-list">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                          <div
                            key={customer.id}
                            className="dropdown-item"
                            onClick={() => {
                              setInvoice({...invoice, customer: customer.id});
                              setCustomerSearch(customer.name);
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <div className="item-name">{customer.name}</div>
                            <div className="item-details">{customer.phone_no}</div>
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-item no-results">No customers found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <div className="date-input-container">
                  <input
                    type="date"
                    className="form-input date-input"
                    value={invoice.due_date}
                    onChange={(e) => setInvoice({...invoice, due_date: e.target.value})}
                  />
                  <FaCalendarAlt 
                    className="calendar-icon" 
                    onClick={() => document.querySelector('.date-input').showPicker()}
                  />
                </div>
              </div>
            </div>
            
            <div className="invoice-items">
              <div className="items-header">
                <h3>Items</h3>
                <button className="btn btn-primary" onClick={addItem}>
                  <FaPlus /> Add Item
                </button>
              </div>
              
              <div className="items-table">
                <div className="table-header">
                  <div>Product</div>
                  <div>Quantity</div>
                  <div>Unit Price</div>
                  <div>Total</div>
                  <div>Action</div>
                </div>
                
                {invoice.items.map((item, index) => (
                  <div key={index} className="table-row">
                    <div>
                      <div className="searchable-dropdown">
                        <div className="search-input-container">
                          <FaSearch className="search-icon" />
                          <input
                            type="text"
                            className="form-input search-input"
                            placeholder="Search products..."
                            value={productSearches[index] || ''}
                            onChange={(e) => {
                              setProductSearches({...productSearches, [index]: e.target.value});
                              setShowProductDropdowns({...showProductDropdowns, [index]: true});
                            }}
                            onFocus={() => setShowProductDropdowns({...showProductDropdowns, [index]: true})}
                          />
                        </div>
                        {showProductDropdowns[index] && (
                          <div 
                            className="dropdown-list"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 9999
                            }}
                          >
                            {getFilteredProducts(productSearches[index]).length > 0 ? (
                              getFilteredProducts(productSearches[index]).map(product => (
                                <div
                                  key={product.id}
                                  className="dropdown-item"
                                  onClick={() => {
                                    updateItem(index, 'product', product.id);
                                    setProductSearches({...productSearches, [index]: product.name});
                                    setShowProductDropdowns({...showProductDropdowns, [index]: false});
                                  }}
                                >
                                  <div className="item-name">{product.name}</div>
                                  <div className="item-details">{product.product_unique_code} - ${product.default_sale_price}</div>
                                </div>
                              ))
                            ) : (
                              <div className="dropdown-item no-results">No products found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="item-total">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    <div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(index)}
                        disabled={invoice.items.length === 1}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="invoice-totals">
              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {businessProfile?.zimra_enabled && (
                  <div className="total-row">
                    <span>Tax ({businessProfile?.zimra_tax_rate || 15}%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows="3"
                value={invoice.notes}
                onChange={(e) => setInvoice({...invoice, notes: e.target.value})}
                placeholder="Additional notes or terms..."
              />
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-success btn-large" onClick={generatePDF}>
                <FaFileInvoice /> Generate Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showPdfModal && (
        <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div className="modal pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Generated Successfully</h2>
              <button className="modal-close" onClick={() => setShowPdfModal(false)}>
                ×
              </button>
            </div>
            <div className="pdf-actions">
              <button className="btn btn-primary" onClick={downloadPDF}>
                <FaDownload /> Download PDF
              </button>
              <button className="btn btn-secondary" onClick={printPDF}>
                <FaPrint /> Print
              </button>
              <button className="btn btn-success" onClick={shareWhatsApp}>
                <FaWhatsapp /> Share via WhatsApp
              </button>
              <button className="btn btn-warning" onClick={shareEmail}>
                <FaEnvelope /> Send via Email
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showInvoicesModal && (
        <div className="modal-overlay" onClick={() => {setShowInvoicesModal(false); setShowActionDropdown({});}}>
          <div className="modal invoices-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>All Invoices</h2>
              <button className="modal-close" onClick={() => setShowInvoicesModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  className="form-input search-input"
                  placeholder="Search invoices by customer name or invoice number..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </div>
              <div className="invoices-table">
                <div className="table-header">
                  <div>Invoice #</div>
                  <div>Customer</div>
                  <div>Date</div>
                  <div>Due Date</div>
                  <div>Total</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map(invoice => {
                    const customer = customers.find(c => c.id === invoice.customer);
                    return (
                      <div key={invoice.id} className="table-row">
                        <div>{invoice.invoice_number}</div>
                        <div>{customer?.name || 'Unknown'}</div>
                        <div>{new Date(invoice.created_at || invoice.issue_date).toLocaleDateString()}</div>
                        <div>{new Date(invoice.due_date).toLocaleDateString()}</div>
                        <div>${invoice.total_amount}</div>
                        <div className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</div>
                        <div className="actions-cell">
                          <div className="actions-dropdown">
                            <button 
                              className="actions-btn"
                              onClick={() => setShowActionDropdown({...showActionDropdown, [invoice.id]: !showActionDropdown[invoice.id]})}
                            >
                              <FaEllipsisV />
                            </button>
                            {showActionDropdown[invoice.id] && (
                              <div className="actions-menu">
                                <button onClick={() => downloadInvoicePDF(invoice)}>
                                  <FaDownload /> Download PDF
                                </button>
                                <button onClick={() => printInvoicePDF(invoice)}>
                                  <FaPrint /> Print
                                </button>
                                <button onClick={() => shareInvoiceWhatsApp(invoice)}>
                                  <FaWhatsapp /> Share via WhatsApp
                                </button>
                                <button onClick={() => shareInvoiceEmail(invoice)}>
                                  <FaEnvelope /> Send via Email
                                </button>
                                <button onClick={() => deleteInvoice(invoice.id)} className="delete-btn">
                                  <FaTrash /> Delete Invoice
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-results">No invoices found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceGeneration;