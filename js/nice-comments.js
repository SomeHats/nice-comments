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

  function layout(comments) {
    var i, last, current, l, bounds, pad;

    for (i = 1, l = comments.length; i < l; i++) {
      if (comments.length !== 0) {
        last = comments[i - 1];
        current = comments[i];
        current.cont.style.height = 0;
        current.el.style.marginTop = 0;
        bounds = {
          current: current.el.getBoundingClientRect(),
          last: last.el.getBoundingClientRect()
        };

        if (bounds.current.top - spacing < bounds.last.bottom) {
          pad = bounds.last.bottom - bounds.current.top + spacing;
          current.cont.style.height = pad + 'px';
          current.el.style.marginTop = pad + 'px';
        }
      }
    }
  }

  function updateComments(cm, data) {
    var comments = cm.niceComments.comments,
      current, comment, i, l, coms;

    coms = data.comments;

    function drawComment(comment, index) {
      var cont = document.createElement('div'),
        el = document.createElement('div'),
        last,
        bounds,
        pad;
      cont.className = 'commentCont';
      el.className = 'comment';
      el.innerHTML = comment.value;
      cont.appendChild(el);

      comment.cont = cont;
      comment.el = el;
      comment.widget = cm.addLineWidget(comment.end.line - 1, cont, {
        noHScroll: true
      });

      comments[index] = comment;
    }

    if (data.redraw === "all") {
      // Redraw ALL the line widgets!
      comments = [];
      l = cm.niceComments.comments.length;
      for (i = 0; i < l; i++) {
        cm.removeLineWidget(cm.niceComments.comments[i].widget);
      }

      // Draw everything
      l = coms.length;
      for (i = 0; i < l; i++) {
        drawComment(coms[i], i);
      }
    } else {
      // Redraw specified line widgets
      l = data.redraw.length;
      for (i = 0; i < l; i++) {
        cm.removeLineWidget(cm.niceComments.comments[data.redraw[i]].widget);
        drawComment(coms[data.redraw[i]], data.redraw[i]);
      }
    }

    cm.niceComments.comments = comments;

    layout(comments);
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
        var d = event.data;
        if (d === "error") {
          console.log("error");
        } else {
          if (d.redraw !== "none") {
            updateComments(cm, d);
          }
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