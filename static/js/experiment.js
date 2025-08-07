var log_records = [];  // Array of log records returned to Flask
var log_remarks = [];  // Array of remarks to be shown again in the second review

var reviewRemarksRight = {};
var reviewRemarksLeft = {};

$(window).on("load", function(){

    $("#submitter").click(function () {
        logData("pageClosed", "pageClosed");

        var data = {
            'data': log_records
        }
        var myData = JSON.stringify(data);

        $("#hidden_log").val(myData);

        var string_remarks = JSON.stringify(log_remarks);
        sessionStorage.setItem("remarks", string_remarks);
    });
});


function retrieveSavedRemarks() {
	var retrieved_remarks = JSON.parse(sessionStorage.getItem("remarks"));
	return retrieved_remarks;
}

var hunks = [];

function initMergely(elementId, height, contextHeight, width, lineNumberLeft, contentLeft, lineNumberRight, contentRight, prefixLineCount, prefix, suffix) {
	$(elementId).mergely({
		width: width,
		height: height,
		wrap_lines: true,
		fadein: '',
		cmsettings: { readOnly: true, mode: "text/x-java", autoresize: false, lineWrapping: true, gutters: ["remarks", "CodeMirror-linenumbers"]},
		lhs: function(setValue) {
			setValue(contentLeft);
		},
		rhs: function(setValue) {
			setValue(contentRight);
		},
		loaded: function() {
			var el = $(elementId);
			el.mergely('cm', 'lhs').options.firstLineNumber = lineNumberLeft;
			el.mergely('cm', 'rhs').options.firstLineNumber = lineNumberRight;
			el.mergely('cm', 'lhs').on("gutterClick", handleGutterClick);
			el.mergely('cm', 'rhs').on("gutterClick", handleGutterClick);
			el.mergely('cm', 'lhs').hunkId = elementId.replace('#compare', '');
			el.mergely('cm', 'rhs').hunkId = elementId.replace('#compare', '');
			el.mergely('cm', 'lhs').hunkSide = 0;
			el.mergely('cm', 'rhs').hunkSide = 1;
			//store prefix/suffix settings only on the left side
			el.mergely('cm', 'lhs').ps_height = contextHeight;
			el.mergely('cm', 'lhs').ps_linecount = prefixLineCount;
			el.mergely('cm', 'lhs').ps_prefix = prefix;
			el.mergely('cm', 'lhs').ps_lhs = contentLeft;
			el.mergely('cm', 'lhs').ps_rhs = contentRight;
			el.mergely('cm', 'lhs').ps_suffix = suffix;
			el.mergely('cm', 'lhs').ps_prefixActive = false;
			// el.mergely('update', function() {ensureViewCorrectSized(elementId)});
			hunks.push(el);
		}
	});
	//computeHunkLines();
}


function logData(action, data){
    // console.log(`${new Date().getTime()};${action};${data}\n`)
    log_records.push(`${new Date().getTime()};${action};${data}\n`);
}


// function makeMarker(msg) {
// 	var marker = document.createElement("div");
// 	marker.title = msg;
// 	marker.style.color = "#dd0000";
// 	marker.innerHTML = "■";
// 	marker.style.fontSize = "18px";
// 	return marker;
// }

function makeMarker(msg){
	var marker = document.createElement("div");
	var icon = marker.appendChild(document.createElement("span"));
	icon.innerHTML = "!!";
	icon.className = "lint-error-icon";
	var name = marker.appendChild(document.createElement("span"))
	name.innerHTML = "<b>You: </b>";
	marker.appendChild(document.createTextNode(msg));
	marker.className = "lint-error";
/*	var marker = document.createElement("div");
	var icon = marker.appendChild(document.createElement("pre"));
	var icon1 = marker.appendChild(document.createElement("code"));
	icon1.id="formatted-code";
	icon1.textContent=msg;
	icon.innerHTML = "!!";
	icon.className = "lint-error-icon";
	marker.className = "lint-error";
	//marker.appendChild(document.createTextNode(msg)); */
	return marker;
}

var instance;
var lineNumber;


