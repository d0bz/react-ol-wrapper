import * as React from 'react';
import * as PropTypes from 'prop-types';
import { difference } from 'lodash';
import { Feature as OlFeature, Map, MapBrowserEvent } from 'ol';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import DragBox from 'ol/interaction/DragBox';
import Draw from 'ol/interaction/Draw';
import { Select as OlSelect } from 'ol/interaction';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Collection from 'ol/Collection';
import GeoJSON from 'ol/format/GeoJSON';
import Polygon, { fromCircle } from 'ol/geom/Polygon';
import { Circle as CircleGeom } from 'ol/geom';
import { Util } from '../util';
import { Feature } from '../types/Feature';
import { MapView } from '../map';
import { WfsLayerDescription } from '../interfaces/WfsLayerDescription';

const ctrlKeyCode = 17;

export class Select extends React.Component<any, any> {

	projection: string = 'EPSG:3857';
	interaction: OlSelect;
	dragBoxInteraction: DragBox;
	drawBoxInteraction: Draw;
	selectableSource: VectorSource;
	selectableLayer: VectorLayer;

	source: VectorSource;
	featureOverlaySource: VectorSource;
	layer: VectorLayer;
	featureOverlay: VectorLayer;
	selectedFeatures: Collection<OlFeature>;
	featureOverlayFeatures: Collection<OlFeature>;
	geojsonFormat: GeoJSON;
	highlightedFeature: OlFeature;
	selectedStyle: Style;

	vectorTileStartDetector: (KeyboardEvent) => void;
	vectorTileEndDetector: (KeyboardEvent) => void;


	static propTypes = {

		/**
		 * Features that are enabled to modify Array<type.Feature>
		 */
		features: PropTypes.array,

		/**
		 * Gets called when user finishes modifying, any drop after drag will be triggered
		 *
		 * @param {type.Feature} feature
		 * @param {boolean} clicked - either clicked or selected by area
		 */
		onSelected: PropTypes.func,

		/**
		 * wfs layer decription to enable WFS request on map click
		 * @param {WfsLayerDescription}
		 */
		wfsLayerDescription: PropTypes.object,

		/**
		 * do select from VectorTile. If yes then wfsLayerDescription.featureNS will be selected
		 * @param {WfsLayerDescription}
		 */
		vectorTile: PropTypes.bool,

		/**
		 * selecting features from vector tile inside or intsersect
		 * @param {WfsLayerDescription}
		 */
		vectorTileWithin: PropTypes.bool,

		/**
		 * wfs layer decription to enable WFS request on map click when first description won't find anything
		 * @param {WfsLayerDescription}
		 */
		secondaryWfsLayerDescription: PropTypes.object,

		/**
		 * Not required. Can select features from vector layer where key='name' attribute is defined
		 */
		layerKeys: PropTypes.arrayOf(PropTypes.string),

		/**
		 * Extra filter for layer, can updated on runtime
		 */
		cqlFilter: PropTypes.array
	};

	events: any = {
		'change': undefined,
		'change:active': undefined,
		'propertychange': undefined,
		'select': undefined
	};

	constructor(props) {
		super(props);

		this.selectedStyle = new Style({
			stroke: new Stroke({
				color: '#f00',
				width: 4
			}),
			fill: new Fill({
				color: 'rgba(255,0,0,0)'
			}),
			image: new Circle({
				radius: 6,
				fill: new Fill({ color: 'rgba(255,0,0,1)' }),
				stroke: new Stroke({ color: '#f00', width: 2 })
			})
		});

		this.selectedFeatures = new Collection([]);
		this.source = new VectorSource({
			wrapX: false,
			features: this.selectedFeatures
		});

		this.selectableSource = new VectorSource({
			wrapX: false
		});

		this.featureOverlayFeatures = new Collection([]);
		this.featureOverlaySource = new VectorSource({
			wrapX: false,
			features: this.featureOverlayFeatures
		});


		this.geojsonFormat = new GeoJSON();
	}

	render() {
		return null;
	}

