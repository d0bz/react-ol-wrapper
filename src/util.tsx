import * as React from 'react';
import { forOwn, isEmpty } from 'lodash';
import WKT from 'ol/format/WKT';
import { Feature as OlFeature } from 'ol';
import { Polygon, Circle, Point, LineString, LinearRing, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection, GeometryType } from 'ol/geom';
import { circular, fromExtent } from 'ol/geom/Polygon';
import { extend, createOrUpdateFromCoordinates, extendCoordinates, containsCoordinate, containsExtent } from 'ol/extent';
import { transformExtent as olTransformExtent, transform } from 'ol/proj';
import * as olFilter from 'ol/format/filter';
import WFS from 'ol/format/WFS';
import GeoJSON from 'ol/format/GeoJSON';
import axios, { AxiosResponse } from 'axios';
import * as jsts from 'jsts';
import { Feature } from './types/Feature';

const wktFormat: WKT = new WKT();


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

const INCHES_PER_UNIT = {
	'm': 39.37,
	'dd': 4374754
};

const DOTS_PER_INCH = 72;

/**
 * @param {number} resolution Resolution.
 * @param {string} units Units
 * @return {number} Scale
 */
function getScaleFromResolution(resolution: number, units: string) {
	return INCHES_PER_UNIT[units] * DOTS_PER_INCH * resolution;
}

function getResolutionForScale(scale: number, units: string) {
	return (scale / (INCHES_PER_UNIT[units] * DOTS_PER_INCH));
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

	if (elem && elem.props.type == childType) {
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
					conjunctionFilters.push(formatFilters([conjunctionFilter])[0]);
				}
			});

			filters.push(olFilter[filter.conjunction](...conjunctionFilters));
		} else {
			if (filter.condition === 'not') {
				if (!filter.value) {
					filters.push(olFilter.not(olFilter.isNull(filter.column)));
				} else if (!isNaN(filter.value)) {
					filters.push(olFilter.not(olFilter.equalTo(filter.column, filter.value)));
				} else {
					filters.push(olFilter.not(olFilter.like(filter.column, filter.value)));
				}
			} else {
				filters.push(olFilter[filter.condition](filter.column, filter.value));
			}
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
		filters.push(olFilter.bbox('geometry', options.bbox, options.srsName));
	}

	if (filters.length > 1) {
		return olFilter.and(...filters);
	} else {
		return filters[0];
	}
}

