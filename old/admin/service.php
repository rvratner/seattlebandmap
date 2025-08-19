<?php
if ($_POST['submitBand']) {
/*
	$_POST:
		[verify] => true
		[id] => id in pending table
		[name] => band name
		[city] => city
		[state] => state
		[website] => website
		[members] => list of members
		[connection0] => bandid
		[connection1] => bandid
		[connection2] => bandid
		[connection3] => bandid
		[connection4] => bandid
		[connection5] => bandid
*/

	mysql_query("BEGIN");

	// Add new row to the band table
	$name = mysql_real_escape_string($_REQUEST['name']);
	$city = mysql_real_escape_string($_REQUEST['city']);
	$state = mysql_real_escape_string($_REQUEST['state']);
	$website = mysql_real_escape_string($_REQUEST['website']);
	$website = (substr($website, 0, 7) == "http://" || strlen($website) == 0) ? $website : "http://" . $website;
	$members = mysql_real_escape_string($_REQUEST['members']);
	$time = time();
	$query = "INSERT INTO bands
				(name, city, state, last_updated, website, members)
				VALUES
				('${name}',
				'${city}',
				'${state}',
				'${time}',
				'${website}',
				'${members}');";
	
	if (!mysql_query($query)) {
		mysql_query("ROLLBACK");
		echo "<p class='warning'>Error! This band already exists in the database</p>";
		return;
	}
	
	// Get the new band id from band table
	$query = "SELECT id FROM bands WHERE name = '${name}';";
	$results = mysql_query($query) or die(mysql_error());
	$row = mysql_fetch_array($results);
	$id = $row['id'];
	
	// Add connections to the connection table
	for ($i = 0; $i <= 5; $i++) {
		$connectionId = $_POST['connection' . $i];
		if ($connectionId) {
			$band1 = min($connectionId, $id);
			$band2 = max($connectionId, $id);
			$query = "INSERT INTO connections (band1, band2) VALUES ('${band1}', '${band2}');";
			
			if (!($results = mysql_query($query))) {
				mysql_query("ROLLBACK");
				echo "<p class='warning'>Error! Duplicate connections were selected</p>";
				return;
			}
		}
	}
	
	// Delete the band from the pending table
	// $query = "DELETE FROM pending_bands WHERE id = '${_REQUEST['id']}';";
	// mysql_query($query) or die(mysql_error());
	
	mysql_query("COMMIT");
	
	echo "<p class='message'>Band '${_REQUEST['name']}' successfully added</p>";
}

if ($_POST['deleteBand']) {
	$query = "DELETE FROM pending_bands WHERE id = '${_REQUEST['id']}';";
	mysql_query($query) or die(mysql_error());
	echo "<p class='message'>Band '${_REQUEST['name']}' successfully removed</p>";
}


if ($_POST['submitConnection']) {
/*
	$_POST:
		[verifyConnection] => true
		[id] => id in pending table
		[connection0] => bandid
		[connection1] => bandid
*/
	if ($_POST["connection0"] == "" || $_POST["connection1"] == "") {
		echo "<p class='warning'>Unable to add connection. Please select two valid bands.</p>";
	}
	else {
		mysql_query("BEGIN");
		
		// Add connection to the connection table
		$band1 = min($_POST["connection0"], $_POST["connection1"]);
		$band2 = max($_POST["connection0"], $_POST["connection1"]);
		$query = "INSERT INTO connections (band1, band2) VALUES ('${band1}', '${band2}');";
		$results = mysql_query($query) or die(mysql_error());
		
		// Delete the band from the pending table
		// if ($_REQUEST['id']) {
			// $query = "DELETE FROM pending_connections WHERE id = '${_REQUEST['id']}';";
			// mysql_query($query) or die(mysql_error());
		// }
		
		// Modify last updated times
		$time = time();
		$query = "UPDATE bands SET last_updated='${time}' WHERE id='${band1}' OR id='${band2}' LIMIT 2;";
		mysql_query($query) or die(mysql_error());
		
		mysql_query("COMMIT");
		
		echo "<p class='message'>Connection successfully added (${band1} - ${band2})</p>";
	}
}

if ($_POST['deleteConnection']) {
	$query = "DELETE FROM pending_connections WHERE id = '${_REQUEST['id']}';";
	mysql_query($query) or die(mysql_error());
	echo "<p class='message'>Connection between '${_REQUEST['band1']}' and '${_REQUEST['band2']}' successfully removed</p>";
}
?>