	componentDidMount() {
		const self = this;

		if (this.props.style) {
			this.selectedStyle = this.props.style.getMapStyle(self.projection);
		}

		this.layer = new VectorLayer({
			source: this.source,
			style: this.selectedStyle
		});

		this.featureOverlay = new VectorLayer({
			source: this.featureOverlaySource
		});

		this.selectableLayer = new VectorLayer({
			source: this.selectableSource
		});


		if (this.props.zIndex) {
			this.layer.setZIndex(this.props.zIndex);
			this.selectableLayer.setZIndex(this.props.zIndex);
			this.featureOverlay.setZIndex(this.props.zIndex);
		} else {
			this.layer.setZIndex(104);
			this.selectableLayer.setZIndex(103);
			this.featureOverlay.setZIndex(105);
		}

		if (!this.context.mapComp.map) {
			this.context.mapComp.mapReadyCallbacks.push(() => {
				// interaction activated
				if (self.props.active) {
					self.activateSelectTool(self.props);
				}
			});
		} else {
			// interaction activated
			if (self.props.active) {
				self.activateSelectTool(self.props);
			}
		}


		let olEvents = Util.getEvents(this.events, this.props);
		if (this.interaction) {
			for (let eventName in olEvents) {
				this.interaction.on(eventName, (evt) => {
					olEvents[eventName].call(self.props.scope, evt)
				});
			}
		}
	}

	componentWillReceiveProps(nextProps) {
		const self = this;
		if (nextProps !== this.props && nextProps.active !== this.props.active) {

			if (this.props.active) {
				this.context.mapComp.map.removeInteraction(this.interaction);
				this.context.mapComp.map.removeInteraction(this.drawBoxInteraction);
				this.context.mapComp.map.un('click', this.mapOnClick);
				this.context.mapComp.map.un('click', this.mapVectorTileClick);
				this.context.mapComp.map.un('pointermove', self.highlightFeature);
				this.context.mapComp.map.getTarget().style.cursor = '';

				this.featureOverlaySource.clear();
				this.source.clear();
				this.selectableSource.clear();
			}

			// interaction activated
			if (nextProps.active) {
				this.activateSelectTool(nextProps);
			}
		}

		if (nextProps.active) {
			if (!nextProps.selectedFeature && (!nextProps.selectedFeatures || nextProps.selectedFeatures.length === 0)) {
				this.showSelectedFeature(null);
			} else if (nextProps.selectedFeature && nextProps.selectedFeature.getId() != (this.selectedFeatures.item(0) && this.selectedFeatures.item(0).getId())) {
				this.showSelectedFeature(nextProps.selectedFeature);
			} else if (nextProps.selectedFeatures && nextProps.selectedFeatures.length != this.selectedFeatures.getLength()) {
				this.showSelectedFeatures(nextProps.selectedFeatures);
			}

			if (nextProps.features && this.props.features && (
				nextProps.features.length != this.props.features.length ||
				(
					difference(nextProps.features.map((f) => f.getId()), self.props.features.map((f) => f.getId())).length !== 0
				)
			) || (!this.props.features && nextProps.features)
			) {
				this.updateFeatures(nextProps.features);
			}
		}
	}

