import * as React from "react";
import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-ol";

export class Tile extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}
                >
                    <Layers>
                        <layer.Tile properties={{
                            "key": "MAPHOTO",
                            "url": "http://tiles.maaamet.ee/tm/tms/1.0.0/foto/{z}/{x}/{-y}.jpg",
                            "type": "tms",
                            "resolutions": [4000, 2000, 1000, 500, 250, 125, 62.5, 31.25, 15.625, 7.8125, 3.90625, 1.953125, 0.9765625, 0.48828125, 0.244140625],
                            "extent": [40500, 5993000, 1064500, 7017000]
                        }}/>
                    </Layers>
                </Map>
                <pre>{`
        <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}
                >
          <Layers>
                 <layer.Tile properties={{
                    "key": "MAPHOTO",
                    "url": "http://tiles.maaamet.ee/tm/tms/1.0.0/foto/{z}/{x}/{-y}.jpg",
                    "type": "tms",
                    "resolutions": [4000, 2000, 1000, 500, 250, 125, 62.5, 31.25, 15.625, 7.8125, 3.90625, 1.953125, 0.9765625, 0.48828125, 0.244140625],
                    "extent": [40500, 5993000, 1064500, 7017000]
                }}/>
          </Layers>
        </Map>
        `}</pre>
            </div>
        );
    }
}