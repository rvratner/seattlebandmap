/*
	Javascript for Seattle Band map
	Does everything to make the SVG map interactive
	
	With help from SVGPan library
	
	By Golf Sinteppadon, 2010
*/

// Mouse position when dragging
var oldX = 0,
	oldY = 0,
	
// Position of mousedown
	clickedX = 0,
	clickedY = 0,
	
// True if currently dragging map
	dragging = false,
// True if map has been moved since last mousedown
	mapMoved = false,

// True if currently dragging zoom bar
	zoomBarDragging = false,
// Zoom bar knob's offset from the top of the zoom bar
	offsetTop = 0,

// Zoom levels
	zoomLevel = 0,
	MIN_ZOOM_LEVEL = -1,
	MAX_ZOOM_LEVEL = 6,
// The zoom level at which band names start being displayed directly on the map
	bandNameVisibilityLevel = 3,

// Amount to zoom in by for each zoom level
	ZOOM_FACTOR = 1.7,

// Map dimensions
	MAP_WIDTH,
	MAP_HEIGHT,

// Preload hand image
	myPic = new Image(32, 32);
	myPic.src = "images/closedhand.ico";

// Used to perform SVG zooms to the current mouse location
var stateTf;

Event.observe(window, 'load', function() {
	// Display warning for browsers that don't support SVG
	if (!$("svg").preserveAspectRatio) {
		$("svg").style.visibility = "hidden";
		$("popup").innerHTML = "Sorry! Your browser is not compatible with the Seattle Band Map. Please <a href='http://www.mozilla.com/en-US/firefox/'>upgrade your web browser</a>.";
		$("popup").style.visibility = "visible";
		$("map").style.backgroundImage = "url(images/iemap.png)";
		$("map").style.cursor = "default";
		$("popup").style.backgroundColor = "black";
		$("popup").style.top = "200px";
		$("popup").style.left = "180px";
		return;
	}
	
	MAP_WIDTH = $("map").getWidth();
	MAP_HEIGHT = $("map").getHeight();
	
	Event.observe("svg", "mousedown", mouseDown);
	Event.observe("svg", 'dblclick', doubleClick);
	Event.observe(document, "mouseup", mouseUp);
	Event.observe(document, "mousemove", mouseMove);
	
	Event.observe("search", "submit", search1);
	$("query").disabled = "";
	
	var outerCircles = document.getElementsByClassName("outer"),
		innerCircles = document.getElementsByClassName("inner"),
		i,
		outerMouseUpFunction = function() { if (!mapMoved) { mouseClick1(this); }},
		outerMouseOverFunction = function() { mouseOver(this); },
		outerMouseOutFunction = function() { mouseOut(this); },
		innerMouseUpFunction = function() { if (!mapMoved) { mouseClick1(this.previousElementSibling); }},
		innerMouseOverFunction = function() { mouseOver(this.previousElementSibling); },
		innerMouseOutFunction = function() { mouseOut(this.previousElementSibling); };
	for (i = outerCircles.length - 1; i >= 0; i--) {
		// Use mouseup instead of onclick so clicking down on a node and dragging does not open the popup
		Event.observe(outerCircles[i], 'mouseup', outerMouseUpFunction);
		Event.observe(outerCircles[i], 'mouseover', outerMouseOverFunction);
		Event.observe(outerCircles[i], 'mouseout', outerMouseOutFunction);
		
		Event.observe(innerCircles[i], 'mouseup', innerMouseUpFunction);
		Event.observe(innerCircles[i], 'mouseover', innerMouseOverFunction);
		Event.observe(innerCircles[i], 'mouseout', innerMouseOutFunction);
	}
	
	zoomBarSetup();
	
	// Handle the "Find a band" default text
	Event.observe("query", "focus", function() { if (this.value === "Find a band") { this.value = ""; } });
	Event.observe("query", "blur", function() { if (this.value === "") { this.value = "Find a band"; } });
	
	// Mouse wheel setup
	if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0) {
		$("svg").addEventListener('mousewheel', mouseWheel, false); // Chrome/Safari
	}
	else {
		$("svg").addEventListener('DOMMouseScroll', mouseWheel, false); // Others
	}
	
});

