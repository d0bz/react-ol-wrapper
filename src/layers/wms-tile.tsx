import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Tile, Image } from 'ol/layer';
import { createXYZ } from 'ol/tilegrid';
import { ImageWMS, TileWMS } from 'ol/source';
import { Util } from '../util';

export class WmsTile extends React.Component<any, any> {

	layer: Tile | Image;

	properties: any = {
		source: undefined,
		visible: undefined,
		updateFilter: undefined
	};

	loadingProgress = {
		loading: 0,
		loaded: 0,
	};

	static propTypes = {
		/**
		 * Define layer params in object
		 * @param {String} featureNS
		 * @param {String} featureType eg HYBRID
		 * @param {String} url eg https://kaart.maaamet.ee/wms/fotokaart
		 * @param {String} version eg 1.1.1
		 * @param {String} cqlFilter, can only be inserted once per load
		 */
		properties: PropTypes.object,

		/**
		 * Can order layers
		 */
		zIndex: PropTypes.number,

		/**
		 * Insert random number when needed to update layer
		 */
		update: PropTypes.number,


		/**
		 * Extra filter for layer, can updated on runtime
		 */
		cqlFilter: PropTypes.array,


		/**
		 * callback when layer is loading
		 * @param {boolean} loading status
		 * @param {number} number of loading tiles
		 * @param {number} number of loaded tiles
		 */
		loading: PropTypes.func,
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

	componentWillReceiveProps(nextProps) {
		if (nextProps !== this.props) {
			this.properties.updateFilter(nextProps.cqlFilter);

			let source: any = this.layer.getSource();

			if (nextProps.update !== this.props.update) {
				source.updateParams({ 'update': Math.random() });
			}

			if (nextProps.visible !== this.props.visible) {
				this.layer.setVisible(nextProps.visible);
			}

			if (nextProps.opacity !== this.props.opacity) {
				this.layer.setOpacity(nextProps.opacity);
			}

			if (JSON.stringify(nextProps.properties.params) !== JSON.stringify(this.props.properties.params)) {

				if (this.props.properties.params) {
					let params = {};
					this.props.properties.params.forEach((param) => {
						params[param.key] = null;
					});

					source.updateParams(params);
				}

				if (nextProps.properties.params) {
					let params = {};
					nextProps.properties.params.forEach((param) => {
						params[param.key] = param.value;
					});

					source.updateParams(params);
				}
			}
		}
	}

	componentWillUnmount() {
		this.context.mapComp.map.removeLayer(this.layer);
	}

	addLayer(props) {
		const self = this;

		self.properties = this.wmsSourceDefinition(props.properties, this.context.mapComp.options.projection.getCode());
		self.properties.updateFilter(props.cqlFilter);

		if (props.properties.maxScale) {
			self.properties.maxResolution = Util.getResolutionForScale(props.properties.maxScale, this.context.mapComp.options.projection.getUnits());
		}

		if (props.properties.minScale) {
			self.properties.minResolution = Util.getResolutionForScale(props.properties.minScale, this.context.mapComp.options.projection.getUnits());
		}

		self.layer = new Tile(self.properties);

		if (props.zIndex) {
			self.layer.setZIndex(props.zIndex);
		}

		if (props.layerKey) {
			self.layer.set('key', props.layerKey);
		}

		if (props.update) {
			let source: any = self.layer.getSource();
			source.updateParams({ 'update': Math.random() });
		}

		self.context.mapComp.map.addLayer(self.layer);
		let olEvents = Util.getEvents(self.events, props);
		for (let eventName in olEvents) {
			self.layer.on(eventName, olEvents[eventName]);
		}
	}

	addLoading = () => {
		++this.loadingProgress.loading;
		this.updateLoadingStatus();
	};

	addLoaded = () => {
		const self = this;
		setTimeout(() => {
			++self.loadingProgress.loaded;
			self.updateLoadingStatus();
		}, 100);
	};

	updateLoadingStatus = () => {
		let finished = false;
		if (this.loadingProgress.loading === this.loadingProgress.loaded) {
			finished = true;
		}

		if (this.props.loading) {
			this.props.loading(finished, this.loadingProgress.loading, this.loadingProgress.loaded);
		}

		if (finished) {
			this.loadingProgress.loading = 0;
			this.loadingProgress.loaded = 0;
		}
	};

	wmsSourceDefinition(layerProperties, projection) {
		const self = this;
		let layers = layerProperties.featureType;
		if (layerProperties.featureNS && layerProperties.featureNS !== '') {
			layers = `${layerProperties.featureNS}:${layerProperties.featureType}`;
		}

		let params = {
			'LAYERS': layers,
			'TILED': true,
			'VERSION': layerProperties.version,
			'STYLES': null,
			'env': null
		};

		function updateFilter(extraFilter) {
			let activeCqlFilter = this.cqlFilter;

			if (extraFilter && extraFilter.length > 0) {
				if (!activeCqlFilter) {
					activeCqlFilter = extraFilter;
				} else {
					activeCqlFilter = activeCqlFilter.concat(extraFilter);
				}
			}

			if (activeCqlFilter && activeCqlFilter.length > 0) {
				const cqlFilter = Util.buildWMSFilter(activeCqlFilter);
				this.source.updateParams({ CQL_FILTER: cqlFilter });
			} else {
				this.source.updateParams({ CQL_FILTER: null });
			}
		}

		if (layerProperties.styles) {
			params.STYLES = layerProperties.styles;
		}

		if (layerProperties.extraParams) {
			params.env = layerProperties.extraParams;
		}

		if (layerProperties.params) {
			layerProperties.params.forEach((param) => {
				params[param.key] = param.value;
			})
		}

		let source = null;
		if (layerProperties.singleTile) {
			source = new TileWMS({
				projection: projection,
				url: layerProperties.url,
				params: params,
				crossOrigin: 'anonymous',
				attributions: layerProperties.attributions || null,
				tileGrid: new createXYZ({ tileSize: [1024, 1024] })
			});
		} else {
			source = new TileWMS({
				projection: projection,
				url: layerProperties.url,
				params: params,
				crossOrigin: 'anonymous',
				attributions: layerProperties.attributions || null
			});
		}

		source.on('tileloadstart', function () {
			self.addLoading();
		});

		source.on('tileloadend', function () {
			self.addLoaded();
		});
		source.on('tileloaderror', function () {
			self.addLoaded();
		});

		const version = source.getParams().VERSION;
		if (version && version.indexOf('1.3') !== -1) {
			const axisOrientation = projection.getAxisOrientation();
			if (axisOrientation === 'neu') {
				source.setTileLoadFunction((img, src) => {
					let bbox = src.substring(src.indexOf('BBOX=') + 5).split('%2C');
					src = src.slice(0, src.indexOf('BBOX='));

					src += `BBOX=${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`;
					img.getImage().src = src;
				});
			}
		}

		return Object.assign({}, {
			visible: true,
			updateFilter: updateFilter,
			source: source
		}, layerProperties);
	};

	static contextTypes: React.ValidationMap<any> = {
		mapComp: PropTypes.instanceOf(Object),
		map: PropTypes.instanceOf(Map)
	};
}