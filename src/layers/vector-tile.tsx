import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { VectorTile as OlVectorTile } from 'ol/layer';
import { VectorTile as OlVectorTileSource } from 'ol/source';
import { get as getProjection } from 'ol/proj';
import MVT from 'ol/format/MVT';
import { createXYZ } from 'ol/tilegrid';
import { Util } from '../util';


export class VectorTile extends React.Component<any, any> {

    layer: OlVectorTile;

    properties: any = {
        source: undefined,
        visible: undefined,
        updateFilter: undefined
    };

    loadingProgress = {
        loading: 0,
        loaded: 0,
    };

    static propTypes = {
        /**
         * Define layer params in object
         * @param {String} featureNS eg basedata
         * @param {String} featureType eg block
         * @param {String} url eg http://dev-kube-pods.post.ee:30095/geoserver/gwc/service/tms
         * @param {String} version eg 1.0.0
         * @param {String} type, eg MVT
         */
        properties: PropTypes.object,

        /**
         * Array<type.Style>
         */
        itemStyle: PropTypes.func,

        /**
         * Insert random number when needed to update layer
         */
        update: PropTypes.number,


        /**
         * callback when layer is loading
         * @param {boolean} loading status
         * @param {number} number of loading tiles
         * @param {number} number of loaded tiles
         */
        loading: PropTypes.func,
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
            this.properties.updateFilter();

            if (nextProps.update !== this.props.update) {
                if (nextProps.style) {
                    this.layer.setStyle(nextProps.style);
                }
            }
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    addLoading = () => {
        ++this.loadingProgress.loading;
        this.updateLoadingStatus();
    };

    addLoaded = () => {
        const self = this;
        setTimeout(() => {
            ++self.loadingProgress.loaded;
            self.updateLoadingStatus();
        }, 100);
    };

    updateLoadingStatus = () => {
        let finished = false;
        if (this.loadingProgress.loading === this.loadingProgress.loaded) {
            finished = true;
        }

        if (this.props.loading) {
            this.props.loading(finished, this.loadingProgress.loading, this.loadingProgress.loaded);
        }

        if (finished) {
            this.loadingProgress.loading = 0;
            this.loadingProgress.loaded = 0;
        }
    };

    addLayer(props) {
        const self = this;

        self.properties = self.mvtSourceDefinition(props.properties, this.context.mapComp.options.projection.getCode());

        self.properties.source.on('tileloadstart', function () {
            self.addLoading();
        });

        self.properties.source.on('tileloadend', function () {
            self.addLoaded();
        });

        self.properties.source.on('tileloaderror', function () {
            self.addLoaded();
        });


        if (props.properties.maxScale) {
            self.properties.maxResolution = Util.getResolutionForScale(props.properties.maxScale, this.context.mapComp.options.projection.getUnits());
        }

        if (props.properties.minScale) {
            self.properties.minResolution = Util.getResolutionForScale(props.properties.minScale, this.context.mapComp.options.projection.getUnits());
        }

        self.layer = new OlVectorTile(self.properties);

        if (props.style) {
            self.layer.setStyle(props.style);
        }

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

        }

        const tileGridOptions = {
            maxZoom: layerProperties.maxZoom || 22,
            minZoom: layerProperties.minZoom || 0,
            extent: layerProperties.extent || getProjection(projection).getExtent()
        };

        const tileGrid = createXYZ(tileGridOptions);

        return Object.assign({}, {
                visible: true,
                updateFilter: updateFilter,
                source: new OlVectorTileSource({
                    projection: getProjection(projection),
                    format: new MVT(),
                    tileGrid: tileGrid,
                    tilePixelRatio: 1,
                    tileSize: 1024,
                    url: `${layerProperties.url}/${layerProperties.version}/${layerProperties.featureNS}:${layerProperties.featureType}@${projection}@pbf/{z}/{x}/{-y}.pbf`
                })
            },
            layerProperties
        )
    };

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object),
        map: PropTypes.instanceOf(Map)
    };

}
