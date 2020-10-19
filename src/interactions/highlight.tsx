import * as React from 'react';
import * as PropTypes from 'prop-types';
import { MapBrowserEvent, Map } from 'ol';
import { Fill, Stroke, Circle, Style } from 'ol/style';
import Select from 'ol/interaction/Select';
import { pointerMove } from 'ol/events/condition';
import { Util } from '../util';
import { MapView } from '../map';

export class Highlight extends React.Component<any, any> {

    interaction: Select;

    options: any = {
        addCondition: undefined,
        condition: undefined,
        layers: undefined,
        style: undefined,
        removeCondition: undefined,
        toggleCondition: undefined,
        multi: undefined,
        features: undefined,
        filter: undefined,
        wrapX: undefined,
        hitTolerance: undefined
    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
        'propertychange': undefined,
        'select': undefined
    };

    constructor(props) {
        super(props);
    }

    render() {
        return null;
    }

    componentDidMount() {
        let self = this;
        if (this.props.instance) {
            this.interaction = this.props.instance;
        } else {
            let options = Util.getOptions(Object['assign'](this.options, this.props));
            options.condition = pointerMove;
            this.interaction = new Select(options);
        }

        if (typeof this.props.active !== undefined) {
            this.interaction.setActive(this.props.active);
        }

        this.interaction.on('select', function (evt: Select.Event) {
            if (evt.selected.length > 0) {
                console.info('selected: ' + evt.selected[0].getId());
            }
        });

        this.context.mapComp.interactions.push(this.interaction);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.interaction.on(eventName, olEvents[eventName]);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            let self = this;
            this.context.mapComp.map.removeInteraction(this.interaction);
            this.context.mapComp.map.un('pointermove', self.highlightFeature, self);
            this.context.mapComp.map.getTarget().style.cursor = '';


            if (this.props.instance) {
                this.interaction = this.props.instance;
            } else {
                let options = Util.getOptions(Object['assign'](this.options, nextProps));

                if (nextProps.source) {
                    this.context.mapComp.map.getLayers().forEach(function (layer) {
                        if (layer.getSource() == nextProps.source) {
                            options.layers = [layer];
                        }
                    });
                }

                options.condition = pointerMove;
                this.interaction = new Select(options);
            }
            this.context.mapComp.map.addInteraction(this.interaction);

            if (typeof nextProps.active !== undefined) {
                this.interaction.setActive(nextProps.active);
            }

            if (this.interaction.getActive()) {
                this.context.mapComp.map.on('pointermove', self.highlightFeature, self);
            }

            let olEvents = Util.getEvents(this.events, nextProps);
            for (let eventName in olEvents) {
                this.interaction.on(eventName, olEvents[eventName]);
            }
        }
    }

    highlightFeature(evt: MapBrowserEvent) {
        if (evt.dragging) return;

        var pixel = this.context.mapComp.map.getEventPixel(evt.originalEvent);
        var hit = this.context.mapComp.map.hasFeatureAtPixel(pixel);

        this.context.mapComp.map.getTarget().style.cursor = hit ? 'pointer' : '';

        /*self.interaction.getFeatures().clear();
         self.featureOverlay.getFeatures().clear();

         let features = [];
         self.context.mapComp.forEachFeatureAtPixel(evt.pixel, function (feature, layer){
         features.push(feature);
         });

         features.forEach(function(f){
         self.featureOverlay.addFeature(f);
         });*/
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
    }

    geometryStyle(feature) {
        let
            style = [],
            geometry_type = feature.getGeometry().getType(),
            white: [number, number, number, number] = [255, 255, 255, 1],
            blue: [number, number, number, number] = [0, 153, 255, 1],
            width: number = 3;

        style['LineString'] = [
            new Style({
                stroke: new Stroke({
                    color: white, width: width + 2
                })
            }),
            new Style({
                stroke: new Stroke({
                    color: blue, width: width
                })
            })
        ],
            style['Polygon'] = [
                new Style({
                    fill: new Fill({ color: [255, 255, 255, 0.5] })
                }),
                new Style({
                    stroke: new Stroke({
                        color: white, width: 3.5
                    })
                }),
                new Style({
                    stroke: new Stroke({
                        color: blue, width: 2.5
                    })
                })
            ],
            style['Point'] = [
                new Style({
                    image: new Circle({
                        radius: width * 2,
                        fill: new Fill({ color: blue }),
                        stroke: new Stroke({
                            color: white, width: width / 2
                        })
                    })
                })
            ];

        return style[geometry_type];
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };

}
