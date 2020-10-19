import {Tile} from './tile';
import {Vector} from './vector';
import {Cluster} from './cluster';
import {Cluster as ClusterV2} from './cluster-v2';
import {Layers} from './layers';
import {Heatmap} from './heatmap';
import {ImageLayer as Image} from './image';
import {VectorTile} from './vector-tile';
import {VectorTilePlain} from './vector-tile-plain';
import {WmsTile} from './wms-tile';
import {OSM} from './osm';

let layer = {
  Tile: Tile,
  Vector: Vector,
  Cluster: Cluster,
  ClusterV2: ClusterV2,
  Heatmap: Heatmap,
  Image: Image,
  VectorTile: VectorTile,
  VectorTilePlain: VectorTilePlain,
  WmsTile: WmsTile,
  OSM: OSM,
};

export {
  Layers,
  layer,
  Heatmap,
  Image,
  VectorTile,
  WmsTile
};