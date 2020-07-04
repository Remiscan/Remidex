import { checkUpdate } from './mod_appLifeCycle.js';

//////////////////////
// Constantes globales
export const Params = {
  layoutPC: 960,
  layoutPClarge: 1140,
  layoutPCcomplet: 1600,
  
  easingStandard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  easingDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easingAccelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',

  spriteSize: 112,

  owidth: false,
  oheight: false,

  nombreADefer: () => { return Math.ceil((Params.oheight ? Params.oheight : 0) / 126); }
};

//////////////////
// Change le thème
export async function changeTheme()
{
  const checkbox = document.getElementById('switch-theme');
  if (checkbox.checked)
  {
    checkbox.checked = false;
    return await setTheme('light');
  }
  else
  {
    checkbox.checked = true;
    return await setTheme('dark');
  }
}


///////////////////////////////////////////////////////
// Change le paramètre de vérification des mises à jour
let settingClicked = false;
export async function changeAutoMaj()
{
  const checkbox = document.getElementById('switch-auto-maj');
  if (checkbox.checked)
  {
    checkbox.checked = false;
    await dataStorage.setItem('check-updates', 0);
  }
  else
  {
    checkbox.checked = true;
    await dataStorage.setItem('check-updates', 1);
    if (!settingClicked)
    {
      settingClicked = true;
      setTimeout(function() { settingClicked = false }, 100);
      checkUpdate();
    }
  }
  return;
}


//////////////////////////////
// Sauvegarde le mdp de la BDD
export async function saveDBpassword()
{
  return await dataStorage.setItem('mdp-bdd', document.getElementById('mdp-bdd').value);
}


//////////////////////////////////////////
// Gère le redimensionnement de la fenêtre
let resizing = false;

export function recalcOnResize() {
  const largeurPage = document.getElementById('largeur-fenetre');
  const hauteurPage = document.getElementById('hauteur-fenetre');

  // owidth = 100vw = largeur totale de la fenêtre, indépendamment de l'affichage ou non des barres de défilement
  const candidWidth = Number(window.getComputedStyle(largeurPage).width.replace('px', ''));
  if (Params.owidth != candidWidth)
    Params.owidth = candidWidth;

  // oheight = 100vh = hauteur totale de la fenêtre, indépendamment de l'affichage ou non de la barre d'URL (au moins pour Chrome)
  //   diffère de window.innerHeight qui dépend de la barre d'URL (et donc change tout le temps => problématique)
  const candidHeight = Number(window.getComputedStyle(hauteurPage).height.replace('px', ''));
  if (Params.oheight != candidHeight)
    Params.oheight = candidHeight;
}

// On détecte le redimensionnement
export function callResize() {
  clearTimeout(resizing);
  resizing = setTimeout(recalcOnResize, 100);
}


///////////////////////////////////////
// Charge toutes les images d'une liste
export function loadAllImages(liste)
{
  let promises = [];
  liste.forEach((e, k) => {
    promises[k] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = function() { resolve(k) }
      img.onerror = function() { reject(k) }
      img.src = e;
    });
  });
  return Promise.all(promises);
}


////////////
// Sync wait
export function wait(time) { return new Promise(resolve => setTimeout(resolve, time)); }