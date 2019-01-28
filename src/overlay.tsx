import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import {Util} from './util';
import { MapView } from './map';


export class Overlay extends React.Component<any, any> {

  overlay: ol.Overlay;
  el: HTMLElement;

  options: any = {
    id: undefined,
    element: undefined,
    offset: undefined,
    position: undefined,
    stopEvent: undefined,
    insertFirst: undefined,
    autoPan: undefined,
    autoPanAnimation: undefined,
    autoPanMargin: undefined
  };

  events: any = {
    'change': undefined,
    'change:element': undefined,
    'change:map': undefined,
    'change:offset': undefined,
    'change:position': undefined,
    'change:positioning': undefined,
    'propertychange': undefined
  };

  render() {
    return (
      <div>
        {this.props.children}
      </div>
    );
  }

  componentDidMount () {
    let options = Util.getOptions( Object['assign'](this.options, this.props));
    this.overlay = new ol.Overlay(options);
    this.context.mapComp.overlays.push(this.overlay);
  }

  static contextTypes: React.ValidationMap<any> = {
    mapComp: PropTypes.instanceOf(MapView),
    map: PropTypes.instanceOf(ol.Map)
  };
}