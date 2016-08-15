'use strict';
import * as _ from 'lodash';
import {promises as jsonld} from 'jsonld';
import { nonenumerable } from 'core-decorators';
import {JsonLd, Core} from './Constants';
//noinspection TypeScriptCheckImport
import {default} from 'core-js/es6/weak-map';

var _isProcessed = new WeakMap();

export class Resource implements IResource {

    constructor(actualResource) {
        _.extend(this, actualResource);

        _isProcessed.set(this, false);
    }

    @nonenumerable
    get id() {
        return this[JsonLd.Id];
    }

    @nonenumerable
    get types() {
        var types = this[JsonLd.Type];

        if(typeof types === 'string'){
            return [ types ];
        }

        return types;
    }

    @nonenumerable
    get _processed() {
        return _isProcessed.get(this);
    }

    @nonenumerable
    set _processed(val:boolean) {
        _isProcessed.set(this, val);
    }

    compact(context:any = null) {
        return jsonld.compact(this, context || Core.Context);
    }
}

var _apiDocumentation = new WeakMap();
var _incomingLinks = new WeakMap();

export class HydraResource extends Resource implements IHydraResource {

    constructor(heracles:IHeracles, actualResource, apiDoc:IApiDocumentation, incomingLinks) {
        super(actualResource);

        _apiDocumentation.set(this, apiDoc);
        _incomingLinks.set(this, incomingLinks);
    }

    @nonenumerable
    get apiDocumentation() {
        return _apiDocumentation.get(this);
    }

    getIncomingLinks() {
        return _incomingLinks.get(this);
    }

    @nonenumerable
    get operations() {
        var classOperations;
        if(_.isArray(this[JsonLd.Type])) {
            classOperations = _.map(this[JsonLd.Type], type => this.apiDocumentation.getOperations(type));
        } else {
            classOperations = [ this.apiDocumentation.getOperations(this[JsonLd.Type]) ];
        }

        var propertyOperations = _.chain(this.getIncomingLinks())
            .map(link => _.map(link.subject.types, type => ({ type: type, predicate: link.predicate })))
            .flatten()
            .map(link => this.apiDocumentation.getOperations(link.type, link.predicate))
            .union()
            .value();

        var operations = [...classOperations, ...propertyOperations];
        return _.flatten(operations).map((supportedOperation:ISupportedOperation) => {
            return new Operation(supportedOperation, this);
        });
    }
}

export class Operation implements IOperation {
    private _supportedOperation: ISupportedOperation;

    constructor(supportedOperation:ISupportedOperation, resource:IHydraResource) {
        this._supportedOperation = supportedOperation;

    }

    get method():string {
        return this._supportedOperation.method;
    }

    get expects():IClass {
        return this._supportedOperation.expects;
    }

    get returns():IClass {
        return this._supportedOperation.returns;
    }

    get requiresInput():boolean {
        return this._supportedOperation.requiresInput;
    }

    get title():string {
        return this._supportedOperation.title;
    }

    get description():string {
        return this._supportedOperation.description;
    }

    invoke() {
    }

}

export class PartialCollectionView extends HydraResource implements IPartialCollectionView {

    @nonenumerable
    get first() { return this[Core.Vocab.first] || null; }

    @nonenumerable
    get previous() { return this[Core.Vocab.previous] || null; }

    @nonenumerable
    get next() { return this[Core.Vocab.next] || null; }

    @nonenumerable
    get last() { return this[Core.Vocab.last] || null; }

    @nonenumerable
    get collection() {
        var collectionLink = _.find(this.getIncomingLinks(), linkArray => {
            return linkArray.predicate === Core.Vocab.view
        });

        return collectionLink ? collectionLink.subject : null
    }
}