# react-ol-wrapper

wrapper of [OpenLayers 4+](https://openlayers.org/)
written in [TypeScript](https://www.typescriptlang.org/)
forked from [react-openlayers](https://github.com/allenhwkim/react-openlayers)

## Install

    npm install react-ol-wrapper --save-dev
        
## Usage

Run command to view component documentation

    npm run doc 

To use component in your application import necessary uses

    import {
      interaction, layer, custom, control, //name spaces
      Interactions, Overlays, Controls,     //group
      Map, Layers, Overlay, Util    //objects
    } from "react-ol-wrapper";

Example
```
    <Map view={{center: [0, 0], zoom: 2}} onClick={showPopup}>
      <Layers>
        <layer.OSM/>
        <layer.Vector features={markers} style={markers.style} zIndex="1" />
      </Layers>
      <Controls attribution={false} zoom={true}>
        <control.Rotate />
        <control.ScaleLine />
        <control.FullScreen />
        <control.OverviewMap />
        <control.ZoomSlider />
        <control.ZoomToExtent />
        <control.Zoom />
      </Controls>
      <Interactions>
        <interaction.Select style={selectedMarkerStyle} />
        <interaction.Draw features={markers} type='Point' />
        <interaction.Modify features={markers} />
      </Interactions>
    </Map>
```

### Module have development interface

    $ npm install
    $ npm run demo

### Publishing version

    $ npm config set registry https://registry.npmjs.org/
    $ npm login
    $ npm version patch
    $ npm publish