function zoomBarSetup() {
	var zoomBar, zoomBarPlus, zoomBarSlider, zoomBarSliderNotch, notchOnClick, zoomBarMinus, zoomBarKnob;
	
	zoomBar = document.createElement("div");
	zoomBar.id = "zoomBar";
	$("map").appendChild(zoomBar);
	
	zoomBarPlus = document.createElement("div");
	zoomBarPlus.id = "zoomBarPlus";
	zoomBarPlus.onclick = function() { zoomCenter(1); };
	zoomBar.appendChild(zoomBarPlus);
	
	zoomBarSlider = document.createElement("div");
	zoomBarSlider.id = "zoomBarSlider";
	zoomBar.appendChild(zoomBarSlider);
	// Create the notches on the zoom bar
	notchOnClick = function() { setZoomLevel(this.getAttribute("notch")); };
	for (i = MIN_ZOOM_LEVEL; i <= MAX_ZOOM_LEVEL; i++) {
		zoomBarSliderNotch = document.createElement("div");
		zoomBarSliderNotch.setAttribute("notch", i);
		$(zoomBarSliderNotch).addClassName("notch");
		zoomBarSliderNotch.style.position = "absolute";
		zoomBarSliderNotch.style.top = (MAX_ZOOM_LEVEL - i) * 10 + 5 + "px";
		zoomBarSliderNotch.onclick = notchOnClick;
		zoomBarSlider.appendChild(zoomBarSliderNotch);
	}
	
	zoomBarMinus = document.createElement("div");
	zoomBarMinus.id = "zoomBarMinus";
	zoomBarMinus.onclick = function() { zoomCenter(0); };
	zoomBar.appendChild(zoomBarMinus);
	
	zoomBarKnob = document.createElement("img");
	zoomBarKnob.src = "images/zoomBarKnob.png";
	zoomBarKnob.id = "zoomBarKnob";
	zoomBarKnob.unselectable = "on";
	Event.observe(zoomBarKnob, 'mousedown', zoomBarKnobMouseDown);
	Event.observe(document, 'mouseup', zoomBarKnobMouseUp);
	Event.observe(document, 'mousemove', zoomBarKnobMouseMove);
	zoomBarSlider.appendChild(zoomBarKnob);
	zoomBarKnob.style.top = (MAX_ZOOM_LEVEL - zoomLevel) * 10 + 5 + "px";
}

// Show the name of the band in a popup when hovering over the node
function mouseOver(node) {
	if ($("popup").nodeId === node.id) { return; }
	
	mouseOut(node);
	
	// Set inner circle's class to current
	node.nextElementSibling.className.baseVal = "inner current";
	
	var hoverPopup = document.createElement("p");
	hoverPopup.textContent = node.nextElementSibling.nextElementSibling.textContent;
	hoverPopup.id = "hoverPopup";
	hoverPopup.nodeId = node.id;
	
	// Add arrow to popup
	var arrow = document.createElement("div");
	arrow.addClassName("arrow");
	hoverPopup.appendChild(arrow);
	
	$("map").appendChild(hoverPopup);
	
	recalculateHoverPopupPosition();
	hoverPopup.style.visibility = "visible";
}

// Remove the hover popup onmouseout
function mouseOut(node) {
	if ($("hoverPopup")) {
		$("map").removeChild($("hoverPopup"));
	}
	// Remove "current" class from inner circle's class
	node.nextElementSibling.className.baseVal = "inner";
}

