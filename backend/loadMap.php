<?php
/*	This file converts the band data in the database into a nice looking
	band map. Graphviz takes ~20 mins to create a good looking graph, so
	we will run this script once a day and use that graph for the whole day
 */


/* Connect to DB, export it to Graphviz compatible dot language in file "connections" */
header("Content-Type: text/plain");

# query the database for band names and connections
# $bandInfo - array( id => array(name, numConnections)
#					 id => array(name, numConnections)
#					 id => array(name, numConnections))
function getBandInfo() {
	include("dbconnect.php");
	$bandInfo = array();
	$query = "SELECT id, name, COUNT(*) as numConnections
			  FROM bands, connections
			  WHERE connections.band1 = bands.id
			  OR connections.band2 = bands.id
			  GROUP BY bands.id";
	$results = mysql_query($query) or die(mysql_error());
	while ($row = mysql_fetch_array($results)) {
		$bandInfo[$row['id']] = array($row['name'], $row['numConnections']);
	}
	return $bandInfo;
}

function dbToDot($out) {	
	include("dbconnect.php");
	# query the database for connections
	$query = "SELECT * FROM connections";
	$results = mysql_query($query) or die(mysql_error());
	$dot = array("strict graph connections {");
	while ($row = mysql_fetch_array($results)) {
		$dot[] = "{$row['band1']} -- {$row['band2']};";
	}

	// Add some dummy edges to make the graph look not so square
	for ($i = 0; $i < 15; $i++) {
		$dot[] = "a${i} -- b${i};";
	}

	$dot[] = "}";
	$dot = implode("\n", $dot);

	mysql_close($db);

	file_put_contents($out, $dot);
}

/* Run Graphviz on file "connections", output to plain text */
function graphviz($in) {
	// Set maximum script running time to a big number to allow the graph to render
	set_time_limit(30 * 6000);

	$time_start = microtime(true);

	// Useful Graphviz attributes:
	// -Gsep : increasing brings the edges' endpoints closer to the middle of the nodes
	// -Goverlap : scale makes graph look good
	// -Gstart : random seed

	// There are two useful Graphviz configurations. One for my laptop (Windows), and one for Linux production
	if ($_SERVER['SERVER_NAME'] != "www.seattlebandmap.com") {
		`"C:/Program Files (x86)/Graphviz2.26.3/bin/dot.exe" -T plain -O -K sfdp temp/connections -Gsep=+400 -Goverlap=scale -Gstart=1`;
	}
	else {
		// Runs on the server and makes a pretty graph
		`/home/rvratner/local/bin/dot -T plain -O -K sfdp temp/connections -Gsep=+400 -Goverlap=scale -Gstart=1`;
	}

	$time_end = microtime(true);
	$time = $time_end - $time_start;
	echo $time . " seconds";
}

