/**
 * UI Controller - DOM binding, comparative rendering & real-time layouts for Pricing Calculator
 */

import { calculatePricing } from './calculator.js';
import * as history from './history.js';

// DOM elements cache
const el = {
    // Current Form Inputs
    projectDate: document.getElementById('project-date'),
    projectName: document.getElementById('project-name'),
    projectDetail: document.getElementById('project-detail'),
    projectUrl1: document.getElementById('project-url-1'),
    projectUrl2: document.getElementById('project-url-2'),
    projectUrl3: document.getElementById('project-url-3'),
    btnVisitUrl1: document.getElementById('btn-visit-url-1'),
    btnVisitUrl2: document.getElementById('btn-visit-url-2'),
    btnVisitUrl3: document.getElementById('btn-visit-url-3'),
    
    exw: document.getElementById('input-exw'),
    exc: document.getElementById('input-exc'),
    quantity: document.getElementById('input-quantity'),
    basePrice: document.getElementById('input-base-price'),
    
    shipping: document.getElementById('input-shipping'),
    packing: document.getElementById('input-packing'),
    gp: document.getElementById('input-gp'),
    
    calcForm: document.getElementById('calc-form'),
    
    // Live Outputs
    outTotalCost: document.getElementById('out-total-cost'),
    outCostPerUnit: document.getElementById('out-cost-per-unit'),
    outTotalSea: document.getElementById('out-total-sea'),
    outSubSeaUnit: document.getElementById('out-sub-sea-unit'),
    outTotalDom: document.getElementById('out-total-dom'),
    outSubDomUnit: document.getElementById('out-sub-dom-unit'),
    outTotalProfit: document.getElementById('out-total-profit'),
    outProfitPerUnit: document.getElementById('out-profit-per-unit'),
    outPricePerUnit: document.getElementById('out-price-per-unit'),
    
    // Actions
    btnSave: document.getElementById('btn-save-project'),
    btnReset: document.getElementById('btn-reset-form'),
    btnToggleHistory: document.getElementById('btn-toggle-history'),
    btnDownload: document.getElementById('btn-download-report'),
    btnDownloadComp: document.getElementById('btn-download-comp-report'),
    
    // History Deck Panel
    historyDeck: document.getElementById('history-deck'),
    projectCount: document.getElementById('project-count'),
    searchInput: document.getElementById('search-input'),
    projectList: document.getElementById('project-list'),
    btnExport: document.getElementById('btn-export-backup'),
    importInput: document.getElementById('import-file-input'),
    
    // Comparative Panel Overlay
    comparativePanel: document.getElementById('comparative-calc-panel'),
    compareBadge: document.getElementById('compare-project-badge'),
    btnCloseComp: document.getElementById('btn-close-comparison'),
    
    // Comp Meta Info
    compMetaName: document.getElementById('comp-meta-name'),
    compMetaDate: document.getElementById('comp-meta-date'),
    
    // Comp Deltas (Inputs)
    pastExw: document.getElementById('comp-past-exw'),
    currExw: document.getElementById('comp-curr-exw'),
    deltaExw: document.getElementById('comp-delta-exw'),
    
    pastExc: document.getElementById('comp-past-exc'),
    currExc: document.getElementById('comp-curr-exc'),
    deltaExc: document.getElementById('comp-delta-exc'),
    
    pastQty: document.getElementById('comp-past-qty'),
    currQty: document.getElementById('comp-curr-qty'),
    deltaQty: document.getElementById('comp-delta-qty'),
    
    pastShipping: document.getElementById('comp-past-shipping'),
    currShipping: document.getElementById('comp-curr-shipping'),
    deltaShipping: document.getElementById('comp-delta-shipping'),
    
    pastPacking: document.getElementById('comp-past-packing'),
    currPacking: document.getElementById('comp-curr-packing'),
    deltaPacking: document.getElementById('comp-delta-packing'),
    
    pastGp: document.getElementById('comp-past-gp'),
    currGp: document.getElementById('comp-curr-gp'),
    deltaGp: document.getElementById('comp-delta-gp'),
    
    // Comp Metrics Cards (Outputs)
    diffCost: document.getElementById('comp-diff-cost'),
    pastCost: document.getElementById('comp-past-cost'),
    currCost: document.getElementById('comp-curr-cost'),
    
    diffProfit: document.getElementById('comp-diff-profit'),
    pastProfit: document.getElementById('comp-past-profit'),
    currProfit: document.getElementById('comp-curr-profit'),
    
    diffUnitPrice: document.getElementById('comp-diff-unit-price'),
    pastUnitPrice: document.getElementById('comp-past-unit-price'),
    currUnitPrice: document.getElementById('comp-curr-unit-price'),
    
    // Shell Containers
    toastContainer: document.getElementById('toast-container'),

    // Supabase DB Sync Panel Elements
    btnDbConfig: document.getElementById('btn-db-config'),
    dbModal: document.getElementById('db-config-modal'),
    btnCloseDbModal: document.getElementById('btn-close-db-modal'),
    dbUrl: document.getElementById('db-supabase-url'),
    dbKey: document.getElementById('db-supabase-key'),
    dbConnectionStatus: document.getElementById('db-connection-status'),
    btnTestDb: document.getElementById('btn-test-db'),
    btnMigrateDb: document.getElementById('btn-migrate-local-to-db'),
    btnSaveDb: document.getElementById('btn-save-db-settings'),
    cloudStatusBadge: document.getElementById('cloud-status-badge'),
    cloudStatusDot: document.getElementById('cloud-status-dot'),
    cloudStatusText: document.getElementById('cloud-status-text')
};

