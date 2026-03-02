

// ─── TYPE IDENTIFIERS ────────────────────────────────────────────────────────
export const PROJECT_TYPES = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
};

// ─── MASTER DEFAULTS  ────────────────────────────────────────────────────────
// These are the hard-coded factory defaults. Admin overrides are stored
// separately in SettingsContext and merged at runtime.
export const PROJECT_TYPE_DEFAULTS = {
    [PROJECT_TYPES.RESIDENTIAL]: {
        id: PROJECT_TYPES.RESIDENTIAL,
        label: 'Residential',
        shortLabel: 'Residential',
        description: 'Rooftop systems for homes — up to 10 kW, simple grid layout.',
        icon: 'Home',
        color: '#f59e0b',        // amber
        bg: 'rgba(245,158,11,0.10)',
        border: 'rgba(245,158,11,0.25)',

        // ── Design rules ──────────────────────────────────────────────────
        capacityMin: 1,              // kW
        capacityMax: 10,             // kW hard cap
        capacityStep: 1,              // kW step in selector
        panelSpacing: 0.02,           // metres between panels (tight)
        rowSpacing: 2.0,            // metres between rows
        tiltAngle: 20,             // °
        azimuth: 180,            // ° (south-facing)
        dcAcRatio: 1.10,
        prTarget: 77,             // Performance Ratio %
        layoutDensity: 'tight',        // tight | medium | wide
        gridPattern: 'portrait',     // portrait | landscape | east-west
        shadowPriority: 'low',         // low | medium | high
        maintenanceAccess: 'minimal',

        // ── Pricing rules ─────────────────────────────────────────────────
        ratePerWp: 42,            // ₹/Wp all-in
        subsidyPct: 40,            // PM-KUSUM default %
        subsidyLabel: 'PM-KUSUM Scheme (40%)',
        gstPct: 5,             // GST %
        financeRate: 7.5,           // % p.a.
        emiMonthsDefault: 60,
        downPaymentPct: 20,

        // ── Financial engine ──────────────────────────────────────────────
        financialMode: 'payback',     // payback | roi | irr
        tariff: 6.5,           // ₹/kWh residential average
        irradiance: 1380,          // kWh/kWp/year
        degradation: 0.5,           // %/year
        omCostPerKwh: 0.15,          // ₹/kWh
        projectLife: 25,            // years
        inflationRate: 5,             // % p.a.
        depreciationPct: 0,            // % (no accelerated depreciation for residential)
        corporateTaxPct: 0,

        // ── AI behaviour ──────────────────────────────────────────────────
        aiObjective: 'cost',        // cost | roi | efficiency
        aiObjectiveLabel: 'Cost Optimisation',
        aiObjectiveDesc: 'Minimise CAPEX and maximise subsidy capture. Simple payback period is the primary metric.',

        // ── Panel models recommended ──────────────────────────────────────
        recommendedPanels: ['400W Mono PERC', '440W Half-Cut Mono'],
        recommendedInverters: ['5kW String Inverter', '10kW String Inverter'],
    },

    [PROJECT_TYPES.COMMERCIAL]: {
        id: PROJECT_TYPES.COMMERCIAL,
        label: 'Commercial',
        shortLabel: 'Commercial',
        description: 'Rooftop / carport for offices & retail — 10 kW to 100 kW.',
        icon: 'Building2',
        color: '#3b82f6',        // blue
        bg: 'rgba(59,130,246,0.10)',
        border: 'rgba(59,130,246,0.25)',

        // ── Design rules ──────────────────────────────────────────────────
        capacityMin: 10,
        capacityMax: 100,
        capacityStep: 5,
        panelSpacing: 0.03,
        rowSpacing: 2.5,
        tiltAngle: 22,
        azimuth: 180,
        dcAcRatio: 1.12,
        prTarget: 79,
        layoutDensity: 'medium',
        gridPattern: 'portrait',
        shadowPriority: 'medium',
        maintenanceAccess: 'standard',

        // ── Pricing rules ─────────────────────────────────────────────────
        ratePerWp: 45,
        subsidyPct: 20,
        subsidyLabel: 'DISCOM Net Metering (20%)',
        gstPct: 12,
        financeRate: 8.5,
        emiMonthsDefault: 48,
        downPaymentPct: 30,

        // ── Financial engine ──────────────────────────────────────────────
        financialMode: 'roi',
        tariff: 8.0,
        irradiance: 1400,
        degradation: 0.5,
        omCostPerKwh: 0.20,
        projectLife: 25,
        inflationRate: 5,
        depreciationPct: 40,           // 40% accelerated depreciation Y1
        corporateTaxPct: 25,

        // ── AI behaviour ──────────────────────────────────────────────────
        aiObjective: 'roi',
        aiObjectiveLabel: 'ROI Optimisation',
        aiObjectiveDesc: 'Maximise return on investment. Prioritise tax depreciation, net metering credits, and ROI per sqft.',

        // ── Panel models recommended ──────────────────────────────────────
        recommendedPanels: ['440W Bifacial Half-Cut', '440W Mono PERC', '545W TOPCon Bifacial'],
        recommendedInverters: ['50kW SMA String Inverter', '60kW Sungrow String Inverter'],
    },

    [PROJECT_TYPES.INDUSTRIAL]: {
        id: PROJECT_TYPES.INDUSTRIAL,
        label: 'Industrial',
        shortLabel: 'Industrial',
        description: 'Large ground mount / shed roof — 100 kW and above.',
        icon: 'Factory',
        color: '#22c55e',        // green
        bg: 'rgba(34,197,94,0.10)',
        border: 'rgba(34,197,94,0.25)',

        // ── Design rules ──────────────────────────────────────────────────
        capacityMin: 100,
        capacityMax: 10000,
        capacityStep: 50,
        panelSpacing: 0.05,           // wide — maintenance gang-way
        rowSpacing: 3.5,
        tiltAngle: 25,
        azimuth: 180,
        dcAcRatio: 1.15,
        prTarget: 81,
        layoutDensity: 'wide',
        gridPattern: 'landscape',
        shadowPriority: 'high',        // shadow optimisation is priority
        maintenanceAccess: 'full',     // 1m maintenance corridor between rows

        // ── Pricing rules ─────────────────────────────────────────────────
        ratePerWp: 38,            // economy of scale
        subsidyPct: 0,
        subsidyLabel: 'No Direct Subsidy (REWA / captive)',
        gstPct: 12,
        financeRate: 9.0,
        emiMonthsDefault: 60,
        downPaymentPct: 20,

        // ── Financial engine ──────────────────────────────────────────────
        financialMode: 'irr',
        tariff: 8.5,
        irradiance: 1420,
        degradation: 0.45,
        omCostPerKwh: 0.25,
        projectLife: 25,
        inflationRate: 5,
        depreciationPct: 40,
        corporateTaxPct: 30,

        // ── AI behaviour ──────────────────────────────────────────────────
        aiObjective: 'efficiency',
        aiObjectiveLabel: 'Efficiency & Performance Optimisation',
        aiObjectiveDesc: 'Maximise energy yield per hectare. Shadow analysis and inter-row spacing optimisation are primary drivers. IRR and depreciation benefits are secondary.',

        // ── Panel models recommended ──────────────────────────────────────
        recommendedPanels: ['545W TOPCon Bifacial', '550W HJT Bifacial', '440W Bifacial Half-Cut'],
        recommendedInverters: ['100kW Growatt Central', '110kW Sungrow Central', '50kW Huawei Smart String ×N'],
    },
};

