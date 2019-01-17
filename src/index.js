'use strict';

const _          = require('lodash');
const path       = require('path');
const React      = require('react');
const ReactDOM   = require('react-dom/server');
const Promise    = require('bluebird');
const Adapter    = require('@frctl/fractal').Adapter;
const utils      = require('@frctl/fractal').utils;

require('ts-node').register({
    transpileOnly: true
});
require('tsconfig-paths').register();

const DEFAULT_OPTIONS = {
    renderMethod: 'renderToString'
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
    }

    render(path, str, context, meta) {
        meta = meta || {};

        global.app = {
            publicFolder: this.getPath('/', meta)
        };

        if (meta && meta.env && meta.env.server) {
            delete require.cache[path];
        }

        let component = require(path);

        component = component.default || component;

        meta.env.publicPath = this.getPath('/', meta);
        meta.env.reactClass = component.name;

        setEnv('_self', meta.self, context);
        setEnv('_target', meta.target, context);
        setEnv('_env', meta.env, context);
        setEnv('_config', this._app.config(), context);

        const element = React.createElement(component, context);
        const html = this._renderMethod(element);

        return Promise.resolve(html);
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

        if (meta.env.server) {
            delete require.cache[path];
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
            const adapter = new ReactAdapter(source, app, options);

            return adapter;
        }
    };
};
