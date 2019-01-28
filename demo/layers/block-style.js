// Styles for the mapbox-streets-v6 vector tile data set. Loosely based on
// http://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6.json
import * as ol from 'openlayers';


export function createBlockStyle(selectedIds) {
	var fill = new ol.style.Fill({ color: '' });
	var polygon = new ol.style.Style({ fill: fill });
	var stroke = new ol.style.Stroke({color: '', width: 1});
	var strokedPolygon = new ol.style.Style({fill: fill, stroke: stroke});

	var styles = [];
	return function (feature, resolution) {
		var length = 0;
		var blockId = feature.get('proto_fid');
		var geom = feature.getGeometry().getType();

		fill.setColor('#ff0000');
		stroke.setColor('#0000ff');
		styles[length++] = strokedPolygon;

		if(selectedIds.indexOf(blockId) !== -1){
			fill.setColor('#00ff00');
			styles[length++] = strokedPolygon;
		}


		styles.length = length;
		return styles;
	};
}
