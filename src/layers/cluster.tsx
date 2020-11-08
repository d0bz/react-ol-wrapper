import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { union } from 'lodash';
import { Fill, Stroke, Circle as CircleStyle, Style as OlStyle, RegularShape, Text } from 'ol/style';
import { pointerMove } from 'ol/events/condition';
import { Cluster as ClusterSource, Vector as VectorSource } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import { Select } from 'ol/interaction';
import { bbox } from 'ol/loadingstrategy';
import { createEmpty, getWidth, getHeight, extend } from 'ol/extent';
import { difference } from 'lodash';
import GeoJSON from 'ol/format/GeoJSON';
import { Util } from '../util';
import { Style } from '../types/Style';
import { Feature } from '../types/Feature';

const textFill = new Fill({
    color: '#fff'
});

const textStroke = new Stroke({
    color: 'rgba(0, 0, 0, 0.6)',
    width: 3
});

const invisibleFill = new Fill({
    color: 'rgba(255, 255, 255, 0.01)'
});

const REQUEST_KEY = 'CLUSTER_REQUEST';
const DEFAULT_DISTANCE = 40;

export class Cluster extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    layer: VectorLayer;
    source: VectorSource;
    selectInteraction: Select;

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
         * @param {Array<type.Feature>} features - array of features in cluster
         * @param {number} radius - recommended radius for cluster circle
         * @param {number} total - total number of features in viewport
         */
        clusterStyle: PropTypes.func,

        /**
         * Style definition, can be Array of styles or one Style
         * {type.Style}
         */
        style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
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
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
        this.context.mapComp.map.removeInteraction(this.selectInteraction);
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

                    if(self.props.cqlFilter){
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

        this.layer = new VectorLayer(options);
        if (props.layerKey) {
            this.layer.set("layerKey", props.layerKey);
        }
        if (props.zIndex) {
            this.layer.setZIndex(props.zIndex);
        }
        this.context.mapComp.map.addLayer(this.layer);

        this.selectInteraction = new Select({
            layers: [this.layer],
            condition: function (evt) {
                return evt.type == 'pointermove' ||
                    evt.type == 'singleclick';
            },
            style: self.selectStyleFunction
        });

        this.context.mapComp.map.addInteraction(this.selectInteraction);

        this.context.mapComp.map.getView().on('change:resolution', this.resolutionChanged);
        this.resolutionChanged();

        let olEvents = Util.getEvents(this.events, props);
        for (let eventName in olEvents) {
            this.layer.on(eventName, olEvents[eventName]);
        }
    }

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
                if(resolution > maxResolution) {
                    Util.stopRequestWFS(`${REQUEST_KEY}_${this.componentKey}`);
                }
            }
        }
    }

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

    selectStyleFunction = (feature) => {
        let styles = [new OlStyle({
            image: new CircleStyle({
                radius: feature.get('radius'),
                fill: invisibleFill
            })
        })];
        const originalFeatures = feature.get('features');
        let originalFeature;
        for (let i = originalFeatures.length - 1; i >= 0; --i) {
            originalFeature = originalFeatures[i];
            styles = union(styles, this.createStyle(originalFeature));
        }
        return styles;
    };

    createStyle = (feature) => {
        const self = this;
        if (this.props.itemStyle) {
            const itemStyle: Array<Style> = this.props.itemStyle(new Feature(feature.clone(), this.projection));
            const mapStyles: Array<OlStyle> = itemStyle.map((s) => {
                const mapStyle: OlStyle = s.getMapStyle(self.projection);
                mapStyle.setGeometry(feature.getGeometry());
                return mapStyle;
            });
            return mapStyles;
        }

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
    };

    styleFunction = (feature, resolution) => {
        const self = this;
        if (resolution != this.currentResolution) {
            this.calculateClusterInfo(resolution);
            this.currentResolution = resolution;
        }
        let style;
        const size = feature.get('features').length;
        if (size > 1) {
            if (this.props.clusterStyle) {
                const features = feature.get('features').map((f) => new Feature(f.clone(), this.projection));
                const clusterStyle: Array<Style> = this.props.clusterStyle({
                    features: features,
                    radius: feature.get('radius'),
                    total: self.maxFeatureCount,
                });

                const mapStyles: Array<OlStyle> = clusterStyle.map((s) => {
                    const mapStyle: OlStyle = s.getMapStyle(self.projection);
                    return mapStyle;
                });

                return mapStyles;
            }

            const text = new Text({
                text: size.toString(),
                fill: textFill,
                stroke: textStroke
            });

            const image = new CircleStyle({
                radius: feature.get('radius'),
                fill: new Fill({
                    color: [255, 153, 0, Math.min(0.8, 0.4 + (size / self.maxFeatureCount))]
                })
            });

            style = new OlStyle({
                image: image,
                text: text
            });
        } else {
            const originalFeature = feature.get('features')[0];
            style = this.createStyle(originalFeature);
        }
        return style;
    };

    calculateClusterInfo = (resolution) => {
        const self = this;
        this.maxFeatureCount = 0;
        const features = this.source.getFeatures();
        let feature, radius;
        for (let i = features.length - 1; i >= 0; --i) {
            feature = features[i];
            const originalFeatures = feature.get('features');
            const extent = createEmpty();
            let j = (void 0), jj = (void 0);
            for (j = 0, jj = originalFeatures.length; j < jj; ++j) {
                extend(extent, originalFeatures[j].getGeometry().getExtent());
            }
            self.maxFeatureCount = Math.max(self.maxFeatureCount, jj);
            radius = 0.25 * (getWidth(extent) + getHeight(extent)) /
                resolution;
            feature.set('radius', radius);
        }
    };


    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object),
        map: PropTypes.instanceOf(Map)
    };
}