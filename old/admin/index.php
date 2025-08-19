<?php
/*
	Admin page to check on pending bands
*/
include("../backend/dbconnect.php");

// Include methods to handle requests
include("service.php");
include("viewComponents.php");
// Search for a band id given a band name
// Return ids of bands in format id1;name1|id2;name2|id3;name3...




// Get all bands from pending table
$query = "SELECT id, name, city, state, website, members, connections FROM pending_bands;";
$results = mysql_query($query) or die(mysql_error());
while ($row = mysql_fetch_array($results)) {
	$pendingBands[] = $row;
}

// Get all pending connections from pending connection table
$query = "SELECT id, band1, band2, description FROM pending_connections;";
$results = mysql_query($query) or die(mysql_error());
$connections = array();
while ($row = mysql_fetch_array($results)) {
	$pendingConnections[] = $row;
}

// Get all current bands for connection select box
$query = "SELECT id, name FROM bands ORDER BY name;";
$results = mysql_query($query) or die(mysql_error());
$bands = array();
while ($row = mysql_fetch_array($results)) {
	$bands[] = $row;
}

mysql_close();

?>
<html>
<head>
	<title>Seattle Band Map | Administration</title>
	<link rel="stylesheet" type="text/css" href="admin.css" />
	<script src="../javascript/libraries/prototype.js" type="text/javascript"></script>
	<script src="admin.js" type="text/javascript"></script>
</head>

<body>

<h1>Pending Band Management</h1>
<p><a href="../backend/loadMap.php">Refresh SVG map</a> - <a href="../backend/updates.txt">View update log</a> - <a href="http://db.seattlebandmap.com/">phpMyAdmin</a></p>

<div id="toggleBands"></div>
<div id="bandsDiv">
<?php
addBandForm();
?><br /><br /><br /><?php
displayPendingBands($pendingBands);
?>
</div>
<br /><br /><br /><div id="connectionsDiv"><?php
addConnectionForm();
?><br /><br /><br /><?php
displayPendingConnections($pendingConnections);
?>
</div>
</body>
</html>