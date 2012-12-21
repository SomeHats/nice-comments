// Some other comment
  var cm,
      widgets = [],
      hidden = [],
      comments = [],
      cursor = {line: -1, ch: 0},
      slc = /\/\/.*/;
  
  function updateComments() {
    console.log('change');
    var code = cm.getValue(),
        lines = code.split("\n"),
        current,
        match,
        index,
        end;
    
    // This removes all the old comment widgets
    while (widgets.length !== 0) {
      var comment = widgets.shift();
      if(comment.parentNode) {
        comment.parentNode.removeChild(comment);
      }
    }
    
    // Unhide hidden lines
    clearHidden();
    
    current = null;
    
    lines.forEach(function(line, number) {
      match = slc.exec(line);
      if (match) {
        index = match.index;
        end = index + match[0].length;
        match = match[0].replace('\/\/', '').trim();
        
        if (current === null) {
          current = {
            line: number,
            comment: match,
            start: {
              line: number,
              ch: index
            },
            end: {
              line: number,
              ch: end
            }
          };
        } else {
          current.comment += "<br>" + match;
          current.end.line = number;
          current.end.ch = end;
        }
        console.log(current);
      } else {
        if (current !== null) {
          var comment = document.createElement('div');
          comment.innerHTML = current.comment;
          comment.className = "comment";
          cm.addWidget({line: number, ch: 0}, comment, {noHScroll: true});
          comment.style.left = "";
          widgets.push(comment);
          
          comments.push(current);
          
          current = null;
          
          showHide(false);
        }
      }
    });
  }
  
  function clearHidden() {
    while (hidden.length !== 0) {
      hidden.shift().clear();
    }
  }
  
  function hide(comment) {
    console.log('ide');
    var marker = document.createElement("div");
    marker.className = 'collapseMarker';
    marker.innerHTML = '\/\/';
    
    var mark = cm.markText(
      comment.start, comment.end,
      {
        clearOnEnter: true,
        replacedWith: marker
      });
    
    marker.addEventListener("click", function() {
      mark.clear();
    }, false);
    
    hidden.push(mark);
  }
  
  function showHide(all) {
    if (all === undefined) all = false;
    
    var lastCursor = cursor;
    cursor = cm.getCursor();
    
    if (all) {
      clearHidden();
      
      comments.forEach(function(comment) {
        if (cursor.line < comment.start.line || cursor.line > comment.end.line) {
          hide(comment);
        }
      });
    } else {
      
    }
    
    /*var lastCursor = cursor;
    cursor = cm.getCursor();
    comments.forEach(function(current) {
      if ((cursor.line < current.start.line || cursor.line > cursor.line) &&
      (all || (lastCursor.line >= current.start.line && lastCursor.line <= cursor.line))) {
        var marker = document.createElement('div');
        marker.className = 'collapseMarker';
        marker.innerHTML = '\/\/';
        var mark = cm.markText(
          current.start,
          current.end,
          {
            clearOnEnter: true,
            replacedWith: marker
          });
          
        marker.addEventListener("click", function() {
          mark.clear();
        }, false);
        hidden.push(mark);
      }
    });*/
  }