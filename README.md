# A React + TypeScript adapter for Fractal.

An adapter to let you use TSX templates with Fractal.

## Installation
```
npm install @gotoandplay/fractal-tsx-adapter --save-dev
```

## Usage
Require the adapter in your Fractal configuration file:
```
let tsxAdapter = require('@gotoandplay/fractal-tsx-adapter');
```

Register the adapter as engine:
```
fractal.components.engine(tsxAdapter);
```
