import { createCard, toggleNotes } from './mod_pokemonCard.js';
import { filterCards, orderCards, reverseOrder, deferCards, cardsInOrder } from './mod_filtres.js';
import { Params, loadAllImages } from './mod_Params.js';
import { Pokemon } from './mod_Pokemon.js';
import { openSpriteViewer } from './mod_spriteViewer.js';
import { updateHunt } from './mod_Hunt.js';

/////////////////////////////////////////////////////////
// Peuple l'application à partir des données de indexedDB
export async function appPopulate()
{
  try {
    // Liste principale
    let data = await shinyStorage.keys();
    data = data.map(async key => { return await shinyStorage.getItem(key) });
    data = await Promise.all(data);
    let conteneur = document.querySelector('#mes-chromatiques>.section-contenu');

    if (data.length == 0) {
      document.querySelector('#mes-chromatiques').classList.add('vide');
      document.querySelector('#mes-chromatiques .message-vide>.material-icons').innerHTML = 'cloud_off';
      document.querySelector('#mes-chromatiques .message-vide>span').innerHTML = 'Aucun Pokémon chromatique dans la base de données. Pour en ajouter, complétez une Chasse !';
    }

    for (const pokemon of data) {
      const card = await createCard(pokemon);
      card.addEventListener('click', () => toggleNotes(card.id));
      card.classList.add('defer');
      conteneur.appendChild(card);

      /*// Surveille la position de chaque carte pour charger / décharger les autres
      let previousY = null;
      let previousRatio = 0;
      const deferMonitor = function(entries, observer) {
        entries.forEach(entry => {
          const currentY = entry.boundingClientRect.y;
          const currentRatio = entry.intersectionRatio;
          const isVisible = entry.isIntersecting;

          const card = entry.target;
          const k = cardsInOrder().findIndex(c => c.id == card.id);
          const nextCard = cardsInOrder()[k + 6];
          const prevCard = cardsInOrder()[k - 1];

          if (previousY == null) previousY = currentY;
          //if (previousRatio == null) previousRatio = currentRatio;

          if (currentY < previousY) {
            if (currentRatio > previousRatio) {
              // Vers le bas - entrée
              //console.log('Afficher', nextCard);
              for (let i = k + 1; i <= k + 10; i++) {
                const nextCard = cardsInOrder()[i]
                if (typeof nextCard != 'undefined')
                  nextCard.classList.replace('defer', 'defered');
              }
            } else {
              // Vers le bas - sortie
              //console.log('Cacher', prevCard);
            }
          } else if (currentY > previousY) {
            if (currentRatio < previousRatio) {
              // Vers le haut - sortie
              //console.log('Afficher', prevCard);
            } else {
              // Vers le bas - sortie
              //console.log('Cacher', prevCard);
            }
          }

          previousY = currentY;
          previousRatio = currentRatio;
        });
      }
      const observer = new IntersectionObserver(deferMonitor, {
        threshold: [0.1, 0.5, 1.0],
      });
      observer.observe(card);*/

      // Active le long clic pour éditer
      let longClic;
      let tresLongClic;
      // - à la souris
      card.addEventListener('mousedown', event => {
        if (event.button == 0)
        {
          clearTimeout(longClic);
          longClic = setTimeout(() => { card.classList.add('editing'); }, 1000);
          tresLongClic = setTimeout(async () => {
            card.classList.remove('editing');
            await updateHunt(parseInt(card.id.replace('pokemon-card-', ''))); 
          }, 3000);
      
          card.addEventListener('mouseup', () => { clearTimeout(longClic); clearTimeout(tresLongClic); card.classList.remove('editing'); });
          card.addEventListener('mouseout', () => { clearTimeout(longClic); clearTimeout(tresLongClic); card.classList.remove('editing'); });
        }
      });
      // - au toucher
      card.addEventListener('touchstart', event => {
        clearTimeout(longClic);
        longClic = setTimeout(() => { card.classList.add('editing'); }, 1000);
        tresLongClic = setTimeout(async () => {
          card.classList.remove('editing');
          await updateHunt(parseInt(card.id.replace('pokemon-card-', ''))); 
        }, 3000);
    
        const clear = () => { clearTimeout(longClic); clearTimeout(tresLongClic); card.classList.remove('editing'); };
        card.addEventListener('touchmove', clear, { passive: true });
        card.addEventListener('touchend', clear);
        card.addEventListener('touchcancel', clear);
      }, { passive: true });
    };

    // Pokédex
    conteneur = document.querySelector('#pokedex>.section-contenu');
    const generations = [
      { num: 1, start: 1, end: 151 },
      { num: 2, start: 152, end: 251 },
      { num: 3, start: 252, end: 386 },
      { num: 4, start: 387, end: 493 },
      { num: 5, start: 494, end: 649 },
      { num: 6, start: 650, end: 721 },
      { num: 7, start: 722, end: 809 },
      { num: 8, start: 810, end: 890 }
    ];
    for (const gen of generations) {
      const genConteneur = document.createElement('div');
      genConteneur.classList.add('pokedex-gen');
      for (let i = gen.start; i <= gen.end; i++) {
        const pkmn = document.createElement('span');
        const pokemon = await pokemonData.getItem(String(i));
        pkmn.classList.add('pkspr', 'pokemon', pokemon.name + '-shiny');
        pkmn.dataset.dexid = i;
        pkmn.addEventListener('click', event => openSpriteViewer(i, event));
        genConteneur.appendChild(pkmn);
      }
      if (gen.num > 2) genConteneur.classList.add('defer');
      conteneur.appendChild(genConteneur);
    }

    return '[:)] L\'application est prête !';
  } catch(error) {
    console.error('[:(] Erreur critique de chargement');
    throw error;
  }
}



