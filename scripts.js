import './modules/comp_loadSpinner.js';
import { Params, changeTheme, changeAutoMaj, callResize, saveDBpassword } from './modules/mod_Params.js';
import { navigate } from './modules/mod_navigate.js';
import { playEasterEgg } from './modules/mod_easterEgg.js';
import { appStart, checkUpdate, manualUpdate } from './modules/mod_appLifeCycle.js';
import { openFiltres } from './modules/mod_filtres.js';
import { Hunt } from './modules/mod_Hunt.js';



//////////////
// NAVIGATION

// Active les liens de navigation
Array.from(document.querySelectorAll('[data-section]')).forEach(link => {
  link.addEventListener('click', () => navigate(link.dataset.section));
});

// Active le bouton retour / fermer
Array.from(document.querySelectorAll('.bouton-retour')).forEach(bouton => {
  bouton.addEventListener('click', () => history.back());
});



//////////
// FILTRES

// Active le FAB des filtres
document.querySelector('.fab').addEventListener('click', openFiltres);

// L'obfuscator ramène en arrière quand on clique dessus
document.querySelector('.obfuscator').addEventListener('click', () => history.back());



///////////////////
// CHASSES EN COURS

// Active le bouton de création de chasse
document.querySelector('.bouton-new-hunt').addEventListener('click', () => Hunt.build());



////////////////////////
// PARAMÈTRES & À PROPOS

// Active les switch des paramètres
dataStorage.getItem('theme').then(theme => {
  if (theme == 'light')
    document.getElementById('switch-theme').checked = false;
  else
    document.getElementById('switch-theme').checked = true;
});

dataStorage.getItem('check-updates').then(value => {
  if (value == 1)
    document.getElementById('switch-auto-maj').checked = true;
  else
    document.getElementById('switch-auto-maj').checked = false;
});

document.querySelector('[for=switch-theme]').onclick = async event => { event.preventDefault(); return await changeTheme(); };
document.querySelector('[for=switch-auto-maj]').onclick = async event => { event.preventDefault(); return await changeAutoMaj(); };

document.getElementById('mdp-bdd').addEventListener('input', async () => {
  return await saveDBpassword();
});

// Active l'easter egg de la section a-propos
document.querySelector('.easter-egg').onclick = playEasterEgg;

// Prépare le bouton de recherche de mise à jour
let longClic;
let needCheck = 1;
const majButton = document.querySelector('.bouton-recherche-maj');

majButton.addEventListener('mousedown', event => {
  event.preventDefault();
  if (event.button == 0)
  {
    clearTimeout(longClic);
    longClic = setTimeout(() => { needCheck = 0; manualUpdate(); }, 3000);

    majButton.addEventListener('mouseup', () => { clearTimeout(longClic); if (needCheck) checkUpdate(true); });
    majButton.addEventListener('mouseout', () => clearTimeout(longClic));
  }
});

majButton.addEventListener('touchstart', () => {
  event.preventDefault();
  clearTimeout(longClic);
  longClic = setTimeout(() => { needCheck = 0; manualUpdate(); }, 3000);

  majButton.addEventListener('touchend', () => { clearTimeout(longClic); if (needCheck) checkUpdate(true); });
  majButton.addEventListener('touchcancel', () => clearTimeout(longClic));
});



/////////////////////////////
// LANCEMENT DE L'APPLICATION

// Au rechargement de l'appli, indiquer qu'on est sur la section de départ
history.replaceState({section: 'mes-chromatiques'}, '');

// Lancement du service worker
window.addEventListener('load', appStart);

// Gère le redimensionnement de la fenêtre
window.addEventListener('resize', callResize);
window.addEventListener('orientationchange', callResize);