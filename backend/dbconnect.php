<?php
// Local:
if ($_SERVER['SERVER_NAME'] != "www.seattlebandmap.com") {
	$db = mysql_connect("localhost", "root", "") or die(mysql_error());
	mysql_select_db("sbmadmin") or die("Selecting DB failed: " . mysql_error());
}
// Dreamhost:
else {
	$db = mysql_connect("db.seattlebandmap.com", "sbmadmin", "S3attleBandMap") or die(mysql_error());
	mysql_select_db("bandmap") or die("Selecting DB failed: " . mysql_error());
}
?>