<?php
/* Get the front page band info from DB and store into variables for viewing
	$mostRecentlyUpdated - 6 most recently updated bands
	$mostConnections - 6 most connected bands
	$mostPopular- 6 most clicked on bands
*/

# connect to DB
include("dbconnect.php");

# Most Recently Updated
$mostRecentlyUpdated = array();
$query = "SELECT id, name, last_updated FROM bands ORDER BY last_updated DESC LIMIT 6";
$results = mysql_query($query) or die(mysql_error());
while ($result = mysql_fetch_array($results)) {
	$mostRecentlyUpdated[] = $result;
}

# Most Connections
$query = "SELECT id, name, COUNT(*)
		  FROM bands, connections
		  WHERE bands.id = connections.band1
		  OR bands.id = connections.band2
		  GROUP BY id
		  ORDER BY COUNT(*) DESC
		  LIMIT 6";
$results = mysql_query($query) or die(mysql_error());
while ($result = mysql_fetch_array($results)) {
	$mostConnections[] = $result;
}

# Most popular
$mostPopular = array();
$query = "SELECT id, name FROM bands ORDER BY click_count DESC LIMIT 6";
$results = mysql_query($query) or die(mysql_error());
while ($result = mysql_fetch_array($results)) {
	$mostPopular[] = $result;
}
mysql_close();
?>