<?php
/*
	Service to handle the queries that can be made to the band map database
*/
include("dbconnect.php");

// Get info about band given an id
if ($_REQUEST['get']) {

	# Get band info
	$query = "SELECT id, name, COUNT(*) as numConnections, city, state, website, members FROM bands, connections WHERE bands.id=${_REQUEST['id']} AND (connections.band1=bands.id OR connections.band2=bands.id);";
	$results = mysql_query($query) or die(mysql_error());
	$bandInfo = mysql_fetch_array($results);
	
	# Get all connections
	$query = "(SELECT band1 AS connection FROM connections WHERE band2=${_REQUEST['id']}) UNION (SELECT band2 AS connection FROM connections WHERE band1=${_REQUEST['id']}) ORDER BY connection";
	$results = mysql_query($query) or die(mysql_error());
	while ($row = mysql_fetch_array($results)) {
		$connections[] = "${row['connection']}";
	}
	$connections = count($connections) > 1 ? implode("|", $connections) : $connections[0];
	echo "${bandInfo['id']};${bandInfo['name']};${bandInfo['numConnections']};${bandInfo['city']};${bandInfo['state']};${bandInfo['website']};${bandInfo['members']};${connections}";
	
	# Increment click count
	$query = "UPDATE bands SET click_count = click_count + 1 WHERE id=${_REQUEST['id']};";
	mysql_query($query) or die(mysql_error());
}

// Search for a band id given a band name
// Return ids of bands in format id1;name1|id2;name2|id3;name3...
if ($_REQUEST['search']) {
	$query = "SELECT id, name FROM bands WHERE name LIKE '%${_REQUEST['name']}%' ORDER BY name LIMIT 10;";
	$results = mysql_query($query) or die(mysql_error());
	$ids = array();
	while ($row = mysql_fetch_array($results)) {
		$ids[] = "${row['id']};${row['name']}";
	}
	echo implode("|", $ids);
}

// Update an existing band's info
if ($_REQUEST['update']) {
	$city = mysql_real_escape_string($_REQUEST['city']);
	$state = mysql_real_escape_string($_REQUEST['state']);
	$website = mysql_real_escape_string($_REQUEST['website']);
	$website = (substr($website, 0, 7) == "http://" || strlen($website) == 0) ? $website : "http://" . $website;
	$members = mysql_real_escape_string($_REQUEST['members']);
	$time = time();
	$query = "UPDATE bands SET city='${city}', state='${state}', website='${website}', members='${members}', last_updated='${time}' WHERE id=${_REQUEST['id']} LIMIT 1;";
	mysql_query($query) or die(mysql_error());
	
	// Append to update log
	if ($_SERVER['SERVER_NAME'] == "www.seattlebandmap.com") {
		$file = fopen("updates.txt", "a");
		fwrite($file, "\nid=${_REQUEST['id']}, city='${city}', state='${state}', website='${website}', members='${members}'");
		fclose($file);
	}
}

mysql_close();
?>