function handleGutterClick(instanceTest, lineNumberTest, gutter, clickEvent) {
	instance = instanceTest;
	lineNumber = lineNumberTest;

	var realLineNumber = lineNumber + instance.options.firstLineNumber;

	if (instance.hunkSide == 1) {
		if (!reviewRemarksRight[instance.hunkId]) {
			reviewRemarksRight[instance.hunkId] = {};
		}

		if (realLineNumber in reviewRemarksRight[instance.hunkId]) {
			prevMsg = reviewRemarksRight[instance.hunkId][realLineNumber].node.lastChild.textContent;
			document.getElementById("review-remark").value = prevMsg;
		}

	} else{
		if (!reviewRemarksLeft[instance.hunkId]) {
			reviewRemarksLeft[instance.hunkId] = {};
		}

		if (realLineNumber in reviewRemarksLeft[instance.hunkId]){
			prevMsg = reviewRemarksLeft[instance.hunkId][realLineNumber].node.lastChild.textContent
			document.getElementById("review-remark").value = prevMsg;
		}
	}

	if(areRemarksEnabled()) {
		$("#remark-popup-window").show();
	}
}

var remarksEnabled = true;

function areRemarksEnabled() {
	return remarksEnabled;
}

function disableRemarks() {
	remarksEnabled = false;
}

function recordRemark() {

	var msg = document.getElementById("review-remark").value;

	document.getElementById("review-remark").value = "";

	var info = instance.lineInfo(lineNumber);
    var prevMsg = "";
	var realLineNumber = lineNumber + instance.options.firstLineNumber;

	if (instance.hunkSide == 1) {
		if (!reviewRemarksRight[instance.hunkId]) {
			reviewRemarksRight[instance.hunkId] = {};
		}

		if (realLineNumber in reviewRemarksRight[instance.hunkId]){
			prevMsg = reviewRemarksRight[instance.hunkId][realLineNumber].node.lastChild.textContent
		}



		if (msg == null) {
			return
		}

		// instance.addLineWidget(lineNumber, makeMarker(msg), {coverGutter: true, noHScroll: true});

		if (realLineNumber in reviewRemarksRight[instance.hunkId]) {
			if (msg == "") {
				// DELETE COMMENT

				updateCommentForLineRecording(instance.hunkId, lineNumber+1, "del");

				logData("deletedComment", `${instance.hunkId}${instance.hunkSide}-${realLineNumber}`);
				reviewRemarksRight[instance.hunkId][realLineNumber].clear()
				// instance.setGutterMarker(lineNumber, "remarks", null);
				delete reviewRemarksRight[instance.hunkId][realLineNumber];
				if(isRemarkPresent(log_remarks, lineNumber, instance.hunkId)) {
					log_remarks = removeRemark(log_remarks, instance.hunkSide, lineNumber, instance.hunkId);
				}
			} else {
				// UPDATE COMMENT
				logData("updateComment",
					`${instance.hunkId}${instance.hunkSide}-${realLineNumber}-${msg}`)
				// info.gutterMarkers.remarks.title = msg;
				// reviewRemarksRight[instance.hunkId][realLineNumber] = msg;
				reviewRemarksRight[instance.hunkId][realLineNumber].node.lastChild.textContent = msg
				reviewRemarksRight[instance.hunkId][realLineNumber].changed()
				if(isRemarkPresent(log_remarks, lineNumber, instance.hunkId)) {
					log_remarks = updateRemark(log_remarks, instance.hunkSide, lineNumber, instance.hunkId, msg);
				}
			}
		} else {
			if (msg == "") {
				// CANCEL COMMENT
				logData("cancelComment",
					`${instance.hunkId}${instance.hunkSide}-${realLineNumber}`)
			} else {
				// ADD COMMENT

				updateCommentForLineRecording(instance.hunkId, lineNumber+1, "add");

				logData("addComment",
					`${instance.hunkId}${instance.hunkSide}-${realLineNumber}-${msg}`)
				// instance.setGutterMarker(lineNumber, "remarks", makeMarker(msg));

				var line_widget = instance.addLineWidget(lineNumber, makeMarker(msg), {
					coverGutter: true,
					noHScroll: true
				});
				reviewRemarksRight[instance.hunkId][realLineNumber] = line_widget;
				log_remarks.push(new Remark(lineNumber, msg, instance.hunkId, instance.hunkSide));
				// addComment(lineNumber, msg, instance.hunkId, instance.hunkSide)
			}
		}
	} else {
		if (!reviewRemarksLeft[instance.hunkId]) {
			reviewRemarksLeft[instance.hunkId] = {};
		}

		if (realLineNumber in reviewRemarksLeft[instance.hunkId]){
			prevMsg = reviewRemarksLeft[instance.hunkId][realLineNumber].node.lastChild.textContent
		}

		if (msg == null) {
			return
		}

		// instance.addLineWidget(lineNumber, makeMarker(msg), {coverGutter: true, noHScroll: true});

		if (realLineNumber in reviewRemarksLeft[instance.hunkId]) {
			if (msg == "") {
				// DELETE COMMENT
				logData("deletedComment", `${instance.hunkId}${instance.hunkSide}-${realLineNumber}`);
				reviewRemarksLeft[instance.hunkId][realLineNumber].clear()
				// instance.setGutterMarker(lineNumber, "remarks", null);
				delete reviewRemarksLeft[instance.hunkId][realLineNumber];
				if(isRemarkPresent(log_remarks, lineNumber, instance.hunkId)) {
					log_remarks = removeRemark(log_remarks, instance.hunkSide, lineNumber, instance.hunkId);
				}
			} else {
				// UPDATE COMMENT
				logData("updateComment",
					`${instance.hunkId}${instance.hunkSide}-${realLineNumber}-${msg}`)
				// info.gutterMarkers.remarks.title = msg;
				// reviewRemarksLeft[instance.hunkId][realLineNumber] = msg;
				reviewRemarksLeft[instance.hunkId][realLineNumber].node.lastChild.textContent = msg
				reviewRemarksLeft[instance.hunkId][realLineNumber].changed()
				if(isRemarkPresent(log_remarks, lineNumber, instance.hunkId)) {
					log_remarks = updateRemark(log_remarks, instance.hunkSide, lineNumber, instance.hunkId, msg);
				}
			}
		} else {
			if (msg == "") {
				// CANCEL COMMENT
				logData("cancelComment",
					`${instance.hunkId}${instance.hunkSide}-${realLineNumber}`)
			} else {
				// ADD COMMENT
				logData("addComment",
					`${instance.hunkId}${instance.hunkSide}-${realLineNumber}-${msg}`)
				// instance.setGutterMarker(lineNumber, "remarks", makeMarker(msg));

				var line_widget = instance.addLineWidget(lineNumber, makeMarker(msg), {coverGutter: true, noHScroll: true});
				reviewRemarksLeft[instance.hunkId][realLineNumber] = line_widget;
				log_remarks.push(new Remark(lineNumber, msg, instance.hunkId, instance.hunkSide));
				// addComment(lineNumber, msg, instance.hunkId, instance.hunkSide)
			}
		}
	}
}

