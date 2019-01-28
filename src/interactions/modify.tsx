import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { difference } from 'lodash';
import { Util } from "../util";
import { MapView } from '../map';
import { Feature } from "../types/Feature";

const modifyStyle = new ol.style.Style({
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

export class Modify extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: ol.interaction.Modify;

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
        if (nextProps !== this.props &&
            (
                nextProps.features && this.props.features &&
                nextProps.features.length != this.props.features.length ||
                (
                    difference(nextProps.features.map((f) => f.getId()), this.props.features.map((f) => f.getId())).length !== 0
                )
            )) {
            this.addControl(nextProps);
        }
    }

    addControl(props){
        const self = this;
        self.projection = self.context.mapComp.map.getView().getProjection().getCode();

        let options = Util.getOptions(Object['assign'](Object.keys(Modify.propTypes), props));

        if(this.interaction){
            this.context.mapComp.map.removeInteraction(this.interaction);
        }

        let features: ol.Collection<ol.Feature> = new ol.Collection();
        let style: ol.style.Style = modifyStyle;

        if (options.style) {
            style = options.style.getMapStyle();
        }

        let params = {
            features: features,
            style: style
        };

        if (options.features) {
            options.features.map((f) => {
                params.features.push(f.getMapFeature(self.projection));
            });
        }

        this.interaction = new ol.interaction.Modify(params);

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
            this.interaction.on("modifyend", (e: ol.interaction.Modify.Event) => {
                props.modifyend(new Feature(e.features.getArray()[0], self.projection));
            });
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };

}