import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map, Feature as OlFeature } from 'ol';
import { Fill, Stroke, Circle, Style } from 'ol/style';
import { Polygon, Point, LineString, LinearRing, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection, GeometryType } from 'ol/geom';
import DragBox from 'ol/interaction/DragBox';
import Draw from 'ol/interaction/Draw';
import Select from 'ol/interaction/Select';
import { always, never, platformModifierKeyOnly, shiftKeyOnly, singleClick } from 'ol/events/condition';
import { boundingExtent } from 'ol/extent';
import { squaredDistance, closestOnCircle, closestOnSegment } from 'ol/coordinate';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Collection from 'ol/Collection';
import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';
import { transform } from 'ol/proj';
import { Util } from '../util';
import { MapView } from '../map';
import { Feature } from '../types/Feature';
import * as jsts from 'jsts';

const resultStyle = new Style({
    stroke: new Stroke({
        color: '#f00',
        width: 4
    }),
    fill: new Fill({
        color: 'rgba(255,0,0,0)'
    })
});


const selectStyle = new Style({
    stroke: new Stroke({
        color: '#3399cc',
        width: 1
    }),
    fill: new Fill({
        color: 'rgba(255,255,255,0.2)'
    })
});

const REQUEST_ID = "MERGE_FEATURE_REQUEST";