function Remark(line, message, hunk, side) {
	this.line = line;
	this.message = message;
	this.hunk = hunk;
	this.side = side;
}

function isRemarkPresent(remarks_list, line, hunk) {
	for(i = 0; i < remarks_list.length; i++) {
		if(remarks_list[i].hunk == hunk) {
			if(remarks_list[i].line == line) {
				return true;
			}
		}
	}
	return false;
}

function updateRemark(remarks_list, side, line, hunk, message) {
	for(i = 0; i < remarks_list.length; i++) {
		if(remarks_list[i].hunk == hunk && remarks_list[i].side == side) {
			if(remarks_list[i].line == line) {
				remarks_list[i].message = message;
				return remarks_list;
			}
		}
	}
	return null;
}

function removeRemark(remarks_list, side, line, hunk) {
	for(i = 0; i < remarks_list.length; i++) {
		if(remarks_list[i].hunk == hunk && remarks_list[i].side == side) {
			if(remarks_list[i].line == line) {
				remarks_list.splice(i, 1);
				return remarks_list;
			}
		}
	}
	return null;
}

function addToCurrentRemarks(old_remark_widget, old_remark_line, instance) {
	var real_line = old_remark_line + instance.options.firstLineNumber;
	if (!reviewRemarksRight[instance.hunkId]) {
		reviewRemarksRight[instance.hunkId] = {};
	}
	reviewRemarksRight[instance.hunkId][real_line] = old_remark_widget;
}


