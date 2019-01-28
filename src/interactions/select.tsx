import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { difference } from 'lodash';
import { Util } from "../util";
import { Feature } from "../types/Feature";
import { MapView } from '../map';
import { WfsLayerDescription } from '../interfaces/WfsLayerDescription';

export class Select extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: ol.interaction.Select;
    selectableSource: ol.source.Vector;
    selectableLayer: ol.layer.Vector;

    source: ol.source.Vector;
    featureOverlaySource: ol.source.Vector;
    layer: ol.layer.Vector;
    featureOverlay: ol.layer.Vector;
    selectedFeatures: ol.Collection<ol.Feature>;
    featureOverlayFeatures: ol.Collection<ol.Feature>;
    geojsonFormat: ol.format.GeoJSON;
    highlightedFeature: ol.Feature;
    selectedStyle: ol.style.Style;

    static propTypes = {

        /**
         * Features that are enabled to modify Array<type.Feature>
         */
        features: PropTypes.array,

        /**
         * Gets called when user finishes modifying, any drop after drag will be triggered
         *
         * @param {type.Feature} feature
         * @param {boolean} isSecondaryWfs if request were made with secondaryWfsLayerDescription when described
         */
        onSelected: PropTypes.func,

        /**
         * wfs layer decription to enable WFS request on map click
         * @param {WfsLayerDescription}
         */
        wfsLayerDescription: PropTypes.object,

        /**
         * wfs layer decription to enable WFS request on map click when first description won't find anything
         * @param {WfsLayerDescription}
         */
        secondaryWfsLayerDescription: PropTypes.object,

        /**
         * Not required. Can select features from vector layer where key='name' attribute is defined
         */
        layerKeys: PropTypes.arrayOf(PropTypes.string)
    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
        'propertychange': undefined,
        'select': undefined
    };

    constructor(props) {
        super(props);


        this.selectedStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#f00',
                width: 4
            }),
            fill: new ol.style.Fill({
                color: 'rgba(255,0,0,0)'
            }),
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({ color: "rgba(255,0,0,1)" }),
                stroke: new ol.style.Stroke({ color: "#f00", width: 2 })
            })
        });

        this.selectedFeatures = new ol.Collection([]);
        this.source = new ol.source.Vector({
            wrapX: false,
            features: this.selectedFeatures
        });

        this.selectableSource = new ol.source.Vector({
            wrapX: false
        });

        this.featureOverlayFeatures = new ol.Collection([]);
        this.featureOverlaySource = new ol.source.Vector({
            wrapX: false,
            features: this.featureOverlayFeatures
        });


        this.geojsonFormat = new ol.format.GeoJSON();
    }

    render() {
        return null;
    }

    componentDidMount() {
        const self = this;


        if (this.props.style) {
            this.selectedStyle = this.props.style.getMapStyle();
        }

        this.layer = new ol.layer.Vector({
            source: this.source,
            style: this.selectedStyle
        });

        this.featureOverlay = new ol.layer.Vector({
            source: this.featureOverlaySource
        });

        this.selectableLayer = new ol.layer.Vector({
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
            this.context.mapComp.layers.push(this.layer);
            this.context.mapComp.layers.push(this.selectableLayer);
            this.context.mapComp.layers.push(this.featureOverlay);

            if (this.props.active) {
                this.context.mapComp.mapReadyCallbacks.push(() => {
                    self.projection = self.context.mapComp.map.getView().getProjection().getCode();
                    self.activateSelectTool(self.props);
                });
            }

        } else {
            self.projection = self.context.mapComp.map.getView().getProjection().getCode();
            this.context.mapComp.map.addLayer(this.layer);
            this.context.mapComp.map.addLayer(this.selectableLayer);
            this.context.mapComp.map.addLayer(this.featureOverlay);

            // interaction activated
            if (this.props.active) {
                this.activateSelectTool(this.props);
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        const self = this;
        if (nextProps !== this.props && nextProps.active !== this.props.active) {

            if (this.props.active) {
                this.context.mapComp.map.removeInteraction(this.interaction);
                this.context.mapComp.map.un('click', this.mapOnClick, this);
                this.context.mapComp.map.un('click', this.mapVectorTileClick, this);
                this.context.mapComp.map.un('pointermove', self.highlightFeature, self);
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

            if(nextProps.features && this.props.features &&
                nextProps.features.length != this.props.features.length ||
                (
                    difference(nextProps.features.map((f) => f.getId()), self.props.features.map((f) => f.getId())).length !== 0
                )
            ){
                this.updateFeatures(nextProps.features);
            }
        }
    }

    activateSelectTool(nextProps) {

        const self = this;
        let options = Util.getOptions(Object['assign'](Object.keys(Select.propTypes), nextProps));

        if (this.props.active) {
            this.context.mapComp.map.removeInteraction(this.interaction);
            this.context.mapComp.map.un('click', this.mapOnClick, this);
            this.context.mapComp.map.un('click', this.mapVectorTileClick, this);
            this.context.mapComp.map.un('pointermove', self.highlightFeature, self);
            this.context.mapComp.map.getTarget().style.cursor = '';

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
                if (nextProps.layerKeys.indexOf(layer.get("layerKey")) !== -1) {
                    options.layers = [layer];
                }
            });
        }

        if (nextProps.wfsLayerDescription) {
            this.context.mapComp.map.on('click', this.mapOnClick, this);
        }

        if (nextProps.vectorTile) {
            this.context.mapComp.map.on('click', this.mapVectorTileClick, this);
        }

        if (nextProps.features) {
            this.selectableSource.clear();
            this.selectableSource.addFeatures(nextProps.features.map((f) => f.getMapFeature(self.projection)));
            options.layers = [this.selectableLayer];
        }

        delete options.features;

        if (options.layers) {
            if (nextProps.style) {
                options.style = nextProps.style.getMapStyle();
            }

            this.interaction = new ol.interaction.Select(options);
            this.interaction.on("select", this.areaSelected, this);
            this.context.mapComp.map.addInteraction(this.interaction);
        }

        if((!options.layers || options.layers.length == 0) && !nextProps.wfsLayerDescription && !nextProps.vectorTile){
            console.warn("Select have nothing to select, check your configuration!");
        }

        this.context.mapComp.map.on('pointermove', self.highlightFeature, self);


        let olEvents = Util.getEvents(this.events, nextProps);
        for (let eventName in olEvents) {
            if(this.interaction) {
                this.interaction.on(eventName, olEvents[eventName], nextProps.scope);
            }
        }
    }

    highlightFeature(evt: ol.MapBrowserEvent) {
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
        this.selectFeature(evt.selected[0]);
    }

    updateFeatures(features: Feature[]){
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

    selectFeature(feature?: ol.Feature, runCallback = true, secondaryWfs = false) {
        const self = this;
        const { onSelected } = this.props;

        this.selectedFeatures.clear();
        this.featureOverlayFeatures.clear();
        if(this.interaction) {
            this.interaction.getFeatures().clear();
        }


        if (feature) {
            if (runCallback && typeof onSelected === 'function') {
                onSelected(new Feature(feature, self.projection), secondaryWfs);
            }
        } else {
            if (runCallback && typeof onSelected === 'function') {
                onSelected(null, secondaryWfs);
            }
        }
    }

    selectVectorTileFeature(featureProperties?) {
        const self = this;
        const { onSelected } = this.props;

        this.selectedFeatures.clear();
        this.featureOverlayFeatures.clear();
        if(this.interaction) {
            this.interaction.getFeatures().clear();
        }

        if (featureProperties) {
            onSelected(new Feature(featureProperties, self.projection), false);
        } else {
            onSelected(null, false);
        }
    }

    mapOnClick(evt) {
        const { wfsLayerDescription, secondaryWfsLayerDescription } = this.props;
        const self = this;
        const coordinate = evt.coordinate;
        const extent = new ol.geom.Circle(coordinate, 0.01).getExtent(); // radius in meters

        this.requestFeatures(wfsLayerDescription, extent).then((prop) => {
            let features = prop.features;
            if (features.length == 0) {
                if (secondaryWfsLayerDescription) {
                    this.requestFeatures(secondaryWfsLayerDescription, extent).then((prop) => {
                        let features = prop.features;
                        features.forEach((feature) => {
                            self.selectFeature(feature.getMapFeature(self.projection), true, true);
                        });
                    });
                }
            } else {
                features.forEach((feature) => {
                    self.selectFeature(feature.getMapFeature(self.projection));
                })
            }
        });
    }

    mapVectorTileClick(evt) {
        const self = this;
        let features = [];
        const clickedFeatures = this.context.mapComp.map.getFeaturesAtPixel(evt.pixel);
        if(clickedFeatures) {
            clickedFeatures.forEach((feature) => {
                // remove duplicates. When using vector tile and clicking same time as zooming then loading will overlap features
                const fid = feature.get("oid");
                if (features.indexOf(fid) === -1) {
                    features.push(fid);
                    self.selectVectorTileFeature({
                        properties: feature.getProperties(),
                        projection: self.projection,
                    });
                }
            })
        }else{
            self.selectVectorTileFeature();
        }
    }

    requestFeatures(wfsLayerDescription, extent) {
        const self = this;
        const requestNode = Util.buildWFSGetFeatureRequestElement({
            geometryPropertyName: wfsLayerDescription.geometryPropertyName,
            featureType: wfsLayerDescription.featureType,
            featureNS: wfsLayerDescription.featureNS,
            srsName: self.context.mapComp.map.getView().getProjection().getCode(),
            bbox: extent,
            cqlFilter: wfsLayerDescription.cqlFilter
        });

        return Util.requestWFS(requestNode, wfsLayerDescription.url, true);
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
        this.context.mapComp.map.un('click', this.mapOnClick, this);
        this.context.mapComp.map.un('click', this.mapVectorTileClick, this);
        this.selectedFeatures.clear();
        this.context.mapComp.map.removeLayer(this.featureOverlay);
        this.context.mapComp.map.removeLayer(this.layer);
        this.context.mapComp.map.removeLayer(this.selectableLayer);
        this.context.mapComp.map.un('pointermove', this.highlightFeature, this);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };
}