export class Merge extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: Draw;
    dragBoxInteraction: DragBox;
    selectInteraction: Select;
    source: VectorSource;
    layer: VectorLayer;
    resultSource: VectorSource;
    resultLayer: VectorLayer;
    wktWriter: jsts.io.WKTWriter;
    wktFormat: WKT;
    jtsParser: jsts.io.OL3Parser;
    mergeFeatures: Collection<OlFeature>;
    geojsonFormat: GeoJSON;

    options: any = {};
    events: any = {};

    unselectLastSelected: (Event) => void;


    constructor(props) {
        super(props);
        this.mergeFeatures = new Collection([]);
        this.source = new VectorSource({ wrapX: false, features: this.mergeFeatures });
        this.resultSource = new VectorSource({ wrapX: false });


        this.geojsonFormat = new GeoJSON();

        this.jtsParser = new jsts.io.OL3Parser();
        this.jtsParser.inject(Point, LineString, LinearRing, Polygon, MultiPoint, MultiLineString,
            MultiPolygon, GeometryCollection);

        this.wktWriter = new jsts.io.WKTWriter();
        this.wktFormat = new WKT();
    }

    render() {
        return null;
    }

    componentDidMount() {
        const self = this;
        let options = Util.getOptions(Object['assign'](this.options, this.props));

        this.context.mapComp.mapReadyCallbacks.push(() => {
            self.projection = self.context.mapComp.map.getView().getProjection().getCode();
        });

        this.layer = new VectorLayer({
            source: this.source,
            style: selectStyle
        });

        this.resultLayer = new VectorLayer({
            source: this.resultSource,
            style: resultStyle
        });


        if (this.props.zIndex) {
            this.layer.setZIndex(this.props.zIndex);
        } else {
            this.layer.setZIndex(100);
        }

        this.resultLayer.setZIndex(this.layer.getZIndex() - 1);

        this.context.mapComp.layers.push(this.layer);
        this.context.mapComp.layers.push(this.resultLayer);
    }

    componentWillReceiveProps(nextProps) {
        var self = this;
        if (nextProps !== this.props && nextProps.active !== this.props.active) {
            let options = Util.getOptions(Object['assign'](this.options, nextProps));


            if (this.props.active) {
                if (this.selectInteraction) {
                    this.context.mapComp.map.removeInteraction(this.selectInteraction);
                }

                if (this.dragBoxInteraction) {
                    this.context.mapComp.map.removeInteraction(this.dragBoxInteraction);
                }

                if (self.unselectLastSelected) {
                    document.removeEventListener('keydown', self.unselectLastSelected, false);
                }


                this.context.mapComp.map.un('click', self.mapOnClick, self);
                this.mergeFeatures.clear();
                this.resultSource.clear();
            }

            // interaction activated
            if (nextProps.active) {
                this.context.mapComp.map.getLayers().forEach(function (layer) {
                    if (layer.getSource() == nextProps.source) {
                        options.layers = [layer];
                    }
                });

                this.selectInteraction = new Select(options);
                this.selectInteraction.on("select", (e) => self.areaSelected(e));

                if (nextProps.wfsLayerDescription) {
                    this.context.mapComp.map.on('click', self.mapOnClick, self);
                }
                //this.selectedFeatures.clear();
                //this.context.mapComp.map.addInteraction(this.selectInteraction);


                this.dragBoxInteraction = new DragBox({
                    condition: platformModifierKeyOnly
                });

                this.dragBoxInteraction.on('boxend', function () {
                    var extent = self.dragBoxInteraction.getGeometry().getExtent();
                    self.requestWFSFeatures(Util.transformExtent(extent, self.projection, 'EPSG:4326'));
                });

                this.context.mapComp.map.addInteraction(this.dragBoxInteraction);

                self.unselectLastSelected = (e: Event) => {
                    // backspace
                    const event: any = e;
                    if (event.which == 8 && self.mergeFeatures.getLength() > 0) {
                        self.mergeFeatures.removeAt(self.mergeFeatures.getLength() - 1);
                        self.selectionChanged();

                    }
                };

                document.addEventListener('keydown', self.unselectLastSelected, false);


            }
        }

        if (nextProps.active && nextProps.mergeFeatures && (nextProps.mergeFeatures.length != this.mergeFeatures.getLength())) {
            self.clearFeatures();
            self.addFeatures(nextProps.mergeFeatures);
        }

    }

    mapOnClick(evt) {
        const coordinate = transform(evt.coordinate, this.projection, 'EPSG:4326');
        const extent = Util.createExtentFromLonLat(coordinate[0], coordinate[1], 0.01);
        this.requestWFSFeatures(extent);
    }

    requestWFSFeatures(extent) {
        const { wfsLayerDescription } = this.props;
        const self = this;

        const requestNode = Util.buildWFSGetFeatureRequestElement({
            geometryPropertyName: wfsLayerDescription.geometryPropertyName,
            featureType: wfsLayerDescription.featureType,
            featureNS: wfsLayerDescription.featureNS,
            srsName: 'EPSG:4326',
            bbox: extent,
            cqlFilter: wfsLayerDescription.cqlFilter
        });

        Util.requestWFS(requestNode, wfsLayerDescription.url, true, REQUEST_ID).then((resp) => {
            resp.features.forEach((feature) => {
                self.toggleFeature(feature);
            });

            self.selectionChanged();
        });
    }

    areaSelected(event) {
        Util.stopRequestWFS(REQUEST_ID);
        const feature = event.selected[0];
        this.toggleFeature(feature);
        this.selectionChanged();
    }

    selectionChanged() {
        const self = this;
        // when more than one area selected then we can allow user to merge areas
        let features = this.mergeFeatures.getArray();

        const resultFeature = this.showFeatures(features);

        const innerFeatures = features.map((f) => {
            return new Feature(f, self.projection);
        });

        let innerResultFeature = new Feature(resultFeature, self.projection);

        this.props.selectionChanged(innerResultFeature, innerFeatures);
    }

    toggleFeature(feature: Feature) {
        // If feature already exists then remove 
        const self = this;
        let featureFound = false;

        for (let x = this.mergeFeatures.getLength() - 1; x >= 0; x--) {
            let f = this.mergeFeatures.item(x);
            if (f.getId() === feature.getId()) {
                featureFound = true;
                self.mergeFeatures.remove(f);
            }
        }

        if (!featureFound) {
            this.mergeFeatures.push(feature.getMapFeature(self.projection));
        }
    }

    clearFeatures() {
        this.mergeFeatures.clear();
        this.resultSource.clear();
    }

    tryToUnion(geomA, geomB, repeated = 0) {
        let unionGeom = null;

        try {
            unionGeom = geomA.union(geomB);
        } catch (e) {
            let bufferedGeom = null;

            // first buffer second geometry
            if (repeated == 0) {
                bufferedGeom = geomB.buffer(-0.00001).buffer(0.00001);
                return this.tryToUnion(geomA, bufferedGeom, repeated + 1);
            } else if (repeated == 1) {
                bufferedGeom = geomA.buffer(-0.00001).buffer(0.00001);
                return this.tryToUnion(bufferedGeom, geomB, repeated + 1);
            } else {
                return geomA;
            }
        }

        return unionGeom;
    }

    showFeatures(features) {
        const self = this;
        let resultFeature = null;

        this.resultSource.clear();

        // show merged areas
        if (features.length > 1) {
            let geomA = this.jtsParser.read(features[0].getGeometry());
            for (let x = 1; x < features.length; x++) {
                let geomB = self.jtsParser.read(features[x].getGeometry());
                geomA = self.tryToUnion(geomA, geomB);
            }

            const geomFactory = new jsts.geom.GeometryFactory();
            let exteriorGeom = null;
            // remove holes
            /*if(geomA.getNumGeometries() > 1){
             let i = 0;
             let polygonGeometries = [];

             while (geomA.getGeometryN(i)) {
             polygonGeometries.push(geomFactory.createPolygon(geomA.getGeometryN(i).getExteriorRing()));
             i++;
             }

             exteriorGeom = geomFactory.createMultiPolygon(polygonGeometries);
             }else{
             exteriorGeom = geomFactory.createPolygon(geomA.getExteriorRing());
             }*/


            const wkt = self.wktWriter.write(geomA);
            resultFeature = self.wktFormat.readFeature(wkt);
            self.resultSource.addFeature(resultFeature);
        }

        return resultFeature;
    }

    addFeatures(features) {
        const self = this;
        if (features && features.length > 0) {

            features = features.map((f) => f.getMapFeature(self.projection));

            this.mergeFeatures.extend(features);
            this.showFeatures(features);
        }
    }

    componentWillUnmount() {
        if (this.selectInteraction) {
            this.context.mapComp.map.removeInteraction(this.selectInteraction);
        }

        this.context.mapComp.map.un('click', this.mapOnClick, this);
        this.mergeFeatures.clear();
        this.resultSource.clear();

        this.context.mapComp.map.removeLayer(this.layer);
        this.context.mapComp.map.removeLayer(this.resultLayer);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };
}