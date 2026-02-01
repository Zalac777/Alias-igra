// ============================================
// ENCRYPTED PASSWORD PROTECTION FOR 18+ THEMES
// ============================================

// ===== SHA-256 =====

async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// ===== ENKRIPTIRANE LOZINKE =====

const SALT = "a9f3d5e7c2b4f6e8d0c2a4f6e8b0d2c4";

// Keyword -> lozinka. Tema se prepoznaje ako naziv POČINJE s keyword.
const PROTECTED_KEYWORDS = {
    "Psovke": "psovke123",
    "18+":    "odrasli123"
};

// Map: stvarni naziv tema -> hash. Popunjava se pri init.
const ENCRYPTED_PASSWORDS = {};

// Promise koji se resolvira kad su hashovi gotovi
const _protectedReady = (async function() {
    if (typeof dostupneTeme === 'undefined') return;
    for (const tema of dostupneTeme) {
        for (const keyword of Object.keys(PROTECTED_KEYWORDS)) {
            if (tema.naziv.startsWith(keyword)) {
                ENCRYPTED_PASSWORDS[tema.naziv] = await sha256(PROTECTED_KEYWORDS[keyword] + SALT);
            }
        }
    }
})();

// ===== JAVNE FUNKCIJE =====

async function verifyThemePassword(themeName, password) {
    await _protectedReady;
    if (!ENCRYPTED_PASSWORDS.hasOwnProperty(themeName)) return false;
    const inputHash = await sha256(password + SALT);
    return inputHash === ENCRYPTED_PASSWORDS[themeName];
}

function isThemeProtected(themeName) {
    return ENCRYPTED_PASSWORDS.hasOwnProperty(themeName);
}

// ============================================
// PASSWORD MODAL
// ============================================

function checkThemePasswordPrompt(themeName) {
    return new Promise((resolve) => {
        const overlay    = document.getElementById('passwordModal');
        const title      = document.getElementById('modalTitle');
        const warning    = document.getElementById('modalWarning');
        const input      = document.getElementById('modalPasswordInput');
        const error      = document.getElementById('modalError');
        const cancelBtn  = document.getElementById('modalCancel');
        const confirmBtn = document.getElementById('modalConfirm');

        title.textContent   = themeName;
        warning.innerHTML = '⚠️ UPOZORENJE ⚠️ <br><br>Sadržaj neprikladan za osobe mlađe od 18 godina.';
        input.value         = '';
        error.textContent   = '';
        overlay.classList.add('active');

        setTimeout(() => input.focus(), 100);

        function close(result) {
            overlay.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            input.removeEventListener('keydown', onKeydown);
            resolve(result);
        }

        function onCancel() { close(false); }

        async function onConfirm() {
            const pw = input.value.trim();
            if (!pw) {
                error.textContent = 'Unesite lozinku.';
                input.focus();
                return;
            }
            const valid = await verifyThemePassword(themeName, pw);
            if (valid) {
                close(true);
            } else {
                error.textContent = 'Pogresna lozinka.';
                input.value = '';
                input.focus();
            }
        }

        function onKeydown(e) {
            if (e.key === 'Enter')  { e.preventDefault(); onConfirm(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel();  }
        }

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
        input.addEventListener('keydown', onKeydown);
    });
}

// ============================================
// ADMIN PANEL - zaštićen tajnim kodom
// ============================================

const _ADMIN_CODE = "ali4s_adm1n_2025";
let _adminUnlocked = false;

function _initAdmin() {
    async function generatePasswordHash(password) {
        const hash = await sha256(password + SALT);
        console.log('\n🔐 Hash za "' + password + '":\n' + hash + '\n');
        return hash;
    }

    async function addProtectedTheme(themeName, password) {
        const hash = await sha256(password + SALT);
        console.log('\n✅ Dodaj u ENCRYPTED_PASSWORDS:\n"' + themeName + '": "' + hash + '"\n');
    }

    async function testPassword(themeName, password) {
        const result = await verifyThemePassword(themeName, password);
        console.log(result ? '✅ Tocna lozinka za "' + themeName + '"' : '❌ Kriva lozinka za "' + themeName + '"');
        return result;
    }

    window.generatePasswordHash = generatePasswordHash;
    window.addProtectedTheme = addProtectedTheme;
    window.testPassword = testPassword;

    console.log('🔓 Admin panel activated.');
    console.log('  generatePasswordHash("lozinka")');
    console.log('  addProtectedTheme("Tema", "lozinka")');
    console.log('  testPassword("Tema", "lozinka")');
}

window.unlockAdmin = function(code) {
    if (_adminUnlocked) { console.log('Already unlocked.'); return; }
    if (code === _ADMIN_CODE) { _adminUnlocked = true; _initAdmin(); }
    else { console.log('Invalid code.'); }
};

// Export samo javne funkcije
window.verifyThemePassword = verifyThemePassword;
window.isThemeProtected = isThemeProtected;
window.checkThemePasswordPrompt = checkThemePasswordPrompt;
