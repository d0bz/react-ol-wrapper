```js
const GeoMapCore = require('../index');
const Map = GeoMapCore.Map;
const Layers = GeoMapCore.Layers;
const layer = GeoMapCore.layer;
const Util = GeoMapCore.Util;
const type = GeoMapCore.type;
const Controls = GeoMapCore.Controls;



let coordinates = [24.761769696908118,59.43256023120438];

let iconFeature = new type.Feature({wkt: `POINT(${coordinates[0]} ${coordinates[1]})`, projection: "EPSG:4326"});

let extentAroundCoordinates = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 100);
let extent = Util.transformExtent(extentAroundCoordinates, "EPSG:4326", "EPSG:3857");

let style = new type.Style({
    imageSrc: "https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png",
    opacity: 0.7,
    scale: 0.2
});


<Map extent={extent}>
  <Layers>
    <layer.OSM/>
    <layer.Vector features={[iconFeature]} style={style} zIndex="1"/>
  </Layers>
</Map>

```