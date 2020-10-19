import * as React from 'react';
import { interaction, Interactions, layer, Layers, Map, type, Util } from 'react-ol';

var iconFeature = new type.Feature({ wkt: 'POINT(0 0)' });
let extent = Util.transformExtent([2751382.0421851384, 8270544.426211012, 2779415.322308727, 8280099.054746659], 'EPSG:3857', 'EPSG:4326');

let svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" width="512px" height="512px" viewBox="0 0 792 792.001" style="enable-background:new 0 0 792 792.001;" xml:space="preserve"><path d="M608.905,123.015c-22.08-37.855-51.812-67.597-89.668-89.668C481.391,11.266,440.383,0,395.779,0 c-44.613,0-85.621,11.266-123.467,33.347c-37.855,22.071-67.588,51.813-89.668,89.668 c-22.081,37.846-32.895,78.854-32.895,123.458v9.911c0,3.163,0.452,4.96,0.903,6.316v0.894v4.96v4.508 c3.605,33.347,12.41,72.615,27.031,117.604c14.669,45.122,32.712,91.101,54.072,137.886 c21.446,46.949,41.912,89.217,61.282,127.062c19.379,37.855,39.201,74.798,59.484,111.297c14.862,33.799,70.192,33.107,86.958,0 c18.869-37.249,40.104-73.441,59.484-111.297c19.369-37.846,39.461-80.286,60.83-127.062 c21.436-46.948,39.451-92.889,54.072-137.886c14.658-45.123,23.877-84.256,27.482-117.604v-6.306c0-2.259,0.451-3.605,0.904-4.057 v-6.316v-9.911C642.252,201.869,630.985,160.861,608.905,123.015z M592.688,254.586v5.402c-0.451,0.452-0.904,1.355-0.904,2.711 v5.854c-3.152,31.992-12.621,70.289-27.934,115.806c-15.324,45.507-34.252,91.917-56.332,139.232 c-22.07,47.314-42.074,87.323-59.475,121.208c-17.303,33.702-34.691,66.242-52.265,97.781 c-17.13-30.646-34.789-63.041-52.274-97.329c-17.668-34.645-37.038-75.211-59.023-122.112 c-22.167-47.266-40.556-93.272-55.879-138.78c-15.323-45.517-24.782-83.814-28.387-115.806v-4.96v-4.499 c-0.452-0.452-0.904-2.259-0.904-4.508v-8.113c0-54.072,19.485-100.367,57.677-138.78c38.413-38.644,84.717-58.129,138.79-58.129 c54.515,0,100.819,19.485,139.231,58.129c38.184,38.413,57.678,84.708,57.678,138.78V254.586z" fill="#00ff00"/> <path d="M395.779,166.715c-24.792,0-46.42,9.017-63.993,26.589c-17.572,17.572-26.127,39.201-26.127,63.983 s8.556,46.411,26.127,63.983c17.572,17.572,39.201,26.589,63.993,26.589c24.782,0,46.411-9.017,63.983-26.589 s26.578-39.201,26.578-63.983s-9.006-46.411-26.578-63.983S420.561,166.715,395.779,166.715z M424.608,286.125 c-16.102,15.89-41.672,15.996-57.667,0c-16.005-15.996-15.774-41.451,0-57.225c16.217-16.217,41.335-16.102,57.667,0 C440.719,244.791,440.95,270.024,424.608,286.125z" fill="#00ff00"/> </svg>`;

/*
var style = new type.Style({
 imageSrc: "../data/icon.png",
 opacity: 0.7,
 scale: 0.2
});
*/

let styleEstonia2 = new type.Style({
    circleRadius: 6,
    fillColor: [0, 153, 255, 0.9],
    strokeColor: [255, 255, 255, 0.75],
    strokeWidth: 1.5
});

let style = new type.Style({
	imageSrc: svg,
	scale: 0.1,
});

let selectedMarkerStyle = Util.cloneObject(style);
selectedMarkerStyle.setOpacity(1);

export class Select extends React.Component<any, any> {
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
			selectedFeatures: [],
            features: markersListFeatures,
		};

		this.featureSelected = this.featureSelected.bind(this);
	}

	featureSelected(features) {
		console.log('selected', features);
		this.setState({
			selectedFeatures: features
		})
	}

	render() {
		return (
			<div>
				<Map extent={extent}>
					<Layers>
						<layer.OSM/>
						<layer.Vector features={this.state.features} style={styleEstonia2} layerKey="selectPoint"/>
					</Layers>
					<Interactions>
						<interaction.Select selectedFeatures={this.state.selectedFeatures} onSelected={this.featureSelected} style={selectedMarkerStyle} active={true} layerKeys={['selectPoint']}/>

						<interaction.Select
							active
							wfsLayerDescription={{
								"featureNS": "avk",
								"featureType": "avk_massiivid",
								"url": "https://kls.pria.ee/geoserver/avk/ows",
								"version": "1.1.0",
								"geometryName": "shape",
							}}
						/>
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