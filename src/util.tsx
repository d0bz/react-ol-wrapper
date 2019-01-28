import * as React from 'react';
import * as ol from 'openlayers';
import axios, { AxiosResponse } from 'axios';
import * as jsts from 'jsts';
import proj4 from 'proj4';
import  { Feature }  from './types/Feature';

const wktFormat: ol.format.WKT = new ol.format.WKT();

function getPropsKey(eventName) {
    return 'on' + eventName
            .replace(/(\:[a-z])/g, $1 => $1.toUpperCase())
            .replace(/^[a-z]/, $1 => $1.toUpperCase())
            .replace(':', '')
}

function getEvents(events: any = {}, props: any = {}): any {
    let prop2EventMap: any = {};
    for (let key in events) {
        prop2EventMap[getPropsKey(key)] = key;
    }

    let ret = {};
    for (let propName in props) {
        let eventName = prop2EventMap[propName];
        let prop = props[propName];
        if (typeof prop !== 'undefined' && propName.match(/^on[A-Z]/) && eventName) {
            ret[eventName] = prop;
        }
    }

    return ret;
}

let typeOf = function (obj) {
    return ({}).toString.call(obj)
        .match(/\s([a-zA-Z]+)/)[1].toLowerCase();
};
function cloneObject(obj) {
    var type = typeOf(obj);
    if (type == 'object' || type == 'array') {
        if (obj.clone) {
            return obj.clone();
        }
        var clone = type == 'array' ? [] : {};
        for (var key in obj) {
            clone[key] = cloneObject(obj[key]);
        }
        return clone;
    }
    return obj;
}

function findChild(children: any[], childType: string) {
    let found: any;
    let childrenArr = React.Children.toArray(children);
    for (let i = 0; i < childrenArr.length; i++) {
        let child: any = childrenArr[i];
        let element = this.elementIsChildType(child, childType);
        if (element) {
            found = element;
            break;
        }
    }
    return found;
}

function elementIsChildType(elem: any, childType: string) {
    let element: any;
    if (elem && elem.type.name == childType) {
        element = elem
    }
    return element;
}

function formatFilters(cqlFilter) {
    let filters = [];

    cqlFilter.forEach((filter) => {
        if (filter.conjunction) {
            let conjunctionFilters = [];
            filter.filters.forEach((conjunctionFilter) => {
                if (Array.isArray(conjunctionFilter)) {
                    conjunctionFilters = conjunctionFilters.concat(formatFilters(conjunctionFilter));
                } else if (conjunctionFilter.conjunction) {
                    conjunctionFilters = conjunctionFilters.concat(formatFilters([conjunctionFilter]));
                } else {
                    conjunctionFilters.push(ol.format.filter[conjunctionFilter.condition](conjunctionFilter.column, conjunctionFilter.value));
                }
            });

            filters.push(ol.format.filter[filter.conjunction](...conjunctionFilters));
        } else {
            filters.push(ol.format.filter[filter.condition](filter.column, filter.value));
        }
    });

    return filters;
}

function buildFilter(options) {

    let filters = [];
    if (options.cqlFilter) {
        filters = filters.concat(formatFilters(options.cqlFilter));
    }

    if (options.bbox) {
        filters.push(ol.format.filter.bbox('geometry', options.bbox, options.srsName));
    }

    if (filters.length > 1) {
        return ol.format.filter.and(...filters);
    } else {
        return filters[0];
    }
}

function buildWMSFilter(activeCqlFilter) {
    let cqlFilter = formatWMSFilters(activeCqlFilter);

    if (cqlFilter.length > 0) {
        cqlFilter = cqlFilter.join(')AND(');
        cqlFilter = `(${cqlFilter})`;
    }

    return cqlFilter;
}

function formatWMSFilters(activeCqlFilter) {
    return activeCqlFilter.map((cqlFilter) => {
        if (cqlFilter.conjunction) {
            let filterResult = cqlFilter.filters.map((filter) => {
                if (Array.isArray(filter)) {
                    return formatWMSFilters(filter);
                } else {
                    return olConditionMapping(filter);
                }
            });
            filterResult = filterResult.join(`)${cqlFilter.conjunction}(`);
            return `(${filterResult})`;
        } else {
            return olConditionMapping(cqlFilter);
        }
    });
}


