Event.observe(window, "load", function() {
	var copyButtons, index;
	copyButtons = $$("#bandsDiv button");
	for (index = 0; index < copyButtons.length; index++) {
		Event.observe(copyButtons[index], "click", copyBand);
	}
	
	// copyButtons = $$("#connections button");
	// for (index = 0; index < copyButtons.length; index++) {
		// Event.observe(copyButtons[index], "click", copyConnection);
	// }
	
	Event.observe("toggleBands", "click", toggleBands);
	toggleBands();
});

function buttonClick(e) {
	//copyRow(this.parentNode.siblings();
}

function copyBand(e) {
	Event.stop(e);
	var fields = ["name", "city", "state", "website", "members", "connections"];
	var toCopy = e.target.parentNode.siblings().slice(4, 10);
	for (var i = 0; i < toCopy.length; i++) {
		$(fields[i]).value = $(fields[i]).textContent = toCopy[i].textContent;
	}
}

// function copyConnection(e) {
	// Event.stop(e);
	// var fields = ["band1", "band2", "description"];
	// var toCopy = e.target.parentNode.siblings().slice(3, 6);
	// for (var i = 0; i < toCopy.length; i++) {
		// $(fields[i]).value = $(fields[i]).textContent = toCopy[i].textContent;
	// }
// }

function toggleBands() {
	$("bandsDiv").style.display = ($("bandsDiv").style.display != "block") ? "block" : "none";
	$("toggleBands").className = ($("toggleBands").hasClassName("hidden")) ? "" : "hidden";
}