function recalculateHoverPopupPosition() {
	if (!$("hoverPopup")) { return; }
	
	// Do all the calculations necessary to make sure that the hover
	// popup is pointing to the correct node
	var hoverPopup = $("hoverPopup"),
		node = $(hoverPopup.nodeId),
		arrow = hoverPopup.childElements()[0],
		
		mapOffsetX = -$("viewport").getCTM().e,
		mapOffsetY = -$("viewport").getCTM().f,
		zoomScale = Math.pow(ZOOM_FACTOR, zoomLevel),

		nodeXPosition = node.cx.baseVal.value,
		nodeYPosition = node.cy.baseVal.value,
		nodeRadius = node.r.baseVal.value;
	
	
	hoverPopup.style.padding = hoverPopup.style.left = hoverPopup.style.top = "0px";
	hoverPopup.style.width = "auto";
	hoverPopup.style.height = "auto";
	
	// For IE9, increase width by 1 to prevent new lines in hover popup
	// This is pretty much a hack
	if (navigator.appName === "Microsoft Internet Explorer") {
		hoverPopup.style.width = hoverPopup.getWidth() + 1 + "px";
	}
	// Set the hover popup's dimensions so it does not change when scrolled out of view
	// This is pretty much a hack too
	hoverPopup.style.width = hoverPopup.getWidth() + "px";
	hoverPopup.style.height = hoverPopup.getHeight() + "px";
	
	// Set padding in javascript to not affect the width
	// If we try to set the padding in CSS, getting the dimensions in Javascript becomes problematic
	hoverPopup.style.padding = "3px 5px";
	
	hoverPopup.style.left = nodeXPosition * zoomScale - mapOffsetX - hoverPopup.getWidth() / 2 + "px";
	hoverPopup.style.top = nodeYPosition * zoomScale - mapOffsetY - nodeRadius * zoomScale - 35 + "px";
	
	arrow.style.top = hoverPopup.getHeight() + "px";
	arrow.style.left = hoverPopup.getWidth() / 2 - arrow.getWidth() / 2 + "px";
}

function mouseDown(e) {
	if (e.preventDefault) {
		e.preventDefault();
	}
	e.returnValue = false;
	
	dragging = true;
	
	oldX = clickedX = e.clientX;
	oldY = clickedY = e.clientY;

	stateTf = $("viewport").getCTM().inverse();
	
	$("map").style.cursor = "url(images/closedhand.ico), pointer";
}

function mouseUp(e) {
	if (e.preventDefault) {
		e.preventDefault();
	}
	e.returnValue = false;
	
	mapMoved = false;
	dragging = false;
	$("map").style.cursor = "url(images/openhand.ico), pointer";
}

function mouseMove(e) {
	if (!dragging) { return; }
	mapMoved = true;
	
	var zoomScale = Math.pow(ZOOM_FACTOR, zoomLevel);
	
	// If popup is tied to a node, move it with the screen
	// The popup can exist without a nodeId if it is showing search results
	if ($("popup").nodeId) {
		$("popup").style.left = e.clientX - oldX + parseInt($("popup").style.left, 10) + "px";
		$("popup").style.top = e.clientY - oldY + parseInt($("popup").style.top, 10) + "px";
	}
	
	// Move the map accordingly
	setCTM($("viewport"), stateTf.inverse().translate((e.clientX - clickedX) / zoomScale, (e.clientY - clickedY) / zoomScale));
	
	oldX = e.clientX;
	oldY = e.clientY;
}

function search1(e) {
	if (e) { Event.stop(e); }
	if ($("query").value.length === 0) { return; }
	$("popup").style.visibility = "hidden";
	// Search text file for building
	new Ajax.Request("backend/queries.php", { method: "get", onSuccess: search2, parameters: { "search": "true", "name": $("query").value } });
}

function search2(ajax) {
	var response = ajax.responseText.split("|");
	resetPopup();
	
	var bandsFound = [];
	// Remove pending bands in list
	if (response) {
		for (var i = 0; i < response.length; i++) {
			var bandId = response[i].substring(0, response[i].indexOf(";"));
			if ($(bandId)) {
				bandsFound.push(response[i]);
			}
		}
	}
	
	if (bandsFound.length == 0) {
		// Add close button
		addCloseButtonToPopup();
		
		// No bands found
		var p = document.createElement("p");
		p.textContent = "No matches were found. Please make sure your band is spelled correctly, or submit a new band to be included in the band map.";
		p.style.lineHeight = "1.7em";
		$("popup").appendChild(p);
		
		$("popup").style.width = "280px";
		centerPopup();
		$("popup").style.padding = "10px";
		$("popup").style.visibility = "visible";
	}
	else if (bandsFound.length === 1) {
		var bandId = bandsFound[0].substring(0, bandsFound[0].indexOf(";"));
		snapToBand($(bandId));
	}
	else {
		// Show popup listing all found bands (up to 10 bands returned)
		var strong = document.createElement("strong");
		strong.textContent = "The following bands were found:";
		$("popup").appendChild(strong);
		
		addCloseButtonToPopup();
		
		var ul = document.createElement("ul");
		
		for (var i = 0; i < bandsFound.length; i++) {
			bandsFound[i] = bandsFound[i].split(";");
			
			var li = document.createElement("li");
			// Set li id to li_(band#)
			// Cannot set the id to just the band# because the band node already has that id
			li.id = "li_" + bandsFound[i][0];
			li.addClassName("snapToBand");
			li.onclick = function() { snapToBand($(this.id.substring(3))); };
			li.onmouseover = function() { mouseOver($(this.id.substring(3))); };
			li.textContent = bandsFound[i][1];
			
			ul.appendChild(li);
		}
		$("popup").appendChild(ul);
		centerPopup();
		$("popup").style.padding = "10px";
		$("popup").style.visibility = "visible";
	}
}