const olConditionMapping = (filter) => {
    let value = null;
    if (!isNaN(filter.value) && isFinite(filter.value)) {
        value = filter.value;
    } else {
        value = filter.value.replace(/\*/g, '');
    }

    switch (filter.condition) {
        case "equalTo":
            return `${filter.column}='${value}'`;
        case "like":
            return `${filter.column} like '%${value}%'`;
        case "ilike":
            return `${filter.column} ilike '%${value}%'`;
        case "isNull":
            return `${filter.column} IS NULL`;
    }

    throw new Error(`filter condition ${filter.condition} not configured`);
};

const olConditionCheckFeature = (feature, filter) => {
    switch (filter.condition) {
        case "equalTo":
        case "like":
        case "ilike":
            return feature.get(filter.column) == filter.value;
        case "not":
            return feature.get(filter.column) != filter.value;
    }

    return false;
};

const olConditionCheck = (feature, cqlFilters) => {
    let validates = true;

    for (let x = 0; x < cqlFilters.length; x++) {
        const cqlFilter = cqlFilters[x];

        if (cqlFilter.conjunction) {
            let innerValidates = false;
            for (let y = 0; y < cqlFilter.filters.length; y++) {
                const filter = cqlFilter.filters[y];
                const passed = olConditionCheckFeature(feature, filter);
                if (!passed && cqlFilter.conjunction == "and") {
                    innerValidates = false;
                    break;
                } else if (passed && cqlFilter.conjunction == "or") {
                    innerValidates = true;
                    break;
                }
            }
            validates = innerValidates;

        } else {
            validates = olConditionCheckFeature(feature, cqlFilter);
            if (!validates) {
                break;
            }
        }
    }

    return validates;
};

/**
 * Create a WFS GetFeature query with a BBOX filter, to be sent
 * as body of an HTTP POST request.
 * @param {Object} options Options.
 *   Must contain "featureNS", "geometryPropertyName", "featureType",
 *   "srsName" and "bbox".
 * @return {Element} The GetFeatureRequest as an XML element.
 */
function buildWFSGetFeatureRequestElement(options) {
    var wfsFormat = new ol.format.WFS();

    var getFeatureOptions = {
        featurePrefix: "ns",
        featureNS: options.featureNS,
        geometryName: options.geometryPropertyName,
        featureTypes: [options.featureType],
        srsName: options.srsName,
        outputFormat: 'application/json',
        filter: null,
        propertyNames: []
    };

    if (options.propertyNames) {
        getFeatureOptions.propertyNames = options.propertyNames;
    }

    getFeatureOptions.filter = buildFilter(options);


    return wfsFormat.writeGetFeature(getFeatureOptions);
}


/**
 * Create a WFS transaction query, to be sent
 * as body of an HTTP POST request.
 * @param {Object} options Options.
 *   Must contain "featureNS", "geometryPropertyName", "featureType",
 *   "srsName" and "bbox".
 *
 * @param {array} features [Feature].
 *   One or more features to be send in same transction
 * @return {Element} The GetFeatureRequest as an XML element.
 */
function buildWFSFeaturesTransaction(options, insertFeatures: Feature[], updateFeatures: Feature[], deleteFeatures: Feature[]) {
    const wfsFormat = new ol.format.WFS();

    const wktWriter = new jsts.io.WKTWriter();
    const wktReader = new jsts.io.WKTReader();

    let updateMapFeatures: ol.Feature[] = [];
    let insertMapFeatures: ol.Feature[] = [];
    let deleteMapFeatures: ol.Feature[] = [];

    if (updateFeatures) {
        updateMapFeatures = updateFeatures.map(function (feature) {
            let geom = wktReader.read(feature.getGeometry());
            if (!geom.isValid()) {
                geom = geom.buffer(-0.000000001).buffer(0.000000001);
                feature.setGeometry(wktWriter.write(geom));
            }

            return feature.getMapFeature();
        });
    }

    if (insertFeatures) {
        insertMapFeatures = insertFeatures.map((f: Feature) => f.getMapFeature());
    }

    if (deleteFeatures) {
        deleteMapFeatures = deleteFeatures.map((f: Feature) => f.getMapFeature());
    }

    let formatGML = {
        featurePrefix: "ns",
        featureNS: options.featureNS,
        featureType: options.featureType,
        srsName: options.srsName,
        nativeElements: null
    };

    return wfsFormat.writeTransaction(insertMapFeatures, updateMapFeatures, deleteMapFeatures, formatGML);
}

