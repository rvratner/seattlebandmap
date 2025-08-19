<?php
/*	Take an input file, which contains bands and connections, and create two output files, each with
	SQL statements to populate data into the respective SQL tables
	
	We should never need to use to script again. Just one time to import the excel spreadsheet into
	the SQL database
	
	Input: "bandmap.csv"
	Output: "bands" and "connections"
*/

// Array of input file
$text = explode("\n", file_get_contents("bandmap.csv"));

/* First output bands */
// Array of all band names
$bandNames = array();
// Map of all bands, with band names pointing to the index
// This is the $bandNames array, except with keys and values swapped
$bandNameInvertedIndex = array();

$index = 1;
// Populate $bandNames and $bandNameInvertedIndex arrays with
// band names, which are the first string in each line
foreach($text as $band) {
	// Turn $band into an array, taking care of commas in band names
	$band = str_getcsv($band);
	if (count($band) > 1) {
		$bandNames[$index] = "INSERT INTO bands (id, name) VALUES (${index}, \"${band[0]}\");";
		$bandNameInvertedIndex[$band[0]] = $index;
		$index++;
	}
}
$bandNames = implode("\r\n", $bandNames);
file_put_contents("bands", $bandNames);



/* Second output connections */

// Populate $connections
// Get the text, and for each connection, try to add the tuple to
// a set, making sure that band1 < band2. Once the set contains all connections
// with band1 < band2, print the sets as a SQL statement

// Contains connections
// ["1,3", "2,4", "1,4", etc...]
$connections = array();

foreach($text as $row) {
	$row = str_getcsv($row);
	for ($i = 1; $i < count($row); $i++) {
		// If the name of the connection can be found, add a connection
		if ($bandNameInvertedIndex[$row[$i]]) {
			$connection1 = ($row[0] < $row[$i]) ? $row[0] : $row[$i];
			$connection2 = ($row[0] > $row[$i]) ? $row[0] : $row[$i];
			
			$key = "${bandNameInvertedIndex[$connection1]},${bandNameInvertedIndex[$connection2]}";
			
			$connections[$key] = 1;
		}
	}
}

// Output file to write to
$out = fopen("connections", 'w') or die("can't open file");

foreach ($connections as $key => $value) {
	$output = "INSERT INTO connections VALUES (${key});\r\n";
	fwrite($out, $output);
}

fclose($out);
?>