// Move the map to the clicked band
function snapToBand(node) {
	var transform = $("viewport").getCTM(),
		x = transform.e,
		y = transform.f,
		zoomScale = Math.pow(ZOOM_FACTOR, zoomLevel),
	
		nodeXPosition = node.cx.baseVal.valueAsString,
		nodeYPosition = node.cy.baseVal.valueAsString;
	
	setCTM($("viewport"), $("viewport").getCTM().translate((MAP_WIDTH / 2 - x) / zoomScale - nodeXPosition, (MAP_HEIGHT / 2 - y) / zoomScale - nodeYPosition));
	
	mouseClick1(node);
}

/**
 * Handle clicking on a node.
 */
function mouseClick1(node) {
	$("popup").style.visibility = "hidden";
	
	// True if we clicked the same node that is already attached to the popup
	// If it is true we will just hide the popup
	var sameNodeClicked = ($("popup").nodeId == node.id);
	
	resetPopup();
	
	if (sameNodeClicked) { return; }
	
	// Set the nodeId field to the current node's id
	$("popup").nodeId = node.id;
	
	// Fetch info about the clicked band
	new Ajax.Request(
		"backend/queries.php",
		{
			method: "post",
			onSuccess: mouseClick2,
			parameters: { "get": "true", "id": node.id }
		}
	);
	
	mouseOut(node);
}

/**
 * Show a popup about the band containing:
 *   Band Name
 *   # of connections
 *   Hometown
 *   Band Members
 */
