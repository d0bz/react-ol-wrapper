import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Tile } from 'ol/layer';
import { TileImage } from 'ol/source';

import { Util } from '../util';

export class Google extends React.Component<any, any> {

	layer: Tile;

	static propTypes = {
		/**
		 * Can order layers
		 */
		zIndex: PropTypes.number,

		/**
		 * Google layer type default is road_map
		 *  'road_names': 'Google Road Names',
            'road_map': 'Google Road Map',
            'satellite': 'Google Satellite',
            'satellite_roads': 'Google Satellite & Roads',
            'terrain': 'Google Terrain',
            'terrain_roads': 'Google Terrain & Roads',
            'road_wo_building': 'Google Road without Building',
		 */
        type: PropTypes.string,
	};

	events: any = {
		'change': undefined,
		'change:extent': undefined,
		'change:maxResolution': undefined,
		'change:minResolution': undefined,
		'change:opacity': undefined,
		'change:preload': undefined,
		'change:source': undefined,
		'change:visible': undefined,
		'change:zIndex': undefined,
		'postcompose': undefined,
		'precompose': undefined,
		'propertychange': undefined,
		'render': undefined
	};

	layers = {
		'road_names': 'Google Road Names',
		'road_map': 'Google Road Map',
		'satellite': 'Google Satellite',
		'satellite_roads': 'Google Satellite & Roads',
		'terrain': 'Google Terrain',
		'terrain_roads': 'Google Terrain & Roads',
		'road_wo_building': 'Google Road without Building',
	};

	layerUrls = {
		'road_names': 'http://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
		'road_map': 'http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
		'satellite': 'http://mt1.google.com/vt/lyrs=s&hl=pl&&x={x}&y={y}&z={z}',
		'satellite_roads': 'http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
		'terrain': 'http://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}',
		'terrain_roads': 'http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
		'road_wo_building': 'http://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
	};

	defaultLayerKey = 'road_map';

	constructor(props) {
		super(props);
	}

	render() {
		return null;
	}

	componentDidMount() {

		const self = this;

		if (!this.context.mapComp.map) {
			this.context.mapComp.mapReadyCallbacks.push(() => {
				self.addLayer(self.props);
			});
		} else {
			this.addLayer(this.props);
		}
	}

	addLayer(props) {
		const self = this;
		let options = {
			source: undefined
		};

		let layerUrl = this.layerUrls[this.defaultLayerKey];
		if (props.type && this.layerUrls[props.type]) {
			layerUrl = this.layerUrls[props.type];
		}

		let source = new TileImage({ url: layerUrl });
		options.source = source;
		self.layer = new Tile(options);
		if (props.zIndex) {
			self.layer.setZIndex(props.zIndex);
		}

		if (props.layerKey) {
			self.layer.set('key', props.layerKey);
		}

		self.context.mapComp.map.addLayer(this.layer);

		let olEvents = Util.getEvents(self.events, props);
		for (let eventName in olEvents) {
			self.layer.on(eventName, olEvents[eventName]);
		}
	}


	componentWillUnmount() {
		this.context.mapComp.map.removeLayer(this.layer);
	}

	static contextTypes: React.ValidationMap<any> = {
		mapComp: PropTypes.instanceOf(Object),
		map: PropTypes.instanceOf(Map)
	};
}