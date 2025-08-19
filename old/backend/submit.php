<p style="width: 300px; margin: 50px auto;">Thank you for your submission! After review, your change will be included in the band map soon.
<a href="#" class="lightwindow_action" rel="deactivate">Click to go back to the map.</a></p>
<?php
// Submit a new band
if ($_REQUEST['newband']) {
	include("dbconnect.php");
	$query = "INSERT INTO pending_bands (name, city, state, website, members, connections) VALUES ('${_REQUEST['name']}', '${_REQUEST['city']}', '${_REQUEST['state']}', '${_REQUEST['website']}', '${_REQUEST['members']}', '${_REQUEST['connections']}');";
	mysql_query($query) or die(mysql_error());
}

// Submit a new connection
if ($_REQUEST['newconnection']) {
	include("dbconnect.php");
	$query = "INSERT INTO pending_connections (band1, band2, description) VALUES ('${_REQUEST['band1']}', '${_REQUEST['band2']}', '${_REQUEST['description']}');";
	mysql_query($query) or die(mysql_error());
}

?>