import moviesApi from './api/moviesApi';
import cardList from '../templates/film-list.hbs';
import getRefs from '../js/get-refs';
import { movieAdapter, movieAdapterModal } from './helpers/index';
import { addEventListenerToGallery } from './modal-event-listener';
import { hideLoader, showLoader } from './loader';
import { onError, onFetchError, onInfo } from './components/notifications';
import { paginator, pageCounter } from './components/pagination';
import paginationBtnsTpl from '../templates/pagination.hbs';
import dbUi from './api/db';
import authUser from './api/auth';
import firebase from 'firebase/app';
import 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDn53btmBJPZDSPSp5tBFxkSuER-mlWeuM',
  authDomain: 'filmoteka-blended2.firebaseapp.com',
  projectId: 'filmoteka-blended2',
  storageBucket: 'filmoteka-blended2.appspot.com',
  messagingSenderId: '258840557786',
  appId: '1:258840557786:web:03f63f1bd48af8ad814de3',
};

firebase.initializeApp(firebaseConfig);

const refs = getRefs();

if (authUser.userId) {
  refs.logInBtn.classList.add('visually-hidden');
  refs.logOutBtn.classList.remove('visually-hidden');
} else {
  refs.logInBtn.classList.remove('visually-hidden');
  refs.logOutBtn.classList.add('visually-hidden');
}

refs.authorisationBtn.addEventListener('click', onLogInLogOut);

function onLogInLogOut(event) {
  if (event.target.dataset.action === 'log-in') {
    if (!authUser.userId || authUser.userId === 'undefined') {
      authUser.openModalAuth();
    }
  }

  if (event.target.dataset.action === 'log-out') {
    firebase
      .auth()
      .signOut()
      .then(() => {
        localStorage.clear();
        refs.logInBtn.classList.remove('visually-hidden');
        refs.logOutBtn.classList.add('visually-hidden');
        onInfo('You have signed out. See you, bye!');
        document.location.reload();
      })
      .catch(onFetchError);
  }
}

refs.searchForm.addEventListener('submit', onSearch);

// отрисовка контейнера для галлереи
// перенести в html!!
const galleryContainerMarkup =
  '<div class="container gallery-js" data-cont="container"></div>';
document
  .querySelector('.header')
  .insertAdjacentHTML('afterend', galleryContainerMarkup);
const galleryRef = document.querySelector('.gallery-js');

// первый запуск - отрисовка галлереи, установка пагинации
initGallery();

async function initGallery() {
  pageCounter.page = 1;
  paginator.set('current', 1);

  try {
    const { results, total_results } = await moviesApi.getPopularMovies();
    renderData(results);
    setupPaginationBtns(total_results);
    // addEventListenerToGallery();
    // уже ж стоит слушатель?
    // поменять реф!
    moviesApi.getRefs().divContainer.addEventListener('click', searchGenreDate);
    refs.header.addEventListener('click', onNavClick);
  } catch (error) {
    hideLoader();
    onFetchError('Ooops!Something went wrong :(');
  }
  hideLoader();
}

function onNavClick(event) {
  if (event.target.dataset.action === 'home' || event.target.closest('svg')) {
    initGallery();
    refs.searchForm.elements.query.value = '';
    showLoader();
    refs.libNav.classList.remove('current-page');
    refs.homeNav.classList.add('current-page');
    refs.header.classList.remove('library-header');
    refs.searchForm.classList.remove('visually-hidden');
    refs.headerBtnWrapper.classList.add('visually-hidden');
  }
  if (event.target.dataset.action === 'library') {
    if (!authUser.userId || authUser.userId === 'undefined') {
      authUser.openModalAuth();
    } else {
      refs.homeNav.classList.remove('current-page');
      refs.libNav.classList.add('current-page');
      refs.header.classList.add('library-header');
      refs.searchForm.classList.add('visually-hidden');
      refs.headerBtnWrapper.classList.remove('visually-hidden');
      refs.pagination.classList.add('visually-hidden');
      const initLibraryMarkup = `<span class="library-inittext" style="text-align: center; display: block; margin-top: 25px">Your library is empty</span>`;
      moviesApi.getRefs().gallery.innerHTML = initLibraryMarkup;

      getLibrary();
    }
  }
}