let currentRequests = [];

function stopRequestWFS(requestId) {
    if (requestId && currentRequests[requestId]) {
        currentRequests[requestId]();
        currentRequests[requestId] = null;
    }
}

function sendTransaction(requestElement: Node, url: string) {
    const wfsFormat = new ol.format.WFS();

    const options = {
        service: 'WFS',
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        data: new XMLSerializer().serializeToString(
            requestElement
        ),
        url: url
    };

    return axios(options).then((response: AxiosResponse<any>) => {
        if (response.data) {
            const result = wfsFormat.readTransactionResponse(response.data);

            return result;
        } else {
            return null;
        }
    });

}

function loadGeoJSON(url: string, projection?: string, requestId = null) {

    const geojsonFormat = new ol.format.GeoJSON({
        featureProjection: projection ? projection : "EPSG:3857",
        defaultDataProjection: "EPSG:4326"
    });

    // cancel previous request if exists
    if (requestId && currentRequests[requestId]) {
        currentRequests[requestId]();
        currentRequests[requestId] = null;
    }

    const options = {
        method: 'GET',
        url: url
    };

    if (requestId) {
        const CancelToken = axios.CancelToken;
        options["cancelToken"] = new CancelToken(function executor(c) {
            // An executor function receives a cancel function as a parameter
            currentRequests[requestId] = c;
        })
    }

    return axios(options).then((response: AxiosResponse<any>) => {
        if (requestId) {
            currentRequests[requestId] = null;
        }
        let innerFeatures = [];

        if (response.status == 200 && response.data.features) {
            const features = geojsonFormat.readFeatures(response.data);
            innerFeatures = features.map((f) => new Feature(f, projection || "EPSG:3857"));
        }

        return innerFeatures;
    });

}

function requestWFS(requestElement: Node, url: string, returnFeatures = false, requestId = null) {
    const geojsonFormat = new ol.format.GeoJSON();

    // cancel previous request if exists
    if (requestId && currentRequests[requestId]) {
        currentRequests[requestId]();
        currentRequests[requestId] = null;
    }

    const options = {
        service: 'WFS',
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        data: new XMLSerializer().serializeToString(
            requestElement
        ),
        url: url
    };


    if (requestId) {
        const CancelToken = axios.CancelToken;
        options["cancelToken"] = new CancelToken(function executor(c) {
            // An executor function receives a cancel function as a parameter
            currentRequests[requestId] = c;
        })
    }

    return axios(options).then((response: AxiosResponse<any>) => {
        if (requestId) {
            currentRequests[requestId] = null;
        }

        let resp = response.data;

        // calculate bbox if not defined
        if (!resp.bbox && resp.features.length > 0 && resp.features[0].properties.bbox) {
            let extent = resp.features[0].properties.bbox;
            for (var x = resp.features.length - 1; x >= 1; x--) {
                if (resp.features[x].properties.bbox) {
                    extent = ol.extent.extend(extent, resp.features[x].properties.bbox);
                }
            }

            resp.bbox = extent;
        }

        if (returnFeatures && resp) {
            const features = geojsonFormat.readFeatures(resp);
            const innerFeatures = features.map((f) => new Feature(f));

            resp.features = innerFeatures;
            return resp;
        } else {
            resp.features = [];
        }

        return resp;
    });
}


function requestWFSProperties(requestElement: Node, url: string) {
    const options = {
        service: 'WFS',
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        data: new XMLSerializer().serializeToString(
            requestElement
        ),
        url: url
    };

    return axios(options).then((response: AxiosResponse<any>) => {
        let resp = response.data;

        // calculate bbox if not defined
        if (!resp.bbox && resp.features.length > 0 && resp.features[0].properties.bbox) {
            let extent = resp.features[0].properties.bbox;
            for (var x = resp.features.length - 1; x >= 1; x--) {
                if (resp.features[x].properties.bbox) {
                    extent = ol.extent.extend(extent, resp.features[x].properties.bbox);
                }
            }

            resp.bbox = extent;
        }


        delete resp.features;
        return resp;
    });
}

