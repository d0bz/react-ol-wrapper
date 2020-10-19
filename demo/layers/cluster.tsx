import * as React from "react";
import {
    interaction, layer, custom, control, type, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-ol";

let coordinates = [26.975502, 59.359948];
let iconFeature = new type.Feature({ wkt: `POINT(${coordinates[0]} ${coordinates[1]})`, projection: "EPSG:4326" });

// cluster extent
// let extent: [number, number, number, number] = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 100);

// cluster-v2 extent
let extent = Util.transformExtent([2751382.0421851384, 8270544.426211012, 2779415.322308727, 8280099.054746659], 'EPSG:3857', 'EPSG:4326');


let normalStyle = new type.Style({
    imageSrc: "https://openlayers.org/en/latest/examples/data/icon.png",
    opacity: 0.7,
    scale: 1,
    imageAnchor: [0.5, 0.5]
});


let notNormalStyle = new type.Style({
    imageSrc: "https://openlayers.org/en/latest/examples/data/dot.png",
    opacity: 0.7,
    scale: 1,
    imageAnchor: [0.5, 0.5]
});

let clusterTextStyle = new type.Style({
    opacity: 1,
    fillColor: '#fff',
    strokeColor: 'rgba(0, 0, 0, 0.6)',
    strokeWidth: 3
});

export class Cluster extends React.Component<any,any> {
    constructor(props) {
        super(props);

        const markersListObjects = [{ 'latitude': 59.430318, 'longitude': 24.793369, 'id': 386, 'nr': 1 }, {
            'latitude': 59.420682,
            'longitude': 24.801111,
            'id': 243310,
            'nr': 2
        }, { 'latitude': 59.4179, 'longitude': 24.8479, 'id': 245451, 'nr': 3 }, { 'latitude': 59.4299, 'longitude': 24.8065, 'id': 227006, 'nr': 4 }, {
            'latitude': 59.432,
            'longitude': 24.8222,
            'id': 227007,
            'nr': 5
        }, { 'latitude': 59.435076, 'longitude': 24.811106, 'id': 227008, 'nr': 7 }, { 'latitude': 59.4389, 'longitude': 24.8316, 'id': 227009, 'nr': 8 }, {
            'latitude': 59.443656,
            'longitude': 24.822961,
            'id': 227010,
            'nr': 9
        }, { 'latitude': 59.4185, 'longitude': 24.8649, 'id': 245459, 'nr': 10 }, { 'latitude': 59.4429, 'longitude': 24.8472, 'id': 227011, 'nr': 11 }, {
            'latitude': 59.4464,
            'longitude': 24.8862,
            'id': 227012,
            'nr': 12
        }, { 'latitude': 59.447534, 'longitude': 24.891419, 'id': 227013, 'nr': 13 }, { 'latitude': 59.4435, 'longitude': 24.8906, 'id': 227014, 'nr': 14 }, {
            'latitude': 59.4393,
            'longitude': 24.875,
            'id': 227015,
            'nr': 15
        }, { 'latitude': 59.4382, 'longitude': 24.8512, 'id': 227016, 'nr': 16 }, { 'latitude': 59.436389, 'longitude': 24.845656, 'id': 227017, 'nr': 17 }, {
            'latitude': 59.4397,
            'longitude': 24.8449,
            'id': 227018,
            'nr': 18
        }, { 'latitude': 59.435305, 'longitude': 24.840309, 'id': 227019, 'nr': 19 }, { 'latitude': 59.4346, 'longitude': 24.8347, 'id': 227020, 'nr': 20 }, {
            'latitude': 59.426234,
            'longitude': 24.797875,
            'id': 227021,
            'nr': 21
        }, { 'latitude': 59.429945, 'longitude': 24.786784, 'id': 227022, 'nr': 22 }, { 'latitude': 59.441, 'longitude': 24.8631, 'id': 227023, 'nr': 23 }, {
            'latitude': 59.437921,
            'longitude': 24.871058,
            'id': 227024,
            'nr': 24
        }, { 'latitude': 59.430199, 'longitude': 24.7922, 'id': 227025, 'nr': 25 }, { 'latitude': 59.4429, 'longitude': 24.8632, 'id': 227026, 'nr': 26 }, {
            'latitude': 59.4531,
            'longitude': 24.8741,
            'id': 227027,
            'nr': 27
        }, { 'latitude': 59.451035, 'longitude': 24.850089, 'id': 227028, 'nr': 28 }, { 'latitude': 59.450095, 'longitude': 24.88021, 'id': 227029, 'nr': 29 }, {
            'latitude': 59.436356,
            'longitude': 24.820683,
            'id': 227030,
            'nr': 30
        }, { 'latitude': 59.441748, 'longitude': 24.873238, 'id': 227031, 'nr': 31 }, { 'latitude': 59.4173, 'longitude': 24.8375, 'id': 245460, 'nr': 32 }, {
            'latitude': 59.4194,
            'longitude': 24.8474,
            'id': 245461,
            'nr': 33
        }, { 'latitude': 59.4162, 'longitude': 24.8386, 'id': 245462, 'nr': 34 }, { 'latitude': 59.418, 'longitude': 24.8316, 'id': 245463, 'nr': 35 }, {
            'latitude': 59.430318,
            'longitude': 24.793369,
            'id': 7469,
            'nr': 36
        }];
        const markersListFeatures = [];
        for (var i = 0; i < markersListObjects.length; i++) {
            var obj = markersListObjects[i];
            markersListFeatures.push(new type.Feature({
                wkt: `POINT(${obj.longitude} ${obj.latitude})`,
                projection: 'EPSG:4326',
                properties: {
                    ...obj,
                },
            }));
        }

        this.state = {
            filterEnabled: false,
            showAll: false,
            update: 1,
            markersList: markersListFeatures,
        };
    }

    createItemStyle(feature) {
        let styles = [];
        let length = 0;

        if (feature.properties.condition_name === 'NORMAL') {
            styles[length++] = Util.cloneObject(normalStyle);
        } else {
            styles[length++] = Util.cloneObject(notNormalStyle);
        }

        if (feature.properties.mailbox_count) {
            styles[length++] = new type.Style({
                text: feature.properties.mailbox_count,
                fillColor: '#fff',
                strokeColor: 'rgba(0, 0, 0, 0.6)',
                strokeWidth: 3
            });
        }

        styles.length = length;
        return styles;
    }

    createClusterStyle(properties) {
        const { features, radius, total } = properties;

        let styles = [];
        let length = 0;

        const textStyle = Util.cloneObject(clusterTextStyle);

        styles[length++] = new type.Style({
            circleRadius: radius,
            fillColor: [255, 153, 0, Math.min(0.8, 0.4 + (features.length / total))]
        });

        let totalMailboxCount = 0;
        features.forEach((f) => {
            totalMailboxCount += f.properties.mailbox_count || 1;
        });

        textStyle.setText(totalMailboxCount);

        styles[length++] = textStyle;

        styles.length = length;
        return styles;
    }

    zoomend = (scale) => {
        console.log(scale);
    }

    enableFilter = () => {
        this.setState({
            filterEnabled: !this.state.filterEnabled,
            update: this.state.update+1
        })
    }

    toggleVisiblity = () => {
        this.setState({
            showAll: !this.state.showAll,
        })
    }

    render() {
        const { markersList } = this.state;
        return (
            <div>
                <button onClick={this.enableFilter}>Toggle Filter</button>
                <button onClick={this.toggleVisiblity}>Toggle visibility</button>
                <Map extent={extent} zoomEnd={this.zoomend}>
                    <Layers>
                        <layer.OSM />

                        <layer.ClusterV2 showAll={this.state.showAll} features={markersList} style={this.markersListStyle} zIndex="1"/>
                    </Layers>
                </Map>
                <pre>{`
        <Map>
          <Layers>
            <layer.OSM/>
            <layer.Vector features={[iconFeature]} style={style} zIndex="1"/>
          </Layers>
        </Map>
        `}</pre>
            </div>
        );
    }

    cachedStyles = {};

    markersListStyle = (feature) => {
        const properties = feature.properties;

        if (this.cachedStyles[properties.nr]) {
            return this.cachedStyles[properties.nr];
        }

        const marker = this.TextMarker({
            fill: 'red',
            value: properties.nr,
        });

        const pointStyle = new type.Style({
            imageSrc: `data:image/svg+xml;utf8,${marker}`,
            imageAnchor: [0.5, 0.5],
            imageSize: [25, 25],
        });

        this.cachedStyles[properties.nr] = pointStyle;

        return pointStyle;
    };

    TextMarker = (props) => {
        const fillColor = (props && props.fill) || 'black';
        const textValue = props && props.value ? props.value.toString() : '';
        const text = textValue.trim();
        return `<svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg"> <circle cx="12.5" cy="12.5" r="12.5" fill="${fillColor}" /> <circle cx="12.5" cy="12.5" r="10" fill="white" /> <text x="50%" y="50%" text-anchor="middle" fill="${fillColor}" fontsize="10px" font-family="Arial" dy=".3em" >${text}</text> </svg>`;
    }
}