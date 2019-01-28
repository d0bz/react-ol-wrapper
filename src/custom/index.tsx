import {Popup} from './popup';
import {ClusterStyle} from './style/cluster-style';
import {GeoCoderControl} from './control/geo-coder-control';
import {GeoCoderComponent} from './control/geo-coder-component';

let custom = {
  style: {
    ClusterStyle: ClusterStyle
  },
  control: {
    GeoCoderControl: GeoCoderControl,
    GeoCoderComponent: GeoCoderComponent
  },
  Popup: Popup
};

export {custom};

