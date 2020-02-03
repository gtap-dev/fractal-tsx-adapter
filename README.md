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

# Features

## Use HTML/JSX in context strings

By default, it's not possible to use HTML (or other Fractal components as JSX) in context variables.

So this example:
```
{
  "context": {
    "children": "<div>this text is in a div</div>"
  }
}
```
does not render a div in children, instead it escapes the string.

To workaround that, you can set the `parseJsxFrom` meta key in your component config:
```
{
  "meta": {
    "parseJsxFrom": [
      "children"
    ]
  },
  "context": {
    "children": "<div>this text is in a div</div>"
  }
}
```

This adapter will then parse the specified keys through [react-jsx-parser](https://github.com/TroyAlford/react-jsx-parser). This allows the use of HTML in context strings. Additionally, it allows the use of other components in the current Fractal library.

> NB! This also means you need to do the same parsing when hydrating the component client-side.

## Wrap components in other components

By default, the render method renders only the component exported as default in the component template file.

Sometimes, it's necessary to render outer components that wrap the rendered components, like a React Context provider.

```
let SomeComponent = require('some-react-component');
let tsxAdapter = require('@gotoandplay/fractal-tsx-adapter')({
  wrapperElements: [
    {
      component: SomeComponent,
      props: {
        some: 'prop',
        yin: 'yang,
      },
    },
    {
      component: '@fractal-component',
      props: {
        some: 'prop',
        yin: 'yang,
      },
    },
  ],
});
```
> NB! This also means you need to do the same wrapping when hydrating the component client-side.
