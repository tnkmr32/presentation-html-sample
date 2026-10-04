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

  // URL の # は、数字ならスライド番号、それ以外なら要素の id として扱う
  // (引用番号リンク [1](#ref-1) で参考文献スライドへ移動する)。
  function showHash() {
    var hash = decodeURIComponent((location.hash || "").replace("#", ""));
    var n = parseInt(hash, 10);
    if (String(n) === hash) return show(n - 1);
    var target = hash && document.getElementById(hash);
    var slide = target && target.closest(".slide");
    show(slide ? slides.indexOf(slide) : index);
  }

  window.addEventListener("hashchange", showHash);
  showHash();
})();