// ─── ORDERED LIST for UI loops ────────────────────────────────────────────────
export const PROJECT_TYPE_LIST = [
    PROJECT_TYPE_DEFAULTS[PROJECT_TYPES.RESIDENTIAL],
    PROJECT_TYPE_DEFAULTS[PROJECT_TYPES.COMMERCIAL],
    PROJECT_TYPE_DEFAULTS[PROJECT_TYPES.INDUSTRIAL],
];

// ─── FINANCIAL ENGINE ─────────────────────────────────────────────────────────
/**
 * computeFinancials(cfg, systemSizeKw)
 * Returns a rich object used by the Design Studio financial panel.
 * cfg = merged project type config (defaults + admin overrides)
 */
export const computeFinancials = (cfg, systemSizeKw) => {
    const kw = parseFloat(systemSizeKw) || 0;
    const kwp = kw * cfg.dcAcRatio;

    // Energy
    const annualGen = Math.round(kw * cfg.irradiance * (cfg.prTarget / 100));          // kWh/yr
    const annualSave = Math.round(annualGen * cfg.tariff);

    // CAPEX
    const capex = Math.round(kwp * 1000 * cfg.ratePerWp);                           // ₹
    const subsidyAmt = cfg.subsidyPct > 0 ? Math.round(capex * cfg.subsidyPct / 100) : 0;
    const netCapex = capex - subsidyAmt;
    const gstAmt = Math.round(capex * cfg.gstPct / 100);

    // Simple payback
    const payback = annualSave > 0 ? (netCapex / annualSave).toFixed(1) : '—';

    // ROI (year 1 net)
    const year1NetSave = annualSave - Math.round(annualGen * cfg.omCostPerKwh);
    const roi1 = netCapex > 0 ? ((year1NetSave / netCapex) * 100).toFixed(1) : '—';

    // IRR approximation (simplified NPV iteration)
    let irr25 = null;
    if (netCapex > 0 && annualSave > 0) {
        let lo = 0, hi = 100, mid;
        for (let i = 0; i < 50; i++) {
            mid = (lo + hi) / 2;
            const r = mid / 100;
            let npv = -netCapex;
            let annSave = annualSave;
            for (let y = 1; y <= cfg.projectLife; y++) {
                annSave *= (1 - cfg.degradation / 100);
                const inflated = annSave * Math.pow(1 + cfg.inflationRate / 100, y);
                npv += (inflated - annualGen * cfg.omCostPerKwh) / Math.pow(1 + r, y);
            }
            if (npv > 0) lo = mid; else hi = mid;
        }
        irr25 = mid.toFixed(1);
    }

    // Depreciation benefit (Y1)
    const depBenefit = cfg.depreciationPct > 0
        ? Math.round(capex * (cfg.depreciationPct / 100) * (cfg.corporateTaxPct / 100))
        : 0;

    // EMI
    const financed = Math.round(netCapex * (1 - cfg.downPaymentPct / 100));
    const r = cfg.financeRate / 100 / 12;
    const n = cfg.emiMonthsDefault;
    const emi = financed > 0 && r > 0
        ? Math.round((financed * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
        : 0;

    // CO₂
    const co2Saved = Math.round(annualGen * 0.82 / 1000);                              // tonnes/yr

    return {
        kw, kwp: kwp.toFixed(1),
        annualGen, annualSave,
        capex, subsidyAmt, netCapex, gstAmt,
        payback, roi1, irr25,
        depBenefit,
        financed, emi, emiMonths: n,
        co2Saved,
        year1NetSave,
    };
};

// ─── PANEL GRID GENERATOR ────────────────────────────────────────────────────
/**
 * generatePanelGrid(cfg, roofWidthM, roofLengthM)
 * Returns a grid descriptor used by the 2D layout visualiser.
 */
export const generatePanelGrid = (cfg, roofWidthM = 20, roofLengthM = 30) => {
    const panelW = cfg.gridPattern === 'landscape' ? 2.0 : 1.0;  // metres
    const panelH = cfg.gridPattern === 'landscape' ? 1.0 : 2.0;

    const colStep = panelW + cfg.panelSpacing;
    const rowStep = panelH + cfg.rowSpacing;

    const cols = Math.floor(roofWidthM / colStep);
    const rows = Math.floor(roofLengthM / rowStep);

    const totalPanels = cols * rows;
    const coverageRatio = ((cols * panelW * rows * panelH) / (roofWidthM * roofLengthM) * 100).toFixed(1);

    return {
        cols, rows, totalPanels,
        panelW, panelH, colStep, rowStep,
        coverageRatio,
        roofWidth: roofWidthM,
        roofLength: roofLengthM,
        density: cfg.layoutDensity,
    };
};

// ─── ADMIN-EDITABLE FIELDS SPEC ──────────────────────────────────────────────
// Drives the SettingsPage admin UI — each field gets a label, type, unit, and bounds.
export const ADMIN_EDITABLE_FIELDS = [
    { key: 'capacityMax', label: 'Max Capacity', type: 'number', unit: 'kW', min: 1, max: 10000 },
    { key: 'panelSpacing', label: 'Panel Spacing', type: 'number', unit: 'm', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'rowSpacing', label: 'Row Spacing', type: 'number', unit: 'm', min: 0.5, max: 10, step: 0.1 },
    { key: 'tiltAngle', label: 'Default Tilt Angle', type: 'number', unit: '°', min: 0, max: 45 },
    { key: 'dcAcRatio', label: 'DC/AC Ratio', type: 'number', unit: '', min: 1.0, max: 1.5, step: 0.01 },
    { key: 'prTarget', label: 'PR Target', type: 'number', unit: '%', min: 60, max: 95 },
    { key: 'ratePerWp', label: 'Rate per Wp (₹)', type: 'number', unit: '₹/Wp', min: 10, max: 200 },
    { key: 'subsidyPct', label: 'Subsidy %', type: 'number', unit: '%', min: 0, max: 80 },
    { key: 'gstPct', label: 'GST %', type: 'number', unit: '%', min: 0, max: 28 },
    { key: 'financeRate', label: 'Finance Rate', type: 'number', unit: '% p.a.', min: 0, max: 30, step: 0.1 },
    { key: 'tariff', label: 'Electricity Tariff', type: 'number', unit: '₹/kWh', min: 1, max: 20, step: 0.1 },
    { key: 'irradiance', label: 'Irradiance', type: 'number', unit: 'kWh/kWp/yr', min: 800, max: 2500 },
    { key: 'degradation', label: 'Panel Degradation', type: 'number', unit: '%/yr', min: 0, max: 2, step: 0.05 },
    { key: 'depreciationPct', label: 'Accelerated Depreciation', type: 'number', unit: '%', min: 0, max: 100 },
    { key: 'corporateTaxPct', label: 'Corporate Tax Rate', type: 'number', unit: '%', min: 0, max: 50 },
    { key: 'omCostPerKwh', label: 'O&M Cost', type: 'number', unit: '₹/kWh', min: 0, max: 2, step: 0.01 },
];