async function onSearch(event) {
  event.preventDefault();

  moviesApi.fetchMethod = 'query';
  pageCounter.page = 1;
  paginator.set('current', 1);

  moviesApi.query = event.currentTarget.elements.query.value.trim();

  if (moviesApi.query === '') {
    return onError(
      'Search result not successful. Please, enter correct movie name and try again',
    );
  }

  try {
    showLoader();
    const { results, total_results } = await moviesApi.getMoviesByQuery();

    if (results.length === 0) {
      refs.searchForm.reset();
      hideLoader();
      return onError(
        'Search was not successful. Please, enter another movie name and try again',
      );
    } else onInfo(`found ${total_results} movies`);
    renderData(results);

    setupPaginationBtns(total_results);
  } catch (error) {
    hideLoader();
    onFetchError('Ooops!Something went wrong :(');
  }
  hideLoader();
}

function renderData(results) {
  refs.pagination.classList.remove('visually-hidden');
  const movieDataList = results.map(item => {
    return movieAdapter(item);
  });
  galleryRef.innerHTML = cardList(movieDataList);
  addEventListenerToGallery();
}

function setupPaginationBtns(total_results) {
  paginator.set('totalResult', total_results);
  const { range, last } = paginator.getPaginationData();
  const markup = paginationBtnsTpl({ range, last });
  const paginationRef = document.querySelector('.pagination-js');
  paginationRef.innerHTML = markup;
  paginationRef.addEventListener('click', onPaginationClick);

  const firstBtnRef = document.querySelector('[data-nav="first"]');
  const lastBtnRef = document.querySelector('[data-nav="last"]');
  const btnsNumRefs = document.querySelectorAll('[data-num]');

  // подсветить текущую кнопку, убрать лишние элементы на краям диапазона
  btnsNumRefs.forEach(el => {
    if (el.textContent == pageCounter.page) {
      el.classList.add('active');
    }
  });

  if (pageCounter.page > 3) {
    firstBtnRef.classList.remove('visually-hidden');
  }
  if (pageCounter.page > 4) {
    firstBtnRef.nextElementSibling.classList.remove('visually-hidden');
  }
  if (pageCounter.page > paginator.getPaginationData().last - 3) {
    lastBtnRef.classList.add('visually-hidden');
  }
  if (pageCounter.page > paginator.getPaginationData().last - 4) {
    lastBtnRef.previousElementSibling.classList.add('visually-hidden');
  }
}

function onPaginationClick(e) {
  if (!e.target.hasAttribute('data-nav') && !e.target.hasAttribute('data-num'))
    return;

  if (e.target.dataset.nav === 'prev') {
    if (pageCounter.page <= 1) return;
    pageCounter.decrement();
  } else if (e.target.dataset.nav === 'first') {
    pageCounter.page = 1;
  } else if (e.target.dataset.nav === 'next') {
    if (pageCounter.page >= paginator.getPaginationData().last) return;
    pageCounter.increment();
  } else if (e.target.dataset.nav === 'last') {
    pageCounter.page = paginator.getPaginationData().last;
  } else {
    pageCounter.page = e.target.dataset.num;
  }
  paginator.set('current', pageCounter.page);

  if (moviesApi.fetchMethod === 'popular') {
    renderPopularGallery();
  } else if (moviesApi.fetchMethod === 'query') {
    renderSearchGallery();
  } else if (moviesApi.fetchMethod === 'genre') {
    renderGenreGallery();
  } else if (moviesApi.fetchMethod === 'year') {
    renderDateGallery();
  }
  setupPaginationBtns(paginator.getPaginationData().totalResult);
}

