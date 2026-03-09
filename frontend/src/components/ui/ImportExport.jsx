


import React, { useState } from 'react';
import { Download, Upload, Check, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Modal } from './Modal';

const ImportExport = ({ moduleName, fields = [], onImport, onExport, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Select/Download, 2: Mapping, 3: Preview/Validate
    const [file, setFile] = useState(null);
    const [mapping, setMapping] = useState({});
    const [parsedData, setParsedData] = useState([]);
    const [validationResults, setValidationResults] = useState({ valid: 0, errors: [] });
    const [isValidating, setIsValidating] = useState(false);

    const reset = () => {
        setStep(1);
        setFile(null);
        setMapping({});
        setParsedData([]);
        setValidationResults({ valid: 0, errors: [] });
    };

    const handleOpen = () => {
        console.log('[ImportExport] Opening modal');
        setIsOpen(true);
    };

    const handleClose = () => {
        console.log('[ImportExport] Closing modal');
        setIsOpen(false);
        reset();
    };

    // Filter out empty rows from parsed data
    const filterValidRows = (rows) => {
        return rows.filter(row => {
            return Object.values(row).some(value => {
                if (value === null || value === undefined || value === '') return false;
                const trimmed = String(value).trim();
                // Skip formatting artifacts
                if (trimmed === '' || trimmed === '######' || trimmed === 'NaN' || 
                    trimmed === 'undefined' || trimmed === 'null') return false;
                return true;
            });
        });
    };

    // Validate data when moving to step 3
    const handleValidate = async () => {
        if (!file) return;
        
        setIsValidating(true);
        try {
            const Papa = await import('papaparse');
            const text = await file.text();
            
            const { data } = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });
            
            // Filter out empty rows
            const cleanedRows = filterValidRows(data);
            console.log('[ImportExport] Parsed rows:', data.length, 'Valid rows:', cleanedRows.length);
            
            setParsedData(cleanedRows);
            
            // Simple validation - count rows with at least one field mapped
            let validCount = 0;
            let errorCount = 0;
            const errors = [];
            
            cleanedRows.forEach((row, index) => {
                const hasData = Object.values(row).some(v => v && String(v).trim() !== '');
                if (hasData) {
                    validCount++;
                } else {
                    errorCount++;
                    errors.push({ row: index + 1, message: 'Empty row' });
                }
            });
            
            setValidationResults({ valid: validCount, errors });
            setStep(3);
        } catch (error) {
            console.error('[ImportExport] Validation error:', error);
            alert('Error validating file: ' + error.message);
        } finally {
            setIsValidating(false);
        }
    };

    const handleFileSelect = (e) => {
        console.log('[ImportExport] File selected:', e.target.files);
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setStep(2);
            // Auto-map based on headers (mock logic)
            const initialMapping = {};
            fields.forEach(field => initialMapping[field.id] = field.id);
            setMapping(initialMapping);
        }
    };

    const handleDownloadTemplate = () => {
        console.log('[ImportExport] Downloading template');
        // Generate CSV template based on fields
        const headers = fields.map(f => f.label).join(',');
        const sampleRow = fields.map(f => {
            if (f.id === 'firstName') return 'John';
            if (f.id === 'lastName') return 'Doe';
            if (f.id === 'email') return 'john@example.com';
            if (f.id === 'phone') return '9876543210';
            if (f.id === 'company') return 'ABC Corp';
            if (f.id === 'source') return 'Website';
            if (f.id === 'city') return 'Mumbai';
            if (f.id === 'value') return '500000';
            if (f.id === 'statusKey') return 'new';
            return '';
        }).join(',');
        
        const csvContent = [headers, sampleRow].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${moduleName.toLowerCase()}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        console.log('[ImportExport] Import button clicked', { file, mapping });
        if (!file) {
            alert('Please select a file first');
            return;
        }
        if (onImport) {
            onImport({ file, mapping });
        } else {
            console.error('[ImportExport] onImport prop is not defined');
            alert('Import function not available');
        }
        handleClose();
    };

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Button variant="outline" size="sm" onClick={() => onExport?.('csv')}>
                <Download size={14} /> Export CSV
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpen}
                type="button"
            >
                <Upload size={14} /> Import
            </Button>

            <Modal
                open={isOpen}
                onClose={handleClose}
                title={`Import ${moduleName} Data`}
                size="lg"
            >
                <div className="space-y-6">
                    {/* Stepper */}
                    <div className="flex items-center justify-between px-10">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                                    step >= s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-faint)] border border-[var(--border-base)]'
                                )}>
                                    {step > s ? <Check size={14} /> : s}
                                </div>
                                {s < 3 && <div className={cn('h-0.5 w-16', step > s ? 'bg-[var(--primary)]' : 'bg-[var(--border-base)]')} />}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-4 py-4 text-center">
                            <div className="glass-card p-8 border-dashed border-2 flex flex-col items-center gap-4 hover:border-[var(--primary)] transition-colors cursor-pointer group" onClick={() => document.getElementById('import-file').click()}>
                                <input type="file" id="import-file" className="hidden" accept=".csv,.json,.xlsx,.xls" onChange={handleFileSelect} />
                                <div className="p-4 rounded-full bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                                    <FileText size={32} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">Click to upload or drag and drop</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Accepts CSV or JSON files (Max 5MB)</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[var(--primary)]" onClick={handleDownloadTemplate}>
                                <Download size={14} /> Download {moduleName} Template
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">Map CSV Columns</h3>
                                <p className="text-xs text-[var(--text-muted)]">File: {file?.name}</p>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {fields.map(field => (
                                    <div key={field.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-[var(--text-primary)]">{field.label}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">{field.required ? 'Required' : 'Optional'}</p>
                                        </div>
                                        <ChevronRight size={14} className="text-[var(--text-faint)]" />
                                        <select
                                            value={mapping[field.id] || ''}
                                            onChange={e => setMapping({ ...mapping, [field.id]: e.target.value })}
                                            className="w-48 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value="">Don't Import</option>
                                            <option value={field.id}>{field.id} (Header Match)</option>
                                            <option value="col_1">Column A</option>
                                            <option value="col_2">Column B</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={handleValidate} disabled={isValidating}>
                                    {isValidating ? 'Validating...' : 'Validate Data'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-500">Validation Results</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        We found {validationResults.valid} valid rows {validationResults.errors.length > 0 && `and ${validationResults.errors.length} rows with errors`}. You can proceed with import.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[var(--border-base)] overflow-hidden bg-[var(--bg-elevated)]">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-[var(--bg-raised)] border-b border-[var(--border-base)] text-[var(--text-faint)] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3">Row</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Validation Message</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-base)]">
                                        {validationResults.valid > 0 && (
                                            <tr className="text-emerald-400">
                                                <td className="p-3">1-{validationResults.valid}</td>
                                                <td className="p-3 font-bold">Valid</td>
                                                <td className="p-3">Ready for import</td>
                                            </tr>
                                        )}
                                        {validationResults.errors.map((error, idx) => (
                                            <tr key={idx} className="text-red-400 bg-red-500/5">
                                                <td className="p-3">{error.row}</td>
                                                <td className="p-3 font-bold">Error</td>
                                                <td className="p-3">{error.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                                <Button onClick={handleImportClick} type="button" disabled={validationResults.valid === 0}>
                                    Import {validationResults.valid} Valid Rows
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ImportExport;
