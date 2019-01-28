```js
const GeoMapCore = require('./index');
const Map = GeoMapCore.Map;
const Layers = GeoMapCore.Layers;
const layer = GeoMapCore.layer;
const Util = GeoMapCore.Util;
const type = GeoMapCore.type;
const Controls = GeoMapCore.Controls;
const Interactions = GeoMapCore.Interactions;
const interaction = GeoMapCore.interaction;

let coordinates = [24.761769696908118,59.43256023120438];
let extentAroundCoordinates = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 10000);
let extent = Util.transformExtent(extentAroundCoordinates, "EPSG:4326", "EPSG:3857");

initialState = { inited: false, features: [] }

if(!state.inited){
	setState({
		inited: true
	});
	
    Util.loadGeoJSON('./demo/data/estonia.json', "EPSG:3857").then((features) => {
        setState({
            features: features
        });
    });
}

;<div>
    <Map extent={extent}>
        <Layers>
            <layer.OSM/>
            <layer.Vector features={state.features}/>
        </Layers>
    </Map>

</div>

```