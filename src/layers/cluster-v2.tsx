import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map, Feature as OlFeature } from 'ol';
import { union } from 'lodash';
import { Fill, Stroke, Circle as CircleStyle, Style as OlStyle, RegularShape, Text } from 'ol/style';
import { Cluster as ClusterSource, Vector as VectorSource } from 'ol/source';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
// import SelectCluster from 'ol-ext/interaction/SelectCluster';
import SelectCluster from '../tools/select_cluster';
import { bbox } from 'ol/loadingstrategy';
import { difference } from 'lodash';
import GeoJSON from 'ol/format/GeoJSON';
import { Util } from '../util';
import { Style } from '../types/Style';
import { Feature } from '../types/Feature';

const backgroundStyle = new OlStyle({
	image: new RegularShape({
		stroke: new Stroke({ color: [0, 0, 0, 0] }),
		fill: new Fill({ color: [255, 255, 255, 0.005] }),
		points: 4,
		radius: 30, // <--------- control its size
	})
});

const REQUEST_KEY = 'CLUSTER_REQUEST';
const DEFAULT_DISTANCE = 40;

export class Cluster extends React.Component<any, any> {

	projection: string = 'EPSG:3857';
	layer: AnimatedCluster;
	selectCluster: any;
	source: VectorSource;

	currentResolution: number = 0;
	maxFeatureCount: number = 0;
	componentKey: number = 0;

	static propTypes = {

		/**
		 * Features that are enabled to modify Array<type.Feature>
		 */
		features: PropTypes.array,

		/**
		 * Minimum distance in pixels between clusters, default 40
		 */
		distance: PropTypes.number,

		/**
		 * Scale when clustering will be disabled
		 */
		showAllFromScale: PropTypes.number,

		/**
		 * wfs layer decription to enable WFS request on map click
		 * @param {WfsLayerDescription}
		 */
		wfsLayerDescription: PropTypes.object,

		/**
		 * callback when layer is loading
		 * @param {loadingData}
		 */
		loadingData: PropTypes.func,

		/**
		 * Define layer params in object
		 * @param {String} maxScale - max scale of layer visibility
		 * @param {String} minScale - min scale of layer visibility
		 */
		properties: PropTypes.object,

		/**
		 * Array<type.Style>
		 */
		itemStyle: PropTypes.func,

		/**
		 * Cluster style function request
		 *
		 * Array<type.Feature> features - array of features in cluster
		 */
		clusterStyle: PropTypes.func,

		/**
		 * Style definition, can be Array of styles or one Style
		 * {type.Style}
		 */
		style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),

