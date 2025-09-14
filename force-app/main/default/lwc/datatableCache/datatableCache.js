const SESSION_PREFIX = 'ftg:datatable:filtersig:';
const DB_NAME = 'ftg-cache';
const STORE = 'datatable';

export async function getIfUnchanged(filtersObj) {
    const { selectedSObject } = filtersObj || {};
    if (!selectedSObject) return null;

    const currentSig = buildSignature(filtersObj);
    const sessKey = SESSION_PREFIX + selectedSObject;
    const prevSig = getSession(sessKey);

    // If filters or logic changed
    if (!prevSig || prevSig !== currentSig) {
        return null;
    }

    const cacheKey = makeCacheKey(selectedSObject, currentSig);
    const hit = await idbGet(cacheKey);
    return hit ?? null;
}

export async function save(filtersObj, datatableInfo) {
    const { selectedSObject } = filtersObj || {};
    if (!selectedSObject || !datatableInfo) return;

    const sig = buildSignature(filtersObj);
    const cacheKey = makeCacheKey(selectedSObject, sig);

    await idbPut(cacheKey, {
        key: cacheKey,
        sObject: selectedSObject,
        payload: sanitizeDatatableInfo(datatableInfo),
        fetchedAt: Date.now()
    });

    setSession(SESSION_PREFIX + selectedSObject, sig);
}

// Build a minimal signature of filters to detect changes.
// We only consider: selectedSObject, selectedFilterLogic, and for each filter:
// field, type, selectedCondition, value
function buildSignature(filtersObj) {
    const min = {
        selectedSObject: filtersObj.selectedSObject,
        selectedFilterLogic: filtersObj.selectedFilterLogic,
        selectedFilters: (filtersObj.selectedFilters || [])
        .map(f => ({
            field: f.field ?? '',
            type: f.type ?? '',
            selectedCondition: f.selectedCondition ?? '',
            value: f.value ?? ''
        }))
        .sort((a, b) => {
            const af = (a.field || '') + '|' + (a.selectedCondition || '');
            const bf = (b.field || '') + '|' + (b.selectedCondition || '');
            return af.localeCompare(bf);
        })
    };

    const stable = stableStringify(min);
    return hashString(stable);
}

function makeCacheKey(selectedSObject, signature) {
    return `ftg:datatable:v1:${selectedSObject}:${signature}`;
}

function getSession(key) {
    try { 
        return window.sessionStorage.getItem(key); 
    } catch { 
        return null; 
    }
}
function setSession(key, val) {
    window.sessionStorage.setItem(key, val); 
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME);
        req.onupgradeneeded = () => {
            const db = req.result;
            const os = db.createObjectStore(STORE, { keyPath: 'key' });
            os.createIndex('bySObject', 'sObject', { unique: false });
            os.createIndex('byFetchedAt', 'fetchedAt', { unique: false });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => {
            const row = req.result;
            resolve(row ? row.payload : null);
        };
        req.onerror = () => reject(req.error);
    });
}

async function idbPut(key, valueObj) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(valueObj);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function sanitizeDatatableInfo(info) {
    return {
        columns: Array.isArray(info.columns) ? info.columns : [],
        records: Array.isArray(info.records) ? info.records : [],
        totalCount: typeof info.totalCount === 'number' ? info.totalCount : 0
    };
}

function stableStringify(obj) {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function hashString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}