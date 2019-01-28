
```js
const GeoMapCore = require('../index');
const Map = GeoMapCore.Map;
const Layers = GeoMapCore.Layers;
const layer = GeoMapCore.layer;
const Controls = GeoMapCore.Controls;

<Map extent={[2265671.9191501983, 7831064.829389805, 3368811.1113618617, 8382634.425495638]}>
    <Layers>
        <layer.Tile properties={{
                                    "key": "OSM_tile",
                                    "url": "http://a.tile.stamen.com/toner/{z}/{x}/{y}.png",
                                }}/>
    </Layers>
    <Controls zoom={true}></Controls>
</Map>
```