// UI State
let activeComparisonProject = null;

/**
 * Bootstraps all UI listeners and displays initial data
 */
export function init() {
    // Set default date input value to today
    if (el.projectDate) {
        el.projectDate.value = new Date().toISOString().split('T')[0];
    }
    
    registerEventListeners();
    refreshUrlActionButtons();
    renderHistoryList();
    runLiveCalculation();

    // Setup initial cloud status badge
    updateCloudStatusBadge();

    // Trigger cloud background sync on launch
    if (history.isSupabaseConfigured()) {
        history.syncFromCloud().then(res => {
            if (res.success && res.changed) {
                renderHistoryList();
                showToast('ซิงโครไนซ์โครงการล่าสุดจากคลาวด์เรียบร้อย 🟢', 'success');
            }
        });
    }
}

/**
 * Registers DOM Event listeners
 */
function registerEventListeners() {
    const inputs = [
        el.projectDate, el.projectName, el.projectDetail,
        el.projectUrl1, el.projectUrl2, el.projectUrl3,
        el.exw, el.exc, el.quantity, el.shipping, el.packing, el.gp
    ].filter(Boolean);
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // Auto-switch to "Save New Project" mode if user changes the name of an active historical run
            if (input === el.projectName && activeComparisonProject && el.projectName.value.trim() !== activeComparisonProject.name) {
                activeComparisonProject = null;
                if (el.btnSave) el.btnSave.textContent = '💾 SAVE PROJECT';
                if (el.comparativePanel) el.comparativePanel.classList.add('collapsed');
                if (el.projectList) {
                    const cards = el.projectList.querySelectorAll('.project-card');
                    cards.forEach(card => card.classList.remove('active'));
                }
                showToast('Switched to Save New Project mode.', 'success');
            }

            runLiveCalculation();
            refreshUrlActionButtons();
            if (activeComparisonProject) {
                runComparisonMath();
            }
        });
    });

    // Visit URL Action Buttons (Explicit Click Routing)
    const urlActions = [
        { btn: el.btnVisitUrl1, input: el.projectUrl1 },
        { btn: el.btnVisitUrl2, input: el.projectUrl2 },
        { btn: el.btnVisitUrl3, input: el.projectUrl3 }
    ];
    
    urlActions.forEach(item => {
        if (!item.btn || !item.input) return;
        
        item.btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const val = item.input.value.trim();
            if (!val) return;
            
            let targetUrl = val;
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = 'https://' + targetUrl;
            }
            
            window.open(targetUrl, '_blank');
        });
    });

    // Save Run Action
    if (el.btnSave) el.btnSave.addEventListener('click', handleSaveRun);
    
    // Reset Form Action
    if (el.btnReset) el.btnReset.addEventListener('click', handleResetForm);

    // Download report as image actions
    if (el.btnDownload) {
        el.btnDownload.addEventListener('click', () => {
            const projectName = el.projectName ? el.projectName.value.trim() : 'Pricing-Report';
            handleDownloadImage('current-calc-panel', `Pricing-${projectName}`);
        });
    }
    
    if (el.btnDownloadComp) {
        el.btnDownloadComp.addEventListener('click', () => {
            const compName = activeComparisonProject ? activeComparisonProject.name : 'Comparison';
            handleDownloadImage('comparative-calc-panel', `Comparison-${compName}`);
        });
    }

    // Sidebar Slide Drawer Toggle
    if (el.btnToggleHistory) {
        el.btnToggleHistory.addEventListener('click', () => {
            if (el.historyDeck) el.historyDeck.classList.toggle('open');
        });
    }

    // Close Comparison Panel Overlay
    if (el.btnCloseComp) {
        el.btnCloseComp.addEventListener('click', exitComparisonMode);
    }

    // Search input filtering
    if (el.searchInput) {
        el.searchInput.addEventListener('input', (e) => {
            renderHistoryList(e.target.value);
        });
    }

    // Export Backup Download
    if (el.btnExport) {
        el.btnExport.addEventListener('click', () => {
            history.exportBackup();
            showToast('JSON backup exported successfully.', 'success');
        });
    }

    // Import Backup File Upload
    if (el.importInput) el.importInput.addEventListener('change', handleImportBackup);

    // Close sidebar deck when user clicks outside on mobile viewports
    document.addEventListener('click', (e) => {
        if (!el.historyDeck || !el.btnToggleHistory) return;
        const isClickInsideDeck = el.historyDeck.contains(e.target);
        const isClickToggleBtn = el.btnToggleHistory.contains(e.target);
        
        if (!isClickInsideDeck && !isClickToggleBtn && el.historyDeck.classList.contains('open')) {
            el.historyDeck.classList.remove('open');
        }
    });

    // Supabase DB Modal Triggers
    if (el.btnDbConfig) {
        el.btnDbConfig.addEventListener('click', openDbModal);
    }
    if (el.cloudStatusBadge) {
        el.cloudStatusBadge.addEventListener('click', openDbModal);
    }
    if (el.btnCloseDbModal) {
        el.btnCloseDbModal.addEventListener('click', closeDbModal);
    }

    // Test connection
    if (el.btnTestDb) {
        el.btnTestDb.addEventListener('click', handleTestDbConnection);
    }

    // Save DB config
    if (el.btnSaveDb) {
        el.btnSaveDb.addEventListener('click', handleSaveDbSettings);
    }

    // Sync Local projects to cloud
    if (el.btnMigrateDb) {
        el.btnMigrateDb.addEventListener('click', handleMigrateLocalToDb);
    }

    // Close DB modal when clicking outside content
    if (el.dbModal) {
        el.dbModal.addEventListener('click', (e) => {
            if (e.target === el.dbModal) {
                closeDbModal();
            }
        });
    }
}

