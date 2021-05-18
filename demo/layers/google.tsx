import * as React from 'react';
import { control, Controls, layer, Layers, Map } from 'react-ol';

export class Google extends React.Component<any, any> {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div>
				<Map view={{
					projection: 'EPSG:3301'
				}}
					 extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}
				>
					<Layers>
						<layer.Google type='satellite' properties={{ attributions: 'Google maps' }} />
					</Layers>
					<Controls attribution={true} zoom={true}>
						<control.Attribution collapsible={false} collapsed={false}/>
					</Controls>
				</Map>
				<pre>{`
        <Map view={{
                    projection: "EPSG:3301"
                }}
                     extent={[22.883216612644446, 57.80457411797305, 27.750159972019446, 59.685116344414965]}
                >
          <Layers>
			<layer.Google type='satellite' />
		   </Layers>
          
	      <Controls attribution={true} zoom={true}>
		      <control.Attribution collapsible={false} collapsed={false}/>
		  </Controls>
        </Map>
        `}</pre>
			</div>
		);
	}
}