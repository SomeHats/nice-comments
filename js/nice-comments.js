/*jslint browser: true, devel: true, indent: 2*/
/*globals CodeMirror, Worker*/

(function () {
  /*
  Hello! I'm a code comment. Click me to edit me. Oh, and I can do
  <a href="https://developer.mozilla.org/en/docs/HTML">HTML</a> too!
  */
  'use strict';

  // How far should there be between each comment?
  var spacing = 10;

  // If the parser isn't already working, send it some new data.
  function parse(cm) {
    if (!cm.niceComments.parser.busy) {
      cm.niceComments.parser.busy = true;
      cm.niceComments.parser.postMessage(cm.getValue());
    }
  }

  // Make sure there's space between all the comments. This is a little dumb
  // as it sets the spacing on all comments, regardless of which have been
  // edited, but it does for this demo
  function layout(comments) {
    var i, last, current, l, bounds, pad;

    for (i = 1, l = comments.length; i < l; i += 1) {
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

  // Redraw and setup UI stuff for all comments that have been updated
  function updateComments(cm, data) {
    var comments = cm.niceComments.comments,
      coms,
      i,
      l;

    coms = data.comments;

    // Draw a particular comment to the screen, and set any interactions.
    function drawComment(comment, index) {
      if (comment === undefined) { return; }

      // Create the HTML structure for the visible comments
      var cont = document.createElement('div'),
        el = document.createElement('div'),
        end;

      cont.className = 'commentCont';
      el.className = 'comment';
      el.innerHTML = comment.value;
      cont.appendChild(el);

      // Save the elements in the comment object
      comment.cont = cont;
      comment.el = el;

      // Hide comments in the editor. See <a
      // href="http://codemirror.net/doc/manual.html#markText">markText</a> in
      // the CodeMirror docs for more.
      comment.marker = cm.markText(
        {line: comment.start.line - 1, ch: comment.start.column},
        {line: comment.end.line - 1, ch: comment.end.column},
        {collapsed: true, readOnly: true}
      );

      // Attach the element to <a href="http://codemirror.net/">CodeMirror</a>
      comment.widget = cm.addLineWidget(comment.end.line, cont, {
        noHScroll: true,
        above: true
      });

      // Find the start of the next comment or the end of the document
      if (index + 1 < coms.length) {
        end = coms[index + 1].start.line - 1;
      } else {
        end = cm.lineCount() + 1;
      }

      // Mark the area the comment seems to refer to, so we can track it
      comment.area = cm.markText(
        {line: comment.end.line, ch: 0},
        {line: end, ch: 0}
      );

      // When you hover over a comment, highlight the corresponding code
      el.addEventListener("mouseover", function () {
        var range = comment.area.find();
        comment.hoverMarker = cm.markText(
          range.from,
          range.to,
          {className: "com-hover"}
        );
      }, false);

      // and when your mouse leaves the comment, remove the highlight
      el.addEventListener("mouseout", function () {
        if (comment.hoverMarker !== undefined) {
          comment.hoverMarker.clear();
          comment.hoverMarker = undefined;
        }
      }, false);
      
      // When you double-click a comment, open up a HTML editor
      el.addEventListener("dblclick", function () {
        el.innerHTML = "";
        comment.editor = CodeMirror(el, {
          value: comment.value,
          mode: "text/html"
        })
      }, false);

      // Update the stored comment with our new data
      comments[index] = comment;
    }

    // <img src="http://i.imgur.com/6bbId.jpg">
    if (data.redraw === "all") {
      comments = [];
      l = cm.niceComments.comments.length;
      for (i = 0; i < l; i += 1) {
        // Remove comment widget and unhide code comments
        cm.removeLineWidget(cm.niceComments.comments[i].widget);
        cm.niceComments.comments[i].marker.clear();
      }

      // Draw everything
      l = coms.length;
      for (i = 0; i < l; i += 1) {
        drawComment(coms[i], i);
      }
    } else {
      // Redraw specified line widgets
      l = data.redraw.length;
      for (i = 0; i < l; i += 1) {
        cm.removeLineWidget(cm.niceComments.comments[data.redraw[i]].widget);
        drawComment(coms[data.redraw[i]], data.redraw[i]);
      }
    }

    /* <ol>
    <li>Save the comment in the editor instance</li>
    <li>Make sure the comments aren't sitting on top of each other</li>
    <li>Get CodeMirror to position its cursor correctly</li>
    </ol> */
    cm.niceComments.comments = comments;

    layout(comments);

    cm.refresh();
  }

  // Add a setting for nice-comments to CodeMirror so it can be run on setup
  CodeMirror.defineOption('niceComments', false, function (cm, val) {
    if (val === false && cm.niceComments !== undefined) {
      // Remove nice comments from editor
      console.log("remove nice comments");
    } else if (val === true && cm.niceComments === undefined) {
      // Start nice comments.
      // Store everything useful in a niceComments object in the editor instance
      cm.niceComments = {};

      // Setup the parser. Ideally, I'd write something to parse javascript and
      // just fetch out the comments. As it stands, I'm just using <a
      // href="http://esprima.org/">esprima</a> in a <a
      // href="http://developer.mozilla.org/en-US/docs/DOM/Using_web_workers">
      // web worker</a>. This mostly works fine, but breaks on invalid
      // javascript and is very inefficient.
      cm.niceComments.parser = new Worker('js/worker.js');

      // The web worker figures out which comments might have changed, if
      // any. Only these comments are redrawn.
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

      /* <ul>
      <li>The busy flag makes sure the worker is only doing one thing at a
      time</li>
      <li>Set up an empty container for comment objects</li>
      <li>Try to parse the document whenever it changes</li>
      </ul> */
      cm.niceComments.parser.busy = false;

      cm.niceComments.comments = [];

      cm.on("change", parse);
      parse(cm);

      // Capture load events and re-layout the comments. This is to stop
      // images or similar sitting on top of other comments.
      document.addEventListener("load", function (e) {
        layout(cm.niceComments.comments);
      }, true);
    }
  });

}());