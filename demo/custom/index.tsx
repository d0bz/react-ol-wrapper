import * as React from 'react';
import {Link} from 'react-router';

export {EarthquakeClusters} from './earthquake-clusters';
export {MarkerStyle} from './marker-style';
export {ComplexDemo} from './complex-demo';

export class Custom extends React.Component<any, any> {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <h1>Customized Examples</h1>
        <ul role="nav" className="group-menu">
          <li><Link to="custom/earthquake-clusters">Earthquake Clusters</Link></li>
          <li><Link to="custom/marker-style">Marker Style</Link></li>
          <li><Link to="custom/complex-demo">ComplexDemo</Link></li>
        </ul>

        <div className="contents">
          {this.props.children}
        </div>
      </div>
    );
  }
}
