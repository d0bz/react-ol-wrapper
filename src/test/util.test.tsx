import React from 'react';
import { shallow, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

import proj4 from 'proj4';
import * as ol from 'openlayers';

import { Util } from '../util';

configure({ adapter: new Adapter() });
proj4.defs("EPSG:3301", "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
ol.proj.setProj4(proj4);

test('util coordinate transform', async() => {
    const roundDecimal = 1000000;
    const initialCoordinates: [number, number] = [21.20456848088, 57.2662064396];
    let transformedCoordinates = Util.transformCoordinate(initialCoordinates, 'EPSG:4326', 'EPSG:3301');
    expect(transformedCoordinates[0]).toBe(331340.81417644);
    expect(transformedCoordinates[1]).toBe(6350518.156314986);

    let restoredCoordinates = Util.transformCoordinate(transformedCoordinates, 'EPSG:3301', 'EPSG:4326');
    expect(Math.round(restoredCoordinates[0]*roundDecimal)/roundDecimal).toBe(Math.round(initialCoordinates[0]*roundDecimal)/roundDecimal);
    expect(Math.round(restoredCoordinates[1]*roundDecimal)/roundDecimal).toBe(Math.round(initialCoordinates[1]*roundDecimal)/roundDecimal);

});