function promptPromise(message) {
  var dialog       = document.getElementById('dialog');
  var input        = dialog.querySelector('input');
  var okButton     = dialog.querySelector('button.ok');
  var cancelButton = dialog.querySelector('button.cancel');

  dialog.querySelector('.message').innerHTML = String(message);
  dialog.className = '';

  return new Promise(function(resolve, reject) {
    dialog.addEventListener('click', function handleButtonClicks(e) {
      if (e.target.tagName !== 'BUTTON') { return; }
      dialog.removeEventListener('click', handleButtonClicks);
      dialog.className = 'hidden';
      if (e.target === okButton) {
        resolve(input.value);
      } else {
        reject(new Error('User cancelled'));
      }
    });
  });
}

//Scroll log function

lastScrollTime = 0;
var scrollRecordingEnabled = true;

function disableScrollRecording(){
	scrollRecordingEnabled = false;
}

function scrollHandler() {
	console.log("scroll");
	if(scrollRecordingEnabled) {
		var curTime = Date.now();
		if (curTime - lastScrollTime > 50) {
			logData('scroll', window.pageXOffset + ';' + window.pageYOffset);
			logData('visibleHunks', determineVisibleHunks());
			logData('visibleLines', determineVisibleLines());
			lastScrollTime = curTime;
		}
	}
}

function determineVisibleHunks() {
	var ret = '';
	for(hunk in hunks) {
		hunk = "#compare" + hunk;
		//console.log("data test: "+hunk);
		var onScreen = isOnScreen(hunk);
		if (onScreen == 1) {
			//partially visible
			//ret += '(' + hunk.id.replace('compare', '') + ') ';
			ret += '(' + hunk + ') ';
		} else if (onScreen == 2) {
			//fully visible
			//ret += hunk.id.replace('compare', '') + ' ';
			ret += hunk + ' ';
		}
	}

	return ret;
}

function isOnScreen(hunk) {
	var win = $(window);

	var vpTop = win.scrollTop();
	var vpBottom = vpTop + win.height();

	var bounds = $(hunk).offset();
    bounds.right = bounds.left + $(hunk).outerWidth();
    bounds.bottom = bounds.top + $(hunk).outerHeight();

	if (bounds.bottom < vpTop || bounds.top > vpBottom) {
		//not contained
		return 0;
	} else if (bounds.top >= vpTop && bounds.bottom <= vpBottom) {
		//fully contained
		return 2;
	} else {
		//partially contained
    	return 1;
    }
};

var linesMap;

class CodeLine {
	constructor(n, t, b) {
	  this.number = n;
	  this.top = t;
	  this.bottom = b;
	}
}

function recomputeLines() {
	if(typeof linesMap !== "undefined") {
		linesMap.clear();
		computeHunkLines();
	}
}

//to populate with the editors
var editors;

function setEditors(edits) {
	editors = edits;
}

function computeLinesInHunk(action, hunkNumber) {
	linesMap = new Map();
	for(let k=0; k<hunks.length; k++) {
		hunkName = "compare" + k;
		var codeArea = document.getElementById(hunkName).getElementsByClassName("CodeMirror-code");
		var lines = codeArea[1].getElementsByClassName("CodeMirror-line");

		var rect = editors[k].getWrapperElement().getBoundingClientRect();
		var topVisibleLine = editors[k].lineAtHeight(rect.top, "window");
		var bottomVisibleLine = editors[k].lineAtHeight(rect.bottom, "window");

		hunk = "#compare" + k;
		var bounds = $(hunk).offset();
		bounds.bottom = bounds.top + $(hunk).outerHeight();
		var height = bounds.bottom - bounds.top;
		var lineHeight = height / (lines.length + 1);
		// Lines include 3 more lines to include blank space.

		if(action == "add" && hunkNumber == k) {
			bottomVisibleLine = bottomVisibleLine - 1;
		}
		if(action == "del" && hunkNumber == k) {
			bottomVisibleLine = bottomVisibleLine + 1;
		}

		var count = 1;
		var linesArr = [];

		var numberOfLines = bottomVisibleLine - topVisibleLine;

		var comments = [];
		if(typeof commentsMap != "undefined") {
			if(commentsMap.has(k)) {
				comments = commentsMap.get(k);
			}
		}

		let i=0;
		var lineTop = bounds.top;
		var lineBottom = editors[k].defaultTextHeight() + bounds.top;

		while(i<numberOfLines+1) {
			if(comments.includes(topVisibleLine + i)) {
				lineTop = lineTop + editors[k].defaultTextHeight();
				lineBottom = lineBottom + editors[k].defaultTextHeight();
			}
			linesArr[i] = new CodeLine(topVisibleLine + i, lineTop, lineBottom);
			count = count + 1;
			i++;
			lineTop = lineTop + editors[k].defaultTextHeight();
			lineBottom = lineBottom + editors[k].defaultTextHeight();
		}
		linesMap.set(hunk, linesArr);
	}
}

