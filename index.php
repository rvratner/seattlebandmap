<?php
// Include these for SVG support
$charset = "utf-8";
$mime = (stristr($_SERVER["HTTP_ACCEPT"],"application/xhtml+xml")) ? "application/xhtml+xml" : "text/html";
header("content-type:$mime;charset=$charset");

include("backend/contentQueries.php");

function addListEvents($id) {
	?>
	onclick="snapToBand($('<?php echo $id ?>'))" onmouseover="mouseOver($('<?php echo $id ?>'))" onmouseout="mouseOut($('<?php echo $id ?>'))"
	<?php
}
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta type="application/xhtml+xml" />
	<link rel="stylesheet" type="text/css" href="css/bandmap.css" />
	<script src="https://ajax.googleapis.com/ajax/libs/prototype/1.7.0.0/prototype.js" type="text/javascript"></script>
	<script src="javascript/libraries/effects.js" type="text/javascript"></script>
	<script src="javascript/libraries/lightwindow.js" type="text/javascript"></script>
	<link rel="stylesheet" href="css/lightwindow.css" type="text/css" media="screen" />
	<link rel="shortcut icon" href="/favicon.ico" />

	<script src="javascript/bandmap.js" type="text/javascript"></script>
	<script src="javascript/svgpan.js" type="text/javascript"></script>
	<title>Seattle Band Map</title>
	
	<script type="text/javascript">

	  var _gaq = _gaq || [];
	  _gaq.push(['_setAccount', 'UA-20432564-1']);
	  _gaq.push(['_trackPageview']);

	  (function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	  })();

	</script>
</head>
<body>
<div id="container">
<p></p>
<p><strong>THE SEATTLE BAND MAP</strong></p>	
The Seattle Band Map explores how bands from the Pacific Northwest are interconnected through
			personal relationships and collaborations.<p>
			
			Bands are connected if a) they share band members or b) two artists have collaborated on a project.
			For the purposes of this map, to qualify as a band, a project must have recorded and publicly shared at least one song and/or played a public show.</p>
		This is a community project, so please feel free to <a href="submit/" class="lightwindow" params="lightwindow_width=800,lightwindow_height=600">submit</a> your own connections.
		<p style="margin-bottom: 40px;">If you have any corrections (incorrect connections, spelling/punctuation errors), comments, or questions please contact us at <a href="mailto:seattlebandmap@gmail.com">seattlebandmap@gmail.com</a></p>
		<form id="search" action="." autocomplete="off">
			<input type="text" id="query" value="Find a band" disabled="disabled" />
			<input type="submit" value="Search" />
		</form>
		
		<div id="menu">
			<a href="submit/" class="lightwindow" params="lightwindow_width=800,lightwindow_height=600" id="submittab"><b>Submit</b></a>
			<a href="http://www.seattlebandmap.com/blog/about/">About</a>
			<a href="http://www.seattlebandmap.com/blog/">Blog</a>
		</div>
	<div id="mapContainer">
	
		<div id="map">
			<!-- One popup is used to show all sorts of information in the map -->
			<div id="popup"></div>
			<?php include("images/map.svg") ?>
		</div>
		
	</div>
	
	<div id="data">
		<div class="section">
			<h2>Most Recently Updated</h2>
			<ol>
<?php
foreach ($mostRecentlyUpdated as $band) {
?>
				<li>
					<!--<img src="images/band.png" />-->
					<span <?php addListEvents($band['id']) ?>><?php echo htmlspecialchars($band['name']) ?></span><br />
					<span <?php addListEvents($band['id']) ?> class="weak"><?php echo date("Y-m-d h:i:s a", $band['last_updated']) ?></span>
				</li>
<?php } ?>
			</ol>
		</div>
		
		<div class="section">
			<h2>Most Connections</h2>
			<!-- Dummy Data -->
			<ol>
<?php foreach ($mostConnections as $band) { ?>
				<li>
					<!--<img src="images/band.png" />-->
					<span <?php addListEvents($band['id']) ?>><?php echo htmlspecialchars($band['name']) ?></span><br />
					<span <?php addListEvents($band['id']) ?> class="weak"><?php echo $band['COUNT(*)'] ?> connection<?php echo ($band['COUNT(*)'] != 1) ? "s" : "" ?></span>
				</li>
<?php } ?>
			</ol>
		</div>
		
		<div class="section">
			<h2>Most Popular</h2>
			<ol>
<?php
foreach ($mostPopular as $band) {
?>
				<li>
					<!--<img src="images/band.png" />-->
					<span <?php addListEvents($band['id']) ?>><?php echo htmlspecialchars($band['name']) ?></span>
					<br /><br />
				</li>
<?php } ?>
			</ol>
		</div>
	</div>
	
</div>

<div id="footer">
	Copyright &copy; 2010-2011, Rachel Ratner; Seattle Band Map Project - Developed by <a href="http://www.golfsinteppadon.com/">Golf Sinteppadon</a>
</div>

</body>
</html>
