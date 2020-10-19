import * as React from 'react';
import * as PropTypes from 'prop-types';
import {Map, Feature as OlFeature} from 'ol';
import {Fill, Stroke, Circle, Style as OlStyle, RegularShape} from 'ol/style';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {difference} from 'lodash';
import {Util} from '../util';
import {Style} from '../types/Style';
import {Feature} from "../types/Feature";

const backgroundStyle = new OlStyle({
    image: new RegularShape({
        stroke: new Stroke({color: [0, 0, 0, 0]}),
        fill: new Fill({color: [255, 255, 255, 0.005]}),
        points: 4,
        radius: 30, // <--------- control its size
    })
});

const defaultStyle = new OlStyle({
    stroke: new Stroke({
        color: '#04c4f9',
        width: 4
    }),
    fill: new Fill({
        color: 'rgba(4, 196, 249, 0.5)'
    }),
    image: new Circle({
        radius: 6,
        fill: new Fill({color: "rgba(255,255,255,1)"}),
        stroke: new Stroke({color: "rgba(4, 196, 249,1)", width: 2})
    })
});


export class Vector extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    layer: VectorLayer;
    source: VectorSource;

    static propTypes = {

        /**
         * Features that are enabled to modify Array<type.Feature>
         */
        features: PropTypes.array,

        /**
         * Layer key value, so other interactions can find layer
         */
        layerKey: PropTypes.string,

        /**
         * Vector source options
         */
        sourceOptions: PropTypes.object,

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

    getStyles(style) {
        const styles = [];
        if (style instanceof Array) {
            style.forEach((style: Style) => {
                styles.push(style.getMapStyle());
            })
        } else {
            styles.push(style.getMapStyle());
        }
        return styles;
    }

    addLayer(props) {
        const self = this;
        this.projection = self.context.mapComp.map.getView().getProjection().getCode();

        let styles = [backgroundStyle];
        let styleFunction = null;
        if (props.style) {
            if (typeof props.style === 'function') {
                styleFunction = (feature: OlFeature, resolution: number) => {
                    return self.getStyles(props.style(new Feature(feature, self.projection), resolution));
                };
            } else {
                styles = styles.concat(this.getStyles(props.style));
            }
        }

        let options = {
            style: styleFunction || styles,
            source: undefined,
            maxResolution: undefined,
            minResolution: undefined,
        };

        this.source = new VectorSource({wrapX: false});
        options.source = this.source;

        if (props.features) {
            this.source.addFeatures(props.features.map((f) => f.getMapFeature(self.projection)));
        } else if (props.source) {
            this.source = props.source;
            options.source = props.source;
        } else if (props.sourceOptions){
            options.source = new VectorSource(props.sourceOptions);
        }

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

        let olEvents = Util.getEvents(this.events, props);
        for (let eventName in olEvents) {
            this.layer.on(eventName, olEvents[eventName]);
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
            source.clear();
            loadedExtentsRtree_.clear();

            if (nextProps.features) {
                source.addFeatures(nextProps.features.map((f) => f.getMapFeature(self.projection)));
            }
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