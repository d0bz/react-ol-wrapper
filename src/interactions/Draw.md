```js
const GeoMapCore = require('../index');
const Map = GeoMapCore.Map;
const Layers = GeoMapCore.Layers;
const layer = GeoMapCore.layer;
const Util = GeoMapCore.Util;
const type = GeoMapCore.type;
const Controls = GeoMapCore.Controls;
const Interactions = GeoMapCore.Interactions;
const interaction = GeoMapCore.interaction;

let coordinates = [24.761769696908118,59.43256023120438];
let extent = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 100);

let interactionType = "Polygon";

initialState = { features: [] }

;<div>
    <Map extent={extent}>
        <Layers>
            <layer.OSM/>
            <layer.Vector features={state.features}/>
        </Layers>
        <Interactions>
            <interaction.Draw
                drawend={(e) => setState({features: [...state.features, e]})}
                type={interactionType}/>
        </Interactions>
    </Map>

</div>

```