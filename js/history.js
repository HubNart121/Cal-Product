/**
 * History Manager - LocalStorage persistence & JSON Backup Portability for Pricing Calculator
 */

const STORAGE_KEY = 'pricing_projects_deck';

/**
 * Retrieves all stored projects from LocalStorage.
 * @returns {Array} List of stored project objects
 */
export function getProjects() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse projects from localStorage', e);
        return [];
    }
}

/**
 * Saves a new calculation run to the project history.
 */
export function saveProject(name, inputs, outputs) {
    const projects = getProjects();
    
    const newProject = {
        id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: name.trim() || 'Unnamed Pricing Run',
        timestamp: new Date().toISOString(),
        inputs: {
            projectDate: inputs.projectDate || new Date().toISOString().split('T')[0],
            detail: String(inputs.detail || '').trim(),
            url1: String(inputs.url1 || '').trim(),
            url2: String(inputs.url2 || '').trim(),
            url3: String(inputs.url3 || '').trim(),
            exwPrice: parseFloat(inputs.exwPrice) || 0,
            excRate: parseFloat(inputs.excRate) || 0,
            quantity: parseFloat(inputs.quantity) || 0,
            overseasShipping: parseFloat(inputs.overseasShipping) || 0,
            domesticPacking: parseFloat(inputs.domesticPacking) || 0,
            gpMargin: parseFloat(inputs.gpMargin) || 0
        },
        outputs: {
            basePrice: parseFloat(outputs.basePrice) || 0,
            totalSeaShip: parseFloat(outputs.totalSeaShip) || 0,
            totalDomestic: parseFloat(outputs.totalDomestic) || 0,
            totalCost: parseFloat(outputs.totalCost) || 0,
            pricePerUnit: parseFloat(outputs.pricePerUnit) || 0,
            profitPerUnit: parseFloat(outputs.profitPerUnit) || 0,
            totalProfit: parseFloat(outputs.totalProfit) || 0
        }
    };

    projects.unshift(newProject);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return newProject;
}

/**
 * Deletes a project run by its unique ID.
 */
export function deleteProject(id) {
    const projects = getProjects();
    const filtered = projects.filter(p => p.id !== id);
    
    if (projects.length === filtered.length) {
        return false;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
}

/**
 * Searches and filters projects by name.
 */
export function searchProjects(query) {
    const projects = getProjects();
    if (!query) return projects;
    
    const q = query.toLowerCase().trim();
    return projects.filter(p => p.name.toLowerCase().includes(q));
}

/**
 * Exports all historical projects into a JSON file download.
 */
export function exportBackup() {
    const projects = getProjects();
    const dataStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `pricing-projects-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Imports projects from a JSON file backup.
 */
export function importBackup(jsonString) {
    try {
        const importedData = JSON.parse(jsonString);
        
        if (!Array.isArray(importedData)) {
            return { success: false, message: 'Invalid format: Backup must be an array of projects.' };
        }
        
        const validatedProjects = [];
        for (const item of importedData) {
            if (!item.name || !item.inputs || !item.outputs) {
                continue;
            }
            
            validatedProjects.push({
                id: item.id || ('proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
                name: String(item.name).trim(),
                timestamp: item.timestamp || new Date().toISOString(),
                inputs: {
                    projectDate: item.inputs.projectDate || new Date().toISOString().split('T')[0],
                    detail: String(item.inputs.detail || '').trim(),
                    url1: String(item.inputs.url1 || '').trim(),
                    url2: String(item.inputs.url2 || '').trim(),
                    url3: String(item.inputs.url3 || '').trim(),
                    exwPrice: parseFloat(item.inputs.exwPrice) || 0,
                    excRate: parseFloat(item.inputs.excRate) || 0,
                    quantity: parseFloat(item.inputs.quantity) || 0,
                    overseasShipping: parseFloat(item.inputs.overseasShipping) || 0,
                    domesticPacking: parseFloat(item.inputs.domesticPacking) || 0,
                    gpMargin: parseFloat(item.inputs.gpMargin) || 0
                },
                outputs: {
                    basePrice: parseFloat(item.outputs.basePrice) || 0,
                    totalSeaShip: parseFloat(item.outputs.totalSeaShip) || 0,
                    totalDomestic: parseFloat(item.outputs.totalDomestic) || 0,
                    totalCost: parseFloat(item.outputs.totalCost) || 0,
                    pricePerUnit: parseFloat(item.outputs.pricePerUnit) || 0,
                    profitPerUnit: parseFloat(item.outputs.profitPerUnit) || 0,
                    totalProfit: parseFloat(item.outputs.totalProfit) || 0
                }
            });
        }
        
        if (validatedProjects.length === 0) {
            return { success: false, message: 'No valid pricing projects found in backup.' };
        }
        
        const currentProjects = getProjects();
        const currentIds = new Set(currentProjects.map(p => p.id));
        
        const newProjects = validatedProjects.filter(p => !currentIds.has(p.id));
        const merged = [...newProjects, ...currentProjects];
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        
        return {
            success: true,
            count: newProjects.length,
            message: `Successfully imported ${newProjects.length} new projects.`
        };
    } catch (e) {
        console.error('Import failed', e);
        return { success: false, message: 'Failed to parse backup file.' };
    }
}

/**
 * Updates an existing historical project run by its unique ID.
 */
export function updateProject(id, name, inputs, outputs) {
    const projects = getProjects();
    const idx = projects.findIndex(p => p.id === id);
    
    if (idx === -1) {
        return saveProject(name, inputs, outputs);
    }
    
    projects[idx] = {
        id: id,
        name: name.trim() || 'Unnamed Pricing Run',
        timestamp: new Date().toISOString(),
        inputs: {
            projectDate: inputs.projectDate || new Date().toISOString().split('T')[0],
            detail: String(inputs.detail || '').trim(),
            url1: String(inputs.url1 || '').trim(),
            url2: String(inputs.url2 || '').trim(),
            url3: String(inputs.url3 || '').trim(),
            exwPrice: parseFloat(inputs.exwPrice) || 0,
            excRate: parseFloat(inputs.excRate) || 0,
            quantity: parseFloat(inputs.quantity) || 0,
            overseasShipping: parseFloat(inputs.overseasShipping) || 0,
            domesticPacking: parseFloat(inputs.domesticPacking) || 0,
            gpMargin: parseFloat(inputs.gpMargin) || 0
        },
        outputs: {
            basePrice: parseFloat(outputs.basePrice) || 0,
            totalSeaShip: parseFloat(outputs.totalSeaShip) || 0,
            totalDomestic: parseFloat(outputs.totalDomestic) || 0,
            totalCost: parseFloat(outputs.totalCost) || 0,
            pricePerUnit: parseFloat(outputs.pricePerUnit) || 0,
            profitPerUnit: parseFloat(outputs.profitPerUnit) || 0,
            totalProfit: parseFloat(outputs.totalProfit) || 0
        }
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[idx];
}

/**
 * Duplicates a project run by its ID, appends ' (Copy)' to its name, and saves it.
 * @param {string} id - Project ID to duplicate
 * @returns {Object|null} The newly created cloned project, or null if failed
 */
export function duplicateProject(id) {
    const projects = getProjects();
    const target = projects.find(p => p.id === id);
    if (!target) return null;
    
    // Create new project inputs by copying target inputs
    const clonedInputs = { ...target.inputs };
    const clonedOutputs = { ...target.outputs };
    const duplicatedName = target.name + ' (Copy)';
    
    return saveProject(duplicatedName, clonedInputs, clonedOutputs);
}
