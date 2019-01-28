import * as React from "react";
import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

export class TileOsm extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Map>
                    <Layers>
                        <layer.Tile properties={{
                            "key": "OSM_tile",
                            "url": "https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png",
                            "type": "tms"
                        }}/>
                    </Layers>
                </Map>
                <pre>{`
        <Map>
          <Layers>
                 <layer.Tile properties={{
                            "key": "OSM_tile",
                            "url": "https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png",
                            "type": "tms"
                        }}/>
          </Layers>
        </Map>
        `}</pre>
            </div>
        );
    }
}