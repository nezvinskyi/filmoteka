import modalTemplate from '../templates/modal.hbs';
import getRefs from '../js/get-refs';
import moviesApi from './api/moviesApi';
import searchGenreDate from './gallery';
import openVideo from './video';
import * as basicLightbox from 'basiclightbox';
import 'basicLightbox/dist/basicLightbox.min.css';
// import { actualyLibraryWached } from './api/storage';

export function onOpenModal(callback) {
  const instance = basicLightbox.create(callback, {
    onClose: instance => {
      refs.bodyRef.classList.remove('overflow-hidden');
    },
  });
  refs.bodyRef.classList.add('overflow-hidden');

  instance.show();
  window.addEventListener('keydown', escCloseModal);

  const closeModalBtn = document.querySelector('.modal-btn-close');

  const closeModal = () => {
    instance.close();
    window.removeEventListener('keydown', escCloseModal);
  };

  function escCloseModal(event) {
    if (event.code === 'Escape') {
      closeModal();
    }
  }

  closeModalBtn.addEventListener('click', closeModal);
  if (moviesApi.getRefs().listGenreModal) {
    moviesApi.getRefs().listGenreModal.addEventListener('click', event => {
      searchGenreDate(event);
      closeModal();
    });
  }
}

const refs = getRefs();

export default function addModal(movie) {
  const markup = modalTemplate(movie);
  const movieId = movie.id;

  onOpenModal(markup);

  const modalContainer = document.querySelector('.modal-container');
  const modalCloseBtn = document.querySelector('.modal-btn-close_container');
  const youtubeModalContainer = document.querySelector('#modal-youtube');

  const youtubeModalBtn = document.querySelector('#trailer');
  const closeYoutubeModalBtn = document.querySelector('#closeYoutubeModalBtn');

  youtubeModalBtn.addEventListener('click', openModalYoutube);
  closeYoutubeModalBtn.addEventListener('click', closeModalYoutube);

  function openModalYoutube() {
    openVideo(movieId);
    modalContainer.classList.add('visually-hidden');
    modalCloseBtn.classList.add('visually-hidden');
    youtubeModalContainer.classList.remove('visually-hidden');
    youtubeModalContainer.classList.add('.is-open');
  }

  function closeModalYoutube() {
    youtubeModalContainer.innerHTML = '';
    youtubeModalContainer.classList.remove('.is-open');
    youtubeModalContainer.classList.add('visually-hidden');
    modalContainer.classList.remove('visually-hidden');
    modalCloseBtn.classList.remove('visually-hidden');
  }
}

//
