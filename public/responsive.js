/* Wrap every table in a horizontal-scroll container so they don't squash on phones.
   Idempotent — safe to run multiple times. */
(function () {
  function wrapTables(root) {
    var tables = (root || document).querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      if (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('table-scroll')) continue;
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { wrapTables(document); });
  } else {
    wrapTables(document);
  }

  // Re-wrap any tables that get added dynamically (quizzes / drills mount content later)
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'TABLE') {
            if (!(n.parentNode && n.parentNode.classList && n.parentNode.classList.contains('table-scroll'))) {
              var wrap = document.createElement('div');
              wrap.className = 'table-scroll';
              n.parentNode.insertBefore(wrap, n);
              wrap.appendChild(n);
            }
          } else if (n.querySelectorAll) {
            wrapTables(n);
          }
        }
      }
    });
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
})();
