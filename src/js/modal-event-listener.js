import moviesApi from './api/moviesApi';
import addModal from './modal';
import { movieAdapterModal } from './helpers/index';
import { onClickToWatchedHandler, onClickToQueueHandler } from './api/storage';

export function addEventListenerToGallery() {
  moviesApi.getRefs().gallery.addEventListener('click', onGalleryClick);
}

function onGalleryClick(event) {
  if (event.target.className !== 'card-img') return;

  moviesApi.movieId = event.target.dataset.id;
  moviesApi.getById().then(renderModal);
}

function renderModal(movie) {
  addModal(movieAdapterModal(movie));
  onClickToQueueHandler(movie);
  onClickToWatchedHandler(movie);
}
