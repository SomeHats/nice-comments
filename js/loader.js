(function (document) {
  'use strict';

  function startEditor(code) {
    var el = document.getElementById("code");
    
    el.innerHTML = "";
    
    CodeMirror(el, {
      value: code,
      mode: "javascript",
      lineWrapping: true,
      niceComments: true
    });

    //window.niceComments(editor);
  }

  function loadCode() {
    // Try to load the source code of this demo
    var r = new XMLHttpRequest();

    r.onreadystatechange = function () {
      if (r.readyState === 4) {
        startEditor(r.responseText);
      }
    };
    r.open('GET', 'js/nice-comments.js');
    r.send(null);
  }

  document.addEventListener('DOMContentLoaded', loadCode, false);
}(document));