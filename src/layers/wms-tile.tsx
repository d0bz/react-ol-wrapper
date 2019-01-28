import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from "../util";

export class WmsTile extends React.Component<any, any> {

    layer: ol.layer.Tile;

    properties: any = {
        source: undefined,
        visible: undefined,
        updateFilter: undefined
    };


    static propTypes = {
        /**
         * Define layer params in object
         * @param {String} featureNS
         * @param {String} featureType eg HYBRID
         * @param {String} url eg https://kaart.maaamet.ee/wms/fotokaart
         * @param {String} version eg 1.1.1
         * @param {String} cqlFilter
         */
        properties: PropTypes.object,

        /**
         * Can order layers
         */
        zIndex: PropTypes.number,
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

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            this.properties.cqlFilter = nextProps.cqlFilter;
            this.properties.updateFilter();
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    addLayer(props) {
        const self = this;

        self.properties = this.wmsSourceDefinition(props.properties, this.context.mapComp.options.projection.getCode());
        self.properties.cqlFilter = props.cqlFilter;
        self.properties.updateFilter();

        self.layer = new ol.layer.Tile(self.properties);
        if (props.zIndex) {
            self.layer.setZIndex(props.zIndex);
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


    wmsSourceDefinition(layerProperties, projection) {
        let layers = layerProperties.featureType;
        if (layerProperties.featureNS && layerProperties.featureNS !== "") {
            layers = `${layerProperties.featureNS}:${layerProperties.featureType}`;
        }

        let params = {
            'LAYERS': layers,
            'TILED': true,
            'VERSION': layerProperties.version,
            'STYLES': null,
            'env': null
        };

        function updateFilter(extraFilter) {
            let activeCqlFilter = this.cqlFilter;

            if (extraFilter && extraFilter.length > 0) {
                activeCqlFilter = extraFilter;
            }

            if (activeCqlFilter && activeCqlFilter.length > 0) {
                const cqlFilter = Util.buildWMSFilter(activeCqlFilter);
                this.source.updateParams({ CQL_FILTER: cqlFilter });
            } else {
                this.source.updateParams({ CQL_FILTER: null });
            }
        }

        if (layerProperties.styles) {
            params.STYLES = layerProperties.styles;
        }

        if (layerProperties.extraParams) {
            params.env = layerProperties.extraParams;
        }

        if (layerProperties.params) {
            layerProperties.params.forEach((param) => {
                params[param.key] = param.value;
            })
        }

        let source = null;
        if (layerProperties.singleTile) {
            source = new ol.source.ImageWMS({
                projection: projection,
                url: layerProperties.url,
                params: params,
                ratio: 1,
                crossOrigin: 'anonymous'
            });
        } else {
            source = new ol.source.TileWMS({
                projection: projection,
                url: layerProperties.url,
                params: params,
                crossOrigin: 'anonymous'
            });
        }

        const version = source.getParams().VERSION;
        if (version && version.indexOf("1.3") !== -1) {
            const axisOrientation = projection.getAxisOrientation();
            if (axisOrientation === "neu") {
                source.setTileLoadFunction((img, src) => {
                    let bbox = src.substring(src.indexOf("BBOX=") + 5).split("%2C");
                    src = src.slice(0, src.indexOf("BBOX="));

                    src += `BBOX=${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`;
                    img.getImage().src = src;
                });
            }
        }

        const obj = Object.assign({}, {
            visible: true,
            updateFilter: updateFilter,
            source: source
        }, layerProperties);

        return obj;
    };

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object),
        map: PropTypes.instanceOf(ol.Map)
    };
}