	activateSelectTool(nextProps) {
		const self = this;

		self.projection = self.context.mapComp.map.getView().getProjection().getCode();
		this.context.mapComp.map.addLayer(self.layer);
		this.context.mapComp.map.addLayer(self.selectableLayer);
		this.context.mapComp.map.addLayer(self.featureOverlay);

		let options = Util.getOptions(Object['assign'](Object.keys(Select.propTypes), nextProps));

		if (this.props.active) {
			this.context.mapComp.map.removeInteraction(this.interaction);
			this.context.mapComp.map.removeInteraction(this.drawBoxInteraction);
			this.context.mapComp.map.un('click', this.mapOnClick);
			this.context.mapComp.map.un('click', this.mapVectorTileClick);
			this.context.mapComp.map.un('pointermove', self.highlightFeature);
			this.context.mapComp.map.getTarget().style.cursor = '';

			if (self.vectorTileStartDetector) {
				document.removeEventListener('keydown', self.vectorTileStartDetector, false);
			}

			if (self.vectorTileEndDetector) {
				document.removeEventListener('keyup', self.vectorTileEndDetector, false);
			}

			this.featureOverlaySource.clear();
			this.source.clear();
			this.selectableSource.clear();
		}

		if (nextProps.source) {
			this.context.mapComp.map.getLayers().forEach(function (layer) {
				if (layer.getSource() == nextProps.source) {
					options.layers = [layer];
				}
			});
		}

		if (nextProps.layerKeys) {
			this.context.mapComp.map.getLayers().forEach(function (layer) {
				if (nextProps.layerKeys.indexOf(layer.get('layerKey')) !== -1) {
					options.layers = [layer];
				}
			});
		}

		if (nextProps.wfsLayerDescription && !nextProps.vectorTile) {
			this.context.mapComp.map.on('click', this.mapOnClick);
		}

		if (nextProps.vectorTile) {
			this.context.mapComp.map.on('click', this.mapVectorTileClick);


			/*this.dragBoxInteraction = new DragBox({
			 condition: ol.events.condition.platformModifierKeyOnly
			 });*/

			/*this.dragBoxInteraction.on('boxend', function () {
			 let extent = self.dragBoxInteraction.getGeometry().getExtent();
			 let geom = ol.geom.Polygon.fromExtent(extent);

			 self.requestWFSFeatures(geom);
			 });*/

			this.drawBoxInteraction = new Draw({
				source: new VectorSource(),
				type: 'Polygon',
				freehand: true
			});

			this.drawBoxInteraction.on('drawend', function (event: any) {
				const feature = event.feature;
				const geom = feature.getGeometry();
				if (geom.getFlatCoordinates().length > 8) {
					self.requestWFSFeatures(geom);
				}
			});

			self.vectorTileStartDetector = (e: KeyboardEvent) => {
				if (e.keyCode === ctrlKeyCode && self.drawBoxInteraction) {
					self.drawBoxInteraction.setActive(true);
					self.context.mapComp.map.addInteraction(self.drawBoxInteraction);
				}
			};

			self.vectorTileEndDetector = (e: KeyboardEvent) => {
				if (e.keyCode === ctrlKeyCode && self.drawBoxInteraction) {
					self.drawBoxInteraction.setActive(false);
					self.context.mapComp.map.removeInteraction(self.drawBoxInteraction);
				}
			};

			document.addEventListener('keydown', self.vectorTileStartDetector);
			document.addEventListener('keyup', self.vectorTileEndDetector);

			this.controlDoubleClickZoom(false);
		}

		if (nextProps.features) {
			this.selectableSource.clear();
			this.selectableSource.addFeatures(nextProps.features.map((f) => f.getMapFeature(self.projection)));
			options.layers = [this.selectableLayer];
		}

		delete options.features;

		if (options.layers) {
			if (nextProps.style) {
				options.style = nextProps.style.getMapStyle(self.projection);
			}

			this.interaction = new OlSelect(options);
			this.interaction.on('select', this.areaSelected);
			this.context.mapComp.map.addInteraction(this.interaction);
		}

		this.context.mapComp.map.on('pointermove', self.highlightFeature);

		if (nextProps.selectedFeatures && nextProps.selectedFeatures.length > 0) {
			this.showSelectedFeatures(nextProps.selectedFeatures);
		}

		let olEvents = Util.getEvents(this.events, nextProps);
		if (this.interaction) {
			for (let eventName in olEvents) {
				this.interaction.on(eventName, (evt) => {
					olEvents[eventName].call(self, evt);
				});
			}
		}
	}

	requestWFSFeatures(geom) {
		if (this.props.loadingData) {
			this.props.loadingData(true);
		}
		const wfsLayerDescription = this.props.wfsLayerDescription;

		const cqlFilter = (wfsLayerDescription.cqlFilter || []).concat(this.props.cqlFilter || []);
		const geometry = geom.transform(this.projection, 'EPSG:4326');
		if (this.props.vectorTileWithin) {
			cqlFilter.push({ value: geometry, column: wfsLayerDescription.geometryPropertyName || 'geometry', condition: 'within' });
		} else {
			cqlFilter.push({ value: geometry, column: wfsLayerDescription.geometryPropertyName || 'geometry', condition: 'intersects' });
		}

		const self = this;
		const requestNode = Util.buildWFSGetFeatureRequestElement({
			propertyNames: wfsLayerDescription.propertyNames,
			geometryPropertyName: wfsLayerDescription.geometryPropertyName,
			featureType: wfsLayerDescription.featureType,
			featureNS: wfsLayerDescription.featureNS,
			srsName: 'EPSG:4326',
			cqlFilter: cqlFilter
		});
		Util.requestWFS(requestNode, wfsLayerDescription.url, true, 'selecttool').then(function (resp) {
			if (self.props.loadingData) {
				self.props.loadingData(false);
			}
			self.selectFeature(resp.features);
		});
	};

