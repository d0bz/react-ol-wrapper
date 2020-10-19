
```js
const GeoMapCore = require('../index');
const Map = GeoMapCore.Map;
const Layers = GeoMapCore.Layers;
const layer = GeoMapCore.layer;
const Controls = GeoMapCore.Controls;

<Map extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}>
    <Layers>
        <layer.Tile properties={{
                                    "key": "OSM_tile",
                                    "url": "http://a.tile.stamen.com/toner/{z}/{x}/{y}.png",
                                }}/>
    </Layers>
    <Controls zoom={true}></Controls>
</Map>
```