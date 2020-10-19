import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { DoubleClickZoom, Draw as OlDraw } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import { Util } from '../util';
import { MapView } from '../map';
import { Feature } from '../types/Feature';

export class Draw extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: OlDraw;
    source: VectorSource;

    static propTypes = {

        /**
         * Geometry type of the geometries being drawn with this instance.
         */
        type: PropTypes.oneOf(['Point', 'LineString', 'Polygon']),

        /**
         * Gets called when user finishes drawing. Doubleclick for LineString and Polygon
         *
         * @return {type.Feature}
         */
        drawend: PropTypes.func,
    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
        'drawend': undefined,
        'drawstart': undefined,
        'propertychange': undefined
    };

    constructor(props) {
        super(props);
        this.source = new VectorSource({ wrapX: false });
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
        let self = this;
        if (nextProps !== this.props && nextProps.type !== this.props.type) {
            this.addControl(nextProps);
        }
    }

    addControl(props) {
        const self = this;

        self.projection = self.context.mapComp.map.getView().getProjection().getCode();

        //Delay execution of activation of double click zoom function
        setTimeout(function () {
            self.controlDoubleClickZoom(true);
        }, 251);
        if (this.interaction) {
            this.context.mapComp.map.removeInteraction(this.interaction);
        }
        let options = Util.getOptions(Object['assign'](Object.keys(Draw.propTypes), props));

        if (options.type) {

            if (options.type == "Circle") {
                console.error("Drawing circle is not yet supported");
                return;
            }

            options.source = this.source;
            this.interaction = new OlDraw(options);
            this.context.mapComp.map.addInteraction(this.interaction);

            this.controlDoubleClickZoom(false);

            setTimeout(function () {
                self.controlDoubleClickZoom(false);
            }, 300);

            self.initializeEvents(props);
        }
    }

    initializeEvents(props) {
        const self = this;
        /*let olEvents = Util.getEvents(this.events, props);
         for (let eventName in olEvents) {
         this.interaction.on(eventName, olEvents[eventName]);
         }*/

        if (props.drawend) {
            this.interaction.on("drawend", (e: OlDraw.Event) => {
                props.drawend(new Feature(e.feature, self.projection));
            });
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
    }

    // dblClick must be disabled while drawing, otherwise dblClicking to end drawing will zoom in.
    controlDoubleClickZoom(active) {
        //Find double click interaction
        var interactions = this.context.mapComp.map.getInteractions();
        for (var i = 0; i < interactions.getLength(); i++) {
            var interaction = interactions.item(i);
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