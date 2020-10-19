import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map, Feature as OlFeature } from 'ol';
import { Fill, Stroke, Circle, Style } from 'ol/style';
import Modify from 'ol/interaction/Modify';
import { pointerMove } from 'ol/events/condition';
import Collection from 'ol/Collection';

import { difference } from "lodash";
import { Util } from "../util";
import { MapView } from '../map';
import { Feature } from "../types/Feature";

const modifyStyle = new Style({
    stroke: new Stroke({
        color: '#04c4f9',
        width: 4
    }),
    fill: new Fill({
        color: 'rgba(4, 196, 249, 0.5)'
    }),
    image: new Circle({
        radius: 6,
        fill: new Fill({ color: "rgba(255,255,255,1)" }),
        stroke: new Stroke({ color: "rgba(4, 196, 249,1)", width: 2 })
    })
});

export class ModifyComponent extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: Modify;

    static propTypes = {

        /**
         * Features that are enabled to modify Array<type.Feature>
         */
        features: PropTypes.array,

        /**
         * Gets called when user finishes modifying, any drop after drag will be triggered
         *
         * @return {type.Feature}
         */
        modifyend: PropTypes.func,

        /**
         * Not required. Can select features from vector layer where key='name' attribute is defined
         */
        layerKey: PropTypes.string,

    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
        'modifyend': undefined,
        'modifystart': undefined,
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
                self.addControl(self.props);
            });
        } else {
            this.addControl(this.props);
        }
    }

    componentWillReceiveProps(nextProps) {
        const self = this;
        if (nextProps !== this.props &&
            (nextProps.features && this.props.features && (
                    nextProps.features.length != this.props.features.length ||
                    (
                        difference(nextProps.features.map((f) => f.getId()), self.props.features.map((f) => f.getId())).length !== 0
                    )
                ) || (!this.props.features && nextProps.features)
            )) {
            this.addControl(nextProps);
        }
    }

    addControl(props){
        const self = this;
        self.projection = self.context.mapComp.map.getView().getProjection().getCode();

        let options = Util.getOptions(Object['assign'](Object.keys(ModifyComponent.propTypes), props));

        if(this.interaction){
            this.context.mapComp.map.removeInteraction(this.interaction);
        }

        let features: Collection<OlFeature> = new Collection();
        let style: Style = modifyStyle;

        if (options.style) {
            style = options.style.getMapStyle();
        }

        let params = {
            features: features,
            style: style,
            source: undefined,
        };

        if (options.features) {
            options.features.map((f) => {
                params.features.push(f.getMapFeature(self.projection));
            });
        }

        if (options.layerKey) {
            this.context.mapComp.map.getLayers().forEach(function (layer) {
                if (options.layerKey === layer.get("layerKey")) {
                    params.source = layer.getSource();
                }
            });
        }

        this.interaction = new Modify(params);

        this.context.mapComp.map.addInteraction(this.interaction);

        this.initializeEvents(props);
    }

    initializeEvents(props){
        const self = this;
        /*let olEvents = Util.getEvents(this.events, props);
         for (let eventName in olEvents) {
         this.interaction.on(eventName, olEvents[eventName]);
         }*/

        if(props.modifyend){
            this.interaction.on("modifyend", (e: Modify.Event) => {
                props.modifyend(new Feature(e.features.getArray()[0], self.projection));
            });
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };

}