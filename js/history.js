/**
 * History Manager - Offline-First Supabase Sync Engine & LocalStorage Caching for Pricing Calculator
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEY = 'pricing_projects_deck';
let supabaseClient = null;

/**
 * Initializes the Supabase client using stored credentials.
 */
export function initSupabase() {
    const url = 'https://mfzilblyhrvbucqruqmq.supabase.co';
    const key = 'sb_publishable_8XJ_w9u3fzybwdUrqXtDrQ_uxhXQJKG';
    try {
        supabaseClient = createClient(url, key);
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        supabaseClient = null;
    }
}

// Automatically bootstrap Supabase configuration on import
initSupabase();

/**
 * Checks if Supabase client is active.
 * @returns {boolean} True if configured successfully
 */
export function isSupabaseConfigured() {
    return !!supabaseClient;
}

/**
 * Retrieves the current Supabase configuration credentials (read-only fallbacks).
 */
export function getSupabaseConfig() {
    return {
        url: 'https://mfzilblyhrvbucqruqmq.supabase.co',
        key: 'sb_publishable_8XJ_w9u3fzybwdUrqXtDrQ_uxhXQJKG'
    };
}

/**
 * Saves Supabase configurations (Deprecated - edit via Antigravity instead)
 */
export function saveSupabaseConfig(url, key) {
    console.warn('Database edits are restricted. Please modify credentials via Antigravity instead.');
}

/**
 * Clears Supabase settings (Deprecated - edit via Antigravity instead)
 */
export function clearSupabaseConfig() {
    console.warn('Database edits are restricted. Please modify credentials via Antigravity instead.');
}

/**
 * Tests connection with specific Supabase endpoints.
 */
export async function testSupabaseConnection(url, key) {
    if (!url || !key) return { success: false, message: 'Missing URL or Key.' };
    try {
        const tempClient = createClient(url.trim(), key.trim());
        const { error } = await tempClient
            .from('pricing_projects')
            .select('id')
            .limit(1);
        
        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true, message: 'Connection successful!' };
    } catch (e) {
        return { success: false, message: e.message || 'Network error occurred.' };
    }
}

/**
 * Pulls all projects from Supabase, merges them with local storage using timestamps, and writes back.
 * @returns {Promise<Object>} Success state and whether modifications were merged
 */
export async function syncFromCloud() {
    if (!supabaseClient) return { success: false, message: 'Supabase is not configured.' };
    try {
        const { data, error } = await supabaseClient
            .from('pricing_projects')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (error) {
            console.error('Failed to sync from cloud:', error);
            return { success: false, message: error.message };
        }

        if (!data) return { success: true, changed: false };

        const localProjects = getLocalProjectsOnly();
        const localMap = new Map(localProjects.map(p => [p.id, p]));
        let changed = false;

        for (const cloudProj of data) {
            const localProj = localMap.get(cloudProj.id);
            if (!localProj) {
                localProjects.push(cloudProj);
                changed = true;
            } else {
                const cloudTime = new Date(cloudProj.timestamp).getTime();
                const localTime = new Date(localProj.timestamp).getTime();
                if (cloudTime > localTime) {
                    const idx = localProjects.findIndex(p => p.id === cloudProj.id);
                    localProjects[idx] = cloudProj;
                    changed = true;
                } else if (localTime > cloudTime) {
                    // Local is newer, silently update cloud in background
                    backgroundSync(localProj, 'upsert');
                }
            }
        }

        // Sort by timestamp descending
        localProjects.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localProjects));
        }

        return { success: true, changed };
    } catch (e) {
        console.error('Failed syncing from cloud:', e);
        return { success: false, message: e.message };
    }
}

/**
 * Syncs all local projects to the cloud in bulk.
 */
export async function syncLocalToCloud() {
    if (!supabaseClient) return { success: false, message: 'Supabase is not configured.' };
    try {
        const localProjects = getLocalProjectsOnly();
        if (localProjects.length === 0) {
            return { success: true, count: 0, message: 'No local projects to sync.' };
        }

        const rows = localProjects.map(p => ({
            id: p.id,
            name: p.name,
            timestamp: p.timestamp,
            inputs: p.inputs,
            outputs: p.outputs
        }));

        const { error } = await supabaseClient
            .from('pricing_projects')
            .upsert(rows);
        
        if (error) {
            console.error('Bulk sync failed:', error);
            return { success: false, message: error.message };
        }

        return { 
            success: true, 
            count: localProjects.length, 
            message: `Successfully synced ${localProjects.length} projects to the cloud.` 
        };
    } catch (e) {
        console.error('Sync failed:', e);
        return { success: false, message: e.message };
    }
}

/**
 * Internal background sync helper.
 */
async function backgroundSync(project, action) {
    if (!supabaseClient) return;
    try {
        if (action === 'delete') {
            await supabaseClient
                .from('pricing_projects')
                .delete()
                .eq('id', project.id);
        } else if (action === 'upsert') {
            await supabaseClient
                .from('pricing_projects')
                .upsert({
                    id: project.id,
                    name: project.name,
                    timestamp: project.timestamp,
                    inputs: project.inputs,
                    outputs: project.outputs
                });
        }
    } catch (e) {
        console.error(`Background cloud sync failed for action "${action}":`, e);
    }
}

