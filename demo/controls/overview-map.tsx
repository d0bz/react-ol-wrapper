import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ol from 'openlayers';
import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

export class OverviewMap extends React.Component<any,any> {
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
					"version": "1.1.1"
				}}/>
                    </Layers>
                    <Controls>
                        <control.OverviewMap collapsed={false}>
                            <Layers>
                                <layer.Tile properties={
                                    {
                                        "url": "http://tiles.maaamet.ee/tm/tms/1.0.0/kaart/{z}/{x}/{-y}.jpg",
                                        "resolutions": [4000, 2000, 1000, 500, 250, 125, 62.5, 31.25, 15.625, 7.8125, 3.90625, 1.953125, 0.9765625, 0.48828125, 0.244140625],
                                        "extent": [40500, 5993000, 1064500, 7017000]
                                    }
                                }/>
                            </Layers>
                        </control.OverviewMap>
                    </Controls>
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
					"version": "1.1.1"
				}}/>
              </Layers>
          <Controls>
            <control.OverviewMap collapsed={false}>
                <Layers>
                    <layer.WmsTile properties={{
					"featureNS": "omniva",
					"featureType": "a3_mesh_borders",
					"url": "http://areamgmt-dataproc.post.ee:8080/geoserver/omniva/wms",
					"version": "1.1.0"
				}}/>
                </Layers>
            </control.OverviewMap>
          </Controls>
        </Map>
        `}</pre>
            </div>
        );
    }
}