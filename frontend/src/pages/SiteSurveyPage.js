// Site Survey Management Module - Solar EPC Edition
// URL: http://localhost:8000/survey
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Calendar, CheckCircle, Clock, Search, Filter,
  Plus, Eye, Play, CheckSquare, Upload, X, ChevronLeft,
  ChevronRight, Building2, Home, Ruler, Sun, FileText,
  Image as ImageIcon, LayoutGrid, List, MoreVertical,
  ArrowRight, Trash2, Edit2, Download, Phone, Mail,
  User, HardHat, StickyNote, Compass, Layers, Zap,
  TrendingUp, TrendingDown, BarChart3, SunDim, PenTool
} from 'lucide-react';
import { format } from 'date-fns';
import { siteSurveysApi } from '../services/siteSurveysApi';
import { leadsApi } from '../services/leadsApi';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Textarea, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';

// ── Constants & Config ──────────────────────────────────────────────────────
const TABS = [
  { id: 'all', label: 'All Surveys', color: 'bg-gray-500', count: 0 },
  { id: 'pending', label: 'Pending', color: 'bg-amber-500', count: 0 },
  { id: 'active', label: 'Active', color: 'bg-blue-500', count: 0 },
  { id: 'complete', label: 'Complete', color: 'bg-emerald-500', count: 0 }
];

const ROOF_TYPES = [
  { id: 'metal_shed', label: 'Metal Shed' },
  { id: 'rcc', label: 'RCC' },
  { id: 'combination', label: 'Combination' }
];

const STRUCTURE_TYPES = [
  { id: 'aluminum_rail', label: 'Aluminum Rail' },
  { id: 'pre_fab', label: 'Pre-fab' },
  { id: 'welded', label: 'Welded' }
];

const STRUCTURE_HEIGHTS = [
  { id: '7ft', label: '7 Ft' },
  { id: '9ft', label: '9 Ft' },
  { id: '10ft', label: '10 Ft' }
];

const MODULE_TYPES = [
  { id: 'bifacial', label: 'Bifacial' },
  { id: 'topcon', label: 'Topcon' }
];