/**
 * Computes and displays outputs based on current form parameters in real-time
 */
function runLiveCalculation() {
    const vals = getFormValues();
    const results = calculatePricing(vals.exwPrice, vals.excRate, vals.quantity, vals.overseasShipping, vals.domesticPacking, vals.gpMargin);
    
    // Render sub base price in form input
    if (el.basePrice) el.basePrice.value = formatCurrency(results.basePrice);

    // Calculate per-unit metrics
    const costPerUnit = vals.quantity > 0 ? results.totalCost / vals.quantity : 0;
    const seaPerUnit = vals.quantity > 0 ? results.totalSeaShip / vals.quantity : 0;
    const domPerUnit = vals.quantity > 0 ? results.totalDomestic / vals.quantity : 0;

    // Render live computed outputs formatted
    if (el.outTotalCost) el.outTotalCost.textContent = formatCurrency(results.totalCost);
    if (el.outCostPerUnit) el.outCostPerUnit.textContent = formatCurrency(costPerUnit);
    
    if (el.outTotalSea) el.outTotalSea.textContent = formatCurrency(results.totalSeaShip);
    if (el.outSubSeaUnit) el.outSubSeaUnit.textContent = `Per Unit: ${formatCurrency(seaPerUnit)}`;
    
    if (el.outTotalDom) el.outTotalDom.textContent = formatCurrency(results.totalDomestic);
    if (el.outSubDomUnit) el.outSubDomUnit.textContent = `Per Unit: ${formatCurrency(domPerUnit)}`;
    
    if (el.outTotalProfit) el.outTotalProfit.textContent = formatCurrency(results.totalProfit);
    if (el.outProfitPerUnit) el.outProfitPerUnit.textContent = formatCurrency(results.profitPerUnit);
    
    if (el.outPricePerUnit) el.outPricePerUnit.textContent = formatCurrency(results.pricePerUnit);
}

/**
 * Retrieves the raw form numeric inputs
 * @returns {Object} Cleaned parameters
 */
