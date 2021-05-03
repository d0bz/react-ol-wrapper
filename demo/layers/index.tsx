import * as React from 'react';
import { Link } from 'react-router';

export { Tile } from './tile';
export { Google } from './google';
export { TileOsm } from './tile-osm';
export { WmsTile } from './wms-tile';
export { Vector } from './vector';
export { Cluster } from './cluster';
export { Heatmap } from './heatmap';
export { Image } from './image';
export { VectorTile } from './vector-tile';
export { VectorTile2 } from './vector-tile-2';
export { OSMVectorTiles } from './osm-vector-tiles';

export class Layers extends React.Component<any, any> {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div>
                <h1>Controls</h1>
                <ul role="nav" className="group-menu">
                    <li><Link to="layers/tile">Tile</Link></li>
                    <li><Link to="layers/Google">Google</Link></li>
                    <li><Link to="layers/tileosm">TileOsm</Link></li>
                    <li><Link to="layers/wms-tile">WMS</Link></li>
                    <li><Link to="layers/vector">Vector</Link></li>
                    <li><Link to="layers/vector-tile">Vector Tile</Link></li>
                    <li><Link to="layers/osm-vector-tiles">OSM Vector Tiles</Link></li>
                    <li><Link to="layers/heatmap">Heatmap</Link></li>
                    <li><Link to="layers/image">Image</Link></li>
                    <li><Link to="layers/cluster">Cluster</Link></li>
                </ul>
                <div className="contents">
                    {this.props.children}
                </div>
            </div>
        );
    }
}