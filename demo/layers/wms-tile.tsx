import * as React from "react";

import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

export class WmsTile extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[331340.8141767173, 6350518.156321323, 795630.1404358551, 6662202.859234595]}
                >
                    <Layers>
                        <layer.WmsTile properties={{
					"featureNS": "",
					"featureType": "HYBRID",
					"url": "https://kaart.maaamet.ee/wms/fotokaart",
					"version": "1.1.1",
					"type": "wms"
				}}/>
                    </Layers>
                </Map>
                <pre>{`
        <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[331340.8141767173, 6350518.156321323, 795630.1404358551, 6662202.859234595]}
                >
                    <Layers>
                        <layer.WmsTile properties={{
					"featureNS": "",
					"featureType": "HYBRID",
					"url": "https://kaart.maaamet.ee/wms/fotokaart",
					"version": "1.1.1",
					"type": "wms"
				}}/>
                    </Layers>
                </Map>
        `}</pre>
            </div>
        );
    }
}