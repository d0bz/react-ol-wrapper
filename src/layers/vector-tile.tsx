import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from "../util";
import { MapView } from '../map';
import axios from 'axios';


export class VectorTile extends React.Component<any, any> {

    layer: ol.layer.Vector;

    properties: any = {
        source: undefined,
        visible: undefined,
        updateFilter: undefined
    };

    events: any = {
        'change': undefined,
        'change:extent': undefined,
        'change:maxResolution': undefined,
        'change:minResolution': undefined,
        'change:opacity': undefined,
        'change:preload': undefined,
        'change:source': undefined,
        'change:useInterimTilesOnError': undefined,
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

        if(!this.context.mapComp.map) {
            this.context.mapComp.mapReadyCallbacks.push(() => {
                self.addLayer(self.props);
            });
        }else{
            this.addLayer(this.props);
        }

    }

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            this.properties.updateFilter();
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    addLayer(props) {
        const self = this;

        self.properties = self.mvtSourceDefinition(props.properties, this.context.mapComp.options.projection.getCode());
        self.layer = new ol.layer.VectorTile(self.properties);
        self.context.mapComp.map.addLayer(self.layer);

        if (props.zIndex) {
            self.layer.setZIndex(props.zIndex);
        }

        if (props.layerKey) {
            self.layer.set("key", props.layerKey);
        }


        let olEvents = Util.getEvents(self.events, props);
        for (let eventName in olEvents) {
            self.layer.on(eventName, olEvents[eventName]);
        }

    }

    mvtSourceDefinition(layerProperties, projection) {
        function updateFilter(extraFilter) {
            console.error(this, extraFilter);
        }

        return Object.assign({}, {
                visible: true,
                updateFilter: updateFilter,
                source: new ol.source.VectorTile({
                    projection: ol.proj.get(projection),
                    format: new ol.format.GeoJSON({
                        dataProjection: ol.proj.get(projection),
                        defaultDataProjection: ol.proj.get(projection),
                        featureProjection: ol.proj.get(projection),
                    }),
                    tileGrid: new ol.tilegrid.TileGrid({
                        extent: layerProperties.extent ,
                        minZoom: 3,
                        resolutions: layerProperties.resolutions,
                    }),
                    tileLoadFunction: function (tile, url) {
                        (tile as any).setProjection(ol.proj.get(projection));
                        (tile as any).setLoader(function () {
                            axios.get(url + "?ts=" + new Date().getTime())
                                .then(response => {
                                    const format = (tile as any).getFormat();
                                    let features = [];
                                    if (layerProperties.cqlFilter) {
                                        format.readFeatures(response.data).forEach((f) => {
                                            if (Util.olConditionCheck(f, layerProperties.cqlFilter)) {
                                                features.push(f);
                                            }
                                        });
                                    } else {
                                        features = format.readFeatures(response.data)
                                    }

                                    (tile as any).setFeatures(features);
                                })
                                .catch(function () {
                                    (tile as any).setFeatures([]);
                                });
                        })
                    },
                    tilePixelRatio: 1,
                    url: `${layerProperties.url}/${layerProperties.version}/${layerProperties.featureNS}:${layerProperties.featureType}@${projection}@geojson/{z}/{x}/{-y}.geojson`
                })
            },
            layerProperties
        )
    };

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object),
        map: PropTypes.instanceOf(ol.Map)
    };

}