function getFormValues() {
    return {
        projectDate: el.projectDate ? el.projectDate.value : new Date().toISOString().split('T')[0],
        name: el.projectName ? el.projectName.value.trim() || 'Pricing Run' : 'Pricing Run',
        detail: el.projectDetail ? el.projectDetail.value.trim() : '',
        url1: el.projectUrl1 ? el.projectUrl1.value.trim() : '',
        url2: el.projectUrl2 ? el.projectUrl2.value.trim() : '',
        url3: el.projectUrl3 ? el.projectUrl3.value.trim() : '',
        exwPrice: el.exw ? parseFloat(el.exw.value) || 0 : 0,
        excRate: el.exc ? parseFloat(el.exc.value) || 0 : 0,
        quantity: el.quantity ? parseFloat(el.quantity.value) || 0 : 0,
        overseasShipping: el.shipping ? parseFloat(el.shipping.value) || 0 : 0,
        domesticPacking: el.packing ? parseFloat(el.packing.value) || 0 : 0,
        gpMargin: el.gp ? parseFloat(el.gp.value) || 0 : 0
    };
}

function handleSaveRun() {
    const vals = getFormValues();
    
    if (el.projectName && !el.projectName.value.trim()) {
        showToast('Please specify a Product Name identifier before saving.', 'error');
        el.projectName.focus();
        return;
    }
    
    const outputs = calculatePricing(vals.exwPrice, vals.excRate, vals.quantity, vals.overseasShipping, vals.domesticPacking, vals.gpMargin);
    
    let saved;
    if (activeComparisonProject) {
        // Update existing project in place
        saved = history.updateProject(activeComparisonProject.id, vals.name, vals, outputs);
        showToast(`Project "${saved.name}" updated successfully.`, 'success');
        exitComparisonMode();
    } else {
        // Save as new project
        saved = history.saveProject(vals.name, vals, outputs);
        showToast(`Project "${saved.name}" saved to history.`, 'success');
    }
    
    // Reset form identifier, description and url inputs
    if (el.projectName) el.projectName.value = '';
    if (el.projectDetail) el.projectDetail.value = '';
    if (el.projectUrl1) el.projectUrl1.value = '';
    if (el.projectUrl2) el.projectUrl2.value = '';
    if (el.projectUrl3) el.projectUrl3.value = '';
    refreshUrlActionButtons();
    
    renderHistoryList();
    runLiveCalculation();
}

/**
 * Resets inputs and closes active comparison states
 */
function handleResetForm() {
    el.calcForm.reset();
    if (el.projectDate) {
        el.projectDate.value = new Date().toISOString().split('T')[0];
    }
    refreshUrlActionButtons();
    exitComparisonMode();
    runLiveCalculation();
    showToast('Form cleared. Ready for new project calculation.', 'success');
}

/**
 * Renders the sidebar project list, applying filters if needed
 */
function renderHistoryList(filterQuery = '') {
    const projects = history.searchProjects(filterQuery);
    el.projectCount.textContent = `${projects.length} PROJECT${projects.length === 1 ? '' : 'S'}`;
    
    // Clear list
    el.projectList.innerHTML = '';
    
    if (projects.length === 0) {
        el.projectList.innerHTML = `
            <li class="deck-empty-state">
                <div class="empty-icon">📂</div>
                <p>${filterQuery ? 'No matched records.' : 'No projects saved yet.'}</p>
                <span class="empty-sub">${filterQuery ? 'Try another keyword.' : 'Run a pricing calculation and save it here.'}</span>
            </li>
        `;
        return;
    }
    
    projects.forEach(p => {
        const li = document.createElement('li');
        li.className = `project-card ${activeComparisonProject && activeComparisonProject.id === p.id ? 'active' : ''}`;
        
        const dateStr = formatDate(p.inputs.projectDate);
        
        li.innerHTML = `
            <div class="project-card-header">
                <span class="project-card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
                <span class="project-card-date">${dateStr}</span>
            </div>
            <div class="project-card-metrics">
                <div class="mini-metric">
                    <span class="mini-lbl">QTY</span>
                    <span class="mini-val">${p.inputs.quantity.toLocaleString()} PCS</span>
                </div>
                <div class="mini-metric">
                    <span class="mini-lbl">PRICE/UNIT</span>
                    <span class="mini-val">${formatCurrency(p.outputs.pricePerUnit)}</span>
                </div>
            </div>
            <div class="project-card-actions">
                <button class="btn-card-copy" title="Copy project" data-id="${p.id}">📋</button>
                <button class="btn-card-del" title="Delete project" data-id="${p.id}">✕</button>
            </div>
        `;
        
        // Listeners for selection and deletion
        li.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-card-del');
            if (delBtn) {
                e.stopPropagation();
                handleDeleteProject(delBtn.dataset.id);
                return;
            }
            
            const copyBtn = e.target.closest('.btn-card-copy');
            if (copyBtn) {
                e.stopPropagation();
                handleDuplicateProject(copyBtn.dataset.id);
                return;
            }
            
            enterComparisonMode(p);
        });
        
        el.projectList.appendChild(li);
    });
}

