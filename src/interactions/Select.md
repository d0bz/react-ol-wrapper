Example usage: draw polygon, modify activates, on feature select modify deactivates and draw activates again

```js
const GeoMapCore = require('../index');
const Map = GeoMapCore.Map;
const Layers = GeoMapCore.Layers;
const layer = GeoMapCore.layer;
const Util = GeoMapCore.Util;
const type = GeoMapCore.type;
const Controls = GeoMapCore.Controls;
const Interactions = GeoMapCore.Interactions;
const interaction = GeoMapCore.interaction;

let coordinates = [24.761769696908118,59.43256023120438];
let extent = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 100);

let interactionType = "Polygon";

initialState = { features: [], selectedFeatures: [] }

let selectFeature = (f) => {
	if(state.selectedFeatures.filter((feature) => feature.getId() === f.getId()).length > 0){
		setState({selectedFeatures: []});
	}else{
        setState({selectedFeatures: [f]});
	}
};

let modifyEnd = (f) => {
	for(let i = 0; i < state.features.length; i++){
	    if(state.features[i].getId() === f.getId()){
            state.features[i] = f;
	    	break;
        }	
	}	
	
	setState({
		features: state.features
	})
};

;<div>
    <Map extent={extent}>
        <Layers>
            <layer.OSM/>
            <layer.Vector features={state.features}/>
        </Layers>
        <Interactions>
            { state.selectedFeatures.length == 0 && 
            <interaction.Draw
                drawend={(f) => setState({
                	features: [...state.features, f], 
                	selectedFeatures: [f]
                })}
                type={interactionType}/>
            }
                
            <interaction.Select 
                active={true} 
                selectedFeatures={state.selectedFeatures} 
                onSelected={(f) => selectFeature(f)} 
                features={state.features}/>
                
            <interaction.Modify 
                features={state.selectedFeatures} 
                modifyend={(f) => { modifyEnd(f) }}/>
        </Interactions>
    </Map>

</div>

```