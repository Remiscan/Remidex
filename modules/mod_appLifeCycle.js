import { appPopulate, appDisplay } from './mod_appContent.js';
import { recalcOnResize } from './mod_Params.js';
import { notify } from './mod_notification.js';
import { Pokemon } from './mod_Pokemon.js';

/////////////////////////////////////////////////////
// On enregistre le service worker
// et on le met à jour si la version du site a changé
let currentWorker;
let appCached;
let appChargee;
let isStarted = 0;
let updateAvailable = 0;

async function initServiceWorker()
{
  try {
    const registration = await navigator.serviceWorker.register('/remidex/service-worker.js');
    console.log('Le service worker a été enregistré', registration);

    // On détecte les mises à jour du service worker lui-même
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state == 'activated')
        {
          console.log('[sw] Service worker mis à jour');
          currentWorker = newWorker;
        }
      });
    });

    currentWorker = registration.installing || navigator.serviceWorker.controller || registration.active;
    return currentWorker;
  } catch(error) {
    console.error(error);
    throw null;
  }
}



/////////////////////////////////////////////////////////
// Démarre l'application (update? => populate => display)
export async function appStart()
{
  if (!'serviceWorker' in navigator)
    throw 'Application non supportée.';

  // Étape 1 : on vérifie si l'application est installée localement

  let log;
  try {
    let filesInstalled = false;
    let dataInstalled = false;
    let serviceWorkerReady = navigator.serviceWorker.controller != null;

    // On vérifie si les données sont installées
    await Promise.all([dataStorage.ready(), shinyStorage.ready(), pokemonData.ready()]);
    const installedVersion = await dataStorage.getItem('version');
    if (installedVersion !== null)
      dataInstalled = true;

    // On vérifie si les fichiers sont installés
    const keys = await caches.keys();
    const trueKeys = keys.filter(e => e.includes('remidex-sw-' + installedVersion));
    if (trueKeys.length >= 1)
      filesInstalled = true;

    if (filesInstalled && dataInstalled && serviceWorkerReady)
    {
      appCached = true;
      log = '[:)] L\'application est déjà installée localement.';
      initServiceWorker();
    }
    else
    {
      appCached = false;
      throw '[:(] L\'application n\'est pas installée localement';
    }
  }

  // Étape 2 : si la réponse est non, on installe l'application
  //   si l'installation est impossible, on arrête et on retentera une fois le service worker disponible

  catch(error) {
    console.log(error);
    console.log('[:|] Préparation de l\'installation...');
    await initServiceWorker();
    log = await appUpdate();
  }

  try {
    appChargee = 'loading';
    console.log(log);
    console.log('[:)] Chargement de l\'application...');
    recalcOnResize();

    // Étape 3 : on peuple l'application à partir des données locales
    log = await appPopulate();
    console.log(log);

    // Étape 4 : on affiche l'application
    log = await appDisplay();
    console.log(log);
    appChargee = 'loaded';

    // Fini !! :)
    appChargee = true;

    const willCheckUpdate = await dataStorage.getItem('check-updates');
    if (willCheckUpdate == 1) {
      await navigator.serviceWorker.ready;
      return checkUpdate();
    } else {
      return;
    }
  }

  // En cas d'erreur critique, on propose de réinstaller
  catch(error) {
    console.error(error);
    appChargee = false;
    if (error == '[:(] Erreur critique de chargement')
    {
      async function forceUpdateNow() {
        [dataStorage, shinyStorage, pokemonData].forEach(async store => {
          const keys = await store.keys();
          keys.forEach(k => store.removeItem(k));
        });
        manualUpdate(true);
      };
      document.getElementById('load-screen').remove();
      return notify('Échec critique du chargement...', 'Réinstaller', 'refresh', forceUpdateNow, 2147483647);
    }
    else if (error != '[:(] Service worker indisponible')
    {
      return notify('Échec du chargement...', 'Réessayer', 'refresh', () => { location.reload() }, 2147483647);
    }
  }
}