/**
 * Handle deletion of a project
 */
function handleDeleteProject(id) {
    const deleted = history.deleteProject(id);
    if (deleted) {
        showToast('Project removed from history.', 'success');
        if (activeComparisonProject && activeComparisonProject.id === id) {
            exitComparisonMode();
        }
        renderHistoryList(el.searchInput.value);
    }
}

/**
 * Handle duplication of a project
 */
function handleDuplicateProject(id) {
    const duplicated = history.duplicateProject(id);
    if (duplicated) {
        showToast(`Duplicated project as: "${duplicated.name}"`, 'success');
        renderHistoryList(el.searchInput ? el.searchInput.value : '');
        
        // Automatically enter edit mode on the cloned project immediately
        enterComparisonMode(duplicated);
    } else {
        showToast('Failed to duplicate project.', 'error');
    }
}

/**
 * Enters side-by-side comparative mode with selected history item
 */
function enterComparisonMode(project) {
    activeComparisonProject = project;
    
    renderHistoryList(el.searchInput.value);
    
    // Populate form with historical inputs
    if (el.projectDate) el.projectDate.value = project.inputs.projectDate;
    if (el.projectName) el.projectName.value = project.name; // Keep exact name!
    if (el.projectDetail) el.projectDetail.value = project.inputs.detail;
    if (el.projectUrl1) el.projectUrl1.value = project.inputs.url1 || '';
    if (el.projectUrl2) el.projectUrl2.value = project.inputs.url2 || '';
    if (el.projectUrl3) el.projectUrl3.value = project.inputs.url3 || '';
    refreshUrlActionButtons();
    
    if (el.btnSave) el.btnSave.textContent = '💾 UPDATE PROJECT';
    
    el.exw.value = project.inputs.exwPrice;
    el.exc.value = project.inputs.excRate;
    el.quantity.value = project.inputs.quantity;
    
    el.shipping.value = project.inputs.overseasShipping;
    el.packing.value = project.inputs.domesticPacking;
    el.gp.value = project.inputs.gpMargin;
    
    // Slide open comparative workspace B
    el.comparativePanel.classList.remove('collapsed');
    
    // Update labels
    el.compareBadge.textContent = `COMPARING TO: ${project.name}`;
    el.compMetaName.textContent = project.name;
    el.compMetaDate.textContent = formatDate(project.inputs.projectDate);
    
    // Run comparison calculation
    runLiveCalculation();
    runComparisonMath();
    
    // Close slide deck drawer on mobile after selection
    if (window.innerWidth < 1024) {
        el.historyDeck.classList.remove('open');
    }
    
    showToast(`Comparative deck loaded: Comparing with "${project.name}".`, 'success');
}

/**
 * Exits comparison mode, collapses the comparative panel
 */
function exitComparisonMode() {
    activeComparisonProject = null;
    if (el.comparativePanel) el.comparativePanel.classList.add('collapsed');
    
    // De-highlight active cards
    if (el.projectList) {
        const cards = el.projectList.querySelectorAll('.project-card');
        cards.forEach(card => card.classList.remove('active'));
    }
    
    if (el.btnSave) el.btnSave.textContent = '💾 SAVE PROJECT';
    
    showToast('Comparison workspace closed.', 'success');
}

/**
 * Handles JSON backup restore files uploads
 */
function handleImportBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const result = history.importBackup(evt.target.result);
        
        if (result.success) {
            showToast(result.message, 'success');
            renderHistoryList();
        } else {
            showToast(result.message, 'error');
        }
        
        el.importInput.value = '';
    };
    reader.readAsText(file);
}

/**
 * Computes comparative margins, deltas, and populates the comparison panel with color styling
 */
