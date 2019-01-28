import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from '../util';
import { MapView } from '../map';

/**
 * Attribution element
 */
export class Attribution extends React.Component<any, any> {

    static propTypes = {

        /**
         * CSS class name
         */
        className: PropTypes.string,
        /**
         * Specify a target if you want the control to be rendered outside of the map's viewport.
         */
        target: PropTypes.string,
        /**
         * Specify if attributions can be collapsed. If not specified, sources control this behavior with their attributionsCollapsible setting.
         */
        collapsible: PropTypes.bool,
        /**
         * Specify if attributions should be collapsed at startup.
         */
        collapsed: PropTypes.bool,
        /**
         * Text label to use for the button tip.
         */
        tipLabel: PropTypes.string,
        /**
         * Text label to use for the collapsed attributions button. Instead of text, also an element (e.g. a span element) can be used.
         */
        label: PropTypes.string,
        /**
         * Text label to use for the expanded attributions button. Instead of text, also an element (e.g. a span element) can be used.
         */
        collapseLabel: PropTypes.string,
        /**
         * Function called when the control should be re-rendered. This is called in a requestAnimationFrame callback.
         */
        render: PropTypes.func,
    };

    control: ol.control.Attribution;

    events: any = {
        'change': undefined,
        'propertychange': undefined
    };

    constructor(props) {
        super(props);
    }

    render() {
        return null;
    }

    componentDidMount() {
        let options = Util.getOptions(Object['assign'](Object.keys(Attribution.propTypes), this.props));
        this.control = new ol.control.Attribution(options);
        this.context.mapComp.controls.push(this.control);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.control.on(eventName, olEvents[eventName]);
        }
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };

}