function sortByArea(a, b) {
    const jtsParser = new jsts.io.OL3Parser();
    const geomA = jtsParser.read(a.getGeometry());
    const geomB = jtsParser.read(b.getGeometry());


    if (geomA.getArea() > geomB.getArea())
        return -1;
    if (geomA.getArea() < geomB.getArea())
        return 1;
    return 0;
}

function unionFeatures(features: Feature[]) {
    if (features.length == 0) {
        return null;
    }

    if (features.length == 1) {
        return features[0];
    }

    const wktWriter = new jsts.io.WKTWriter();
    const wktReader = new jsts.io.WKTReader();

    let onlyPolygons = [];

    for (let x = 0; x < features.length; x++) {
        let polygons = getPolygonsFromCollection(wktReader.read(features[x].getGeometry()));
        onlyPolygons = onlyPolygons.concat(polygons);
    }

    let unionGeom = onlyPolygons[0];

    for (let x = 1; x < onlyPolygons.length; x++) {
        unionGeom = unionGeom.union(onlyPolygons[x]);
    }

    let resultFeature = new Feature();
    resultFeature.setGeometry(wktWriter.write(unionGeom));

    return resultFeature;
}

function getPolygonsFromCollection(geometry) {
    let onlyPolygons = [];
    if (geometry.getGeometryType() === "GeometryCollection") {

        let x = 0;
        while (geometry.getGeometryN(x)) {
            if (geometry.getGeometryN(x).getGeometryType().indexOf("Polygon") !== -1) {
                let polygon = geometry.getGeometryN(x);
                if (!polygon.isValid()) {
                    polygon = polygon.buffer(-0.000000001).buffer(0.000000001);
                    if (!polygon.isValid()) {
                        polygon = polygon.buffer(-0.00001).buffer(0.00001);
                    }
                }
                onlyPolygons.push(polygon);
            }
            x++;
        }

    } else if (geometry.getGeometryType().indexOf("Polygon") !== -1) {

        if (!geometry.isValid()) {
            geometry = geometry.buffer(-0.000000001).buffer(0.000000001);
            if (!geometry.isValid()) {
                geometry = geometry.buffer(-0.00001).buffer(0.00001);
            }
        }

        onlyPolygons.push(geometry);
    }

    return onlyPolygons;
}

function cutPolygonWithPolyon(originPolygon: Feature, obstaclePolygon: Feature) {
    const wktWriter = new jsts.io.WKTWriter();
    const wktReader = new jsts.io.WKTReader();

    let geomA = wktReader.read(originPolygon.getGeometry());
    let geomB = wktReader.read(obstaclePolygon.getGeometry());

    if (geomA.intersects(geomB)) {
        if (!geomA.isValid()) {
            geomA = geomA.buffer(-0.000000001).buffer(0.000000001);
        }

        if (!geomB.isValid()) {
            geomB = geomB.buffer(-0.000000001).buffer(0.000000001);
        }

        const difference = geomA.difference(geomB);
        const resultGeometry = wktWriter.write(difference);

        originPolygon.setGeometry(resultGeometry);
    }
    return originPolygon;
}