function runComparisonMath() {
    if (!activeComparisonProject) return;
    
    const past = activeComparisonProject.inputs;
    const curr = getFormValues();
    
    // Render specifications Side-by-Side comparison
    el.pastExw.textContent = `¥${past.exwPrice.toLocaleString()}`;
    el.currExw.textContent = `¥${curr.exwPrice.toLocaleString()}`;
    renderDeltaDisplay(el.deltaExw, past.exwPrice, curr.exwPrice, true); // Less EXW is positive (green)
    
    el.pastExc.textContent = past.excRate.toFixed(2);
    el.currExc.textContent = curr.excRate.toFixed(2);
    renderDeltaDisplay(el.deltaExc, past.excRate, curr.excRate, true); // Less rate is positive (green)
    
    el.pastQty.textContent = `${past.quantity.toLocaleString()} PCS`;
    el.currQty.textContent = `${curr.quantity.toLocaleString()} PCS`;
    renderDeltaDisplay(el.deltaQty, past.quantity, curr.quantity, false); // More QTY is positive (green)
    
    el.pastShipping.textContent = `${past.overseasShipping}%`;
    el.currShipping.textContent = `${curr.overseasShipping}%`;
    renderDeltaDisplay(el.deltaShipping, past.overseasShipping, curr.overseasShipping, true); // Less shipping is positive
    
    el.pastPacking.textContent = `${past.domesticPacking}%`;
    el.currPacking.textContent = `${curr.domesticPacking}%`;
    renderDeltaDisplay(el.deltaPacking, past.domesticPacking, curr.domesticPacking, true); // Less packing is positive
    
    el.pastGp.textContent = `${past.gpMargin}%`;
    el.currGp.textContent = `${curr.gpMargin}%`;
    renderDeltaDisplay(el.deltaGp, past.gpMargin, curr.gpMargin, false); // More GP is positive
    
    // Render Results Comparisons
    const pastOut = activeComparisonProject.outputs;
    const currOut = calculatePricing(curr.exwPrice, curr.excRate, curr.quantity, curr.overseasShipping, curr.domesticPacking, curr.gpMargin);
    
    // Cost delta
    el.pastCost.textContent = formatCurrency(pastOut.totalCost);
    el.currCost.textContent = formatCurrency(currOut.totalCost);
    renderDifferenceDisplay(el.diffCost, pastOut.totalCost, currOut.totalCost, 'currency', true); // Less cost is positive (green)
    
    // Profit delta
    el.pastProfit.textContent = formatCurrency(pastOut.totalProfit);
    el.currProfit.textContent = formatCurrency(currOut.totalProfit);
    renderDifferenceDisplay(el.diffProfit, pastOut.totalProfit, currOut.totalProfit, 'currency', false); // More profit is positive (green)
    
    // Unit Price delta
    el.pastUnitPrice.textContent = formatCurrency(pastOut.pricePerUnit);
    el.currUnitPrice.textContent = formatCurrency(currOut.pricePerUnit);
    renderDifferenceDisplay(el.diffUnitPrice, pastOut.pricePerUnit, currOut.pricePerUnit, 'currency', true); // Less unit price is positive (green)
}

/**
 * Computes percentage changes and formats delta labels
 */
