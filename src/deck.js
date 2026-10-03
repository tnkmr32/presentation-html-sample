(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var counter = document.querySelector("[data-current]");
  var total = document.querySelector("[data-total]");
  var index = 0;

  function clamp(i) {
    return Math.min(Math.max(i, 0), slides.length - 1);
  }

  function show(i) {
    index = clamp(i);
    slides.forEach(function (slide, n) {
      slide.classList.toggle("is-active", n === index);
    });
    if (counter) counter.textContent = index + 1;
    history.replaceState(null, "", "#" + (index + 1));
  }

  function next() {
    show(index + 1);
  }

  function prev() {
    show(index - 1);
  }

  document.addEventListener("keydown", function (e) {
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
      e.preventDefault();
      next();
    } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
      e.preventDefault();
      prev();
    }
  });

  document.addEventListener("click", function (e) {
    if (e.button !== 0 || e.target.closest("a, button, input, select, textarea")) return;
    var selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    next();
  });

  if (total) total.textContent = slides.length;

  var initial = parseInt((location.hash || "").replace("#", ""), 10);
  show(isNaN(initial) ? 0 : initial - 1);
})();
