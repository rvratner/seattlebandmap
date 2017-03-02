<?php

// Create a select box containing all the bands in the database
// $number - number of select boxes to make
function createConnectionSelectBoxes($number) {
	global $bands;

	for ($i = 0; $i < $number; $i++) {
		echo "<select name='connection{$i}'>";
			echo "<option value=''>-------</option>";
		foreach ($bands as $band) {
			echo "<option value='{$band['id']}'>{$band['name']}</option>";
		}
		echo "</select>";
	}
}
function addBandForm() {
	?>
	<form target="." method="post" >
		<h2>Add a band</h2>
		<input type="hidden" name="submitBand" value="true" />
		<label>Band Name<br />
			<input type="text" name="name" id="name"/>
		</label>
		<br /><br />
		<label>City<br />
			<input type="text" name="city" id="city"/>
		</label>
		<br /><br />
		<label>State<br />
		<input type="text" name="state" id="state"/>
		</label>
		<br /><br />
		<label>Website<br />
		<input type="text" name="website" id="website"/>
		</label>
		<br /><br />
		<label>Members<br />
		<input type="text" name="members" id="members"/>
		</label>
		<br />
		<br />
		<br />
		<label>Connections<br />
		<div id="connections"></div>
		<br />
		<?php createConnectionSelectBoxes(5) ?>
		</label>
		<br />
		<br />
		<br />
		<input type="submit" value="Submit Band" />
	</form>
	<?php
}

function addConnectionForm() {
	?>
	<form target="." method="post">
		<h2>Add a connection</h2>
		<input type="hidden" name="submitConnection" value="true" />
		<?php createConnectionSelectBoxes(2) ?>
		<input type="submit" value="Submit Connection" />
	</form>
	<?php
}

function displayPendingBands($pendingBands) {
	if (count($pendingBands) < 1) {
		echo "No current pending bands";
	} else {
	?>
	<table>
	<caption>Pending Bands</caption>
	<tr><th>Band Name</th><th>City</th><th>State</th><th>Website</th><th>Members</th><th>Connections</th></tr><?php
		foreach ($pendingBands as $band) {
			?>
			<tr>
				<form target="." method="post" onsubmit="return confirm('Are you sure you want to delete this band?')">
					<input type="hidden" name="deleteBand" value="true" />
					<input type="hidden" name="id" value="<?php echo $band['id'] ?>" />
					<input type="hidden" name="name" value="<?php echo $band['name'] ?>" />
					<td><?php echo $band['name'] ?></td>
					<td><?php echo $band['city'] ?></td>
					<td><?php echo $band['state'] ?></td>
					<td><?php echo $band['website'] ?></td>
					<td><?php echo $band['members'] ?></td>
					<td><?php echo $band['connections'] ?></td>
					<td><button>Copy</button></td>
					<td><input type="submit" value="Delete Band" /></td>
				</form>
			</tr><?php
		}
	?></table><?php
	}
}

function displayPendingConnections($pendingConnections) {
	if (count($pendingConnections) < 1) {
		echo "No current pending connections";
	}
	else {
	?>
	<table>
		<caption>Pending Connections</caption>
		<tr><th>Band 1</th><th>Band 2</th><th>Description</th></tr><?php
		foreach ($pendingConnections as $connection) {
		?>
		<tr>
			<form target="." method="post" onsubmit="return confirm('Are you sure you want to delete this connection?')">
				<input type="hidden" name="deleteConnection" value="true" />
				<input type="hidden" name="id" value="<?php echo $connection['id'] ?>" />
				<input type="hidden" name="band1" value="<?php echo $connection['band1'] ?>" />
				<input type="hidden" name="band2" value="<?php echo $connection['band2'] ?>" />
				<td><?php echo $connection['band1'] ?></td>
				<td><?php echo $connection['band2'] ?></td>
				<td><?php echo $connection['description'] ?></td>
				<!--<td><button>Copy</button></td>-->
				<td><input type="submit" value="Delete Connection" /></td>
			</form>
		</tr>
	<?php
		}
	?>
	</table>
	<?php
	}
}
?>