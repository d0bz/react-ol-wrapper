import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Image } from 'ol/layer';
import { ImageStatic } from 'ol/source';
import { Util } from '../util';
import { MapView } from '../map';

export class ImageLayer extends React.Component<any, any> {

    layer: Image;

    static propTypes = {
        /**
         * Define layer params in object
         * @param {String} url eg https://imgs.xkcd.com/comics/online_communities.png
         * @param {Array} imageExtent[Number,Number,Number,Number] define image extent
         * @param {String} projection define image projection, which extent is defined, most stable use is WGS:84
         */
        properties: PropTypes.object,
    };

    events: any = {
        'change': undefined,
        'change:extent': undefined,
        'change:gradient': undefined,
        'change:maxResolution': undefined,
        'change:minResolution': undefined,
        'change:opacity': undefined,
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

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    addLayer(props) {
        const self = this;

        var imageSource = new ImageStatic(props.properties);

        let properties = {
            maxResolution: undefined,
            minResolution: undefined,
        };
        if (props.properties.maxScale) {
            properties.maxResolution = Util.getResolutionForScale(props.properties.maxScale, this.context.mapComp.options.projection.getUnits());
        }

        if (props.properties.minScale) {
            properties.minResolution = Util.getResolutionForScale(props.properties.minScale, this.context.mapComp.options.projection.getUnits());
        }

        self.layer = new Image({
            ...properties,
            source: imageSource
        });

        if (props.zIndex) {
            self.layer.setZIndex(props.zIndex);
        }

        if (props.opacity) {
            self.layer.setOpacity(props.opacity);
        }

        if (props.layerKey) {
            self.layer.set("key", props.layerKey);
        }

        self.context.mapComp.map.addLayer(self.layer);
        let olEvents = Util.getEvents(self.events, props);
        for (let eventName in olEvents) {
            self.layer.on(eventName, olEvents[eventName]);
        }

    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };

}