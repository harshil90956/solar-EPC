import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Type, Square, Circle, Triangle, Image as ImageIcon, Table, 
  MousePointer, Move, Trash2, Copy, AlignLeft, AlignCenter, 
  AlignRight, Bold, Italic, Underline, Palette, Grid3X3,
  Download, Save, Undo, Redo, ZoomIn, ZoomOut, RotateCcw,
  ChevronUp, ChevronDown, Eye, Lock, Unlock, Layers,
  Plus, Minus, Settings, FileText, Sparkles, Frame,
  TextCursor, Highlighter, StickyNote, Shapes, X
} from 'lucide-react';

// ── Canva-Style Visual Proposal Editor ─────────────────────────────────────
const ProposalCanvasEditor = ({ 
  initialData, 
  onSave, 
  onCancel,
  readOnly = false 
}) => {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [selectedElement, setSelectedElement] = useState(null);
  const [draggingElement, setDraggingElement] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeTool, setActiveTool] = useState('select');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showLayers, setShowLayers] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 794, height: 1124 }); // A4 size in pixels at 96 DPI

  // Canvas elements state with professional proposal template
  const [elements, setElements] = useState(initialData?.canvasElements || [
    // Header Background
    {
      id: 'header-bg',
      type: 'shape',
      x: 0,
      y: 0,
      width: 794,
      height: 130,
      shapeType: 'rectangle',
      style: {
        backgroundColor: '#006b6b',
        borderColor: 'transparent',
        borderWidth: 0
      },
      zIndex: 0
    },
    // Company Logo Area
    {
      id: 'company-name',
      type: 'text',
      x: 40,
      y: 25,
      width: 400,
      height: 35,
      content: '<div style="font-size: 26px; font-weight: 800; color: white; letter-spacing: -0.5px;">Sunvora Energy Pvt. Ltd.</div>',
      style: {
        fontSize: 26,
        fontWeight: '800',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'company-tagline',
      type: 'text',
      x: 40,
      y: 62,
      width: 400,
      height: 20,
      content: '<div style="font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Best Value & Quality Solar Solution</div>',
      style: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    // Proposal Number Box
    {
      id: 'proposal-box',
      type: 'shape',
      x: 580,
      y: 20,
      width: 190,
      height: 90,
      shapeType: 'rectangle',
      style: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.3)',
        borderWidth: 1,
        borderRadius: 8
      },
      zIndex: 1
    },
    {
      id: 'proposal-label',
      type: 'text',
      x: 590,
      y: 30,
      width: 170,
      height: 20,
      content: '<div style="font-size: 11px; color: rgba(255,255,255,0.8); text-align: center; letter-spacing: 2px;">PROPOSAL</div>',
      style: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 2
    },
    {
      id: 'proposal-number',
      type: 'text',
      x: 590,
      y: 55,
      width: 170,
      height: 30,
      content: `<div style="font-size: 22px; font-weight: 700; color: white; text-align: center;">${initialData?.proposalNumber || 'PROP-2026-0001'}</div>`,
      style: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 2
    },
    // Customer Section
    {
      id: 'to-label',
      type: 'text',
      x: 40,
      y: 155,
      width: 60,
      height: 20,
      content: '<div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">To:</div>',
      style: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'customer-name',
      type: 'text',
      x: 40,
      y: 175,
      width: 350,
      height: 30,
      content: `<div style="font-size: 18px; font-weight: 700; color: #1f2937;">${initialData?.customerName || 'Customer Name'}</div>`,
      style: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'customer-address',
      type: 'text',
      x: 40,
      y: 208,
      width: 350,
      height: 70,
      content: `<div style="font-size: 12px; color: #4b5563; line-height: 1.6;">${initialData?.projectLocation || 'Project Location Address'}<br><span style="color: #6b7280;">📧 ${initialData?.customerEmail || 'customer@email.com'}</span><br><span style="color: #6b7280;">📞 ${initialData?.customerPhone || '+91 9876543210'}</span></div>`,
      style: {
        fontSize: 12,
        color: '#4b5563',
        fontFamily: 'Inter, system-ui, sans-serif',
        lineHeight: 1.6
      },
      zIndex: 1
    },
    // Date Section (Right side)
    {
      id: 'date-box',
      type: 'shape',
      x: 580,
      y: 155,
      width: 190,
      height: 100,
      shapeType: 'rectangle',
      style: {
        backgroundColor: '#f9fafb',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 6
      },
      zIndex: 1
    },
    {
      id: 'date-content',
      type: 'text',
      x: 590,
      y: 165,
      width: 170,
      height: 80,
      content: `<div style="font-size: 12px; color: #374151; line-height: 2;">
        <div style="display: flex; justify-content: space-between;"><span style="color: #6b7280;">Date:</span> <strong>${new Date().toISOString().split('T')[0]}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #6b7280;">Valid Until:</span> <strong>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #6b7280;">Status:</span> <span style="color: #f59e0b; font-weight: 600;">DRAFT</span></div>
      </div>`,
      style: {
        fontSize: 12,
        color: '#374151',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 2
    },
    // Subject Section
    {
      id: 'subject-bg',
      type: 'shape',
      x: 40,
      y: 285,
      width: 730,
      height: 55,
      shapeType: 'rectangle',
      style: {
        backgroundColor: '#f3f4f6',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 6
      },
      zIndex: 1
    },
    {
      id: 'subject-label',
      type: 'text',
      x: 55,
      y: 295,
      width: 80,
      height: 20,
      content: '<div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Subject</div>',
      style: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 2
    },
    {
      id: 'subject-text',
      type: 'text',
      x: 55,
      y: 315,
      width: 700,
      height: 25,
      content: `<div style="font-size: 15px; font-weight: 600; color: #1f2937;">${initialData?.projectName || '5kW Solar Installation Proposal'}</div>`,
      style: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 2
    },
    // Services Section Header
    {
      id: 'services-header',
      type: 'text',
      x: 40,
      y: 365,
      width: 200,
      height: 30,
      content: '<div style="font-size: 20px; font-weight: 700; color: #059669;">Services Offered</div>',
      style: {
        fontSize: 20,
        fontWeight: '700',
        color: '#059669',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    // Services Table
    {
      id: 'services-table',
      type: 'table',
      x: 40,
      y: 405,
      width: 730,
      height: 220,
      rows: 5,
      cols: 5,
      headers: ['#', 'Item Description', 'Qty', 'Rate', 'Amount'],
      data: [
        ['1', 'Solar PV Module 550W - Bifacial TopCon', '8 nos', '₹35,000', '₹2,80,000'],
        ['2', 'Module Mounting Structure GI', '1 set', '₹45,000', '₹45,000'],
        ['3', 'Grid Tie Inverter 5kW with WiFi', '1 nos', '₹1,20,000', '₹1,20,000'],
        ['4', 'DC/AC Cables & Accessories', '1 set', '₹35,000', '₹35,000'],
        ['5', 'Installation & Commissioning', '1 job', '₹50,000', '₹50,000']
      ],
      style: {
        borderColor: '#d1d5db',
        borderWidth: 1,
        backgroundColor: 'white',
        headerBackground: '#f9fafb'
      },
      zIndex: 1
    },
    // Summary Section
    {
      id: 'summary-line',
      type: 'shape',
      x: 450,
      y: 640,
      width: 320,
      height: 1,
      shapeType: 'rectangle',
      style: {
        backgroundColor: '#e5e7eb',
        borderColor: 'transparent'
      },
      zIndex: 1
    },
    {
      id: 'subtotal-label',
      type: 'text',
      x: 450,
      y: 650,
      width: 200,
      height: 25,
      content: '<div style="font-size: 13px; color: #6b7280; text-align: right;">Subtotal</div>',
      style: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'right',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'subtotal-value',
      type: 'text',
      x: 670,
      y: 650,
      width: 100,
      height: 25,
      content: '<div style="font-size: 13px; color: #1f2937; text-align: right; font-weight: 600;">₹5,30,000</div>',
      style: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'right',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'gst-label',
      type: 'text',
      x: 450,
      y: 680,
      width: 200,
      height: 25,
      content: '<div style="font-size: 13px; color: #6b7280; text-align: right;">GST (18%)</div>',
      style: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'right',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'gst-value',
      type: 'text',
      x: 670,
      y: 680,
      width: 100,
      height: 25,
      content: '<div style="font-size: 13px; color: #1f2937; text-align: right; font-weight: 600;">₹95,400</div>',
      style: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'right',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'total-line',
      type: 'shape',
      x: 450,
      y: 715,
      width: 320,
      height: 2,
      shapeType: 'rectangle',
      style: {
        backgroundColor: '#059669',
        borderColor: 'transparent'
      },
      zIndex: 1
    },
    {
      id: 'total-label',
      type: 'text',
      x: 450,
      y: 725,
      width: 200,
      height: 30,
      content: '<div style="font-size: 16px; color: #1f2937; text-align: right; font-weight: 700;">Total Amount</div>',
      style: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'right',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'total-value',
      type: 'text',
      x: 670,
      y: 725,
      width: 100,
      height: 30,
      content: '<div style="font-size: 20px; color: #059669; text-align: right; font-weight: 800;">₹6,25,400</div>',
      style: {
        fontSize: 20,
        fontWeight: '800',
        color: '#059669',
        textAlign: 'right',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    // Terms Section
    {
      id: 'terms-header',
      type: 'text',
      x: 40,
      y: 780,
      width: 250,
      height: 25,
      content: '<div style="font-size: 14px; font-weight: 700; color: #1f2937; letter-spacing: -0.3px;">Terms & Conditions</div>',
      style: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1f2937',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    },
    {
      id: 'terms-content',
      type: 'text',
      x: 40,
      y: 810,
      width: 730,
      height: 120,
      content: '<div style="font-size: 11px; color: #6b7280; line-height: 1.8;">1. <strong>Payment Terms:</strong> 50% advance payment required before project commencement. Balance 50% on completion and commissioning.<br>2. <strong>Warranty:</strong> 5-year warranty on installation workmanship. 25 years performance warranty on solar panels.<br>3. <strong>Timeline:</strong> Project completion within 4-6 weeks from order confirmation.<br>4. <strong>Approvals:</strong> All government approvals and net metering charges are extra.<br>5. <strong>Validity:</strong> This proposal is valid for 30 days from the date of issue.</div>',
      style: {
        fontSize: 11,
        color: '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif',
        lineHeight: 1.8
      },
      zIndex: 1
    },
    // Footer
    {
      id: 'footer-line',
      type: 'shape',
      x: 40,
      y: 950,
      width: 730,
      height: 1,
      shapeType: 'rectangle',
      style: {
        backgroundColor: '#e5e7eb',
        borderColor: 'transparent'
      },
      zIndex: 0
    },
    {
      id: 'footer-text',
      type: 'text',
      x: 40,
      y: 965,
      width: 730,
      height: 50,
      content: '<div style="font-size: 10px; color: #9ca3af; text-align: center; line-height: 1.6;"><strong style="color: #6b7280;">Sunvora Energy Pvt. Ltd.</strong> | 104 to 1117, Millennium Business Hub-1, Surat, Gujarat - 395006<br>📞 +91 96380 00461 | ✉️ epc@sunvoraenergy.com | 🌐 www.sunvoraenergy.com</div>',
      style: {
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      zIndex: 1
    }
  ]);

  // Text formatting state with toggle support
  const [textFormat, setTextFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    highlight: null,
    color: '#1f2937',
    align: 'left',
    fontSize: 14
  });

  // Toggle text format
  const toggleTextFormat = (formatType) => {
    const newValue = !textFormat[formatType];
    setTextFormat(prev => ({ ...prev, [formatType]: newValue }));
    
    // Apply to selected element
    if (selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element?.type === 'text') {
        const updates = {};
        switch(formatType) {
          case 'bold':
            updates.fontWeight = newValue ? 'bold' : 'normal';
            break;
          case 'italic':
            updates.fontStyle = newValue ? 'italic' : 'normal';
            break;
          case 'underline':
            updates.textDecoration = newValue ? 'underline' : 'none';
            break;
        }
        updateElementStyle(selectedElement, updates);
      }
    }
  };

  // Save history for undo/redo
  const saveHistory = useCallback((newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newElements)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Add element
  const addElement = (type) => {
    const newElement = {
      id: `el-${Date.now()}`,
      type,
      x: 100,
      y: 100 + elements.length * 20,
      width: type === 'text' ? 300 : type === 'table' ? 600 : 150,
      height: type === 'text' ? 100 : type === 'table' ? 200 : 150,
      content: type === 'text' ? 'Double click to edit text' : '',
      style: {
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        color: '#1f2937',
        backgroundColor: type === 'shape' ? '#e5e7eb' : 'transparent',
        borderColor: type === 'table' ? '#d1d5db' : 'transparent',
        borderWidth: type === 'table' ? 1 : 0
      },
      zIndex: elements.length + 1
    };

    // Add table rows/cols if table
    if (type === 'table') {
      newElement.rows = 4;
      newElement.cols = 4;
      newElement.data = Array(4).fill(null).map(() => Array(4).fill(''));
      newElement.headers = ['Item', 'Description', 'Qty', 'Amount'];
    }

    // Add shape type if shape
    if (type === 'shape') {
      newElement.shapeType = 'rectangle';
    }

    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedElement(newElement.id);
    saveHistory(newElements);
  };

  // Delete element
  const deleteElement = (id) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    setSelectedElement(null);
    saveHistory(newElements);
  };

  // Duplicate element
  const duplicateElement = (id) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const newElement = {
        ...JSON.parse(JSON.stringify(element)),
        id: `el-${Date.now()}`,
        x: element.x + 20,
        y: element.y + 20,
        zIndex: elements.length + 1
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      setSelectedElement(newElement.id);
      saveHistory(newElements);
    }
  };

  // Update element
  const updateElement = (id, updates) => {
    const newElements = elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(newElements);
  };

  // Update element style
  const updateElementStyle = (id, styleUpdates) => {
    const newElements = elements.map(el => 
      el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
    );
    setElements(newElements);
  };

  // Mouse event handlers
  const handleMouseDown = (e, elementId) => {
    if (readOnly) return;
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setSelectedElement(elementId);
    setDraggingElement(elementId);
    setDragOffset({
      x: x - element.x,
      y: y - element.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingElement || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    let newX = x - dragOffset.x;
    let newY = y - dragOffset.y;

    // Snap to grid
    if (snapToGrid) {
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
    }

    // Constrain to canvas
    newX = Math.max(0, Math.min(newX, canvasSize.width - 50));
    newY = Math.max(0, Math.min(newY, canvasSize.height - 50));

    updateElement(draggingElement, { x: newX, y: newY });
  }, [draggingElement, dragOffset, scale, snapToGrid, canvasSize]);

  const handleMouseUp = () => {
    if (draggingElement) {
      saveHistory(elements);
    }
    setDraggingElement(null);
  };

  // Handle text edit
  const handleTextEdit = (id, newContent) => {
    updateElement(id, { content: newContent });
  };

  // Handle table cell edit
  const handleTableCellEdit = (elementId, row, col, value) => {
    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'table') {
      const newData = [...element.data];
      newData[row][col] = value;
      updateElement(elementId, { data: newData });
    }
  };

  // Apply text formatting
  const applyTextFormat = (format) => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (element?.type !== 'text') return;

    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      // Apply to selected text
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      
      if (format.bold) span.style.fontWeight = 'bold';
      if (format.italic) span.style.fontStyle = 'italic';
      if (format.underline) span.style.textDecoration = 'underline';
      if (format.highlight) span.style.backgroundColor = format.highlight;
      if (format.color) span.style.color = format.color;
      
      range.surroundContents(span);
    } else {
      // Apply to entire element
      updateElementStyle(selectedElement, {
        fontWeight: format.bold ? 'bold' : element.style.fontWeight,
        fontStyle: format.italic ? 'italic' : element.style.fontStyle,
        textDecoration: format.underline ? 'underline' : element.style.textDecoration,
        backgroundColor: format.highlight || element.style.backgroundColor,
        color: format.color || element.style.color,
        textAlign: format.align || element.style.textAlign,
        fontSize: format.fontSize || element.style.fontSize
      });
    }
  };

  // Bring to front / Send to back
  const changeZIndex = (id, direction) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;

    const newZIndex = direction === 'up' 
      ? Math.max(...elements.map(e => e.zIndex)) + 1
      : 1;
    
    updateElement(id, { zIndex: newZIndex });
    saveHistory(elements);
  };

  // Save canvas
  const handleSave = () => {
    const data = {
      canvasElements: elements,
      canvasSize,
      savedAt: new Date().toISOString()
    };
    onSave?.(data);
  };

  // Export as image (simplified - would need html2canvas in production)
  const handleExport = () => {
    alert('Export functionality would generate PDF/PNG from canvas');
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (draggingElement) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingElement, handleMouseMove]);

  // Initialize history
  useEffect(() => {
    if (history.length === 0 && elements.length > 0) {
      setHistory([JSON.parse(JSON.stringify(elements))]);
      setHistoryIndex(0);
    }
  }, []);

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Left Sidebar - Tools */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 shadow-sm z-20">
        <button
          onClick={() => setActiveTool('select')}
          className={`p-3 rounded-lg transition-colors ${
            activeTool === 'select' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title="Select"
        >
          <MousePointer size={20} />
        </button>
        
        <div className="w-8 h-px bg-gray-200 my-1" />
        
        <button
          onClick={() => addElement('text')}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Add Text"
        >
          <Type size={20} />
        </button>
        
        <button
          onClick={() => addElement('table')}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Add Table"
        >
          <Table size={20} />
        </button>
        
        <button
          onClick={() => addElement('image')}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Add Image"
        >
          <ImageIcon size={20} />
        </button>
        
        <button
          onClick={() => addElement('shape')}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Add Shape"
        >
          <Shapes size={20} />
        </button>
        
        <button
          onClick={() => addElement('sticky')}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Add Sticky Note"
        >
          <StickyNote size={20} />
        </button>
        
        <div className="w-8 h-px bg-gray-200 my-1" />
        
        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`p-3 rounded-lg transition-colors ${
            showLayers ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title="Layers"
        >
          <Layers size={20} />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {/* File Actions */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded hover:bg-white hover:shadow-sm disabled:opacity-30 text-gray-600 transition-all"
                title="Undo"
              >
                <Undo size={18} />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded hover:bg-white hover:shadow-sm disabled:opacity-30 text-gray-600 transition-all"
                title="Redo"
              >
                <Redo size={18} />
              </button>
            </div>

            <div className="w-px h-6 bg-gray-300" />

            {/* View Controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setScale(s => Math.max(0.25, s - 0.1))}
                className="p-2 rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all"
              >
                <Minus size={16} />
              </button>
              <span className="text-sm text-gray-600 w-14 text-center font-medium">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(3, s + 0.1))}
                className="p-2 rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="w-px h-6 bg-gray-300" />

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-all ${
                showGrid ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle Grid"
            >
              <Grid3X3 size={18} />
            </button>

            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded-lg transition-all ${
                snapToGrid ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Snap to Grid"
            >
              <Frame size={18} />
            </button>
          </div>

          {/* Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <h1 className="text-sm font-semibold text-gray-800">
              {initialData?.proposalNumber || 'New Proposal'}
            </h1>
            <p className="text-xs text-gray-500">Visual Proposal Designer</p>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>

        {/* Text Formatting Toolbar (shown when text selected) */}
        {selectedEl?.type === 'text' && !readOnly && (
          <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center gap-2 px-4">
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => toggleTextFormat('bold')}
                className={`p-1.5 rounded transition-all ${
                  textFormat.bold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Bold"
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => toggleTextFormat('italic')}
                className={`p-1.5 rounded transition-all ${
                  textFormat.italic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Italic"
              >
                <Italic size={16} />
              </button>
              <button
                onClick={() => toggleTextFormat('underline')}
                className={`p-1.5 rounded transition-all ${
                  textFormat.underline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Underline"
              >
                <Underline size={16} />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-300" />

            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => applyTextFormat({ align: 'left' })}
                className={`p-1.5 rounded transition-all ${
                  textFormat.align === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <AlignLeft size={16} />
              </button>
              <button
                onClick={() => applyTextFormat({ align: 'center' })}
                className={`p-1.5 rounded transition-all ${
                  textFormat.align === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <AlignCenter size={16} />
              </button>
              <button
                onClick={() => applyTextFormat({ align: 'right' })}
                className={`p-1.5 rounded transition-all ${
                  textFormat.align === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <AlignRight size={16} />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-300" />

            {/* Highlight Colors */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 px-2">Highlight:</span>
              <button
                onClick={() => applyTextFormat({ highlight: '#fef3c7' })}
                className="w-5 h-5 rounded bg-yellow-200 border border-gray-300 hover:scale-110 transition-transform"
                title="Yellow"
              />
              <button
                onClick={() => applyTextFormat({ highlight: '#dbeafe' })}
                className="w-5 h-5 rounded bg-blue-200 border border-gray-300 hover:scale-110 transition-transform"
                title="Blue"
              />
              <button
                onClick={() => applyTextFormat({ highlight: '#fce7f3' })}
                className="w-5 h-5 rounded bg-pink-200 border border-gray-300 hover:scale-110 transition-transform"
                title="Pink"
              />
              <button
                onClick={() => applyTextFormat({ highlight: '#d1fae5' })}
                className="w-5 h-5 rounded bg-green-200 border border-gray-300 hover:scale-110 transition-transform"
                title="Green"
              />
              <button
                onClick={() => applyTextFormat({ highlight: null })}
                className="w-5 h-5 rounded bg-white border border-gray-300 flex items-center justify-center hover:scale-110 transition-transform"
                title="None"
              >
                <X size={10} />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-300" />

            {/* Font Size */}
            <select
              onChange={(e) => applyTextFormat({ fontSize: parseInt(e.target.value) })}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white shadow-sm"
              defaultValue={14}
            >
              <option value="10">10px</option>
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
              <option value="24">24px</option>
              <option value="32">32px</option>
              <option value="48">48px</option>
            </select>

            {/* Text Color */}
            <input
              type="color"
              onChange={(e) => applyTextFormat({ color: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 shadow-sm"
              defaultValue="#1f2937"
              title="Text Color"
            />
          </div>
        )}

        {/* Canvas Container */}
        <div className="flex-1 overflow-auto bg-[#e5e7eb] p-8">
          <div
            ref={canvasRef}
            className="relative mx-auto bg-white"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              backgroundImage: showGrid 
                ? 'radial-gradient(circle, #d1d5db 1px, transparent 1px)' 
                : 'none',
              backgroundSize: '20px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
            onClick={(e) => {
              if (e.target === canvasRef.current) {
                setSelectedElement(null);
              }
            }}
          >
            {/* Render Elements */}
            {elements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(element => (
                <CanvasElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElement === element.id}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                  onUpdate={(updates) => updateElement(element.id, updates)}
                  onUpdateStyle={(style) => updateElementStyle(element.id, style)}
                  onDelete={() => deleteElement(element.id)}
                  onDuplicate={() => duplicateElement(element.id)}
                  readOnly={readOnly}
                />
              ))}

            {/* Selection Box */}
            {selectedEl && !readOnly && (
              <SelectionBox 
                element={selectedEl}
                onBringToFront={() => changeZIndex(selectedEl.id, 'up')}
                onSendToBack={() => changeZIndex(selectedEl.id, 'down')}
                onDelete={() => deleteElement(selectedEl.id)}
                onDuplicate={() => duplicateElement(selectedEl.id)}
              />
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="h-8 bg-white border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="font-medium">{elements.length} elements</span>
            <span>Canvas: {canvasSize.width} × {canvasSize.height}px</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{selectedElement ? `Selected: ${selectedEl?.type}` : 'No selection'}</span>
            {snapToGrid && <span className="text-blue-600 font-medium flex items-center gap-1"><Frame size={12}/> Snap ON</span>}
          </div>
        </div>
      </div>

      {/* Right Panel - Properties & Layers */}
      {showLayers && (
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm z-20">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Layers size={16} />
              Layers
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {elements
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((el, index) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElement(el.id)}
                  className={`p-3 border-b border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedElement === el.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    {el.type === 'text' && <Type size={14} className="text-gray-500" />}
                    {el.type === 'table' && <Table size={14} className="text-gray-500" />}
                    {el.type === 'image' && <ImageIcon size={14} className="text-gray-500" />}
                    {el.type === 'shape' && <Square size={14} className="text-gray-500" />}
                    {el.type === 'sticky' && <StickyNote size={14} className="text-yellow-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 font-medium block truncate capitalize">
                      {el.type} {index + 1}
                    </span>
                    <span className="text-xs text-gray-400">z-index: {el.zIndex}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        changeZIndex(el.id, 'up');
                      }}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        changeZIndex(el.id, 'down');
                      }}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Canvas Element Component ───────────────────────────────────────────────
const CanvasElement = ({ 
  element, 
  isSelected, 
  onMouseDown, 
  onUpdate, 
  onUpdateStyle,
  onDelete,
  onDuplicate,
  readOnly 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef(null);

  const handleDoubleClick = () => {
    if (element.type === 'text' && !readOnly) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (isEditing && contentRef.current) {
      onUpdate({ content: contentRef.current.innerHTML });
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && element.type === 'text') {
      e.preventDefault();
      handleBlur();
    }
  };

  // Render based on element type
  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            ref={contentRef}
            contentEditable={isEditing && !readOnly}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onDoubleClick={handleDoubleClick}
            dangerouslySetInnerHTML={{ __html: element.content }}
            className={`w-full h-full p-2 ${isEditing ? 'cursor-text' : 'cursor-move'}`}
            style={{
              fontSize: element.style?.fontSize || 14,
              fontWeight: element.style?.fontWeight || 'normal',
              fontStyle: element.style?.fontStyle || 'normal',
              textDecoration: element.style?.textDecoration || 'none',
              color: element.style?.color || '#1f2937',
              fontFamily: element.style?.fontFamily || 'Inter, sans-serif',
              textAlign: element.style?.textAlign || 'left',
              lineHeight: element.style?.lineHeight || 1.4,
              backgroundColor: element.style?.backgroundColor || 'transparent',
              outline: isEditing ? '2px solid #3b82f6' : 'none',
              overflow: 'hidden',
              wordWrap: 'break-word'
            }}
          />
        );

      case 'table':
        return (
          <div className="w-full h-full overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {element.headers?.map((header, i) => (
                    <th 
                      key={i}
                      className="border border-gray-300 p-2 text-sm font-semibold bg-gray-50 text-left"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {element.data?.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td 
                        key={colIndex}
                        className="border border-gray-300 p-2 text-sm"
                        contentEditable={!readOnly}
                        onBlur={(e) => {
                          const newData = [...element.data];
                          newData[rowIndex][colIndex] = e.target.innerText;
                          onUpdate({ data: newData });
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
            {element.content ? (
              <img 
                src={element.content} 
                alt="Canvas element"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center p-4">
                <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Double click to add image</p>
              </div>
            )}
          </div>
        );

      case 'shape':
        const shapeStyles = {
          rectangle: { borderRadius: 0 },
          circle: { borderRadius: '50%' },
          rounded: { borderRadius: 12 }
        };
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.style?.backgroundColor || '#e5e7eb',
              border: element.style?.borderWidth 
                ? `${element.style.borderWidth}px solid ${element.style.borderColor || '#9ca3af'}` 
                : 'none',
              ...shapeStyles[element.shapeType || 'rectangle']
            }}
          />
        );

      case 'sticky':
        return (
          <div 
            className="w-full h-full p-3 shadow-md"
            style={{
              backgroundColor: element.style?.backgroundColor || '#fef3c7',
              transform: 'rotate(-2deg)'
            }}
          >
            <div
              contentEditable={!readOnly}
              onBlur={(e) => onUpdate({ content: e.target.innerHTML })}
              dangerouslySetInnerHTML={{ __html: element.content }}
              className="w-full h-full text-sm"
              style={{ outline: 'none' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg z-50' : ''
      } ${readOnly ? 'pointer-events-none' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        cursor: isEditing ? 'text' : 'move'
      }}
      onMouseDown={onMouseDown}
    >
      {renderContent()}
    </div>
  );
};

// ── Selection Box Component ─────────────────────────────────────────────────
const SelectionBox = ({ 
  element, 
  onBringToFront, 
  onSendToBack, 
  onDelete, 
  onDuplicate 
}) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: element.x - 2,
        top: element.y - 2,
        width: element.width + 4,
        height: element.height + 4,
        zIndex: 9999
      }}
    >
      {/* Selection border */}
      <div className="absolute inset-0 border-2 border-blue-500" />
      
      {/* Resize handles */}
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />
      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-sm" />

      {/* Action buttons */}
      <div className="absolute -top-10 left-0 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 pointer-events-auto">
        <button
          onClick={onBringToFront}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
          title="Bring to front"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={onSendToBack}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
          title="Send to back"
        >
          <ChevronDown size={16} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={onDuplicate}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
          title="Duplicate"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default ProposalCanvasEditor;