	highlightFeature = (evt: MapBrowserEvent) => {
		if (evt.dragging) return;

		var pixel = this.context.mapComp.map.getEventPixel(evt.originalEvent);

		var feature = this.context.mapComp.map.forEachFeatureAtPixel(pixel, function (feature) {
			return feature;
		});

		let hit = false;

		if (feature && feature != this.highlightedFeature) {
			this.selectableSource.getFeatures().forEach((f) => {
				if (f === feature) {
					hit = true;
				}
			});
		} else if (feature && feature == this.highlightedFeature) {
			hit = true;
		}

		if (hit) {
			this.context.mapComp.map.getTarget().style.cursor = 'pointer';
		}

		if (hit) {
			if (this.highlightedFeature) {
				this.featureOverlayFeatures.remove(this.highlightedFeature);
			}
			if (feature) {
				this.featureOverlayFeatures.push(feature);
			} else {
				this.context.mapComp.map.getTarget().style.cursor = '';
			}
			this.highlightedFeature = feature;
		}

		if (!hit) {
			if (this.highlightedFeature) {
				this.featureOverlayFeatures.remove(this.highlightedFeature);
				this.highlightedFeature = null;
			}
			this.context.mapComp.map.getTarget().style.cursor = '';
		}
	}

	areaSelected(evt) {
		this.selectFeature([new Feature(evt.selected[0], this.projection)]);
	}

	updateFeatures(features: Feature[]) {
		const self = this;
		this.selectableSource.clear();
		this.selectableSource.addFeatures(features.map((f) => f.getMapFeature(self.projection)));
	}

	showSelectedFeatures(features: Feature[]) {
		this.featureOverlayFeatures.clear();

		this.selectedFeatures.clear();
		this.selectedFeatures.extend(features.map((f) => f.getMapFeature(this.projection)));
	}

	showSelectedFeature(feature: Feature) {
		this.selectedFeatures.clear();

		if (feature) {
			this.selectedFeatures.push(feature.getMapFeature(this.projection));
		}
	}

	selectFeature(feature?: Array<Feature>, runCallback = true, clicked = false) {
		const { onSelected } = this.props;

		this.selectedFeatures.clear();
		this.featureOverlayFeatures.clear();

		if (this.interaction) {
			this.interaction.getFeatures().clear();
		}

		if (feature) {
			if (runCallback && typeof onSelected === 'function') {
				onSelected(feature, clicked);
			}
		} else {
			if (runCallback && typeof onSelected === 'function') {
				onSelected(null, clicked);
			}
		}
	}

	selectVectorTileFeature(features) {
		const { onSelected } = this.props;

		this.selectedFeatures.clear();
		this.featureOverlayFeatures.clear();
		if (this.interaction) {
			this.interaction.getFeatures().clear();
		}

		if (features && features.length > 0) {
			onSelected(features, true);
		} else {
			onSelected(null, true);
		}
	}

	mapVectorTileClick = (evt) => {
		const self = this;
		const features = [];
		const returnFeatures = [];
		const clickedFeatures = this.context.mapComp.map.getFeaturesAtPixel(evt.pixel);

		if (clickedFeatures) {
			const sameLayerFeatures = clickedFeatures.filter((feature) => feature.get('layer') === self.props.wfsLayerDescription.featureType);
			if (sameLayerFeatures.length > 0) {
				sameLayerFeatures.forEach(function (feature) {
					const fid = feature.get('oid');
					if (features.indexOf(fid) === -1) {
						features.push(fid);
						const newFeature = new Feature();
						newFeature.setId(fid);
						newFeature.setProperties(feature.getProperties());
						returnFeatures.push(newFeature);
					}
				});

				self.selectVectorTileFeature(returnFeatures);
			} else {
				this.mapOnClick(evt);
			}
		} else {
			this.mapOnClick(evt);
		}
	}