function mouseClick2(ajax) {
	// data[0] - id
	// data[1] - name
	// data[2] - numConnections
	// data[3] - city
	// data[4] - state
	// data[5] - website
	// data[6] - members
	// data[7] - list of connections delimited by |
	var data = ajax.responseText.split(";");
	
	// Make sure grabbed nodeId still matches the current nodeId
	// They can mismatch if the user clicks on another node
	// before the request returns, or if the user double clicks on a node
	if ($("popup").nodeId != data[0]) {
		return;
	}
	
	// Add arrow to popup
	var arrow = document.createElement("div");
	arrow.addClassName("arrow");
	$("popup").appendChild(arrow);
	
	// Show band name
	var strong = document.createElement("strong");
	strong.textContent = data[1];
	$("popup").appendChild(strong);
	
	// Add close button
	addCloseButtonToPopup();
	
	// Show # of connections
	var p = document.createElement("p");
	p.id = "popupConnections";
	p.style.width = "300px";
	var weak = document.createElement("span");
	weak.addClassName("weak");
	weak.textContent = data[2] + " connection" + ((data[2] != 1) ? "s - " : " - ");
	p.appendChild(weak);
	$("popup").appendChild(p);
	
	// Show list of connections
	var connections = data[7].split("|");
	
	var span;
	for (var i = 0; i < connections.length; i++) {
		span = document.createElement("span");
		span.addClassName("snapToBand");
		span.setAttribute("nodeId", connections[i]);
		span.onclick = function() { snapToBand($(this.getAttribute("nodeId"))) };
		span.onmouseover = function() { mouseOver($(this.getAttribute("nodeId"))) };
		span.onmouseout = function() { mouseOut($(this.getAttribute("nodeId"))) };
		span.textContent = $(connections[i]).nextElementSibling.nextElementSibling.textContent;
		p.appendChild(span);
		if (i < connections.length - 1) {
			span = document.createElement("span");
			span.textContent = ", ";
			p.appendChild(span);
		}
	}
	
	var table = document.createElement("table");
	
	// Show location
	var tr = document.createElement("tr");
	var td = document.createElement("td");
	td.textContent = "Location";
	tr.appendChild(td);
	var td = document.createElement("td");
	td.textContent = (data[3] && data[4]) ? data[3] + ", " + data[4] : data[3] + data[4];
	td.city = data[3];
	td.state = data[4];
	tr.appendChild(td);
	table.appendChild(tr);
	
	// Show website URL
	var tr = document.createElement("tr");
	var td = document.createElement("td");
	td.textContent = "Website";
	tr.appendChild(td);
	var td = document.createElement("td");
	var a = document.createElement("a");
	a.textContent = a.href = data[5];
	a.target = "_blank";
	td.appendChild(a);
	tr.appendChild(td);
	table.appendChild(tr);
	
	// Show band members
	var tr = document.createElement("tr");
	var td = document.createElement("td");
	td.textContent = "Members";
	td.style.verticalAlign = "top";
	tr.appendChild(td);
	var td = document.createElement("td");
	var ul = document.createElement("ul");
	var bandMembers = data[6].split(",");
	for (var i = 0; i < bandMembers.length; i++) {
		var li = document.createElement("li");
		li.textContent = bandMembers[i];
		ul.appendChild(li);
	}
	td.members = data[6];
	td.appendChild(ul);
	tr.appendChild(td);
	table.appendChild(tr);
	
	$("popup").appendChild(table);
	
	// Add edit button
	var edit = document.createElement("p");
	edit.textContent = "[edit]";
	edit.onclick = editBandInfo;
	edit.id = "edit";
	$("popup").appendChild(edit);
	
	recalculatePopupPosition();
	
	// Change the padding back to the default
	$("popup").style.padding = "10px";
	
	$("popup").style.visibility = "visible";
	
}

/*
	Turn the popup into an editable form
*/
function editBandInfo() {
	// var span = document.createElement("span");
	// span.onclick = function() { myLightWindow.activateWindow({ href: "submit", width: "800", height: "600" }) };
	// span.textContent = "Add a connection";
	// $("popupConnections").appendChild(span);

	var tableRows = $$("#popup tr");
	
	// Grab the corresponding fields from the popup and create an editable form
	for (var i = 0; i < 3; i++) {
		td = tableRows[i].childElements()[1];
		
		var input = document.createElement("input");
		
		// Fill in values for location from td fields
		if (i == 0) {
			input.value = td.city;
			input.style.width = "150px";
			var input2 = document.createElement("input");
			input2.value = td.state;
			input2.style.width = "20px";
			input2.maxLength = "2";
			input2.style.marginLeft = "10px";
		}
		
		// Fill in value for URL straight from the text
		else if (i == 1) {
			input.value = td.textContent;
		}
		
		// Fill in value for band members from td field
		else {
			input.value = td.members;
		}
		
		td.textContent = "";
		td.appendChild(input);
		if (i == 0) {
			td.appendChild(input2);
		}
	}
	
	// Replace edit button with save button
	
	$("popup").removeChild($("edit"));
	var save = document.createElement("p");
	save.textContent = "[save]";
	save.onclick = saveBandInfo;
	save.id = "save";
	$("popup").appendChild(save);
	
}

function saveBandInfo() {
	var nodeId = $("popup").nodeId;
	$("popup").nodeId = null;
	
	values = $$("#popup input");
	new Ajax.Request("backend/queries.php",
		{ method: "post",
		  onSuccess: function() { mouseClick1($(nodeId)) },
		  parameters: { "update": "true", "id": nodeId, "city": values[0].value, "state": values[1].value, "website": values[2].value, "members": values[3].value}
	});
}