function renderDeltaDisplay(element, past, curr, inverse = false) {
    if (past === curr) {
        element.textContent = '0.0%';
        element.className = 'comp-delta';
        return;
    }
    
    if (past === 0) {
        element.textContent = '+100%';
        element.className = `comp-delta ${inverse ? 'negative' : 'positive'}`;
        return;
    }
    
    const pctChange = ((curr - past) / past) * 100;
    const formatted = `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
    element.textContent = formatted;
    
    const isPositiveChange = pctChange > 0;
    const isGood = inverse ? !isPositiveChange : isPositiveChange;
    
    element.className = `comp-delta ${isGood ? 'positive' : 'negative'}`;
}

/**
 * Computes difference margins and formats differences
 */
function renderDifferenceDisplay(element, past, curr, formatType, inverse = false) {
    const diff = curr - past;
    let formatted = '';
    
    if (formatType === 'currency') {
        formatted = `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`;
    }
    
    if (diff === 0) {
        element.textContent = 'NO DIFF';
        element.className = 'comp-metric-diff neutral';
        return;
    }
    
    element.textContent = formatted;
    
    const isPositiveChange = diff > 0;
    const isGood = inverse ? !isPositiveChange : isPositiveChange;
    
    element.className = `comp-metric-diff ${isGood ? 'positive' : 'negative'}`;
}

/**
 * Utility: Shows a non-intrusive toast pop-up status notification
 */
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : '⚠';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    
    el.toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 50);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => el.toastContainer.removeChild(toast), 300);
    }, 4500);
}

/* ==========================================================================
   Formatting & Sanitation Utilities
   ========================================================================== */

function formatCurrency(val) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(val);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch(e) {
        return dateString;
    }
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Triggers loading of html2canvas and initiates capturing of specified panel
 * @param {string} targetId - ID of the DOM element to screenshot
 * @param {string} fileName - Saved file name (.png)
 */
function handleDownloadImage(targetId, fileName) {
    showToast('กำลังเตรียมรูปภาพรายงาน...', 'success');
    
    if (typeof html2canvas === 'undefined') {
        const s = document.createElement('script');
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        s.onload = () => runCapture(targetId, fileName);
        s.onerror = () => showToast('ไม่สามารถเชื่อมต่อระบบสร้างรูปภาพได้', 'error');
        document.head.appendChild(s);
    } else {
        runCapture(targetId, fileName);
    }
}

/**
 * Capture specified element offscreen / cleanly and triggers download
 * @param {string} targetId - ID of the element to capture
 * @param {string} fileName - File name
 */
function runCapture(targetId, fileName) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
        showToast('ไม่พบเนื้อหาเพื่อสร้างรูปภาพ', 'error');
        return;
    }
    
    // Add capturing class to hide buttons and scrollbars
    targetElement.classList.add('capturing');
    
    // Slight timeout to ensure layout updates before capturing
    setTimeout(() => {
        html2canvas(targetElement, {
            backgroundColor: '#11141B', // Match --color-bg-panel
            scale: 2, // High resolution
            logging: false,
            useCORS: true
        }).then(canvas => {
            targetElement.classList.remove('capturing');
            
            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('บันทึกรูปภาพรายงานสำเร็จ 🖼️', 'success');
        }).catch(err => {
            console.error('Capture failed', err);
            targetElement.classList.remove('capturing');
            showToast('เกิดข้อผิดพลาดในการบันทึกรูปภาพ', 'error');
        });
    }, 200);
}

/**
 * Updates URL Reference Action Buttons (🔗 icon) state based on inputs validation
 */
function refreshUrlActionButtons() {
    const urls = [
        { input: el.projectUrl1, btn: el.btnVisitUrl1 },
        { input: el.projectUrl2, btn: el.btnVisitUrl2 },
        { input: el.projectUrl3, btn: el.btnVisitUrl3 }
    ];
    
    urls.forEach(item => {
        if (!item.input || !item.btn) return;
        const val = item.input.value.trim();
        
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
            item.btn.href = val;
            item.btn.classList.remove('disabled');
            item.btn.setAttribute('tabindex', '0');
        } else if (val) {
            item.btn.href = 'https://' + val;
            item.btn.classList.remove('disabled');
            item.btn.setAttribute('tabindex', '0');
        } else {
            item.btn.href = '#';
            item.btn.classList.add('disabled');
            item.btn.setAttribute('tabindex', '-1');
        }
    });
}

/**
 * Opens the Supabase configuration modal and loads existing credentials
 */
function openDbModal() {
    if (!el.dbModal) return;
    
    // Load config
    const config = history.getSupabaseConfig();
    
    // Pre-fill with the user's Supabase URL and Key by default
    const defaultUrl = 'https://mfzilblyhrvbucqruqmq.supabase.co';
    const defaultKey = 'sb_publishable_8XJ_w9u3fzybwdUrqXtDrQ_uxhXQJKG';
    if (el.dbUrl) el.dbUrl.value = config.url || defaultUrl;
    if (el.dbKey) el.dbKey.value = config.key || defaultKey;
    
    // Update status badge
    updateDbModalStatus();
    
    // Show modal
    el.dbModal.style.display = 'flex';
}

/**
 * Closes the Supabase configuration modal
 */
function closeDbModal() {
    if (el.dbModal) {
        el.dbModal.style.display = 'none';
    }
}

/**
 * Updates the connection status badge in the modal UI
 */
function updateDbModalStatus() {
    if (!el.dbConnectionStatus || !el.btnMigrateDb) return;
    
    const isConfigured = history.isSupabaseConfigured();
    if (isConfigured) {
        el.dbConnectionStatus.className = 'db-status-badge status-success';
        el.dbConnectionStatus.innerHTML = '<span class="status-dot green"></span> CONNECTED (SUPABASE CLOUD MODE)';
        el.btnMigrateDb.removeAttribute('disabled');
    } else {
        el.dbConnectionStatus.className = 'db-status-badge status-offline';
        el.dbConnectionStatus.innerHTML = '<span class="status-dot orange"></span> OFFLINE (LOCAL STORAGE MODE)';
        el.btnMigrateDb.setAttribute('disabled', 'true');
    }
}

/**
 * Updates the tiny cloud status badge in the main header
 */
function updateCloudStatusBadge() {
    if (!el.cloudStatusDot || !el.cloudStatusText) return;
    
    const isConfigured = history.isSupabaseConfigured();
    if (isConfigured) {
        el.cloudStatusDot.className = 'status-dot green';
        el.cloudStatusText.textContent = 'CLOUD SYNCED';
    } else {
        el.cloudStatusDot.className = 'status-dot orange';
        el.cloudStatusText.textContent = 'OFFLINE MODE';
    }
}

/**
 * Validates and tests database credentials in real-time
 */
async function handleTestDbConnection() {
    if (!el.dbUrl || !el.dbKey || !el.dbConnectionStatus || !el.btnTestDb) return;
    
    const url = el.dbUrl.value.trim();
    const key = el.dbKey.value.trim();
    
    if (!url || !key) {
        showToast('กรุณากรอกข้อมูล Supabase URL และ Key ให้ครบถ้วน', 'error');
        return;
    }
    
    el.btnTestDb.setAttribute('disabled', 'true');
    el.btnTestDb.textContent = '⚡ TESTING...';
    
    const result = await history.testSupabaseConnection(url, key);
    
    el.btnTestDb.removeAttribute('disabled');
    el.btnTestDb.textContent = '⚡ TEST CONNECTION';
    
    if (result.success) {
        el.dbConnectionStatus.className = 'db-status-badge status-success';
        el.dbConnectionStatus.innerHTML = '<span class="status-dot green"></span> CONNECTED (SUPABASE CLOUD MODE)';
        if (el.btnMigrateDb) el.btnMigrateDb.removeAttribute('disabled');
        showToast('เชื่อมต่อฐานข้อมูล Supabase สำเร็จ 🟢', 'success');
    } else {
        el.dbConnectionStatus.className = 'db-status-badge status-error';
        el.dbConnectionStatus.innerHTML = `<span class="status-dot red"></span> ERROR: ${result.message.toUpperCase()}`;
        if (el.btnMigrateDb) el.btnMigrateDb.setAttribute('disabled', 'true');
        showToast(`ล้มเหลว: ${result.message}`, 'error');
    }
}

/**
 * Saves configuration values and starts cloud synchronization
 */
async function handleSaveDbSettings() {
    if (!el.dbUrl || !el.dbKey) return;
    
    const url = el.dbUrl.value.trim();
    const key = el.dbKey.value.trim();
    
    if (url && key) {
        // Test connection first
        const test = await history.testSupabaseConnection(url, key);
        if (!test.success) {
            showToast('บันทึกไม่สำเร็จ: การเชื่อมต่อฐานข้อมูลล้มเหลว', 'error');
            return;
        }
        
        history.saveSupabaseConfig(url, key);
        showToast('บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว 💾', 'success');
    } else {
        history.clearSupabaseConfig();
        showToast('ยกเลิกการเชื่อมต่อระบบคลาวด์แล้ว สลับเป็น Offline Mode 💾', 'success');
    }
    
    updateCloudStatusBadge();
    closeDbModal();
    
    // Refresh Sidebar instantly if there were cloud changes
    if (history.isSupabaseConfigured()) {
        showToast('กำลังซิงโครไนซ์ข้อมูลคลาวด์...', 'success');
        const sync = await history.syncFromCloud();
        if (sync.success && sync.changed) {
            renderHistoryList();
            showToast('ซิงค์ข้อมูลล่าสุดสำเร็จ 🟢', 'success');
        }
    }
}

/**
 * Migrates all local calculations to cloud Supabase table
 */
async function handleMigrateLocalToDb() {
    if (!el.btnMigrateDb) return;
    
    el.btnMigrateDb.setAttribute('disabled', 'true');
    el.btnMigrateDb.textContent = '📤 SYNCING...';
    
    showToast('กำลังเตรียมย้ายข้อมูลโลคอลขึ้นสู่คลาวด์...', 'success');
    
    const result = await history.syncLocalToCloud();
    
    el.btnMigrateDb.removeAttribute('disabled');
    el.btnMigrateDb.textContent = '📤 SYNC TO CLOUD';
    
    if (result.success) {
        showToast(`โอนย้ายสำเร็จ! ซิงค์ทั้งหมด ${result.count} รายการขึ้นสู่ Supabase เรียบร้อย 🎉`, 'success');
    } else {
        showToast(`เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ${result.message}`, 'error');
    }
}