function cutPolygonWithLine(polygon: Feature, line: Feature) {

    const wktWriter = new jsts.io.WKTWriter();
    const wktReader = new jsts.io.WKTReader();

    let geomA = wktReader.read(line.getGeometry());
    let geomB = wktReader.read(polygon.getGeometry());
    if (!geomB.isValid()) {
        geomB = geomB.buffer(-0.000000001).buffer(0.000000001);
        if (!geomB.isValid()) {
            geomB = geomB.buffer(-0.00001).buffer(0.00001);
        }
    }

    let polygonGeometries = [];
    if (geomB.getGeometryType() === 'MultiPolygon') {
        let i = 0;
        while (geomB.getGeometryN(i)) {
            polygonGeometries.push(geomB.getGeometryN(i));
            i++;
        }
    } else {
        polygonGeometries.push(geomB);
    }

    let cutGeometries = [];

    polygonGeometries.forEach(function (poly) {
        if (!poly.isValid()) {
            poly = poly.buffer(-0.000000001).buffer(0.000000001);
            if (!poly.isValid()) {
                poly = poly.buffer(-0.00001).buffer(0.00001);
            }
        }

        let union = poly.getExteriorRing().union(geomA);

        const polygonizer = new jsts.operation.polygonize.Polygonizer();
        polygonizer.add(union);


        let polygons = polygonizer.getPolygons();
        let onlyPolygons = [];

        for (let i = polygons.iterator(); i.hasNext();) {
            const polygon = i.next();


            if (polygon.getGeometryType() === "GeometryCollection") {

                let x = 0;
                while (polygon.getGeometryN(x)) {
                    if (polygon.getGeometryN(x).getGeometryType().indexOf("Polygon") !== -1) {
                        onlyPolygons.push(polygon.getGeometryN(x));
                    }
                    x++;
                }

            } else if (polygon.getGeometryType().indexOf("Polygon") !== -1) {
                onlyPolygons.push(polygon);
            }

        }

        for (let i = 0; i < onlyPolygons.length; i++) {
            const polygon = onlyPolygons[i];
            const intersection = geomB.intersection(polygon);
            const areaDifference = polygon.getArea() - intersection.getArea();
            if (areaDifference < 10 && areaDifference > -10) {
                cutGeometries.push(wktWriter.write(intersection));
            } else if (geomB.contains(intersection.buffer(-0.5))) {
                cutGeometries.push(wktWriter.write(intersection));
            }
        }
    });

    let newFeatures = [];
    cutGeometries.forEach(function (wkt) {
        let feature = new Feature();
        feature.setGeometry(wkt);
        newFeatures.push(feature);
    });

    return newFeatures;
}

function transformExtent(extent: [number, number, number, number], from: string, to: string) {
    return ol.proj.transformExtent(extent, from, to);
}

function transformCoordinate(coordinate: [number, number], from: string, to: string) {
    return ol.proj.transform(coordinate, from, to);
}

function transformWKT(wkt: string, from: string, to: string) {
    const feature = wktFormat.readFeature(wkt);
    feature.getGeometry().transform(from, to);
    return wktFormat.writeGeometry(feature.getGeometry());
}

function createExtentFromLonLat(x:number, y:number, radiusMeters:number): [number,number,number,number] {
    let extent = new ol.geom.Circle(proj4("EPSG:4326", "EPSG:3857", [y, x]), radiusMeters).getExtent();

    const min = proj4("EPSG:3857", "EPSG:4326", [extent[0], extent[1]]);
    const max = proj4("EPSG:3857", "EPSG:4326", [extent[2], extent[3]]);

    return [min[1], min[0], max[1], max[0]];
}

/**
 * @component
 * Util class
 */
export class Util {
    static getOptions = (props: any): any => {
        let options: any = {};
        for (let key in props) {
            if (
                key !== 'children'
                && typeof props[key] !== 'undefined' //exclude undefined ones
                && !key.match(/^on[A-Z]/)     //exclude events
            ) {
                options[key] = props[key];
            }
        }
        return options;
    };

    static getEvents = getEvents;
    static cloneObject = cloneObject;
    static findChild = findChild;
    static elementIsChildType = elementIsChildType;
    static buildWFSGetFeatureRequestElement = buildWFSGetFeatureRequestElement;
    static buildWFSFeaturesTransaction = buildWFSFeaturesTransaction;
    static requestWFS = requestWFS;
    static sendTransaction = sendTransaction;
    static stopRequestWFS = stopRequestWFS;
    static requestWFSProperties = requestWFSProperties;
    static cutPolygonWithLine = cutPolygonWithLine;
    static cutPolygonWithPolyon = cutPolygonWithPolyon;
    static unionFeatures = unionFeatures;
    static transformExtent = transformExtent;
    static transformCoordinate = transformCoordinate;
    static olConditionCheck = olConditionCheck;
    static buildWMSFilter = buildWMSFilter;
    static loadGeoJSON = loadGeoJSON;
    static transformWKT = transformWKT;
    static createExtentFromLonLat = createExtentFromLonLat;
}

export const getOptions = ((props: any): any => {
    return Util.getOptions(props);
});