function buildWFSUrlFilter(options) {
	let cqlFilters = options.cqlFilter || [];
	let cqlFilter = formatWMSFilters(cqlFilters);

	if (options.bbox) {
		// BBOX(the_geom,19438298.842,%20-4502716.974,19702465.211,%20-4587714.950,%27EPSG:3857%27)
		cqlFilter.push(olFilter.bbox(options.geometryPropertyName || 'geometry', options.bbox, options.srsName));
	}

	let cqlFilterString = '';
	if (cqlFilter.length > 0) {
		cqlFilterString = cqlFilter.join(')AND(');
		cqlFilterString = `(${cqlFilterString})`;
	}


	return cqlFilterString;
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
				} else if (filter.conjunction) {
					return formatWMSFilters([filter]);
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

const flipCoordinates = (coordinates) => {
	const newCoordinates = [];
	for (let x = 0; x < coordinates.length; x++) {
		newCoordinates.push([coordinates[x][1], coordinates[x][0]]);
	}
	return newCoordinates;
}

const olConditionMapping = (filter) => {
	let value = null;
	if (filter.condition === 'intersects') {
		filter.value.setCoordinates([flipCoordinates(filter.value.getCoordinates()[0])]);
		return `intersects(${filter.column},${wktFormat.writeGeometry(filter.value)})`;
	} else if (!isNaN(filter.value) && isFinite(filter.value)) {
		value = filter.value;
	} else {
		value = filter.value.replace(/\*/g, '');
	}

	switch (filter.condition) {
		case 'equalTo':
			return `${filter.column}='${value}'`;
		case 'greaterThan':
			return `${filter.column}>'${value}'`;
		case 'greaterThanOrEqualTo':
			return `${filter.column}>='${value}'`;
		case 'lessThan':
			return `${filter.column}<'${value}'`;
		case 'lessThanOrEqualTo':
			return `${filter.column}<='${value}'`;
		case 'like':
			return `${filter.column} like '%${value}%'`;
		case 'ilike':
			return `${filter.column} ilike '%${value}%'`;
		case 'isNull':
			return `${filter.column} IS NULL`;
		case 'not':
			if (!value) {
				return `${filter.column} IS NOT NULL`;
			}
			return `${filter.column} NOT like '${value}'`;

	}

	throw new Error(`filter condition ${filter.condition} not configured`);
};

const olConditionCheckFeature = (feature, filter) => {
	switch (filter.condition) {
		case 'equalTo':
		case 'like':
		case 'ilike':
			return feature.get(filter.column) == filter.value;
		case 'not':
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
				if (!passed && cqlFilter.conjunction == 'and') {
					innerValidates = false;
					break;
				} else if (passed && cqlFilter.conjunction == 'or') {
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
	var wfsFormat = new WFS();

	var getFeatureOptions = {
		featurePrefix: 'ns',
		featureNS: options.featureNS,
		geometryName: options.geometryPropertyName,
		featureTypes: [options.featureType],
		srsName: options.srsName,
		outputFormat: options.outputFormat || 'application/json',
		filter: null,
		propertyNames: [],
		startIndex: null,
		maxFeatures: null,
	};

	if (options.propertyNames) {
		getFeatureOptions.propertyNames = options.propertyNames;
	}

	if (options.maxFeatures) {
		getFeatureOptions.maxFeatures = options.maxFeatures;
	} else {
		delete getFeatureOptions.maxFeatures;
	}

	if (options.startIndex) {
		getFeatureOptions.startIndex = options.startIndex;
	} else {
		delete getFeatureOptions.startIndex;
	}

	getFeatureOptions.filter = buildFilter(options);

	let featureRequest = wfsFormat.writeGetFeature(getFeatureOptions);

	if (options.sortBy) {
		const OGCNS = 'http://www.opengis.net/ogc';
		const DOCUMENT = document.implementation.createDocument(null, null, null);

		let sortByNode = DOCUMENT.createElementNS(OGCNS, 'SortBy');
		let sortPropertyNode = DOCUMENT.createElementNS(OGCNS, 'SortProperty');
		let propertyNameNode = DOCUMENT.createElementNS(OGCNS, 'PropertyName');
		propertyNameNode.textContent = options.sortBy;
		let sortOrderNode = DOCUMENT.createElementNS(OGCNS, 'SortOrder');
		sortOrderNode.textContent = options.sortDirection ? options.sortDirection : 'ASC';

		sortPropertyNode.appendChild(propertyNameNode);
		sortPropertyNode.appendChild(sortOrderNode);
		sortByNode.appendChild(sortPropertyNode);
		featureRequest.firstChild.appendChild(sortByNode);
	}

	return featureRequest;
}


/**
 * Create a WFS GetFeature query with filter, to be sent
 * as url parameters of an HTTP GET request.
 * @param {Object} options Options.
 *   Must contain "featureNS", "geometryPropertyName", "featureType",
 *   "srsName" and "bbox".
 * @return {String} The GetFeatureRequest as an url string.
 */
function buildWFSGetFeatureRequestUrl(options) {
	const typeName = `${options.featureNS}${options.featureNS ? ':' : ''}${options.featureType}`;
	const getFeatureOptions = {
		service: 'WFS',
		typeName: typeName.trim(),
		geometryName: options.geometryPropertyName || 'geometry',
		srsName: options.srsName,
		outputFormat: options.outputFormat || 'application/json',
		CQL_FILTER: null,
		propertyName: '',
		startIndex: null,
		count: null,
		sortBy: null,
		version: '2.0.0',
		viewparams: options.viewparams,
		env: options.env,
	};

	if (options.propertyNames) {
		getFeatureOptions.propertyName = options.propertyNames.join(',');
	}

	if (options.maxFeatures) {
		getFeatureOptions.count = options.maxFeatures.toString();
	} else {
		delete getFeatureOptions.count;
	}

	if (options.startIndex) {
		getFeatureOptions.startIndex = options.startIndex.toString();
	} else {
		delete getFeatureOptions.startIndex;
	}

	getFeatureOptions.CQL_FILTER = buildWFSUrlFilter(options);

	if (options.sortBy) {
		getFeatureOptions.sortBy = `${options.sortBy} ${options.sortDirection === 'DESC' ? 'D' : 'A'}`;
	} else {
		delete getFeatureOptions.sortBy;
	}

	const url = [];
	forOwn(getFeatureOptions, (value, key) => {
		if (!isEmpty(value)) {
			url.push(`${key}=${value}`);
		}
	});

	return url.join('&');
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
	const wfsFormat = new WFS();

	const wktWriter = new jsts.io.WKTWriter();
	const wktReader = new jsts.io.WKTReader();

	let updateMapFeatures: OlFeature[] = [];
	let insertMapFeatures: OlFeature[] = [];
	let deleteMapFeatures: OlFeature[] = [];

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
		featurePrefix: 'ns',
		featureNS: options.featureNS,
		featureType: options.featureType,
		srsName: options.srsName,
		nativeElements: null
	};

	return wfsFormat.writeTransaction(insertMapFeatures, updateMapFeatures, deleteMapFeatures, formatGML);
}

let currentRequests = [];

function stopRequestWFS(requestId, callback = null) {
	if (requestId && currentRequests[requestId]) {
		currentRequests[requestId]();
		currentRequests[requestId] = null;

		if (callback) {
			setTimeout(callback, 10);
		}
	} else {
		if (callback) {
			callback();
		}
	}
}

function sendTransaction(requestElement: Node, url: string) {
	const wfsFormat = new WFS();

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

			if (!result.transactionSummary) {
				const xmlParser = new DOMParser();

				let doc = xmlParser.parseFromString(response.data, 'text/xml')
				if (response.data && !doc.querySelector('parsererror')) {
					const tag = doc.getElementsByTagName('ows:ExceptionText');
					if (tag.length > 0) {
						throw new Error(tag[0].innerHTML);
					}
				}
			}

			return result;
		} else {
			return null;
		}
	});

}

