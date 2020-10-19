import * as React from "react";
import {
    interaction, layer, custom, control, type, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-ol";


let iconFeature = new type.Feature({ wkt: "POINT(22.719727 58.892533)" });
let iconFeature2 = new type.Feature({ wkt: "POINT(572967.931136 6528833.628659)", projection: "EPSG:3301" });

let svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" width="512px" height="512px" viewBox="0 0 792 792.001" style="enable-background:new 0 0 792 792.001;" xml:space="preserve"> <g> <g> <path d="M608.905,123.015c-22.08-37.855-51.812-67.597-89.668-89.668C481.391,11.266,440.383,0,395.779,0 c-44.613,0-85.621,11.266-123.467,33.347c-37.855,22.071-67.588,51.813-89.668,89.668 c-22.081,37.846-32.895,78.854-32.895,123.458v9.911c0,3.163,0.452,4.96,0.903,6.316v0.894v4.96v4.508 c3.605,33.347,12.41,72.615,27.031,117.604c14.669,45.122,32.712,91.101,54.072,137.886 c21.446,46.949,41.912,89.217,61.282,127.062c19.379,37.855,39.201,74.798,59.484,111.297c14.862,33.799,70.192,33.107,86.958,0 c18.869-37.249,40.104-73.441,59.484-111.297c19.369-37.846,39.461-80.286,60.83-127.062 c21.436-46.948,39.451-92.889,54.072-137.886c14.658-45.123,23.877-84.256,27.482-117.604v-6.306c0-2.259,0.451-3.605,0.904-4.057 v-6.316v-9.911C642.252,201.869,630.985,160.861,608.905,123.015z M592.688,254.586v5.402c-0.451,0.452-0.904,1.355-0.904,2.711 v5.854c-3.152,31.992-12.621,70.289-27.934,115.806c-15.324,45.507-34.252,91.917-56.332,139.232 c-22.07,47.314-42.074,87.323-59.475,121.208c-17.303,33.702-34.691,66.242-52.265,97.781 c-17.13-30.646-34.789-63.041-52.274-97.329c-17.668-34.645-37.038-75.211-59.023-122.112 c-22.167-47.266-40.556-93.272-55.879-138.78c-15.323-45.517-24.782-83.814-28.387-115.806v-4.96v-4.499 c-0.452-0.452-0.904-2.259-0.904-4.508v-8.113c0-54.072,19.485-100.367,57.677-138.78c38.413-38.644,84.717-58.129,138.79-58.129 c54.515,0,100.819,19.485,139.231,58.129c38.184,38.413,57.678,84.708,57.678,138.78V254.586z" fill="#fc951e"/> <path d="M395.779,166.715c-24.792,0-46.42,9.017-63.993,26.589c-17.572,17.572-26.127,39.201-26.127,63.983 s8.556,46.411,26.127,63.983c17.572,17.572,39.201,26.589,63.993,26.589c24.782,0,46.411-9.017,63.983-26.589 s26.578-39.201,26.578-63.983s-9.006-46.411-26.578-63.983S420.561,166.715,395.779,166.715z M424.608,286.125 c-16.102,15.89-41.672,15.996-57.667,0c-16.005-15.996-15.774-41.451,0-57.225c16.217-16.217,41.335-16.102,57.667,0 C440.719,244.791,440.95,270.024,424.608,286.125z" fill="#fc951e"/> </g> </g> </svg>';

var style = new type.Style({
    imageSrc: "https://openlayers.org/en/v4.0.1/examples/data/icon.png",
    opacity: 0.7
});

var style2 = new type.Style({
    imageSrc: 'data:image/svg+xml;utf8,' + svg,
    opacity: 0.7,
    scale: 0.1,
    imageAnchor: [0.5, 1]
});

const views = [
    {
        id: "MA",
        projection: "EPSG:3301",
        extent: [22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]
    },
    {
        id: "OSM",
        projection: "EPSG:3857",
        extent: [22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]
    },
];

export class ComplexDemo extends React.Component<any,any> {
    constructor(props) {
        super(props);

        this.state = {
            activeView: 0,
            interactionType: 'Polygon',
            features: []
        };

        Util.loadGeoJSON('../data/estonia.json', "EPSG:4326").then((features) => {
            this.setState({
                features: features
            });
        });


        this.featureSelected = this.featureSelected.bind(this);
    }

    featureSelected(feature) {
        console.log(feature);
        this.setState({
            selectedFeatures: feature
        })
    }

    modifyEnd(feature) {
        this.setState({
            selectedFeatures: [feature]
        })
    }

    toggleView(){
        this.setState({
            activeView: this.state.activeView === 0 ? 1 : 0
        })
    }

    render() {
        const { activeView } = this.state;

        const view= {
            projection: views[activeView].projection
        };
        const extent = views[activeView].extent;

        return (
            <div>
                <Map view={view} extent={extent}>
                    <Layers>
                        { activeView === 1 &&
                            <layer.OSM />
                        }

                        {
                            activeView === 0 &&
                            <layer.Tile properties={{
                                "key": "MAPHOTO",
                                "url": "http://tiles.maaamet.ee/tm/tms/1.0.0/foto/{z}/{x}/{-y}.jpg",
                                "type": "tms",
                                "resolutions": [4000, 2000, 1000, 500, 250, 125, 62.5, 31.25, 15.625, 7.8125, 3.90625, 1.953125, 0.9765625, 0.48828125, 0.244140625],
                                "extent": [40500, 5993000, 1064500, 7017000]
                            }}/>
                        }

                        <layer.Vector
                            style={style}
                            features={[iconFeature2]}
                        />

                        <layer.Vector
                            style={style2}
                            features={[iconFeature]}
                        />

                        <layer.Vector features={this.state.features} style={style} layerKey="worldPoints"/>

                    </Layers>

                    <Interactions>
                        <interaction.Select active={true} selectedFeatures={this.state.selectedFeatures} onSelected={this.featureSelected} layerKeys={["worldPoints"]}/>
                        <interaction.Modify features={this.state.selectedFeatures} modifyend={(feature) => { this.modifyEnd.call(this, feature) }}/>
                    </Interactions>
                </Map>
                <button onClick={this.toggleView.bind(this)}>Toggle</button>
                <pre>{`
        <Map>
          <Layers>
            <layer.OSM />
            <layer.Vector 
              style={style}
              source={source}/>
          </Layers>
        </Map>
        `}</pre>
            </div>
        );
    }
}