///////////////////////////
// Met à jour l'application
function appUpdate(update = false, force = false)
{
  const version = Date.now()
  return new Promise((resolve, reject) => {
    if (typeof currentWorker === 'undefined' || currentWorker == null)
      return reject('[:(] Service worker indisponible');

    // On demande au service worker de mettre à jour l'appli' et on attend sa réponse
    const chan = new MessageChannel();

    // On se prépare à recevoir la réponse
    chan.port1.onmessage = function(event)
    {
      if (event.data.error)
      {
        console.error(event.data.error);
        reject('[:(] Erreur de contact du service worker');
      }
      else
      {
        if (update)
        {
          document.querySelector('.progression-maj').style.setProperty('--progression', 1);
          setTimeout(function() { location.reload(true); }, 100);
        }
        resolve('[:)] Installation terminée !');
      }
    }

    // On contacte le SW
    currentWorker.postMessage({'action': 'update', 'force': force}, [chan.port2]);

    // On surveille l'avancée du SW grâce aux messages qu'il envoie
    let totalLoaded = 0;
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.loaded)
      {
        totalLoaded++;
        document.querySelector('.progression-maj').style.setProperty('--progression', totalLoaded / (event.data.total + 1));
      }
      else if (!event.data.loaded && event.data.erreur)
        reject('[:(] Certains fichiers n\'ont pas pu être récupérés');
    });
  });
}



////////////////////////////////////////
// Met à jour l'application manuellement
export async function manualUpdate(force = false)
{
  try {
    if (!navigator.onLine)
      throw 'Connexion internet indisponible';
    if (!'serviceWorker' in navigator)
      throw 'Service worker indisponible';

    notify('Mise à jour forcée...');
    document.getElementById('notification').classList.add('installing');
    const result = await appUpdate(true, force);
    return console.log(result);
  }
  catch (raison) {
    console.error(raison);
    document.getElementById('notification').classList.remove('installing');
    notify('Échec de mise à jour', 'Réessayer', 'update', manualUpdate, 10000);
  }
}



/////////////////////////////////////////////
// Vérifie la disponibilité d'une mise à jour
let checkingUpdate = 0;
export function checkUpdate(checkNotification = false)
{
  const notif = document.getElementById('notification');
  if (notif.classList.contains('on') || checkingUpdate)
    return;
  checkingUpdate = 1;
  const texteSucces = 'Mise à jour disponible...';

  return new Promise((resolve, reject) => {
    if (!navigator.onLine)
      return reject('Pas de connexion internet');
    if (updateAvailable)
      return resolve(texteSucces);

    // On lance mod_update.php pour récupérer les données les plus récentes
    fetch('/remidex/mod_update.php?type=check&date=' + Date.now())
    .then(response => {
      if (response.status == 200)
        return response;
      else
        throw '[:(] Erreur ' + response.status + ' lors de la requête';
    })
    .then(response => { return response.json(); })
    .then(data => {
      if ((localStorage.getItem('remidex/version-fichiers') != data['version-fichiers']) || (localStorage.getItem('remidex/version-bdd') != data['version-bdd']))
      {
        updateAvailable = 1;
        console.log('[:|] Mise à jour détectée');
        console.log('     Installé : fichiers v. ' + localStorage.getItem('remidex/version-fichiers') + ', bdd v. ' + localStorage.getItem('remidex/version-bdd'));
        console.log('   Disponible : fichiers v. ' + data['version-fichiers'] + ', bdd v. ' + data['version-bdd']);
        return texteSucces;
      }
      else
      {
        updateAvailable = 0;
        console.log('[:)] Aucune mise à jour disponible');
        console.log('     Installé : fichiers v. ' + localStorage.getItem('remidex/version-fichiers') + ', bdd v. ' + localStorage.getItem('remidex/version-bdd'));
        throw 'Pas de mise à jour';
      }
    })
    .then(result => resolve(result))
    .catch(error => reject(error))
  })
  .then(result => {
    notify(result, 'Installer', 'update', manualUpdate, 10000);
    checkingUpdate = 0;
  })
  .catch(error => {
    if (checkNotification)
      notify(error);
    checkingUpdate = 0;
  });
}



/////////////////////////////////////////
// Vérifie si l'appli peut être installée
function checkInstall()
{
  let installPrompt;
  const installBouton = document.getElementById('install-bouton');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    installBouton.classList.add('on');

    installBouton.addEventListener('click', e => {
      installBouton.classList.remove('on');
      installPrompt.prompt();
      installPrompt.userChoice
      .then(choix => {
        if (choix.outcome === 'accepted')
          console.log('[app] Installation acceptée !');
        else
          console.log('[app] Installation refusée');
          installPrompt = null;
      });
    });
  });

  window.addEventListener('appinstalled', e => {
    console.log('[app] Installation terminée !');
  });
}