////////////////////////
// Affiche l'application
export async function appDisplay()
{
  const loadScreen = document.getElementById('load-screen');
  const listeImages = ['./pokesprite/pokesprite.png', './sprites.png'];

  const promiseImages = loadAllImages(listeImages);
  async function promiseInit() {
    const savedFiltres = JSON.parse(await dataStorage.getItem('filtres'));
    if (savedFiltres != null && savedFiltres.length > 0)
    {
      await filterCards(savedFiltres);
      Array.from(document.querySelectorAll('input.filtre')).forEach(input => {
        let correspondances = 0;
        for (const filtre of savedFiltres) {
          const alterFiltres = filtre.split('|');
          if (alterFiltres.includes(input.value)) correspondances++;
        }
        if (correspondances > 0) input.checked = true;
        else input.checked = false;
      });
    }
    else
      await filterCards();

    const savedOrdre = JSON.parse(await dataStorage.getItem('ordre'));
    if (savedOrdre != null)
    {
      await orderCards(savedOrdre);
      Array.from(document.querySelectorAll('input[name=ordre]')).forEach(input => {
        if (input.id == 'ordre-' + savedOrdre) input.checked = true;
      });
    }
    else
      await orderCards();

    const savedOrdreReverse = JSON.parse(await dataStorage.getItem('ordre-reverse'));
    if (savedOrdreReverse == true)
      await reverseOrder();

    deferCards();
    
    document.getElementById('version-fichiers').innerHTML = await dataStorage.getItem('version-fichiers');
    document.getElementById('version-bdd').innerHTML = await dataStorage.getItem('remidex/version-bdd');
    window.tempsFin = Date.now();
    document.getElementById('version-tempschargement').innerHTML = Number(window.tempsFin - window.tempsDebut);
    
    return;
  };

  try {
    await Promise.all([promiseImages, promiseInit()]);
    //document.querySelector('#mes-chromatiques').classList.add('start');
    const byeLoad = loadScreen.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: 100,
      easing: Params.easingStandard,
      fill: 'forwards'
    });
    byeLoad.onfinish = () => {
      loadScreen.remove();
      document.getElementById('mes-chromatiques').classList.add('defered');
      //setTimeout(() => document.querySelector('#mes-chromatiques').classList.remove('start'), 200 + Params.nombreADefer * 80 + 800);
    }
    return '[:)] Bienvenue sur le Rémidex !';
  } catch(error) {
    console.error(error);
  }
}