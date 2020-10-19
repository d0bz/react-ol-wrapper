import * as React from 'react';
import {
	interaction, layer, custom, control, type, //name spaces
	Interactions, Overlays, Controls,     //group
	Map, Layers, Overlay, Util    //objects
} from 'react-ol';

let coordinates = [24.761769696908118, 59.43256023120438];
let iconFeature = new type.Feature({ wkt: `POINT(${coordinates[0]} ${coordinates[1]})`, projection: 'EPSG:4326' });
let extentCoordinate: [number, number, number, number] = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 100);

let style = new type.Style({
	imageSrc: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
	opacity: 0.7,
	scale: 0.2
});

let styleEstonia2 = new type.Style({
	circleRadius: 6,
	fillColor: [0, 153, 255, 0.1],
	strokeColor: [255, 255, 255, 0.75],
	strokeWidth: 1.5
});

const linkStyle = new type.Style({
	strokeColor: [0, 0, 255, 0.75],
	strokeWidth: 4
});

let styleEstonia = [
	new type.Style({
		fillColor: [0, 153, 255, 0.1],
		strokeColor: [255, 0, 0, 1],
		strokeWidth: 6
	}),
	new type.Style({
		fillColor: [0, 0, 0, 0],
		strokeColor: [0, 0, 255, 1],
		strokeWidth: 3
	})
];


export class Vector extends React.Component<any, any> {
	constructor(props) {
		super(props);

		let opts = {
			featureType: 'Linea_costa',
			featureNS: '',
			srsName: 'EPSG:4326',
			version: '1.0.0',
			maxFeatures: 10,
			startIndex: 0,
			sortBy: 'OBJECTID'
		};

		this.state = {
			features: [],
			estoniaFeatures: [],
		};

		const requestNode = Util.buildWFSGetFeatureRequestElement(opts);
		const requestUrl = Util.buildWFSGetFeatureRequestUrl(opts);
		Util.requestWFS(requestNode, 'https://demo.geo-solutions.it/geoserver/test/ows', true, 'demoRequestNode').then((resp) => {
			console.log(resp);
			this.setState({
				features: resp.features
			})
		}, (fail) => {
			console.log(fail);
		});

		Util.requestWFS(requestUrl, 'https://demo.geo-solutions.it/geoserver/test/ows', true, 'demoRequestUrl').then((resp) => {
			console.log(resp);
		}, (fail) => {
			console.log(fail);
		});

		Util.loadGeoJSON('../data/estonia.json', 'EPSG:4326').then((features) => {
			this.setState({
				estoniaFeatures: features
			});
		});

	}

	render() {
		return (
			<div>
				<Map extent={extentCoordinate}>
					<Layers>
						<layer.OSM/>
						<layer.Vector features={[iconFeature]} style={style} zIndex="2"/>
						<layer.Vector features={this.state.features} zIndex="3"/>
						<layer.Vector features={this.state.estoniaFeatures} style={styleEstonia} zIndex="3"/>
						<layer.Vector features={this.state.estoniaFeatures} style={this.styleEstoniaFunction} zIndex="3"/>
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
	styleEstoniaFunction = (feature, resolution: number) => {
		return [
			new type.Style({
				fillColor: [0, 153, 255, 0.1],
				strokeColor: [255, 0, 0, 1],
				strokeWidth: 6
			}),
			new type.Style({
				fillColor: [0, 0, 0, 0],
				strokeColor: [0, 0, 255, 1],
				strokeWidth: 3
			})
		]
	}
}