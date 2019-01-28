import * as React from "react";
import {
    interaction, layer, custom, control, type, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-openlayers";


export class Draw extends React.Component<any, any> {
    constructor(props) {
        super(props);
        this.state = {
            view: {
                zoom: 4,
                center: [-11000000, 4600000],
            },
            interactionType: 'Polygon',
            features: []
        };
        this.drawend = this.drawend.bind(this);
    }

    drawend(e) {
        console.log('xxxxxxxxxxxxx, draw end', e);

        this.setState({
            features: [...this.state.features, e]
        })
    }

    render() {
        return (
            <div>
                <Map view={this.state.view}>
                    <Layers>
                        <layer.OSM/>
                        <layer.Vector features={this.state.features}/>
                    </Layers>
                    <Interactions>
                        <interaction.Draw
                            drawend={this.drawend}
                            type={this.state.interactionType}/>
                    </Interactions>
                </Map>
                <select onChange={(event) => this.setState({interactionType: event.target.value})} value={this.state.interactionType}>
                    <option value="Point">Point</option>
                    <option value="Polygon">Polygon</option>
                    <option value="LineString">Line</option>
                </select>
                <br/>
                <pre>{`
        `}</pre>
            </div>
        );
    }
}
