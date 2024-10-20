window.onload = function () {
  setTimeout(() => {
    const preload = document.getElementById("preloader-stage");
    preload.style.opacity = 0;
    setTimeout(function () {
      preload.remove();
    }, 1200);
  }, 1000);
};