/******************************************************** Zoom functions **********************************************************/
// Handle zooming
// zoomIn (0 or 1) - zoom in 1, zoom out 0
// x - x mouse coordinate of zoom
// y - y mouse coordinate of zoom
function zoom(zoomIn, x, y) {
	// Debug
	//$("query").value = "x: " + x + ",y: " + y;
	
	// Return if invalid zoom
	if ((zoomIn && zoomLevel == MAX_ZOOM_LEVEL) || (!zoomIn && zoomLevel == MIN_ZOOM_LEVEL)) {
		return false;
	}
	
	// New scale matrix in current mouse position
	var k;
	
	// Zoom in
	if (zoomIn) {
		zoomLevel++;
		
		k = $("svg").createSVGMatrix().translate(x, y).scale(ZOOM_FACTOR).translate(-x, -y);
		
		// Show band labels in the map
		if (zoomLevel == bandNameVisibilityLevel) {
			var text = $$("text");
			for (var i = 0; i < text.length; i++) {
				text[i].style.display = "block";
			}
		}
	}
	
	// Zoom out
	else {
		zoomLevel--;
		
		k = $("svg").createSVGMatrix().translate(x, y).scale(1 / ZOOM_FACTOR).translate(-x, -y);
		
		// Hide band labels in the map
		if (zoomLevel == bandNameVisibilityLevel - 1) {
			var text = $$("text");
			for (var i = 0; i < text.length; i++) {
				text[i].style.display = "none";
			}
		}	
	}
	
	$("zoomBarKnob").style.top = (MAX_ZOOM_LEVEL - zoomLevel) * 10 + 5 + "px";

	setCTM($("viewport"), $("viewport").getCTM().multiply(k));

	if (typeof(stateTf) == "undefined") {
		stateTf = $("viewport").getCTM().inverse();
	}
	stateTf = stateTf.multiply(k.inverse());
	
	recalculatePopupPosition();
	recalculateHoverPopupPosition();
	
	return true;
}

function zoomBarKnobMouseDown(e) {
	//if (!e) { e = window.event; }
	//Event.extend(e);
	Event.stop(e);

	zoomBarDragging = true;
	offsetTop = parseInt($("zoomBarKnob").style.top, 10) - e.clientY;
	
	$("zoomBarKnob").style.cursor = "url(images/closedhand.ico), pointer";
}

function zoomBarKnobMouseUp(e) {
	if (!zoomBarDragging) { return; }
	zoomBarDragging = false;
	$("zoomBarKnob").style.cursor = "url(images/openhand.ico), pointer";
	
	var newZoomLevel = MAX_ZOOM_LEVEL - parseInt(parseInt($("zoomBarKnob").style.top, 10) / 10, 10);
	setZoomLevel(newZoomLevel);
}

function zoomBarKnobMouseMove(e) {
	//if (!e) { e = window.event; }
	//Event.extend(e);
	
	if (zoomBarDragging) {
		$("zoomBarKnob").style.top = e.clientY + offsetTop + "px";
		
		var topOfSlider = 5;
		if ($("zoomBarKnob").offsetTop < topOfSlider) { $("zoomBarKnob").style.top = topOfSlider + "px"; }
		var bottomOfSlider = (MAX_ZOOM_LEVEL - MIN_ZOOM_LEVEL) * 10 + 5;
		if ($("zoomBarKnob").offsetTop > bottomOfSlider) { $("zoomBarKnob").style.top = bottomOfSlider + "px"; }
	}
}

function setZoomLevel(newZoomLevel) {
	while (newZoomLevel < zoomLevel) { zoomCenter(0); }
	while (newZoomLevel > zoomLevel) { zoomCenter(1); }
}

/**
 * Zoom in on double click
 */
function doubleClick(evt) {
	var p = getEventPoint(evt);
	p = p.matrixTransform($("viewport").getCTM().inverse());
	
	zoom(1, p.x, p.y);
}

/**
 * Handle mouse wheel event.
 */
function mouseWheel(evt) {
	if (evt.preventDefault)
		evt.preventDefault();
	evt.returnValue = false;
	
	//								(Chrome/Safari)			(Mozilla)
	var delta = (evt.wheelDelta) ? evt.wheelDelta / 3600 : evt.detail / -90;
	
	var p = getEventPoint(evt);
	p = p.matrixTransform($("viewport").getCTM().inverse());
	
	zoom(Math.ceil(delta), p.x, p.y);
}