		/**
		 * Cluster link style definition, can be Array of styles or one Style
		 * {type.Style}
		 */
		linkStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),

		/**
		 * Clustering points radius
		 * number
		 */
		pointRadius: PropTypes.number,

		/**
		 * Show all points
		 * boolean
		 */
		showAll: PropTypes.bool,
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

		this.currentResolution = 0;
		this.maxFeatureCount = 0;
		this.componentKey = Math.floor(Math.random() * (9999999999999 - 0 + 1));
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
		const self = this;
		if (nextProps !== this.props &&
			(
				(nextProps.features && this.props.features && (
						nextProps.features.length != this.props.features.length ||
						(
							difference(nextProps.features.map((f) => f.getId()), self.props.features.map((f) => f.getId())).length !== 0
						)
					) || (!this.props.features && nextProps.features)
				) ||
				(nextProps.updateTimestamp != this.props.updateTimestamp))
		) {

			const source: any = this.layer.getSource();
			const loadedExtentsRtree_: any = source.loadedExtentsRtree_;
			source.source.clear();
			loadedExtentsRtree_.clear();

			if (nextProps.features) {
				source.source.addFeatures(nextProps.features.map((f) => f.getMapFeature(self.projection)));
			}
		}

		if (nextProps.update !== this.props.update) {
			let source: any = this.layer.getSource();
			source.getSource().refresh();
		} else if (this.props.showAll !== nextProps.showAll) {
			this.addSelectClusterInteraction(nextProps);

			//let source: any = this.layer.getSource();
			//source.getSource().refresh();
		}
	}

	componentWillUnmount() {
		this.context.mapComp.map.removeLayer(this.layer);
		this.context.mapComp.map.removeInteraction(this.selectCluster);
		this.context.mapComp.map.getView().un('change:resolution', this.resolutionChanged);

	}

	addLayer(props) {
		const self = this;
		this.projection = self.context.mapComp.map.getView().getProjection().getCode();

		let options = {
			style: self.styleFunction,
			source: undefined,
			maxResolution: undefined,
			minResolution: undefined,
			animationDuration: 400,
		};

		let source = new VectorSource({ wrapX: false });

		if (props.features) {
			source.addFeatures(props.features.map((f) => f.getMapFeature(self.projection)));
		} else if (props.wfsLayerDescription) {
			const wfsLayerDescription = props.wfsLayerDescription;

			source = new VectorSource({
				format: new GeoJSON(),
				loader: function (mapExtent, resolution, projection) {
					const extent = Util.transformExtent(mapExtent, projection, 'EPSG:4326');

					const bboxFilter = Util.cqlFilter.intersectsExtent(extent, wfsLayerDescription.geometryPropertyName || 'geometry');
					let cqlFilter = wfsLayerDescription.cqlFilter || [];
					cqlFilter = Util.cloneObject(cqlFilter);
					cqlFilter.push(bboxFilter);

					if (self.props.cqlFilter) {
						cqlFilter = cqlFilter.concat(self.props.cqlFilter);
					}

					const requestNode = Util.buildWFSGetFeatureRequestElement({
						geometryPropertyName: wfsLayerDescription.geometryPropertyName,
						featureType: wfsLayerDescription.featureType,
						featureNS: wfsLayerDescription.featureNS,
						srsName: 'EPSG:4326',
						cqlFilter: cqlFilter
					});

					Util.stopRequestWFS(`${REQUEST_KEY}_${self.componentKey}`, () => {
						self.onLoad(true);
						Util.requestWFS(requestNode, wfsLayerDescription.url, true, `${REQUEST_KEY}_${self.componentKey}`).then((resp) => {
							if (resp.features.length > 0) {
								self.currentResolution = 0;
								self.addFeatures(resp.features);
							}
							self.onLoad(false);
						}, () => {
							self.onLoad(false);
						});
					});
				},
				strategy: bbox
			});
		}


		this.source = new ClusterSource({
			distance: props.distance || DEFAULT_DISTANCE,
			source: source,
		});

		options.source = this.source;

		if (props.properties) {
			if (props.properties.maxScale) {
				options.maxResolution = Util.getResolutionForScale(props.properties.maxScale, this.context.mapComp.options.projection.getUnits());
			}

			if (props.properties.minScale) {
				options.minResolution = Util.getResolutionForScale(props.properties.minScale, this.context.mapComp.options.projection.getUnits());
			}
		}

		this.layer = new AnimatedCluster(options);

		if (props.layerKey) {
			this.layer.set('layerKey', props.layerKey);
		}

		if (props.zIndex) {
			this.layer.setZIndex(props.zIndex);
		}

		this.context.mapComp.map.addLayer(this.layer);

		const linkStyle = this.props.linkStyle ? this.getStyles(this.props.linkStyle) : [this.linkStyle];

		this.addSelectClusterInteraction(this.props);

		this.context.mapComp.map.getView().on('change:resolution', this.resolutionChanged);
		this.resolutionChanged();

		let olEvents = Util.getEvents(this.events, props);
		for (let eventName in olEvents) {
			this.layer.on(eventName, olEvents[eventName]);
		}
	}

	addSelectClusterInteraction = (props) => {
		if (this.selectCluster) {
			this.context.mapComp.map.removeInteraction(this.selectCluster);
		}

		this.selectCluster = new SelectCluster({
			layer: this.layer,
			selectAll: props.showAll,
			// Point radius: to calculate distance between the features
			pointRadius: props.pointRadius || 14,
			animate: false,
			// Feature style when it springs apart
			featureStyle: (feature, resolution) => {
				const originalFeatures = feature.get('features');
				let originalFeature;
				let styles = [];
				if (originalFeatures) {
					for (let i = originalFeatures.length - 1; i >= 0; --i) {
						originalFeature = originalFeatures[i];
						styles = union(styles, this.createStyleResolution(originalFeature, resolution));
					}
				}
				return styles;
			},
			// selectCluster: false,	// disable cluster selection
			// Style to draw cluster when selected
			style: function (f, res) {
				return [];
			}
		});

		this.selectCluster.on('select', this.clusterSelected);

		this.context.mapComp.map.addInteraction(this.selectCluster);
	}

	linkStyle = new OlStyle({
		// Draw a link beetween points (or not)
		stroke: new Stroke({
			color: 'red',
			width: 2
		})
	});

	clusterSelected = (evt) => {
		const features = evt.selected[0] && evt.selected[0].get('features');
		if (!features || features.length === 1) {
			this.selectCluster.clear();
		}
	};

	resolutionChanged = () => {
		const { showAllFromScale, distance, properties } = this.props;
		const resolution = this.context.mapComp.map.getView().getResolution();

		if (showAllFromScale) {
			const minResolution = Util.getResolutionForScale(showAllFromScale, this.context.mapComp.options.projection.getUnits());

			if (resolution < minResolution) {
				this.source.setDistance(0);
			} else if (this.source.getDistance() === 0) {
				this.source.setDistance(distance || DEFAULT_DISTANCE);
			}
		}

		if (properties) {
			if (properties.maxScale) {
				const maxResolution = Util.getResolutionForScale(properties.maxScale, this.context.mapComp.options.projection.getUnits());
				if (resolution > maxResolution) {
					Util.stopRequestWFS(`${REQUEST_KEY}_${this.componentKey}`);
				}
			}
		}
	};

	onLoad = (loading: boolean) => {
		const { loadingData } = this.props;
		if (loadingData) {
			loadingData(loading);
		}
	};

	addFeatures(features?: Array<Feature>) {
		const self = this;
		this.source.source.clear();

		if (features) {
			this.source.source.addFeatures(features.map((f: Feature) => f.getMapFeature(self.projection)));
		}
	}

	getStyles(style) {
		const self = this;
		const styles = [];
		if (style instanceof Array) {
			style.forEach((style: Style) => {
				styles.push(style.getMapStyle(self.projection));
			})
		} else {
			styles.push(style.getMapStyle(self.projection));
		}
		return styles;
	}

	createStyleResolution = (feature, resolution) => {
		const style = this.createStyle(feature);
		if (typeof style === 'function') {
			return style(feature, resolution);
		}
		return style;
	};

	createStyle = (feature) => {
		const self = this;
		let styleFunction = null;
		let styles = [backgroundStyle];
		if (this.props.style) {
			if (typeof this.props.style === 'function') {
				styleFunction = (feature: OlFeature, resolution: number) => {
					return self.getStyles(self.props.style(new Feature(feature, self.projection), resolution));
				};

				return styleFunction;
			} else {
				styles = styles.concat(this.getStyles(self.props.style));
				return styles;
			}
		} else {
			const image = new CircleStyle({
				radius: 5,
				fill: new Fill({
					color: [255, 153, 0, 0.8]
				})
			});
			return [new OlStyle({
				geometry: feature.getGeometry(),
				image: image
			})];
		}

		return [];
	};

	// Style for the clusters
	styleCache = {};
	styleFunction = (feature, resolution) => {
		let style;
		const size = feature.get('features').length;
		if (size > 1) {
			if (this.props.showAll) {
				style = backgroundStyle;
			} else {
				style = this.styleCache[size];
				if (!style) {
					if (this.props.clusterStyle) {
						const features = feature.get('features').map((f) => new Feature(f.clone(), this.projection));
						const clusterStyle: Array<Style> = this.props.clusterStyle(features);
						return this.getStyles(clusterStyle);
					}

					var color = size > 25 ? '192,0,0' : size > 8 ? '255,128,0' : '0,128,0';
					var radius = Math.max(8, Math.min(size * 0.75, 20));
					var dash = 2 * Math.PI * radius / 6;
					var dashed = [0, dash, dash, dash, dash, dash, dash];
					style = this.styleCache[size] = new OlStyle({
						image: new CircleStyle({
							radius: radius,
							stroke: new Stroke({
								color: 'rgba(' + color + ',0.5)',
								width: 15,
								lineDash: dashed,
								lineCap: 'butt'
							}),
							fill: new Fill({
								color: 'rgba(' + color + ',1)'
							})
						}),
						text: new Text({
							text: size.toString(),
							//font: 'bold 12px comic sans ms',
							//textBaseline: 'top',
							fill: new Fill({
								color: '#fff'
							})
						})
					});
				}
			}
			return style;
		} else {
			const originalFeature = feature.get('features')[0];
			style = this.createStyleResolution(originalFeature, resolution);
		}
		return style;
	};

	static contextTypes: React.ValidationMap<any> = {
		mapComp: PropTypes.instanceOf(Object),
		map: PropTypes.instanceOf(Map)
	};
}