import moviesApi from './render-card';
import cardList from '../templates/film-list.hbs';
import getRefs from '../js/get-refs';
import { movieAdapter } from './helpers/index';
import { addEventListenerToGallery } from './modal-event-listener';
import { hideLoader, showLoader } from './loader';
import { onError, onFetchError, onQueryInfo } from './components/notifications';
import {
  paginator,
  getDataPagination,
  pageCounter,
} from './components/pagination';
import paginationBtnsTpl from '../templates/pagination.hbs';

const refs = getRefs();

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
    hideLoader();

    // addEventListenerToGallery();
    // уже ж стоит слушатель?
    // поменять реф!
    moviesApi.getRefs().divContainer.addEventListener('click', searchGenreDate);
    document.addEventListener('click', onNavClick);
  } catch (error) {
    onFetchError();
  }
}

function onNavClick(event) {
  if (event.target.dataset.action === 'home' || event.target.closest('svg')) {
    // console.log('clicked on:', event.target);
    initGallery();
  }
}

async function onSearch(event) {
  event.preventDefault();

  moviesApi.fetchMethod = 'query';
  pageCounter.page = 1;
  paginator.set('current', 1);

  //!!loader start!!
  // showLoader();

  moviesApi.query = event.currentTarget.elements.query.value.trim();

  if (moviesApi.query === '') {
    // hideLoader();
    return onError();
  }

  try {
    const { results, total_results } = await moviesApi.getMoviesByQuery();

    if (results.length === 0) {
      //позже добавить надо будет
      // clearInput();
      return onError();
    } else onQueryInfo(total_results);
    renderData(results);

    setupPaginationBtns(total_results);
  } catch (error) {
    // .then(hideLoader) !!
    onFetchError();
  }
  //!!clearInput!!
}

function renderData(results) {
  refs.pagination.classList.remove('visually-hidden');
  // galleryRef.innerHTML = '';
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
  // console.log('pageCounter:>>', pageCounter.page);
  paginator.set('current', pageCounter.page);
  // console.log(
  //   'currentPaginationPage:>>',
  //   paginator.getPaginationData().current,
  // );

  if (moviesApi.fetchMethod === 'popular') {
    // console.log('render popular', pageCounter.page);
    renderPopularGallery();
  } else if (moviesApi.fetchMethod === 'query') {
    // console.log('render query', pageCounter.page);
    renderSearchGallery();
  } else if (moviesApi.fetchMethod === 'genre') {
    renderGenreGallery();
  } else if (moviesApi.fetchMethod === 'year') {
    renderDateGallery();
  }
  setupPaginationBtns(paginator.getPaginationData().totalResult);

  // подсветить активную кнопку
  // скрыть крайние на краях диапазона
  const firstBtnRef = document.querySelector('[data-nav="first"]');
  const lastBtnRef = document.querySelector('[data-nav="last"]');
  const btnsRefs = document.querySelectorAll('.page-btn');

  btnsRefs.forEach(el => {
    if (el.textContent === pageCounter.page) {
      el.classList.add('active');
    }
  });

  if (pageCounter.page > 4) {
    firstBtnRef.classList.remove('visually-hidden');
    firstBtnRef.nextElementSibling.classList.remove('visually-hidden');
    // firstBtnRef.previousElementSibling.classList.remove('visually-hidden');
  }

  if (pageCounter.page > paginator.getPaginationData().last - 3) {
    lastBtnRef.classList.add('visually-hidden');
    // lastBtnRef.nextElementSibling.classList.add('visually-hidden');
    lastBtnRef.previousElementSibling.classList.add('visually-hidden');
  }
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

  showLoader();

  try {
    const { results, total_results } = await moviesApi.getSearchGenres();
    setupPaginationBtns(total_results);
    renderData(results);
    addEventListenerToGallery();
    moviesApi.getRefs().divContainer.addEventListener('click', searchGenreDate);
    hideLoader();
  } catch (error) {
    onFetchError();
  }
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
    hideLoader();
  } catch (error) {
    onFetchError();
  }
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
