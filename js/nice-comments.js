/*jslint browser: true, devel: true, indent: 2*/
/*globals CodeMirror*/

(function () {
  // Hello!
  'use strict';

  var spacing = 10;

  function parse(cm) {
    if (!cm.niceComments.parser.busy) {
      cm.niceComments.parser.busy = true;
      cm.niceComments.parser.postMessage(cm.getValue());
    }
  }

  function updateComments(cm, coms) {
    var l = cm.niceComments.comments.length,
      comments = [],
      current, comment, i;

    // Clear all old comments
    for (i = 0; i < l; i++) {
      cm.removeLineWidget(cm.niceComments.comments[i].widget);
    }

    function newComment() {
      current = {};
      current.start = comment.loc.start.line;
      current.end = comment.loc.end.line;
      current.value = comment.value;
    }

    function saveComment() {
      var cont = document.createElement('div'),
        el = document.createElement('div'),
        last,
        bounds,
        pad;
      cont.className = 'commentCont';
      el.className = 'comment';
      el.innerHTML = current.value;
      cont.appendChild(el);

      current.cont = cont;
      current.el = el;
      current.widget = cm.addLineWidget(current.end - 1, cont, {
        noHScroll: true
      });

      if (comments.length !== 0) {
        last = comments[comments.length - 1];
        bounds = {
          current: el.getBoundingClientRect(),
          last: last.el.getBoundingClientRect()
        };

        if (bounds.current.top - spacing < bounds.last.bottom) {
          pad = bounds.last.bottom - bounds.current.top + spacing;
          cont.style.height = pad + 'px';
          el.style.marginTop = pad + 'px';
        }

        console.log(bounds);
      }

      comments.push(current);
    }

    l = coms.length;

    // Cycle through all the comments from Esprima...
    for (i = 0; i < l; i++) {
      comment = coms[i];
      // If no comments have been worked on before, set one up.
      if (current === undefined) {
        newComment();
      } else {
        // If this comment doesn't immediately follow the previous...
        if (current.end + 1 !== comment.loc.start.line) {
          // ... Save the last comment, and start a new one.
          saveComment();
          console.log(current.value);
          newComment();
        } else {
          // Otherwise, assume these are two parts of the same comment and join
          // them together.
          current.end = comment.loc.end.line;
          current.value += comment.value;
        }
      }
    }
    saveComment();

    console.log(" \n", " \n", "----------------------", "\n ", " \n");
    cm.niceComments.comments = comments;
  }

  CodeMirror.defineOption('niceComments', false, function (cm, val) {
    if (val === false && typeof cm.niceComments !== "undefined") {
      // Remove nice comments from editor
    } else if (val === true && typeof cm.niceComments === "undefined") {
      // Start nice comments.
      // Store everything useful in a niceComments object in the editor instance
      cm.niceComments = {};

      // Setup the parser. Ideally, I'd write something to parse javascript and
      // just fetch out the comments. As it stands, I'm just using esprima in a
      // web worker. This mostly works fine, but breaks on invalid javascript
      // and is very inefficient.
      cm.niceComments.parser = new Worker('js/worker.js');

      cm.niceComments.parser.onmessage = function (event) {
        console.log(event.data);
        if (event.data !== "error") {
          updateComments(cm, event.data);
        }
        cm.niceComments.parser.busy = false;
      };

      // The busy flag makes sure we're only parsing one bit of code at a time.
      cm.niceComments.parser.busy = false;

      cm.niceComments.comments = [];

      cm.on("change", parse);
      parse(cm);
    }
  });

}());