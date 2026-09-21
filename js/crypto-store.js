// ============================================================
// CRYPTO STORE — Client-Side Hardware-Accelerated Encryption
// Standard Reference: Enterprise Specification BRD/FRD v2.0
// Uses Web Crypto API (AES-GCM 256-bit + PBKDF2)
// ============================================================

var CryptoStore = (() => {
    let _cryptoKey = null;
    let _currentPrefix = 'ccms_enc_';
    const SALT = new Uint8Array([71, 114, 101, 116, 101, 120, 67, 67, 77, 83, 75, 101, 121, 50, 48, 50]); // GretexCCMSKey202

    function textToBytes(str) { 
        return new TextEncoder().encode(str); 
    }

    function bytesToText(bytes) { 
        return new TextDecoder().decode(bytes); 
    }

    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function hasWebCrypto() { 
        return !!(window.crypto && window.crypto.subtle); 
    }

    /**
     * Initializes the cryptographic key derived from active user session.
     * Uses PBKDF2 with 100,000 iterations & SHA-256 to produce an AES-GCM 256-bit key.
     */
    async function init(session) {
        const username = (session && session.username) || 'guest';
        const userId   = (session && (session.user_id || session.userId)) || 'USR-000';
        const role     = (session && session.role) || 'User';

        // User-scoped isolation prefix: ccms_enc_{username}_{role}_
        _currentPrefix = `ccms_enc_${username.toLowerCase()}_${role.toLowerCase().replace(/\s+/g, '')}_`;

        if (!hasWebCrypto()) {
            console.warn('[CryptoStore] Web Crypto API not available. Using fallback obfuscation.');
            return false;
        }

        try {
            const secret = `${username}:${userId}:${role}:GretexCCMSSecureKey2026`;
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw', 
                textToBytes(secret), 
                { name: 'PBKDF2' }, 
                false, 
                ['deriveKey']
            );

            _cryptoKey = await window.crypto.subtle.deriveKey(
                { 
                    name: 'PBKDF2', 
                    salt: SALT, 
                    iterations: 100000, 
                    hash: 'SHA-256' 
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            console.log('[CryptoStore] AES-GCM 256-bit encryption initialized for session:', username);
            return true;
        } catch (err) {
            console.error('[CryptoStore] Key derivation failed:', err);
            return false;
        }
    }

    /**
     * Encrypts arbitrary JS object or data using AES-GCM with a random 12-byte IV.
     * Output format: { iv: "<base64>", ct: "<base64>" }
     */
    async function encrypt(data) {
        const jsonStr = JSON.stringify(data);
        if (!_cryptoKey || !hasWebCrypto()) {
            return { iv: 'plain', ct: btoa(encodeURIComponent(jsonStr)) };
        }

        try {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = textToBytes(jsonStr);
            const cipherBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv }, 
                _cryptoKey, 
                encoded
            );

            return { 
                iv: bufferToBase64(iv), 
                ct: bufferToBase64(cipherBuffer) 
            };
        } catch (err) {
            console.error('[CryptoStore] Encryption error:', err);
            return { iv: 'plain', ct: btoa(encodeURIComponent(jsonStr)) };
        }
    }

    /**
     * Decrypts { iv, ct } payload and returns the original JavaScript data.
     */
    async function decrypt(payload) {
        if (!payload || !payload.ct) return null;

        if (payload.iv === 'plain' || !_cryptoKey || !hasWebCrypto()) {
            try { 
                return JSON.parse(decodeURIComponent(atob(payload.ct))); 
            } catch (e) { 
                return null; 
            }
        }

        try {
            const ivBytes = base64ToBytes(payload.iv);
            const cipherBytes = base64ToBytes(payload.ct);
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBytes }, 
                _cryptoKey, 
                cipherBytes
            );

            return JSON.parse(bytesToText(decryptedBuffer));
        } catch (err) {
            console.warn('[CryptoStore] Decryption failed (key mismatch or corrupted data):', err);
            return null;
        }
    }

    /**
     * Encrypts and saves data to localStorage or sessionStorage under user-scoped prefix.
     */
    async function save(key, data, storageType = 'local') {
        try {
            const encrypted = await encrypt(data);
            const fullKey = _currentPrefix + key;
            const json = JSON.stringify(encrypted);
            if (storageType === 'session') {
                sessionStorage.setItem(fullKey, json);
            } else {
                localStorage.setItem(fullKey, json);
            }
            return true;
        } catch (err) {
            console.error('[CryptoStore] Save failed for key:', key, err);
            return false;
        }
    }

    /**
     * Loads and decrypts data from localStorage or sessionStorage.
     */
    async function load(key, storageType = 'local') {
        try {
            const fullKey = _currentPrefix + key;
            const raw = (storageType === 'session') 
                ? sessionStorage.getItem(fullKey) 
                : localStorage.getItem(fullKey);

            if (!raw) return null;
            return await decrypt(JSON.parse(raw));
        } catch (err) {
            console.warn('[CryptoStore] Load failed for key:', key, err);
            return null;
        }
    }

    /**
     * 100% Sign-Out Data Purge Standard:
     * Destroys in-memory cryptographic key and wipes all ccms_enc_* keys from both
     * localStorage and sessionStorage.
     */
    function wipeAll() {
        _cryptoKey = null;
        try {
            // Wipe all ccms_enc_ keys from localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.startsWith('ccms_enc_')) {
                    localStorage.removeItem(k);
                }
            }
            // Wipe all ccms_enc_ keys from sessionStorage
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const k = sessionStorage.key(i);
                if (k && k.startsWith('ccms_enc_')) {
                    sessionStorage.removeItem(k);
                }
            }
            console.log('[CryptoStore] 100% Data Purge Complete — all encrypted caches destroyed.');
        } catch (e) {
            console.error('[CryptoStore] Error during purge:', e);
        }
    }

    return { 
        init, 
        encrypt, 
        decrypt, 
        save, 
        load, 
        wipeAll, 
        isReady: () => !!_cryptoKey,
        getPrefix: () => _currentPrefix
    };
})();

if (typeof window !== 'undefined') {
    window.CryptoStore = CryptoStore;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoStore;
}