function computeHunkLines() {
	linesMap = new Map();
	for(hunk in hunks) {
		hunk = "#compare" + hunk;
		var bounds = $(hunk).offset();
		bounds.bottom = bounds.top + $(hunk).outerHeight();
		var height = bounds.bottom - bounds.top;
		var lineHeight = height / (lines.length + 1);
		// Lines include 3 more lines to include blank space.

		var count = 1;

		for (let i=0; i<lines.length+1; i++) {
			var lineTop = count * lineHeight + bounds.top;
			var lineBottom = (count + 1) * lineHeight + bounds.top;
			linesArr[i] = new CodeLine(i, lineTop, lineBottom);
			count = count + 1;
		}
		linesMap.set(hunk, linesArr);
		var test = linesMap.get(hunk).length;
	}
}

function determineVisibleLines() {
	var ret = '';
	for(hunk in hunks) {
		hunk = "#compare" + hunk;
		//console.log("data test: "+hunk);
		var onScreen = isOnScreen(hunk);
		if (onScreen == 1) {
			//partially visible
			//ret += '(' + hunk.id.replace('compare', '') + ') ';
			ret += '(' + hunk + ') ';
		} else if (onScreen == 2) {
			//fully visible
			//ret += hunk.id.replace('compare', '') + ' ';
			ret += hunk + ' ';
		}
		for(let i=0; i < linesMap.get(hunk).length; i++){
			//console.log("top " + l.top);
			//console.log("bottom " + l.bottom);
			var lineOnScreen = isLineOnScreen(linesMap.get(hunk)[i]);
			if (lineOnScreen == 1) {
				//partially visible
				ret += '(' + linesMap.get(hunk)[i].number + ') ';
			} else if (lineOnScreen == 2) {
				//fully visible
				ret += linesMap.get(hunk)[i].number + ' ';
			}
		}
	}
	return ret;
}

function isLineOnScreen(line) {
	var win = $(window);

	var vpTop = win.scrollTop();
	var vpBottom = vpTop + win.height();

	if (line.bottom < vpTop || line.top > vpBottom) {
		//not contained
		return 0;
	} else if (line.top >= vpTop && line.bottom <= vpBottom) {
		//fully contained
		return 2;
	} else {
		//partially contained
    	return 1;
    }
};

function recomputeLinesScroll(hunkNumber){
	logData("internal scroll", "hunk" + hunkNumber);
	if(typeof linesMap !== "undefined") {
		linesMap.clear();
		computeLinesInHunk("none", 0);
	}
}

var commentsMap = new Map();

function updateCommentForLineRecording(hunkId, lineNumber, action){
	if(action == "add") {
		addCommentToMap(hunkId, lineNumber);
	}
	else if(action == "del") {
		removeCommentFromMap(hunkId, lineNumber);
	}
	computeLinesInHunk(action, parseInt(hunkId));
	logData('visibleHunks', determineVisibleHunks());
	logData('visibleLines', determineVisibleLines());
}

function addCommentToMap(hunkId, commentLine) {
	//if(typeof commentsMap == "undefined") {
	//	commentsMap = new Map();
	//}
	var hunkNumber = parseInt(hunkId);
	if(commentsMap.has(hunkNumber)){
		var comments = commentsMap.get(hunkNumber);
		comments.push(commentLine);
	} else {
		var comments = [];
		comments.push(commentLine);
		commentsMap.set(hunkNumber, comments);
	}
}

function removeCommentFromMap(hunkId, commentLine) {
	var hunkNumber = parseInt(hunkId);
	if(typeof commentsMap == "undefined") {
		return;
	}
	if(commentsMap.has(hunkNumber)){
		var comments = commentsMap.get(hunkNumber);
		const indexToRemove = comments.indexOf(commentLine);
		if(indexToRemove > -1) {
			comments.splice(indexToRemove, 1);
		}
	}
}