// ── Grid Drawing Canvas Component ────────────────────────────────────────────
const GridDrawingCanvas = ({ drawingData, onChange, readOnly = false }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState(drawingData?.lines || []);
  const [currentLine, setCurrentLine] = useState(null);
  const [dimensions, setDimensions] = useState(drawingData?.dimensions || []);
  const [textLabels, setTextLabels] = useState(drawingData?.textLabels || []);
  const [tool, setTool] = useState('line');
  const [inputText, setInputText] = useState('');
  const [inputPosition, setInputPosition] = useState(null);

  const GRID_SIZE = 20;
  const CANVAS_WIDTH = 560;
  const CANVAS_HEIGHT = 400;

  useEffect(() => {
    drawCanvas();
  }, [lines, currentLine, dimensions, textLabels]);

  useEffect(() => {
    if (onChange) {
      onChange({ lines, dimensions, textLabels });
    }
  }, [lines, dimensions, textLabels]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw stored lines
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    lines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.stroke();
      drawArrowhead(ctx, line.startX, line.startY, line.endX, line.endY);
    });

    if (currentLine) {
      ctx.beginPath();
      ctx.moveTo(currentLine.startX, currentLine.startY);
      ctx.lineTo(currentLine.endX, currentLine.endY);
      ctx.stroke();
      drawArrowhead(ctx, currentLine.startX, currentLine.startY, currentLine.endX, currentLine.endY);
    }

    // Draw dimensions
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px Arial';
    dimensions.forEach(dim => {
      ctx.fillText(dim.value, dim.x, dim.y);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dim.lineStartX, dim.lineStartY);
      ctx.lineTo(dim.lineEndX, dim.lineEndY);
      ctx.stroke();
    });

    // Draw text labels
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px Arial';
    textLabels.forEach(label => {
      ctx.fillText(label.text, label.x, label.y);
    });
  };

  const drawArrowhead = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 8;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const handleMouseDown = (e) => {
    if (readOnly) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left);
    const y = snapToGrid(e.clientY - rect.top);

    if (tool === 'line') {
      setIsDrawing(true);
      setCurrentLine({ startX: x, startY: y, endX: x, endY: y });
    } else if (tool === 'dimension') {
      setIsDrawing(true);
      setCurrentLine({ startX: x, startY: y, endX: x, endY: y, isDimension: true });
    } else if (tool === 'text') {
      setInputPosition({ x, y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentLine || readOnly) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left);
    const y = snapToGrid(e.clientY - rect.top);
    setCurrentLine({ ...currentLine, endX: x, endY: y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentLine || readOnly) return;

    if (currentLine.isDimension) {
      const length = Math.round(Math.sqrt(
        Math.pow(currentLine.endX - currentLine.startX, 2) +
        Math.pow(currentLine.endY - currentLine.startY, 2)
      ) / GRID_SIZE);

      setDimensions([...dimensions, {
        lineStartX: currentLine.startX,
        lineStartY: currentLine.startY,
        lineEndX: currentLine.endX,
        lineEndY: currentLine.endY,
        x: (currentLine.startX + currentLine.endX) / 2 - 10,
        y: (currentLine.startY + currentLine.endY) / 2 - 5,
        value: `${length}'`
      }]);
    } else {
      setLines([...lines, currentLine]);
    }

    setIsDrawing(false);
    setCurrentLine(null);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText && inputPosition) {
      setTextLabels([...textLabels, { text: inputText, x: inputPosition.x, y: inputPosition.y }]);
      setInputText('');
      setInputPosition(null);
    }
  };

  const clearCanvas = () => {
    setLines([]);
    setDimensions([]);
    setTextLabels([]);
  };

  if (readOnly) {
    return (
      <div className="border border-gray-400 bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="cursor-default block"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded p-1">
            <button
              onClick={() => setTool('line')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${tool === 'line' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
            >
              <Ruler size={14} className="inline mr-1" />
              Line
            </button>
            <button
              onClick={() => setTool('dimension')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${tool === 'dimension' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
            >
              <ArrowRight size={14} className="inline mr-1" />
              Dim
            </button>
            <button
              onClick={() => setTool('text')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${tool === 'text' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
            >
              <PenTool size={14} className="inline mr-1" />
              Text
            </button>
          </div>
          <button
            onClick={clearCanvas}
            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {inputPosition && (
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text..."
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            autoFocus
          />
          <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Add</button>
          <button type="button" onClick={() => setInputPosition(null)} className="px-2 py-1 text-gray-600 text-xs">Cancel</button>
        </form>
      )}

      <div className="border-2 border-gray-800 bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`${tool === 'text' ? 'cursor-text' : 'cursor-crosshair'} block`}
        />
      </div>
    </div>
  );
};
const SurveyStatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-300',
    active: 'bg-blue-100 text-blue-700 border-blue-300',
    complete: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  };

  const labels = {
    pending: 'Pending',
    active: 'Active',
    complete: 'Complete'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

// ── KPI Card Component ───────────────────────────────────────────────────────
const KPICard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

// ── Survey Card Component ────────────────────────────────────────────────────
const SurveyCard = ({ survey, onView, onStart, onComplete, onDelete }) => {
  return (
    <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center font-bold text-xs">
            {survey.clientName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-xs">{survey.clientName}</h4>
            <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
              <MapPin size={10} /> {survey.city}
            </p>
          </div>
        </div>
        <SurveyStatusBadge status={survey.status} />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2 text-[10px]">
        <div className="bg-gray-50 rounded p-1">
          <p className="text-gray-500">Capacity</p>
          <p className="font-semibold text-gray-900">{survey.projectCapacity}</p>
        </div>
        <div className="bg-gray-50 rounded p-1">
          <p className="text-gray-500">Engineer</p>
          <p className="font-semibold text-gray-900 truncate">{survey.engineer}</p>
        </div>
      </div>

      <div className="mb-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600 truncate">
        {survey.surveyId}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="text-[10px] text-gray-500">
          <Calendar size={10} className="inline mr-0.5" />
          {format(new Date(survey.createdAt), 'dd MMM')}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onView(survey)}
            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View"
          >
            <Eye size={14} />
          </button>

          {survey.status === 'pending' && (
            <button
              onClick={() => onStart(survey)}
              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors"
            >
              <Play size={12} />
              Start
            </button>
          )}

          {survey.status === 'active' && (
            <button
              onClick={() => onComplete(survey)}
              className="px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors"
            >
              <FileText size={12} />
              Fill
            </button>
          )}

          {survey.status === 'complete' && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium flex items-center gap-0.5">
              <CheckCircle size={12} />
              Done
            </span>
          )}

          <button
            onClick={() => onDelete(survey)}
            className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Pending to Active Assignment Modal (Simplified) ─────────────────────────────
const PendingToActiveModal = ({ isOpen, onClose, survey, onSubmit }) => {
  const [formData, setFormData] = useState({
    engineer: '',
    surveyDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    if (survey) {
      setFormData(prev => ({
        ...prev,
        engineer: survey.engineer || '',
        surveyDate: format(new Date(), 'yyyy-MM-dd')
      }));
    }
  }, [survey]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit({
      engineer: formData.engineer,
      solarConsultant: formData.engineer,
      scheduledDate: formData.surveyDate,
      notes: formData.notes,
      activeData: {
        assignedAt: new Date().toISOString(),
        scheduledDate: formData.surveyDate
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Assign Survey"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.engineer}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Play size={18} className="mr-2" /> Start Survey
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Lead Details Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <User size={16} /> Lead Details
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Client:</span>
              <p className="font-medium text-gray-900">{survey?.clientName}</p>
            </div>
            <div>
              <span className="text-gray-500">City:</span>
              <p className="font-medium text-gray-900">{survey?.city}</p>
            </div>
            <div>
              <span className="text-gray-500">Capacity:</span>
              <p className="font-medium text-gray-900">{survey?.projectCapacity || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Survey ID:</span>
              <p className="font-medium text-gray-900">{survey?.surveyId}</p>
            </div>
          </div>
        </div>

        {/* Assignment Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <HardHat size={14} className="inline mr-1" /> Assign Engineer *
            </label>
            <input
              type="text"
              value={formData.engineer}
              onChange={(e) => handleInputChange('engineer', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Enter engineer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={14} className="inline mr-1" /> Survey Date *
            </label>
            <input
              type="date"
              value={formData.surveyDate}
              onChange={(e) => handleInputChange('surveyDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText size={14} className="inline mr-1" /> Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Active to Complete Form Modal (Paper Form Style) ────────────────────────
const ActiveToCompleteModal = ({ isOpen, onClose, survey, onSubmit }) => {
  const [formData, setFormData] = useState({
    finalImages: [],
    finalNotes: '',
    engineerApproval: false,
    engineerName: '',
    completionDate: format(new Date(), 'yyyy-MM-dd'),
    panelPlacementDetails: '',
    finalDrawing: { lines: [], dimensions: [], textLabels: [] }
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (survey) {
      setFormData(prev => ({
        ...prev,
        engineerName: survey.solarConsultant || ''
      }));
    }
  }, [survey]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDrawingChange = (drawingData) => {
    setFormData(prev => ({ ...prev, finalDrawing: drawingData }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls = files.map(file => URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, finalImages: [...prev.finalImages, ...uploadedUrls] }));
      toast.success(`${files.length} images uploaded`);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      completeData: {
        ...formData,
        completionDate: new Date().toISOString()
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !formData.engineerApproval}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <CheckCircle size={18} className="mr-2" /> Complete Survey
          </Button>
        </div>
      }
    >
      <div className="bg-white p-6 max-h-[75vh] overflow-y-auto">
        {/* Paper Form Container */}
        <div className="border-2 border-gray-800 p-4 bg-white">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
                <SunDim size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-wide">GRANDO</h1>
                <p className="text-sm text-gray-600">SOLAR ENERGY</p>
              </div>
            </div>
            <div className="text-center flex-1">
              <h2 className="text-lg font-bold text-gray-900 border-2 border-gray-800 inline-block px-4 py-1">
                Survey Completion Form
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-700">Date: <span className="border-b border-gray-600 px-2">{format(new Date(), 'dd/MM/yy')}</span></p>
              <p className="text-xs text-gray-500 mt-1">Survey ID: {survey?.surveyId}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300">
            <p className="text-sm"><span className="font-semibold">Client:</span> {survey?.clientName} | <span className="font-semibold">City:</span> {survey?.city}</p>
            <p className="text-sm"><span className="font-semibold">Project Capacity:</span> {survey?.projectCapacity}</p>
          </div>

          {/* Final Roof Drawing */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Final Roof Layout Drawing:</p>
            <GridDrawingCanvas
              drawingData={formData.finalDrawing}
              onChange={handleDrawingChange}
            />
          </div>

          {/* Panel Placement Details */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Panel Placement Details:</p>
            <textarea
              value={formData.panelPlacementDetails}
              onChange={(e) => handleInputChange('panelPlacementDetails', e.target.value)}
              className="w-full border border-gray-400 p-2 text-sm focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="Describe panel placement, row spacing, access paths..."
            />
          </div>

          {/* Final Site Images */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Final Site Photos:</p>
            <div className="border-2 border-dashed border-gray-400 p-4 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="final-images-form"
              />
              <label htmlFor="final-images-form" className="cursor-pointer">
                <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">Upload final site images</p>
              </label>
            </div>
            {formData.finalImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {formData.finalImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square border border-gray-300">
                    <img src={img} alt={`Final ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, finalImages: prev.finalImages.filter((_, i) => i !== idx) }))}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final Notes */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Final Notes:</p>
            <textarea
              value={formData.finalNotes}
              onChange={(e) => handleInputChange('finalNotes', e.target.value)}
              className="w-full border border-gray-400 p-2 text-sm focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="Any final observations or recommendations..."
            />
          </div>

          {/* Engineer Approval Section */}
          <div className="border-t-2 border-gray-800 pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <HardHat size={18} />
              Engineer Approval
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Engineer Name:</span>
                <input
                  type="text"
                  value={formData.engineerName}
                  onChange={(e) => handleInputChange('engineerName', e.target.value)}
                  className="flex-1 border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter engineer name"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Completion Date:</span>
                <input
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => handleInputChange('completionDate', e.target.value)}
                  className="border border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Approval Checkbox */}
            <div className="p-3 border-2 border-gray-300 bg-gray-50">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`w-5 h-5 border-2 border-gray-600 flex items-center justify-center mt-0.5 ${formData.engineerApproval ? 'bg-emerald-600 border-emerald-600' : 'bg-white'}`}>
                  {formData.engineerApproval && <CheckCircle size={14} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.engineerApproval}
                  onChange={(e) => handleInputChange('engineerApproval', e.target.checked)}
                  className="hidden"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">I confirm that the survey is complete and accurate</p>
                  <p className="text-xs text-gray-500">All measurements verified and documented. Final approval required to complete survey.</p>
                </div>
              </label>
            </div>

            {/* Engineer Signature */}
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Engineer Signature:</span>
                <div className="flex-1 border-b-2 border-gray-800 h-8"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Survey Details View Modal (Paper Form Style) ─────────────────────────────
const SurveyDetailsModal = ({ isOpen, onClose, survey }) => {
  if (!survey) return null;

  const activeData = survey.activeData || {};
  const completeData = survey.completeData || {};
  const roofDrawing = activeData.roofDrawing || { lines: [], dimensions: [], textLabels: [] };

  const DisplayCheckboxGroup = ({ label, value, options }) => {
    const selectedOption = options.find(opt => opt.id === value);
    return (
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{label}</span>
        <div className="flex flex-wrap items-center gap-3">
          {options.map(opt => (
            <div key={opt.id} className="flex items-center gap-1">
              <div className={`w-4 h-4 border border-gray-500 flex items-center justify-center ${value === opt.id ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                {value === opt.id && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-gray-700">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="bg-white p-6 max-h-[75vh] overflow-y-auto">
        {/* Paper Form Container */}
        <div className="border-2 border-gray-800 p-4 bg-white">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
                <SunDim size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-wide">GRANDO</h1>
                <p className="text-sm text-gray-600">SOLAR ENERGY</p>
              </div>
            </div>
            <div className="text-center flex-1">
              <h2 className="text-lg font-bold text-gray-900 border-2 border-gray-800 inline-block px-4 py-1">
                Pre-Sales Site Assessment Form
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-700">
                Date: <span className="border-b border-gray-600 px-2">
                  {survey.createdAt ? format(new Date(survey.createdAt), 'dd/MM/yy') : '-'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Survey ID: {survey.surveyId}</p>
              <div className="mt-2">
                <SurveyStatusBadge status={survey.status} />
              </div>
            </div>
          </div>

          {/* Client Info Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Client Name/City:</span>
              <span className="flex-1 border-b border-gray-400 px-2 py-1 text-sm">{survey.clientName} / {survey.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Project Capacity:</span>
              <span className="w-32 border-b border-gray-400 px-2 py-1 text-sm">{survey.projectCapacity || '-'}</span>
            </div>
          </div>

          {/* Roof Type */}
          <div className="mb-3 border-b border-gray-300 pb-2">
            <DisplayCheckboxGroup label="Roof Type:" value={survey.roofType} options={ROOF_TYPES} />
          </div>

          {/* Structure Type */}
          <div className="mb-3 border-b border-gray-300 pb-2">
            <DisplayCheckboxGroup label="Structure Type:" value={survey.structureType} options={STRUCTURE_TYPES} />
          </div>

          {/* Structure Height */}
          <div className="mb-3 border-b border-gray-300 pb-2">
            <DisplayCheckboxGroup label="Structure Height:" value={survey.structureHeight} options={STRUCTURE_HEIGHTS} />
            {survey.customHeight && (
              <div className="flex items-center gap-2 ml-20 mt-1">
                <span className="text-sm text-gray-500">Custom Height:</span>
                <span className="border-b border-gray-400 px-2 py-0.5 text-sm">{survey.customHeight}</span>
              </div>
            )}
          </div>

          {/* Module */}
          <div className="mb-3 border-b border-gray-300 pb-2">
            <DisplayCheckboxGroup label="Module:" value={survey.moduleType} options={MODULE_TYPES} />
          </div>

          {/* Solar Consultant & Floors */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Solar Consultant Name:</span>
              <span className="flex-1 border-b border-gray-400 px-2 py-1 text-sm">{survey.solarConsultant || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Number of Floors:</span>
              <span className="w-16 border-b border-gray-400 px-2 py-1 text-sm text-center">{survey.floors || '-'}</span>
            </div>
          </div>

          {/* Client Signature */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Client Signature:</span>
              <div className="flex-1 border-b-2 border-gray-800 h-8"></div>
            </div>
          </div>

          {/* Roof Drawing Display */}
          {roofDrawing.lines?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Roof Layout Drawing:</p>
              <GridDrawingCanvas
                drawingData={roofDrawing}
                readOnly={true}
              />
            </div>
          )}

          {/* Site Images */}
          {activeData.siteImages?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Site Photos:</p>
              <div className="grid grid-cols-4 gap-2">
                {activeData.siteImages.map((img, idx) => (
                  <div key={idx} className="aspect-square border border-gray-300">
                    <img src={img} alt={`Site ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {survey.notes && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Additional Notes:</p>
              <div className="border border-gray-400 p-2 text-sm bg-gray-50">{survey.notes}</div>
            </div>
          )}

          {/* Completion Details (for completed surveys) */}
          {survey.status === 'complete' && completeData && (
            <div className="border-t-2 border-gray-800 pt-4 mt-4">
              <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                <CheckCircle size={18} />
                Completion Details
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Engineer Name:</span>
                  <span className="flex-1 border-b border-gray-400 px-2 py-1 text-sm">{completeData.engineerName || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Completion Date:</span>
                  <span className="border-b border-gray-400 px-2 py-1 text-sm">
                    {completeData.completionDate ? format(new Date(completeData.completionDate), 'dd/MM/yy') : '-'}
                  </span>
                </div>
              </div>

              {completeData.panelPlacementDetails && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-gray-700">Panel Placement:</span>
                  <div className="border border-gray-400 p-2 text-sm bg-gray-50 mt-1">{completeData.panelPlacementDetails}</div>
                </div>
              )}

              {completeData.finalNotes && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-gray-700">Final Notes:</span>
                  <div className="border border-gray-400 p-2 text-sm bg-gray-50 mt-1">{completeData.finalNotes}</div>
                </div>
              )}

              {completeData.finalImages?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Final Site Photos:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {completeData.finalImages.map((img, idx) => (
                      <div key={idx} className="aspect-square border border-gray-300">
                        <img src={img} alt={`Final ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completeData.engineerApproval && (
                <div className="p-3 border-2 border-emerald-300 bg-emerald-50 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Engineer Approved - Survey Complete</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ── Main Site Survey Page Component ────────────────────────────────────────────
const SiteSurveyPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, complete: 0 });

  // Modal States
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  // Fetch surveys
  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const status = activeTab === 'all' ? '' : activeTab;
      console.log('[SiteSurvey] Fetching surveys with status:', status);

      const response = await siteSurveysApi.getAll({
        status,
        search: searchQuery,
        limit: 100
      });

      console.log('[SiteSurvey] API Response:', response);
      console.log('[SiteSurvey] Response data:', response.data);

      const surveyData = response.data?.data || response.data || [];
      console.log('[SiteSurvey] Survey data extracted:', surveyData);
      console.log('[SiteSurvey] Survey count:', surveyData.length);

      setSurveys(surveyData);

      // Update stats
      const statsResponse = await siteSurveysApi.getStats();
      console.log('[SiteSurvey] Stats response:', statsResponse);

      const statsData = statsResponse.data || {};
      setStats({
        total: statsData.total || 0,
        pending: statsData.pending || 0,
        active: statsData.active || 0,
        complete: statsData.complete || 0
      });
    } catch (error) {
      console.error('[SiteSurvey] Failed to fetch surveys:', error);
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Handle move to active with form data
  const handleMoveToActive = async (formData) => {
    try {
      await siteSurveysApi.moveToActive(selectedSurvey._id || selectedSurvey.surveyId, formData);

      toast.success('Survey assigned and moved to Active');
      setPendingModalOpen(false);
      setSelectedSurvey(null);
      fetchSurveys();
    } catch (error) {
      console.error('Failed to move to active:', error);
      toast.error('Failed to update survey');
    }
  };

  // Handle move to complete
  const handleMoveToComplete = async (formData) => {
    try {
      await siteSurveysApi.moveToComplete(selectedSurvey._id || selectedSurvey.surveyId, formData);

      toast.success('Survey completed successfully');
      setCompleteModalOpen(false);
      setSelectedSurvey(null);
      fetchSurveys();
    } catch (error) {
      console.error('Failed to complete survey:', error);
      toast.error('Failed to complete survey');
    }
  };

  // Handle delete
  const handleDelete = async (survey) => {
    if (!window.confirm(`Delete survey for ${survey.clientName}?`)) return;

    try {
      await siteSurveysApi.delete(survey._id || survey.surveyId);
      toast.success('Survey deleted');
      fetchSurveys();
    } catch (error) {
      console.error('Failed to delete survey:', error);
      toast.error('Failed to delete survey');
    }
  };

  // Open modals
  const openPendingModal = (survey) => {
    setSelectedSurvey(survey);
    setPendingModalOpen(true);
  };

  const openCompleteModal = (survey) => {
    setSelectedSurvey(survey);
    setCompleteModalOpen(true);
  };

  const openDetailsModal = (survey) => {
    setSelectedSurvey(survey);
    setDetailsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Site Survey Management</h1>
        <p className="text-gray-500">Manage site surveys from lead to completion</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <KPICard
          label="Total Surveys"
          value={stats.total}
          icon={FileText}
          variant="indigo"
        />
        <KPICard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          variant="amber"
        />
        <KPICard
          label="Active"
          value={stats.active}
          icon={Play}
          variant="blue"
        />
        <KPICard
          label="Complete"
          value={stats.complete}
          icon={CheckCircle}
          variant="emerald"
        />
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {TABS.map(tab => {
              const count = tab.id === 'all' ? stats.total :
                tab.id === 'pending' ? stats.pending :
                  tab.id === 'active' ? stats.active : stats.complete;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white text-gray-900' : 'bg-gray-200 text-gray-700'
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Survey Grid */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading surveys...</p>
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No surveys found</p>
              <p className="text-sm text-gray-400">
                {activeTab === 'all'
                  ? 'Surveys will appear here when leads are moved to Site Survey stage'
                  : `No ${activeTab} surveys found`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {surveys.map(survey => (
                <SurveyCard
                  key={survey._id || survey.surveyId}
                  survey={survey}
                  onView={openDetailsModal}
                  onStart={openPendingModal}
                  onComplete={openCompleteModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PendingToActiveModal
        isOpen={pendingModalOpen}
        onClose={() => { setPendingModalOpen(false); setSelectedSurvey(null); }}
        survey={selectedSurvey}
        onSubmit={handleMoveToActive}
      />

      <ActiveToCompleteModal
        isOpen={completeModalOpen}
        onClose={() => { setCompleteModalOpen(false); setSelectedSurvey(null); }}
        survey={selectedSurvey}
        onSubmit={handleMoveToComplete}
      />

      <SurveyDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => { setDetailsModalOpen(false); setSelectedSurvey(null); }}
        survey={selectedSurvey}
      />
    </div>
  );
};

export default SiteSurveyPage;