function zoomCenter(zoomIn) {
	var mapOffsetX = -$("viewport").getCTM().e,
		mapOffsetY = -$("viewport").getCTM().f,
		zoomScale = Math.pow(ZOOM_FACTOR, zoomLevel);
	
	zoom(zoomIn, (MAP_WIDTH / 2 + mapOffsetX) / zoomScale, (MAP_HEIGHT / 2 + mapOffsetY) / zoomScale);
}

function resetPopup() {
	var popup = $("popup");
	popup.nodeId = "";
	popup.style.padding = popup.style.left = popup.style.top = "0px";
	popup.style.width = "auto";
	popup.style.height = "auto";
	while (popup.childElements().length > 0) {
		popup.removeChild(popup.childElements()[0]);
	}
}

// Submit page
function newconnectionclick() {
	$("newband").removeClassName("active");
	$("newbandmenuitem").removeClassName("active");
	$("newconnection").addClassName("active");
	$("newconnectionmenuitem").addClassName("active");
}

function newbandclick() {
	$("newband").addClassName("active");
	$("newbandmenuitem").addClassName("active");
	$("newconnection").removeClassName("active");
	$("newconnectionmenuitem").removeClassName("active");
}

/************************************************************* Popup Helpers ****************************************************/

function centerPopup() {
	$("popup").style.top = MAP_HEIGHT / 2 - $("popup").offsetHeight / 2 + "px";
	$("popup").style.left = MAP_WIDTH / 2 - $("popup").offsetWidth / 2 + "px";
}

function recalculatePopupPosition() {
	if (!$("popup").nodeId) return;
	$("popup").style.padding = $("popup").style.left = $("popup").style.top = "0px";
	$("popup").style.width = "auto";
	$("popup").style.height = "auto";
	
	// Hack so the popup will not change dimensions when it gets scrolled out of view
	$("popup").style.width = $("popup").getWidth() + "px";
	$("popup").style.height = $("popup").getHeight() + "px";
	
	// Position the popup while we have node's position
	var node = $($("popup").nodeId),
	// mapOffsetX & mapOffsetY - how far the map has been scrolled in both
	// the x and y directions. Some number between 0 and MAX_DIMENSION * MAX_ZOOM_LEVEL
		mapOffsetX = -$("viewport").getCTM().e,
		mapOffsetY = -$("viewport").getCTM().f,
		zoomScale = Math.pow(ZOOM_FACTOR, zoomLevel),
	
	// nodeXPosition & nodeYPosition - position of the node in the map
	// Some number between 0 and 960 or 0 and 500
		nodeXPosition = node.cx.baseVal.value,
		nodeYPosition = node.cy.baseVal.value,
		nodeRadius = node.r.baseVal.value;
	
	// Calculate the position of the popup
	// 0 < left < 960
	// 0 < top < 500
	$("popup").style.left = nodeXPosition * zoomScale - mapOffsetX - 10 + "px";
	$("popup").style.top = nodeYPosition * zoomScale - mapOffsetY - 20 + "px";
	
	arrow = $$("#popup .arrow")[0];
	
	if ($("popup").offsetLeft < 600) {
		arrow.removeClassName("arrowRight");
		arrow.addClassName("arrowLeft");
		arrow.style.left = "-10px";
	}
	else {
		arrow.removeClassName("arrowLeft");
		arrow.addClassName("arrowRight");
		arrow.style.left = $("popup").getWidth() + 20 + "px";
	}
	
	// Offset the left position depending on which side the popup should appear on
	if ($("popup").offsetLeft < 600) {
		// Show popup on right side of node
		$("popup").style.left = $("popup").offsetLeft + nodeRadius * zoomScale + 25 + "px";
	}
	else {
		// Show popup on left side of node
		$("popup").style.left = $("popup").offsetLeft - $("popup").getWidth() - nodeRadius * zoomScale - 25 + "px";
	}
	$("popup").style.padding = "10px";
}

function addCloseButtonToPopup() {
	var closeButton = document.createElement("span");
	closeButton.textContent = "x";
	closeButton.addClassName("close");
	closeButton.onclick = function() { $("popup").nodeId = null; $("popup").style.visibility = "hidden"; };
	$("popup").appendChild(closeButton);
}