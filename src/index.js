'use strict';

const _          = require('lodash');
const path       = require('path');
const decache    = require('./decache.js');
const React      = require('react');
const ReactDOM   = require('react-dom/server');
const Adapter    = require('@frctl/fractal').Adapter;
const utils      = require('@frctl/fractal').utils;

const JsxParser = require('react-jsx-parser').default;

const DEFAULT_OPTIONS = {
    renderMethod: 'renderToString',
    ssr: true,
    wrapperElements: []
};

/*
 * React Adapter
 * -------------
 */
class ReactAdapter extends Adapter {
    constructor(source, app, options) {
        super(null, source);
        this._app = app;

        if (options.renderMethod == 'renderToString') {
            this._renderMethod = ReactDOM.renderToString;
        } else {
            this._renderMethod = ReactDOM.renderToStaticMarkup;
        }
        this.options = options;
        this.components = {};
    }

    getAllComponents() {
        const componentLibrary = {};

        this._app.components.flatten().each((item) => {
            let component = require(item.viewPath);

            component = component.default || component;

            componentLibrary[component.name] = component;
        });

        return componentLibrary;
    }

    wrapChildren(children) {
        return React.createElement(JsxParser, {
            jsx: children,
            components: this.getAllComponents(),
            renderInWrapper: false
        });
    }

    wrapString(str) {
        if (typeof str !== 'undefined' && typeof str === 'string') {
            return this.wrapChildren(str);
        }

        return str;
    }

    getContext(context, parseJsxFrom) {
        if (parseJsxFrom && parseJsxFrom.length) {
            const newContext = JSON.parse(JSON.stringify(context));

            for (const item of parseJsxFrom) {
                const arr = item.split('.');

                arr.reduce((object, item, index) => {
                    if (index === arr.length - 1) {
                        object[item] = this.wrapString(object[item]);
                    }

                    return object[item];
                }, newContext);
            }

            return newContext;
        }

        return context;
    }

    getWrapperComponent(component) {
        if (typeof component === 'string' && component.startsWith('@')) {
            const comp = this._app.components.flatten().find(component);

            if (comp) {
                return require(comp.viewPath).default;
            }
        }

        return component;
    }

    renderParentElements(children) {
        if (this.options.wrapperElements.length) {
            return this.options.wrapperElements.reverse().reduce((currentElement, wrapperObject) => {
                const wrapperComponent = this.getWrapperComponent(wrapperObject.component);

                return React.createElement(wrapperComponent, Object.assign({}, wrapperObject.props, {
                    children: currentElement
                }));
            }, children);
        }

        return children;
    }

    render(path, str, context, meta) {
        meta = meta || {};

        global.app = {
            publicFolder: this.getPath('/', meta)
        };

        if (meta && meta.env && meta.env.server && this.options.ssr && !meta.self.meta.cache) {
            decache(path);
        }

        let component = require(path);

        component = component.default || component;

        meta.env.publicPath = this.getPath('/', meta);
        meta.env.reactClass = component.name;

        setEnv('_self', meta.self, context);
        setEnv('_target', meta.target, context);
        setEnv('_env', meta.env, context);
        setEnv('_config', this._app.config(), context);

        if (this.options.ssr || meta.env.ssr) {
            const element = React.createElement(component, this.getContext(context, meta.self.meta.parseJsxFrom));
            const parentElements = this.renderParentElements(element);
            const html = this._renderMethod(parentElements);

            return Promise.resolve(html);
        }

        return '';
    }

    renderLayout(path, str, context, meta) {
        meta = meta || {};

        meta.env.publicPath = this.getPath('/', meta);

        setEnv('_self', meta.self, context);
        setEnv('_target', meta.target, context);
        setEnv('_env', meta.env, context);
        setEnv('_config', this._app.config(), context);

        global.app = {
            publicFolder: this.getPath('/', meta)
        };

        if (meta.env.server && this.options.ssr) {
            decache(path);
        }

        let component = require(path);

        component = component.default || component;
        const element   = React.createElement(component, context);
        const html      = '<!DOCTYPE html>' + ReactDOM.renderToStaticMarkup(element);

        return Promise.resolve(html);
    }

    getPath(assetPath, root) {
        let returnPath = assetPath;
        let fractal = this._source._app;

        if (!root || !root.env || root.env.server) {
            returnPath = assetPath;
        } else {
            returnPath = path.dirname(utils.relUrlPath(assetPath, _.get(root.env.request || root.request, 'path', '/'), fractal.web.get('builder.urls'))) + '/';
        }

        return returnPath;
    }
}

/**
 * set environment variables
 * @param {[type]} key     [description]
 * @param {[type]} value   [description]
 * @param {[type]} context [description]
 * @returns {void}
 */
function setEnv(key, value, context) {
    if (_.isUndefined(context[key]) && !_.isUndefined(value)) {
        context[key] = value;
    }
}

/*
 * Adapter registration
 * --------------------
 */
module.exports = function(config = {}) {
    const options = _.assign({}, DEFAULT_OPTIONS, config);

    return {
        register(source, app) {
            const registerTsconfig = () => {
                require('tsconfig-paths').register();
            };
            const handleLoaded = () => {
                require('ts-node').register({
                    transpileOnly: true
                });

                registerTsconfig();
            };
            const handleUpdated = () => {
                registerTsconfig();
            };

            app.components.on('loaded', handleLoaded);
            app.components.on('updated', handleUpdated);

            const adapter = new ReactAdapter(source, app, options);

            return adapter;
        }
    };
};