/**
 * Retrieves all stored projects from LocalStorage (synchronous fallback).
 * @returns {Array} List of stored project objects
 */
function getLocalProjectsOnly() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse projects from localStorage', e);
        return [];
    }
}

/**
 * Retrieves all stored projects (Synchronous Offline-First UI compatibility).
 * @returns {Array} List of stored project objects
 */
export function getProjects() {
    return getLocalProjectsOnly();
}

/**
 * Saves a new calculation run to local and cloud database.
 */
export function saveProject(name, inputs, outputs) {
    const projects = getLocalProjectsOnly();
    
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
    
    // Background cloud synchronization
    backgroundSync(newProject, 'upsert');

    return newProject;
}

/**
 * Deletes a project run by its unique ID.
 */
export function deleteProject(id) {
    const projects = getLocalProjectsOnly();
    const filtered = projects.filter(p => p.id !== id);
    
    if (projects.length === filtered.length) {
        return false;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // Background cloud synchronization
    backgroundSync({ id }, 'delete');

    return true;
}

/**
 * Searches and filters projects by name.
 */
export function searchProjects(query) {
    const projects = getLocalProjectsOnly();
    if (!query) return projects;
    
    const q = query.toLowerCase().trim();
    return projects.filter(p => p.name.toLowerCase().includes(q));
}

/**
 * Exports all historical projects into a JSON file download.
 */
export function exportBackup() {
    const projects = getLocalProjectsOnly();
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
        
        const currentProjects = getLocalProjectsOnly();
        const currentIds = new Set(currentProjects.map(p => p.id));
        
        const newProjects = validatedProjects.filter(p => !currentIds.has(p.id));
        const merged = [...newProjects, ...currentProjects];
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        // Push new imports to cloud in bulk in background
        if (newProjects.length > 0) {
            syncLocalToCloud();
        }
        
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
    const projects = getLocalProjectsOnly();
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
    
    // Background cloud synchronization
    backgroundSync(projects[idx], 'upsert');

    return projects[idx];
}

/**
 * Duplicates a project run by its ID, appends ' (Copy)' to its name, and saves it.
 */
export function duplicateProject(id) {
    const projects = getLocalProjectsOnly();
    const target = projects.find(p => p.id === id);
    if (!target) return null;
    
    const clonedInputs = { ...target.inputs };
    const clonedOutputs = { ...target.outputs };
    const duplicatedName = target.name + ' (Copy)';
    
    return saveProject(duplicatedName, clonedInputs, clonedOutputs);
}

/**
 * Validates user credentials using server-side RPC on Supabase (Zero password leaks to client).
 */
export async function validateLogin(username, password) {
    if (!supabaseClient) return { success: false, message: 'Database client not connected.' };
    try {
        const { data, error } = await supabaseClient.rpc('verify_user_credentials', {
            p_username: username,
            p_password: password
        });

        if (error) {
            console.error('Authentication error:', error);
            return { success: false, message: error.message };
        }

        return { success: !!data };
    } catch (e) {
        console.error('Authentication exception:', e);
        return { success: false, message: e.message || 'Authentication error.' };
    }
}

/**
 * Changes user credentials securely using server-side RPC (verifying old credentials).
 */
export async function changeCredentials(currentPassword, newUsername, newPassword) {
    if (!supabaseClient) return { success: false, message: 'Database client not connected.' };
    try {
        const activeUser = sessionStorage.getItem('calc_active_user') || 'admin';
        const { data, error } = await supabaseClient.rpc('change_user_credentials', {
            p_username: activeUser,
            p_old_password: currentPassword,
            p_new_username: newUsername,
            p_new_password: newPassword
        });

        if (error) {
            console.error('Mutation error:', error);
            return { success: false, message: error.message };
        }

        return { success: !!data };
    } catch (e) {
        console.error('Mutation exception:', e);
        return { success: false, message: e.message || 'Failed to modify credentials.' };
    }
}

/**
 * Fetches the user's public IP address from ipify and logs the login event in auth_logs.
 * Standardized try-catch avoids locking out users on strict network configurations or ad-blockers.
 */
export async function writeAuthLog(username) {
    if (!supabaseClient) return;
    let ipAddress = 'BLOCKED / OFFLINE IP';
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

        const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const json = await res.json();
            ipAddress = json.ip || ipAddress;
        }
    } catch (e) {
        console.warn('IP lookup bypassed (connection blocked or offline):', e);
    }

    try {
        await supabaseClient
            .from('auth_logs')
            .insert([{ username, ip_address: ipAddress }]);
    } catch (e) {
        console.error('Failed to write access audit log:', e);
    }
}

/**
 * Retrieves the 50 most recent access logs.
 */
export async function getAuthLogs() {
    if (!supabaseClient) return { success: false, message: 'Database client not connected.' };
    try {
        const { data, error } = await supabaseClient
            .from('auth_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Retrieve logs error:', error);
            return { success: false, message: error.message };
        }

        return { success: true, logs: data || [] };
    } catch (e) {
        console.error('Retrieve logs exception:', e);
        return { success: false, message: e.message || 'Failed to retrieve logs.' };
    }
}

