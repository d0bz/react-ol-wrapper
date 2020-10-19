import * as React from "react";

import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-ol";

export class WmsTile extends React.Component<any,any> {
    constructor(props) {
        super(props);

        this.state = {
            extraFilters: [],
            params: null,
            labelparams: null,
            refresh: 0
        };
    }

    addExtraFilter = () => {
        this.setState({
            extraFilters: [{ value: "60605", column: "postcode", condition: "equalTo" }],
        })
    };

    addParamsFilter = () => {
        if (this.state.params) {
            this.setState({
               params: null,
                labelparams: null,
            });
        } else {
            this.setState({
                params: [
                    { key: "viewparams", value: "l1_codes:'79';l3_codes:'6252'\\,'6857';use_filter:1" },
                ],
                labelparams: [
                    { key: "viewparams", value: "l1_codes:'79';use_filter:1" },
                ],
            })
        }
    };

    refresh = () => {
        this.setState({
            refresh: new Date().getTime()
        })
    };

    loading = (status, loading, loaded) => {
        console.log(status, loading, loaded);
    };

    render() {
        return (
            <div>
                <button onClick={this.addExtraFilter}>cqlfilter</button>
                <button onClick={this.addParamsFilter}>params filter</button>
                <button onClick={this.refresh}>Refresh layer</button>
                <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}
                >
                    <Layers>
                        <layer.WmsTile properties={{
                            "featureNS": "",
                            "featureType": "HYBRID",
                            "url": "https://kaart.maaamet.ee/wms/fotokaart",
                            "version": "1.1.1",
                            "type": "wms"
				        }}
                        />
                    </Layers>
                </Map>
                <pre>{`
        <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}
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