function loadGeoJSON(url: string, projection?: string, requestId = null) {

	const geojsonFormat = new GeoJSON({
		featureProjection: projection ? projection : 'EPSG:3857',
		defaultDataProjection: 'EPSG:4326'
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
		options['cancelToken'] = new CancelToken(function executor(c) {
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
			innerFeatures = features.map((f) => new Feature(f, projection || 'EPSG:3857'));
		}

		return innerFeatures;
	});

}

function cancelRequestWFS(requestId: string | number) {
	// cancel previous request if exists
	if (requestId && currentRequests[requestId]) {
		currentRequests[requestId]();
		currentRequests[requestId] = null;
		return true;
	}

	return false;
}

function requestWFSContent(requestElement: Node, url: string, returnFeatures = false, requestId = null) {
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

	let srsName = 'EPSG:4326';
	try {
		let element: any = requestElement;
		let query: any = element.getElementsByTagName('Query')[0];
		srsName = query.getAttribute('srsName');
	} catch (e) {
	}

	if (requestId) {
		const CancelToken = axios.CancelToken;
		options['cancelToken'] = new CancelToken(function executor(c) {
			// An executor function receives a cancel function as a parameter
			currentRequests[requestId] = c;
		})
	}

	return axios(options).then((response: AxiosResponse<any>) => {
		if (requestId) {
			currentRequests[requestId] = null;
		}

		let resp = response.data;

		const xmlParser = new DOMParser();

		if (resp && !xmlParser.parseFromString(resp, 'text/xml').querySelector('parsererror')) {
			let doc = xmlParser.parseFromString(resp, 'text/xml');
			if (doc) {
				const tag = doc.getElementsByTagName('ows:ExceptionText');
				if (tag.length > 0) {
					throw new Error(tag[0].innerHTML);
				}
			}
		}

		return resp;
	});
}

function getQueryParam(urlParameters, param) {
	const rx = new RegExp('[?&]' + param + '=([^&]+).*$');
	const returnVal = urlParameters.match(rx);
	return returnVal === null ? '' : returnVal[1];
}

function describeFeatureType(options, requestId = null) {
	// cancel previous request if exists
	if (requestId && currentRequests[requestId]) {
		currentRequests[requestId]();
		currentRequests[requestId] = null;
	}

	const typeName = `${options.featureNS}${options.featureNS ? ':' : ''}${options.featureType}`;

	const readyUrl = `${options.url}?request=DescribeFeatureType&service=WFS&typeName=${typeName}&outputformat=application/json&version=2.0.0`;

	let requestOptions = {
		service: 'WFS',
		method: 'GET',
		headers: { 'content-type': 'application/json' },
		url: readyUrl
	};

	if (requestId) {
		const CancelToken = axios.CancelToken;
		requestOptions['cancelToken'] = new CancelToken(function executor(c) {
			// An executor function receives a cancel function as a parameter
			currentRequests[requestId] = c;
		})
	}

	return axios(requestOptions).then((response: AxiosResponse<any>) => {
		if (requestId) {
			currentRequests[requestId] = null;
		}

		let resp = response.data.featureTypes[0].properties;
		return resp;
	});
}

function requestWFS(requestElement: Node | string, url: string, returnFeatures = false, requestId = null) {
	const geojsonFormat = new GeoJSON();

	// cancel previous request if exists
	if (requestId && currentRequests[requestId]) {
		currentRequests[requestId]();
		currentRequests[requestId] = null;
	}

	let options = {};
	let srsName = 'EPSG:4326';

	if (requestElement instanceof Node) {
		options = {
			service: 'WFS',
			method: 'POST',
			headers: { 'content-type': 'application/xml' },
			data: new XMLSerializer().serializeToString(
				requestElement
			),
			url: url
		};

		try {
			let element: any = requestElement;
			let query: any = element.getElementsByTagName('Query')[0];
			srsName = query.getAttribute('srsName');
		} catch (e) {
		}
	} else {
		srsName = getQueryParam(requestElement, 'srsName');
		options = {
			method: 'GET',
			headers: { 'content-type': 'application/json' },
			url: `${url}?request=GetFeature&${requestElement}`
		};
	}

	if (requestId) {
		const CancelToken = axios.CancelToken;
		options['cancelToken'] = new CancelToken(function executor(c) {
			// An executor function receives a cancel function as a parameter
			currentRequests[requestId] = c;
		})
	}

	return axios(options).then((response: AxiosResponse<any>) => {
		if (requestId) {
			currentRequests[requestId] = null;
		}

		let resp = response.data;

		const xmlParser = new DOMParser();

		if (resp && !xmlParser.parseFromString(resp, 'text/xml').querySelector('parsererror')) {
			let doc = xmlParser.parseFromString(resp, 'text/xml');
			if (doc) {
				const tag = doc.getElementsByTagName('ows:ExceptionText');
				if (tag.length > 0) {
					throw new Error(tag[0].innerHTML);
				}
			}
		}

		// calculate bbox if not defined
		if (!resp.bbox && resp.features.length > 0 && resp.features[0].properties.bbox) {
			let extent = resp.features[0].properties.bbox.slice(0);
			for (var x = resp.features.length - 1; x >= 1; x--) {
				if (resp.features[x].properties.bbox) {
					extent = extend(extent, resp.features[x].properties.bbox);
				}
			}

			resp.bbox = extent;
		}

		if (returnFeatures && resp) {
			const features = geojsonFormat.readFeatures(resp);
			const innerFeatures = features.map((f) => new Feature(f, srsName));

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
					extent = extend(extent, resp.features[x].properties.bbox);
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
	if (geometry.getGeometryType() === 'GeometryCollection') {

		let x = 0;
		while (geometry.getGeometryN(x)) {
			if (geometry.getGeometryN(x).getGeometryType().indexOf('Polygon') !== -1) {
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

	} else if (geometry.getGeometryType().indexOf('Polygon') !== -1) {

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


			if (polygon.getGeometryType() === 'GeometryCollection') {

				let x = 0;
				while (polygon.getGeometryN(x)) {
					if (polygon.getGeometryN(x).getGeometryType().indexOf('Polygon') !== -1) {
						onlyPolygons.push(polygon.getGeometryN(x));
					}
					x++;
				}

			} else if (polygon.getGeometryType().indexOf('Polygon') !== -1) {
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
	return olTransformExtent(extent, from, to);
}

function transformCoordinate(coordinate: [number, number], from: string, to: string) {
	return transform(coordinate, from, to);
}

function transformWKT(wkt: string, from: string, to: string) {
	const feature = wktFormat.readFeature(wkt);
	feature.getGeometry().transform(from, to);
	return wktFormat.writeGeometry(feature.getGeometry());
}

function createExtentFromLonLat(x: number, y: number, radiusMeters: number): [number, number, number, number] {
	return circular([x, y], radiusMeters, 4).getExtent();
}

function createExtentFromLonLatArray(coordinates: [number, number][]): [number, number, number, number] {
	return createOrUpdateFromCoordinates(coordinates);
}

function extendExtentWithLonLatArray(extent: [number, number, number, number], coordinates: [number, number][]): [number, number, number, number] {
	return extendCoordinates(extent, coordinates);
}

function extendExtentWithExtent(extent: [number, number, number, number], extent2: [number, number, number, number]): [number, number, number, number] {
	return extend(extent, extent2);
}

function extentContainsCoordinate(extent: [number, number, number, number], coordinate: [number, number]): boolean {
	return containsCoordinate(extent, coordinate);
}

function extentContainsExtent(extent: [number, number, number, number], extent2: [number, number, number, number]): boolean {
	return containsExtent(extent, extent2);
}

function bufferExtentPercentage(extent: [number, number, number, number], percentage: number): [number, number, number, number] {
	const mercatorExtent = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
	var poly = [
		[mercatorExtent[0], mercatorExtent[3]],
		[mercatorExtent[2], mercatorExtent[3]],
		[mercatorExtent[2], mercatorExtent[1]],
		[mercatorExtent[0], mercatorExtent[1]],
		[mercatorExtent[0], mercatorExtent[3]]
	];
	var geomFactory = new jsts.geom.GeometryFactory();

	var jstsCoordinates = poly.map(function (pt) {
		return new jsts.geom.Coordinate(pt[0], pt[1]);
	});

	var radiusMeters = Math.min(mercatorExtent[2] - mercatorExtent[0], mercatorExtent[3] - mercatorExtent[1]) * (percentage / 100);

	var linearRing = geomFactory.createLinearRing(jstsCoordinates);
	var jstsPolygon = geomFactory.createPolygon(linearRing).buffer(radiusMeters);
	var newExtent: [number, number, number, number] =
		[
			jstsPolygon.getEnvelopeInternal().getMinX(),
			jstsPolygon.getEnvelopeInternal().getMinY(),
			jstsPolygon.getEnvelopeInternal().getMaxX(),
			jstsPolygon.getEnvelopeInternal().getMaxY()
		];

	return transformExtent(newExtent, 'EPSG:3857', 'EPSG:4326');
}

function bufferExtent(extent: [number, number, number, number], radiusMeters: number): [number, number, number, number] {
	const mercatorExtent = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
	var poly = [
		[mercatorExtent[0], mercatorExtent[3]],
		[mercatorExtent[2], mercatorExtent[3]],
		[mercatorExtent[2], mercatorExtent[1]],
		[mercatorExtent[0], mercatorExtent[1]],
		[mercatorExtent[0], mercatorExtent[3]]
	];
	var geomFactory = new jsts.geom.GeometryFactory();

	var jstsCoordinates = poly.map(function (pt) {
		return new jsts.geom.Coordinate(pt[0], pt[1]);
	});
	var linearRing = geomFactory.createLinearRing(jstsCoordinates);
	var jstsPolygon = geomFactory.createPolygon(linearRing).buffer(radiusMeters);
	var newExtent: [number, number, number, number] =
		[
			jstsPolygon.getEnvelopeInternal().getMinX(),
			jstsPolygon.getEnvelopeInternal().getMinY(),
			jstsPolygon.getEnvelopeInternal().getMaxX(),
			jstsPolygon.getEnvelopeInternal().getMaxY()
		];

	return transformExtent(newExtent, 'EPSG:3857', 'EPSG:4326');
}

function getPixelFromCoordinate(coordinate: [number, number]): [number, number] | null {
	const win: any = window;
	if (!win.mapInstance) {
		return null;
	}

	const transformedCoordinate = transform(coordinate, 'EPSG:4326', win.mapInstance.getView().getProjection());
	return win.mapInstance.getPixelFromCoordinate(transformedCoordinate);
}

let cqlFilter = {
	isLike: (value: string, column: string) => {
		return { value: `*${value}*`, column: column, condition: 'like' };
	},
	equalTo: (value: string, column: string) => {
		return { value: value, column: column, condition: 'equalTo' };
	},
	notEqualTo: (value: string, column: string) => {
		return { value: value, column: column, condition: 'notEqualTo' };
	},
	not: (value: string | null, column: string) => {
		return { value: value, column: column, condition: 'not' };
	},
	isNull: (column: string) => {
		return { value: '', column: column, condition: 'isNull' };
	},
	intersectsExtent: (value: [number, number, number, number], column?: string) => {
		const geom = fromExtent(value);
		return { value: geom, column: column || 'geometry', condition: 'intersects' };
	},
	intersectsFeature: (feature: Feature, proj: string = 'EPSG:4326', column?: string) => {
		const mapFeature = feature.getMapFeature(proj);
		const geom: any = mapFeature.getGeometry();
		if (geom.getFlatCoordinates().length > 8) {
			return { value: geom, column: column || 'geometry', condition: 'intersects' };
		}

		return null;
	},
	insideFeature: (feature: Feature, proj: string = 'EPSG:4326', column?: string) => {
		const mapFeature = feature.getMapFeature(proj);
		const geom: any = mapFeature.getGeometry();
		if (geom.getFlatCoordinates().length > 8) {
			return { value: geom, column: column || 'geometry', condition: 'within' };
		}

		return null;
	},
	containsFeature: (feature: Feature, proj: string = 'EPSG:4326', column?: string) => {
		const mapFeature = feature.getMapFeature(proj);
		const geom: any = mapFeature.getGeometry();
		if (geom.getFlatCoordinates().length > 8) {
			return { value: geom, column: column || 'geometry', condition: 'contains' };
		}

		return null;
	},
};


function distanceLonLatCoordinates(coordinateA: [number, number], coordinateB: [number, number], unit?: string) {
	if (!unit) {
		unit = 'K';
	}

	if ((coordinateA[0] == coordinateB[0]) && (coordinateA[1] == coordinateB[1])) {
		return 0;
	} else {
		const radlat1 = Math.PI * coordinateA[1] / 180;
		const radlat2 = Math.PI * coordinateB[1] / 180;
		const theta = coordinateA[0] - coordinateB[0];
		const radtheta = Math.PI * theta / 180;
		let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
		dist = dist * 180 / Math.PI;
		dist = dist * 60 * 1.1515;
		if (unit == 'K') {
			dist = dist * 1.609344
		}
		if (unit == 'N') {
			dist = dist * 0.8684
		}
		return dist;
	}
}

function extentCenter(extent: [number, number, number, number]): [number, number] {
	return [(extent[2] + extent[0]) / 2, (extent[3] + extent[1]) / 2];
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
	static requestWFSContent = requestWFSContent;
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
	static buildWFSUrlFilter = buildWFSUrlFilter;
	static loadGeoJSON = loadGeoJSON;
	static transformWKT = transformWKT;
	static getScaleFromResolution = getScaleFromResolution;
	static getResolutionForScale = getResolutionForScale;
	static createExtentFromLonLat = createExtentFromLonLat;
	static createExtentFromLonLatArray = createExtentFromLonLatArray;
	static distanceLonLatCoordinates = distanceLonLatCoordinates;
	static extendExtentWithLonLatArray = extendExtentWithLonLatArray;
	static extendExtentWithExtent = extendExtentWithExtent;
	static extentContainsCoordinate = extentContainsCoordinate;
	static extentContainsExtent = extentContainsExtent;
	static cqlFilter = cqlFilter;
	static getPixelFromCoordinate = getPixelFromCoordinate;
	static extentCenter = extentCenter;
	static cancelRequestWFS = cancelRequestWFS;
	static bufferExtent = bufferExtent;
	static bufferExtentPercentage = bufferExtentPercentage;
	static buildWFSGetFeatureRequestUrl = buildWFSGetFeatureRequestUrl;
	static describeFeatureType = describeFeatureType;
}

export const getOptions = ((props: any): any => {
	return Util.getOptions(props);
});
