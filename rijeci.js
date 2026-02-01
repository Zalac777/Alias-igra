// Katalog svih dostupnih tema
var dostupneTeme = [
    { 
        naziv: "Sport", 
        file: "rijeci/sport.js", 
        variables: {
            lako: "sportRijeciLako",
            srednje: "sportRijeciSrednje",
            tesko: "sportRijeciTesko"
        }
    },
    { 
        naziv: "Filmovi", 
        file: "rijeci/filmovi.js", 
        variables: {
            lako: "filmoviRijeciLako",
            srednje: "filmoviRijeciSrednje",
            tesko: "filmoviRijeciTesko"
        }
    },
    { 
        naziv: "Glazba", 
        file: "rijeci/glazba.js", 
        variables: {
            lako: "glazbaRijeciLako",
            srednje: "glazbaRijeciSrednje",
            tesko: "glazbaRijeciTesko"
        }
    },
    { 
        naziv: "Klasična glazba", 
        file: "rijeci/klasicnaglazba.js", 
        variables: {
            lako: "klasicnaGlazbaLako",
            srednje: "klasicnaGlazbaSrednje",
            tesko: "klasicnaGlazbaTesko"
        }
    },
    { 
        naziv: "Hrana", 
        file: "rijeci/hrana.js", 
        variables: {
            lako: "hranaRijeciLako",
            srednje: "hranaRijeciSrednje",
            tesko: "hranaRijeciTesko"
        }
    },
    { 
        naziv: "Geografija", 
        file: "rijeci/geografija.js", 
        variables: {
            lako: "geografijaRijeciLako",
            srednje: "geografijaRijeciSrednje",
            tesko: "geografijaRijeciTesko"
        }
    },
    { 
        naziv: "Filozofija", 
        file: "rijeci/filozofija.js", 
        variables: {
            lako: "filozofijaRijeciLako",
            srednje: "filozofijaRijeciSrednje",
            tesko: "filozofijaRijeciTesko"
        }
    },

    { 
        naziv: "Biblija", 
        file: "rijeci/biblija.js", 
        variables: {
            lako: "biblijaRijeciLako",
            srednje: "biblijaRijeciSrednje",
            tesko: "biblijaRijeciTesko"
        }
    },
    { 
        naziv: "18+", 
        file: "rijeci/seksualnost.js", 
        variables: {
            lako: "seksualnostRijeciLako",
            srednje: "seksualnostRijeciSrednje",
            tesko: "seksualnostRijeciTesko"
        }
    },
    { 
        naziv: "Psovke", 
        file: "rijeci/psovke.js", 
        variables: {
            lako: "psovkeRijeciLako",
            srednje: "psovkeRijeciSrednje",
            tesko: "psovkeRijeciTesko"
        }
    },



];

// Funkcija za učitavanje tema
async function loadTheme(theme) {
    return new Promise((resolve, reject) => {
        // Provjeri je li script već učitan
        const existingScript = document.querySelector(`script[src="${theme.file}"]`);
        if (existingScript) {
            // Script već postoji, provjeri varijablu
            const words = window[theme.variable];
            if (words && Array.isArray(words)) {
                resolve(words);
                return;
            }
        }
        
        const script = document.createElement('script');
        script.src = theme.file;
        script.onload = () => {
            // Daj browseru malo vremena da procesira
            setTimeout(() => {
                const words = window[theme.variable];
                if (words && Array.isArray(words) && words.length > 0) {
                    resolve(words);
                } else {
                    reject(new Error(`Tema ${theme.naziv} nije ispravno učitana ili varijabla ${theme.variable} ne postoji`));
                }
            }, 10);
        };
        script.onerror = () => {
            reject(new Error(`Nije moguće učitati file ${theme.file}`));
        };
        document.head.appendChild(script);
    });
}

// Export za pristup iz drugih fileova
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dostupneTeme, loadTheme };
}