async function renderSearchGallery() {
  const { results, total_results } = await moviesApi.getMoviesByQuery();
  renderData(results);
}

async function renderPopularGallery() {
  const { results, total_results } = await moviesApi.getPopularMovies();
  renderData(results);
}

async function renderGenreGallery() {
  const { results, total_results } = await moviesApi.getSearchGenres();
  renderData(results);
}

async function renderDateGallery() {
  const { results, total_results } = await moviesApi.getSearchYear();
  renderData(results);
}

async function initGenreGallery(e) {
  e.preventDefault();

  moviesApi.fetchMethod = 'genre';
  pageCounter.page = 1;
  paginator.set('current', 1);

  // clear active status of library buttons
  refs.btnWatched.classList.remove('btn-active-page');
  refs.btnQueue.classList.remove('btn-active-page');

  const genre = await e.target;
  moviesApi.searchGenre = genre.dataset.id;

  try {
    showLoader();
    const { results, total_results } = await moviesApi.getSearchGenres();
    setupPaginationBtns(total_results);
    renderData(results);
    addEventListenerToGallery();
    moviesApi.getRefs().divContainer.addEventListener('click', searchGenreDate);
  } catch (error) {
    hideLoader();
    onFetchError('Ooops!Something went wrong :(');
  }
  hideLoader();
}

async function initDateGallery(e) {
  moviesApi.fetchMethod = 'year';
  pageCounter.page = 1;
  paginator.set('current', 1);

  // clear active status of library buttons
  refs.btnWatched.classList.remove('btn-active-page');
  refs.btnQueue.classList.remove('btn-active-page');

  try {
    const date = await e.target.textContent;
    moviesApi.searchYear = date;
    showLoader();
    const { results, total_results } = await moviesApi.getSearchYear();

    renderData(results);
    addEventListenerToGallery();

    setupPaginationBtns(total_results);

    moviesApi.getRefs().divContainer.addEventListener('click', searchGenreDate);
  } catch (error) {
    hideLoader();
    onFetchError('Ooops!Something went wrong :(');
  }
  hideLoader();
}

export default function searchGenreDate(e) {
  if (e.target.dataset.search === 'ok') {
    initGenreGallery(e);
  } else if (e.target.dataset.set === 'releaseDate') {
    initDateGallery(e);
  } else {
    return;
  }
}

// localStorage check and first render from localStorage

function getLibrary() {
  //если пустой - ошибка!!!
  const { btnWatched, btnQueue } = getRefs();
  let keys = Object.keys(localStorage);
  let arr = [];
  for (let key of keys) {
    let keyName = `${key}`;
    arr.push(keyName);
  }

  const localStorageKeys = arr.map(item => {
    if (item === 'watched_fb' || item === 'queue_fb') {
      let data = item;
      return data;
    }
  });

  btnWatched.classList.remove('btn-active-page');
  btnQueue.classList.remove('btn-active-page');

  if (localStorageKeys.includes('watched_fb')) {
    showLoader();
    dbUi.getAllWatchedData().then(data => {
      if (data === undefined) {
        queueMoviesHandler();
      }

      hideLoader();

      if (data !== undefined) {
        btnWatched.classList.add('btn-active-page');
        btnQueue.classList.remove('btn-active-page');
      }

      renderFirebaseData(data);
    });
  }

  function queueMoviesHandler() {
    if (localStorageKeys.includes('queue_fb')) {
      showLoader();
      dbUi.getAllQueueData().then(data => {
        renderFirebaseData(data);
        hideLoader();
      });

      btnQueue.classList.add('btn-active-page');
      btnWatched.classList.remove('btn-active-page');
    }
  }
}

function renderFirebaseData(data) {
  if (data == null) {
    return;
  }

  const movieDataList = data.map(item => {
    let data = movieAdapterModal(item);
    return data;
  });
  const containerFilmRef = document.querySelector('[data-cont="container"]');
  containerFilmRef.innerHTML = cardList(movieDataList);
}