	mapOnClick = (evt) => {
		const self = this;
		let skipRequest = false;
		this.context.mapComp.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
			if (!layer) {
				skipRequest = true;
			} else {
				const layerKey = layer.getProperties().layerKey;
				if (self.props.layerKeys && (layerKey && self.props.layerKeys.indexOf(layerKey) === -1)) {
					skipRequest = true;
				}
			}
		});

		if (skipRequest) {
			return;
		}

		const { wfsLayerDescription, secondaryWfsLayerDescription } = this.props;
		const coordinate = evt.coordinate;
		const radius = this.props.clickRadius || 0.01;
		const geom = fromCircle(
			new CircleGeom(coordinate, radius),
			12, 90);

		if (self.props.loadingData) {
			self.props.loadingData(true);
		}

		this.requestFeatures(wfsLayerDescription, geom).then((prop) => {
			let features = prop.features;
			if (features.length == 0) {
				if (secondaryWfsLayerDescription) {
					this.requestFeatures(secondaryWfsLayerDescription, geom).then((prop) => {
						let features = prop.features;
						if (features.length > 0) {
							self.selectFeature(features, true, true);
						} else {
							self.selectFeature(null, true, true);
						}
					});
				} else {
					self.selectFeature(null);
				}
			} else {
				self.selectFeature(features, true, true);
			}

			if (self.props.loadingData) {
				self.props.loadingData(false);
			}
		});
	}

	requestFeatures(wfsLayerDescription, geom) {
		const self = this;

		let cqlFilter = (wfsLayerDescription.cqlFilter || []).concat(this.props.cqlFilter || []);
		cqlFilter = cqlFilter.slice(0);
		if (geom) {
			const geometry = geom.transform(this.projection, 'EPSG:4326');
			cqlFilter.push(
				{
					value: geometry,
					column: wfsLayerDescription.geometryPropertyName || 'geometry',
					condition: 'intersects'
				}
			)
		}

		const requestNode = Util.buildWFSGetFeatureRequestElement({
			geometryPropertyName: wfsLayerDescription.geometryPropertyName,
			propertyNames: wfsLayerDescription.propertyNames,
			featureType: wfsLayerDescription.featureType,
			featureNS: wfsLayerDescription.featureNS,
			srsName: 'EPSG:4326',
			cqlFilter: cqlFilter
		});

		return Util.requestWFS(requestNode, wfsLayerDescription.url, true);
	}

	componentWillUnmount() {
		const self = this;
		this.context.mapComp.map.removeInteraction(this.interaction);
		this.context.mapComp.map.removeInteraction(this.drawBoxInteraction);
		this.context.mapComp.map.un('click', this.mapOnClick);
		this.context.mapComp.map.un('click', this.mapVectorTileClick);
		this.selectedFeatures.clear();
		this.context.mapComp.map.removeLayer(this.featureOverlay);
		this.context.mapComp.map.removeLayer(this.layer);
		this.context.mapComp.map.removeLayer(this.selectableLayer);
		this.context.mapComp.map.un('pointermove', this.highlightFeature);

		if (self.vectorTileStartDetector) {
			document.removeEventListener('keydown', self.vectorTileStartDetector, false);
		}

		if (self.vectorTileEndDetector) {
			document.removeEventListener('keyup', self.vectorTileEndDetector, false);
		}

		this.controlDoubleClickZoom(true);
	}

	// dblClick must be disabled while drawing, otherwise dblClicking to end drawing will zoom in.
	controlDoubleClickZoom(active) {
		//Find double click interaction
		const interactions = this.context.mapComp.map.getInteractions();
		for (let i = 0; i < interactions.getLength(); i++) {
			const interaction = interactions.item(i);
			if (interaction instanceof DoubleClickZoom) {
				interaction.setActive(active);
			}
		}
	}

	static contextTypes: React.ValidationMap<any> = {
		mapComp: PropTypes.instanceOf(MapView),
		map: PropTypes.instanceOf(Map)
	};
}