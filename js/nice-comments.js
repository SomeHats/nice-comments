/*jslint browser: true, devel: true, indent: 2*/
/*globals CodeMirror, Worker*/

(function () {
  /*
  Hello! I'm a code comment. Click me to edit me. Oh, and I can do
  <a href="https://developer.mozilla.org/en/docs/HTML">HTML</a> too!
  */
  'use strict';

  // Check browser support for mouseenter/mouseleave events:
  var supports = {
    mouseenter: (document.documentElement.onmouseenter !== undefined)
  };

  // Comment holds all the information about a comment, and is in control of
  // rendering and updating it.
  function Comment(comment, cm) {
    this.start = comment.start;
    this.end = comment.end;
    this.value = comment.value;
    this.cm = cm;
  }

  // How much distance space should be between each comment
  Comment.prototype.spacing = 10;

  Comment.prototype.set = function (value) {
    this.value = value;
    this.dom.content.innerHTML = value;
    this.dom.comment.classList.remove("editing");
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
    this.marker = this.cm.markText({
      line: this.start.line - 1,
      ch: this.start.column
    }, {
      line: this.end.line - 1,
      ch: this.end.column
    }, {
      collapsed: true,
      readOnly: true
    });

    this.marker.comment = this;

    // Find the start of the next comment or the end of the document
    if (this.next !== undefined) {
      end = this.next.start.line - 1;
    } else {
      end = this.cm.lineCount() + 1;
    }

    // Mark the area the comment seems to refer to, so we can track it
    this.area = this.cm.markText({
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
    editButton.appendChild(document.createTextNode("e"));
    deleteButton.appendChild(document.createTextNode("x"));

    container.appendChild(comment);
    comment.appendChild(editButton);
    comment.appendChild(deleteButton);
    comment.appendChild(content);

    // Save the elements in the comment object
    this.dom = {
      container: container,
      comment: comment,
      content: content,
      editButton: editButton,
      deleteButtom: deleteButton
    };

    // Attach the element to <a href="http://codemirror.net/">CodeMirror</a>
    this.widget = this.cm.addLineWidget(this.start.line - 1, container, {
      noHScroll: true
    });
  };

  // Interactivey stuff
  Comment.prototype.setBehaviour = function () {
    var el = this.dom.comment,
      comment = this;
    // When you hover over a comment, highlight the corresponding code
    function mouseEnter(e) {
      if (comment.editor === undefined) {
        comment.highlight();
      }
      el.classList.add("hover");
    }

    // and when your mouse leaves the comment, remove the highlight
    function mouseLeave(e) {
      if (comment.editor === undefined) {
        comment.removeHighlight();
      }
      el.classList.remove("hover");
    }

    // Use native mouseenter/leave for browsers that support <a
    // href="http://www.w3.org/TR/DOM-Level-3-Events/#event-type-mouseenter">
    // DOM Level 3 Events
    if (supports.mouseenter) {
      el.addEventListener("mouseenter", mouseEnter, false);
      el.addEventListener("mouseleave", mouseLeave, false);
    } else {
      // Fall back to the polyfill for those that don't
      el.addEventListener("mouseover", function (e) {
        if (comment.hoverCheck(e, this)) {
          mouseEnter(e);
        }
      }, false);
      el.addEventListener("mouseout", function (e) {
        if (comment.hoverCheck(e, this)) {
          mouseLeave(e);
        }
      }, false);
    }

    // Start an HTML editor when code is double clicked
    this.dom.content.addEventListener("dblclick", function (e) {
      e.preventDefault();
      comment.edit();
    }, false);

    // ... or when the edit button is clicked
    this.dom.editButton.addEventListener("click", function () {
      comment.edit();
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

  Comment.prototype.edit = function () {
    var self = this, activity = true, editor, editEl, marker;

    this.highlight();

    this.dom.comment.classList.add("editing");

    this.dom.content.innerHTML = "";
    editEl = document.createElement("div");
    this.dom.content.appendChild(editEl);
    editor = this.editor = new CodeMirror(editEl, {
      value: this.value,
      mode: "text/html"
    });

    this.layout();
    editor.focus();

    editor.on("cursorActivity", function (cm) {
      if (!cm.somethingSelected()) {
        activity = true;
      }
    });

    editEl.addEventListener("keydown", function (e) {
      var key;
      if (activity === false) {
        key = e.key || e.keyCode || e.which;
        if (key === 38 || key === 37) {
          // Up & left
          self.cm.niceComments.suppressCursor = true;
          self.cm.setCursor(self.marker.find().from);
          self.cm.focus();
        } else if (key === 39 || key === 40) {
          // Right & down
          self.cm.niceComments.suppressCursor = true;
          self.cm.setCursor(self.marker.find().to);
          self.cm.focus();
        }
      }
      activity = false;
    }, false);

    editor.on("change", function () {
      self.layout();
    });

    editor.on("blur", function () {
      self.removeHighlight();
      self.set(editor.getValue());
      self.editor = undefined;
    });
  };

  // Highlight code that corresponds to this comment
  Comment.prototype.highlight = function () {
    var range;
    this.removeHighlight();
    range = this.area.find();
    this.hoverMarker = this.cm.markText(
      {
        line: range.from.line,
        ch: 0
      },
      range.to,
      { className: "com-hover" }
    );
  };

  // Remove highlight on relevant code
  Comment.prototype.removeHighlight = function () {
    if (this.hoverMarker !== undefined) {
      this.hoverMarker.clear();
      this.hoverMarker = undefined;
    }
  };

  // Polyfill mouseenter & mouseleave events. Taken from the Mootools core:
  // <a href="https://github.com/mootools/mootools-core/blob/master/Source/Element/Element.Event.js#L152-L156">
  // Element.Event.js</a>
  Comment.prototype.hoverCheck = function (event, element) {
    var related = event.relatedTarget;
    if (related === null) {
      return true;
    }
    if (!related) {
      return false;
    }
    return (related !== element && related.prefix !== 'xul' && !element.contains(related));
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
    var changeContext = false;
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

      // Is the cursor on the border of any of the comment areas?
      cm.on("cursorActivity", function () {
        var cursor, comment, markers, marker, i, l;

        changeContext = false;

        if (cm.niceComments.suppressCursor) {
          cm.niceComments.suppressCursor = false;
          return;
        }

        if (!cm.somethingSelected()) {
          cursor = cm.getCursor();
          markers = cm.findMarksAt(cursor);
          for (i = 0, l = markers.length; i < l; i += 1) {
            if (markers[i].hasOwnProperty("comment")) {
              comment = markers[i].comment;
              marker = markers[i].find();
              if ((marker.from.line === cursor.line &&
                  marker.from.ch === cursor.ch) ||
                  (marker.to.line === cursor.line &&
                  marker.to.ch === cursor.ch)) {
                changeContext = comment;
                break;
              }
            }
          }
        }
      });

      // Try to work out where to put the cursor according to this.
      cm.display.wrapper.addEventListener("keydown", function (e) {
        var key;
        console.log(cm.display.wrapper.classList);
        if (changeContext !== false) {
          key = e.key || e.keyCode || e.which;

          if (key === 38 || key === 37) {
            // Up & left - start at the end
            changeContext.edit();
            changeContext.editor.setCursor({
              line: changeContext.editor.lineCount() + 1,
              ch: 0
            });
          } else if (key === 39 || key === 40) {
            // Right & down - start at the start
            changeContext.edit();
          }
        }
        changeContext = false;
      }, false);

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