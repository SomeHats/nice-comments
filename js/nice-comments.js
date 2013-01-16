/*jslint browser: true, devel: true, indent: 2*/
/*globals CodeMirror, Worker*/

(function () {
  /*
  Hello! I'm a code comment. Click me to edit me. Oh, and I can do
  <a href="https://developer.mozilla.org/en/docs/HTML">HTML</a> too!
  */
  'use strict';

  // Comment holds all the information about a comment, and is in control of
  // rendering and updating it.
  function Comment(comment, cm) {
    this.start = comment.start;
    this.end = comment.end;
    this.value = comment.value;
    this.editor = cm;
  }

  // How much distance space should be between each comment
  Comment.prototype.spacing = 10;

  Comment.prototype.set = function (value) {
    this.value = value;
    this.el.innerHTML = value;
    this.layout();
  };

  // Give the comment a reference to the comment before it
  Comment.prototype.setPrevious = function (previous) {
    if (previous !== undefined) {
      this.previous = previous;
      previous.next = this;
    } else {
      this.previous = undefined;
    }
  };

  // After a comment has been rendered and had 'next' set, it can have any
  // event listeners set and spaced out in relation to other comments
  Comment.prototype.activate = function () {
    this.setBehaviour();
    this.markSource();
    this.layout();
  };

  // Make sure we can keep track of the comment in the text.
  Comment.prototype.markSource = function () {
    var end;

    // Hide comments in the editor. See <a
    // href="http://codemirror.net/doc/manual.html#markText">markText</a> in
    // the CodeMirror docs for more.
    this.marker = this.editor.markText({
      line: this.start.line - 1,
      ch: this.start.column
    }, {
      line: this.end.line - 1,
      ch: this.end.column
    }, {
      collapsed: true,
      readOnly: true
    });

    // Find the start of the next comment or the end of the document
    if (this.next !== undefined) {
      end = this.next.start.line - 1;
    } else {
      end = this.editor.lineCount() + 1;
    }

    // Mark the area the comment seems to refer to, so we can track it
    this.area = this.editor.markText({
      line: this.end.line,
      ch: 0
    }, {
      line: end,
      ch: 0
    });
  };

  // Create DOM stuff and attach to the editor
  Comment.prototype.render = function () {
    var container,
      deleteButton,
      editButton,
      comment,
      content;

    // Create the HTML structure for the visible comments
    container = document.createElement("div");
    comment = document.createElement("div");
    content = document.createElement("div");
    editButton = document.createElement("button");
    deleteButton = document.createElement("button");

    container.className = 'commentCont';
    comment.className = 'comment';
    editButton.className = 'edit';
    deleteButton.className = 'delete';

    content.innerHTML = this.value;

    container.appendChild(comment);
    comment.appendChild(editButton);
    comment.appendChild(deleteButton);
    comment.appendChild(content);

    // Save the elements in the comment object
    this.dom = {
      container: container,
      comment: comment,
      content: content,
      edit: editButton,
      delte: deleteButton
    };

    // Attach the element to <a href="http://codemirror.net/">CodeMirror</a>
    this.widget = this.editor.addLineWidget(this.end.line, container, {
      noHScroll: true,
      above: true
    });
  };

  // Interactivey stuff
  Comment.prototype.setBehaviour = function () {
    var el = this.dom.content,
      comment = this;
    // When you hover over a comment, highlight the corresponding code
    this.dom.comment.addEventListener("mouseover", function (e) {
      var range;
      if (this === e.target && !this.contains(e.relatedTarget)) {
        range = comment.area.find();
        comment.hoverMarker = comment.editor.markText(
          range.from,
          range.to,
          { className: "com-hover" }
        );
      }
    }, false);

    // and when your mouse leaves the comment, remove the highlight
    this.dom.comment.addEventListener("mouseout", function (e) {
      if (!this.contains(e.relatedTarget)) {
        if (comment.hoverMarker !== undefined) {
          comment.hoverMarker.clear();
          comment.hoverMarker = undefined;
        }
      }
    }, false);

    // Start an HTML editor when code is double clicked
    el.addEventListener("dblclick", function () {
      var editor, editEl, marker;

      marker = comment.hoverMarker;
      comment.hoverMarker = undefined;

      el.innerHTML = "";
      editEl = document.createElement("div");
      el.appendChild(editEl);
      editor = comment.editor = new CodeMirror(editEl, {
        value: comment.value,
        mode: "text/html"
      });

      comment.layout();
      editor.focus();

      editor.on("change", function () {
        comment.layout();
      });

      editor.on("blur", function () {
        comment.set(editor.getValue());
        marker.clear();
      });
    }, false);
  };

  // Make sure the gap between this comment and the next is big enough that they
  // don't overlap each other.
  Comment.prototype.layout = function () {
    var next = this.next,
      bounds,
      pad;

    if (next !== undefined) {
      next.dom.container.style.height = 0;
      next.dom.comment.style.marginTop = 0;
      bounds = {
        current: this.dom.comment.getBoundingClientRect(),
        next: next.dom.comment.getBoundingClientRect()
      };

      if (bounds.next.top - this.spacing < bounds.current.bottom) {
        pad = bounds.current.bottom - bounds.next.top + this.spacing;
        next.dom.container.style.height = pad + 'px';
        next.dom.comment.style.marginTop = pad + 'px';
      }
    }
  };

  // Redraw and setup UI stuff for all comments that have been updated
  function updateComments(cm, data) {
    var comments = cm.niceComments.comments,
      comment,
      ref,
      i,
      l;

    // <img src="http://i.imgur.com/6bbId.jpg">
    if (data.redraw === "all") {
      // Remove all the old comments and line widgets etc. from DOM
      l = comments.length;
      for (i = 0; i < l; i += 1) {
        cm.removeLineWidget(comments[i].widget);
        comments[i].marker.clear();
      }

      // Clear old saved comments
      comments = [];

      // Render and save all the new comments
      while (data.comments.length) {
        comment = new Comment(data.comments.shift(), cm);

        comment.render();

        if (comments.length > 0) {
          comment.setPrevious(comments[comments.length - 1]);
          comment.previous.activate();
        }

        comments.push(comment);
      }
      comment.activate();
      // Only redraw comments which have changed.
    } else {
      l = data.redraw.length;
      for (i = 0; i < l; i += 1) {
        ref = data.redraw[i];
        cm.removeLineWidget(comments[ref].widget);
        comment = new Comment(data.comments.shift(), cm);
        if (ref !== 0) {
          comment.setPrevious(comments[ref - 1]);
        }
        comment.draw();
        comments[ref] = comment;
      }
    }

    /* <ol>
    <li>Save the comment in the editor instance</li>
    <li>Make sure the comments aren't sitting on top of each other</li>
    <li>Get CodeMirror to position its cursor correctly</li>
    </ol> */
    cm.niceComments.comments = comments;

    cm.refresh();
  }

  // If the parser isn't already working, send it some new data.
  function parse(cm) {
    if (!cm.niceComments.parser.busy) {
      cm.niceComments.parser.busy = true;
      cm.niceComments.parser.postMessage(cm.getValue());
    }
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
      // images or similar sitting on top of other comments. Hacky.
      document.addEventListener("load", function () {
        var l = cm.niceComments.comments.length,
          i;

        for (i = 0; i < l; i += 1) {
          cm.niceComments.comments[i].layout();
        }
      }, true);
    }
  });

}());