function plainToSVG($in, $bandInfo, $out) {
	// Array containing input, which is formatted like:
	// [0] => graph 2 1
	// [1] => node 3 4
	// [2] => edge 5 7
	$in = explode("\n", file_get_contents($in));
	// Output file to write to
	$map = fopen("temp/map.svg", 'w') or die("can't open file");
	
	// Array to temporarily hold all the graph nodes
	$nodes = array();
	
	$colors = array('#336699', '#4C340A', '#122F4C', '#6C8BAA', '#3292B0', '#112233', '#E6B24C');

	// Iterate through the shapes to draw, and output the appropriate SVG
	foreach($in as $shape) {
		$shape = explode(" ", $shape);
		if ($shape[0] == "graph") {
			// $shape format:
			// [0] "graph"
			// [1] scale
			// [2] width
			// [3] height
			$GRAPH_HEIGHT = $shape[2];
			$GRAPH_WIDTH = $shape[3];
			$svg = '<svg width="100%" height="100%" version="1.1" id="svg"
					xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
					<g id="viewport">
					<rect id="mapBoundary" width="600%" height="600%" fill="white" x="-200%" y="-200%"/>';

			fwrite($map, $svg);
		}
		
		else if ($shape[0] == "node" && $shape[1][0] != "a" && $shape[1][0] != "b") {
			// $shape format:
			// [0] "node"
			// [1] node name
			// [2] x position
			// [3] y position
			// [4] width (unused - size is based on number of connections)
			// [5] height (unused - size is based on number of connections)
			// [6..] miscellaneous style info which we do not use
			// $nodeWidth = $shape[4] * 5;
			// $nodeHeight = $shape[4] * 5;
			
			$bandName = htmlspecialchars($bandInfo[$shape[1]][0]);
			$numConnections = $bandInfo[$shape[1]][1];
			
			// Scale radius based on number of connections
			$radius = .3 + pow($numConnections, 0.4) / 3;
			
			$coordinates = fitToGraph($shape[2], $shape[3], $GRAPH_WIDTH, $GRAPH_HEIGHT);
			$xCoordinate = round($coordinates[0], 3); // Round to thousandths place
			$yCoordinate = round($coordinates[1], 3);
			
			$borderRadius = $radius + .2;
			
			$xBorderCoordinate = $xCoordinate + outerBorderRandomOffset();
			$yBorderCoordinate = $yCoordinate + outerBorderRandomOffset();
			// Scale the text down by 10 and multiply it by 10 again to get around a Webkit text rendering bug
			$xTextCoordinate = ($xCoordinate + $nodeWidth + $radius + 1) * 10;
			$yTextCoordinate = ($yCoordinate + ($nodeHeight / 2) + 0.25) * 10;
			
			$color = $colors[array_rand($colors)];
			$svg = "<g>
						<circle class='outer' id='${shape[1]}' cx='${xBorderCoordinate}' cy='${yBorderCoordinate}' r='${borderRadius}' fill='black' />
						<circle class='inner' cx='${xCoordinate}' cy='${yCoordinate}' r='${radius}' fill='${color}' />
						<text x='${xTextCoordinate}' y='${yTextCoordinate}' transform='scale(0.1)'>${bandName}</text>
					</g>";
					
			// This version of text has white text shadows which looks good but lags a lot
			// Maybe enable it in the future when browsers are faster
			// $svg = "
						// <circle id='${shape[1]}' cx='${xCoordinate}' cy='${yCoordinate}' r='${radius}' fill='${color}' />
						// <text class='shadow' x='${xTextCoordinate}' y='${yTextCoordinate}' transform='scale(0.1)'>${bandName}</text>
						// <text x='${xTextCoordinate}' y='${yTextCoordinate}' transform='scale(0.1)'>${bandName}</text>
					// ";
			
			// Store the result in nodes array to be printed at the end
			$nodes[] = $svg;
		}
		
		else if ($shape[0] == "edge" && $shape[1][0] != "a") {
			// $shape format:
			// [0] "edge"
			// [1] tail node name
			// [2] head node name
			// [3] number of nodes
			// [4],[5] x1, y1
			// [6],[7] x2, y2
			// [8],[9] x3, y3
			// etc. for remaining points on the curve
			// [n..] miscellaneous style info which we will overwrite
			//edge 1 2 4 3.612 4.9977 3.6705 4.8472 3.7446 4.6568 3.8033 4.5057 solid black
			
			// Create an edge that passes through all the points
			$pathD = array();
			for ($i = 0; $i < $shape[3]; $i++) {
				$index = $i * 2 + 4;
								
				$coordinates = fitToGraph($shape[$index], $shape[$index + 1], $GRAPH_WIDTH, $GRAPH_HEIGHT);
				
				$x = round($coordinates[0], 3); // Round to thousandths
				$y = round($coordinates[1], 3); // Round to thousandths
				$pathD[] = "${x},${y}";
			}
			$pathD = "M" . implode(" ", $pathD);
			$pathD[strpos($pathD, " ")] = "C";
			
			$svg = "<g id='edge${shape[1]}_${shape[2]}'>
						<path d='${pathD}'/>
					</g>";

			fwrite($map, $svg);
		}
	}
	fwrite($map, implode("\n", $nodes));

	fwrite($map, "\n</g>\n</svg>");

	fclose($map);

	/* Move the generated SVG to the images folder */
	rename("temp/map.svg", $out);
}

// Rotate, scale, and translate a coordinate to fit it on band map screen
function fitToGraph($xCoordinate, $yCoordinate, $oldXScale, $oldYScale) {
	
	$ANGLE = -M_PI / 4;
	// Rotate
	$tempX = $xCoordinate * cos($ANGLE) - $yCoordinate * sin($ANGLE);
	$tempY = $xCoordinate * sin($ANGLE) + $yCoordinate * cos($ANGLE);
	
	$xCoordinate = $tempX;
	$yCoordinate = $tempY;
	
	// Translate
	$xCoordinate += -1500;
	$yCoordinate += 1500;
	
	// Scale
	$X_SCALE = 1000;
	$Y_SCALE = 1000;
	$xCoordinate /= $oldXScale / $X_SCALE;
	$yCoordinate /= $oldYScale / $Y_SCALE;
	
	return array($xCoordinate, $yCoordinate);
}

// This returns a random number to move the outer circle by, with greater likelihood of larger offset
function outerBorderRandomOffset() {
	return round((1000 - pow(rand(0, 10), 3)) * (rand(0, 1) * 2 - 1) / 15000, 3);
}

$tempFiles = array("dot" => "temp/connections", "plain" => "temp/connections.plain", "svg" => "../images/map.svg");

$bandInfo = getBandInfo();
dbToDot($tempFiles["dot"]);

graphviz($tempFiles["dot"]);

plainToSVG($tempFiles["plain"], $bandInfo, $tempFiles["svg"]);
?>