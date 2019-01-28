import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { difference } from 'lodash';
import { Util } from "../util";


const backgroundStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
        stroke: new ol.style.Stroke({ color: [0, 0, 0, 0] }),
        fill: new ol.style.Fill({ color: [255, 255, 255, 0.005] }),
        points: 4,
        radius: 30, // <--------- control its size
    })
});

const defaultStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#04c4f9',
        width: 4
    }),
    fill: new ol.style.Fill({
        color: 'rgba(4, 196, 249, 0.5)'
    }),
    image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({ color: "rgba(255,255,255,1)" }),
        stroke: new ol.style.Stroke({ color: "rgba(4, 196, 249,1)", width: 2 })
    })
});

export class Vector extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    layer: ol.layer.Vector;
    source: ol.source.Vector;

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
         * Style definition
         * {type.Style}
         */
        style: PropTypes.object,
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

    addLayer(props) {
        const self = this;
        this.projection = self.context.mapComp.map.getView().getProjection().getCode();
        let options = {
            style: [backgroundStyle, defaultStyle],
            source: undefined,
        };

        if (props.style) {
            let style: ol.style.Style = props.style.getMapStyle();
            options.style.push(style);
        }

        this.source = new ol.source.Vector({ wrapX: false });
        options.source = this.source;

        if (props.features) {
            this.source.addFeatures(props.features.map((f) => f.getMapFeature(self.projection)));
        } else if (props.source) {
            this.source = props.source;
            options.source = props.source;
        }

        this.layer = new ol.layer.Vector(options);
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
            (
                nextProps.features && this.props.features &&
                nextProps.features.length != this.props.features.length ||
                (
                    difference(nextProps.features.map((f) => f.getId()), this.props.features.map((f) => f.getId())).length !== 0
                )
            ) ||
            (nextProps.updateTimestamp != this.props.updateTimestamp))
        ) {

            const source: any = this.layer.getSource();
            const loadedExtentsRtree_: any = source.loadedExtentsRtree_;
            //source.clear();
            //loadedExtentsRtree_.clear();

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
        map: PropTypes.instanceOf(ol.Map)
    };
}