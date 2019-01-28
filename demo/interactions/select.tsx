import * as React from "react";
import * as ol from 'openlayers';
import {
    interaction, layer, custom, control,type , //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

var iconFeature = new type.Feature({wkt: "POINT(0 0)"});

var style = new type.Style({
    imageSrc: "https://openlayers.org/en/v4.0.1/examples/data/icon.png",
    opacity: 0.7
});

let selectedMarkerStyle = Util.cloneObject(style);
selectedMarkerStyle.setOpacity(1);

export class Select extends React.Component<any, any> {
    constructor(props) {
        super(props);

        this.state = {
            selectedFeatures: []
        };

        this.featureSelected = this.featureSelected.bind(this);
    }

    featureSelected(feature){
        console.log("selected", feature);
        this.setState({
            selectedFeatures: [feature]
        })
    }

    render() {
        return (
            <div>
                <Map>
                    <Layers>
                        <layer.OSM />
                        <layer.Vector features={[iconFeature]} style={style} layerKey="selectPoint"/>
                    </Layers>
                    <Interactions>
                        <interaction.Select selectedFeatures={this.state.selectedFeatures} onSelected={this.featureSelected}  style={selectedMarkerStyle} active={true} layerKeys={["selectPoint"]}/>
                    </Interactions>
                </Map>
                <pre>{`
          <Map>
            <Layers>
              <layer.Tile />
              <layer.Vector source={markers} style={markers.style} />
            </Layers>
            <Interactions>
              <interaction.Select style={selectedMarkerStyle} />
            </Interactions>
          </Map>
        `}</pre>
            </div>
        );
    }
}