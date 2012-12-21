/*jslint browser: true, devel: true, indent: 2*/
/*globals CodeMirror*/

(function (document) {
  'use strict';

  var lintStr = "/*jslint browser: true, devel: true, indent: 2*/\n";
  lintStr += "/*globals CodeMirror*/\n";

  function startEditor(code) {
    var el = document.getElementById("code");

    el.innerHTML = "";

    code = code.replace(lintStr, "");

    new CodeMirror(el, {
      value: code,
      mode: "javascript",
      lineWrapping: true,
      niceComments: true
    });
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