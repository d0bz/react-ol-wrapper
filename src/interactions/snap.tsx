import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from "../util";
import { MapView } from '../map';

export class Snap extends React.Component<any, any> {

    interaction: ol.interaction.Snap;
    interactions: any[] = [];
    projection: string = "EPSG:3857";

    static propTypes = {

        /**
         * Features that are enabled to modify Array<type.Feature>
         */
        features: PropTypes.array,

        /**
         * Not required. Can select features from vector layer where key='name' attribute is defined
         */
        layerKeys: PropTypes.arrayOf(PropTypes.string),

        /**
         * Not required. Define how far from vector snaps
         */
        pixelTolerance: PropTypes.number,
    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
        'propertychange': undefined
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
                self.registerSnap(self.props);
            });
        } else {
            self.registerSnap(self.props);
        }
    }

    addSnapFeature(evt) {
        this.interaction.addFeature(evt.feature);
    }

    removeSnapFeature(evt) {
        this.interaction.removeFeature(evt.feature);
    }

    removeSnap(props) {
        for (var x = this.interactions.length - 1; x >= 0; x--) {
            this.context.mapComp.map.removeInteraction(this.interactions[x].interaction);
            this.interactions.splice(x, 1);
        }
    }

    findByLayer(layerObject) {
        for (var x = 0; x < this.interactions.length; x++) {
            if (this.interactions[x].source == layerObject.getSource()) {
                return this.interactions[x];
                break;
            }
        }
        return false;
    }

    removeByLayer(layerObject) {
        for (var x = 0; x < this.interactions.length; x++) {
            if (this.interactions[x].source == layerObject.getSource()) {
                this.interactions.splice(x, 1);
                return true;
                break;
            }
        }
        return false;
    }

    registerSnap(props) {
        const self = this;
        self.projection = self.context.mapComp.map.getView().getProjection().getCode();
        let options = Util.getOptions(Object['assign'](Object.keys(Snap.propTypes), props));

        const features: ol.Collection<ol.Feature> = new ol.Collection([]);

        if(options.features){
            options.features.map((f) => {
                features.push(f.getMapFeature(self.projection));
            });
        }

        if (props.layerKeys) {
            this.context.mapComp.map.getLayers().forEach(function (layerObject) {
                if (props.layerKeys.indexOf(layerObject.get("layerKey")) !== -1) {

                    if (layerObject.getVisible()) {
                        let opts = {
                            source: layerObject.getSource(),
                            pixelTolerance: null
                        };

                        if (options.pixelTolerance) {
                            opts.pixelTolerance = options.pixelTolerance;
                        }

                        const newInteraction = new ol.interaction.Snap(opts);
                        this.context.mapComp.map.addInteraction(newInteraction);

                        let olEvents = Util.getEvents(this.events, this.props);
                        for (let eventName in olEvents) {
                            newInteraction.on(eventName, olEvents[eventName]);
                        }

                        this.interactions.push({
                            source: layerObject.getSource(),
                            interaction: newInteraction
                        });
                    }

                }
            });
        }

        this.interaction = new ol.interaction.Snap(options);

        if (features.getLength() > 0) {
            features.forEach(feature => {
                this.interaction.addFeature(feature);
            });
        }
    }

    componentWillUnmount() {
        const self = this;
        self.context.mapComp.map.removeInteraction(self.interaction);
        this.interactions.forEach((interaction) => self.context.mapComp.map.removeInteraction(interaction));

    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };
}