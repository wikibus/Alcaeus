import * as $rdf from '@rdf-esm/data-model'
import * as Hydra from '@rdfine/hydra'
import { rdf, hydra } from '@tpluscode/rdf-ns-builders'
import type { ResourceIdentifier } from '@tpluscode/rdfine'
import type { ResourceFactory } from '@tpluscode/rdfine/lib/ResourceFactory'
import type { RdfResourceCore } from '@tpluscode/rdfine/RdfResource'
import type { AnyContext, AnyPointer, GraphPointer } from 'clownface'
import type { DatasetCore, NamedNode } from 'rdf-js'
import TermMap from '@rdf-esm/term-map'
import { Term } from '@rdfjs/types'

export interface ResourceRepresentation<D extends DatasetCore = DatasetCore, T extends RdfResourceCore<D> = Hydra.Resource<D>> extends Iterable<Hydra.Resource<D>> {
    /**
     * Gets the root of the representation or undefined if it cannot be determined
     */
    root: (Hydra.Resource<D> & T) | null

    /**
     * Gets the number of resource within this representation
     */
    length: number

    /**
     * Indexer to look up any arbitrary resource by its id within the representation
     */
    get<T = RdfResourceCore>(uri: string): (T & Hydra.Resource<D>) | undefined

    /**
     * Gets all resources of given RDF type from the representation
     * @param {string} classId RDF class identifier
     * @returns {Array<Hydra.Resource>}
     */
    ofType<T = RdfResourceCore>(classId: string | NamedNode): (T & Hydra.Resource<D>)[]
}

export default class <D extends DatasetCore, T extends RdfResourceCore<D>> implements ResourceRepresentation<D, T> {
    private __graph: AnyPointer<AnyContext, D>
    private __factory: ResourceFactory
    private readonly rootNode: GraphPointer<ResourceIdentifier>
    private __uniqueResources: () => Map<Term, Hydra.Resource<D>>

    public constructor(graph: AnyPointer<AnyContext, D>, factory: ResourceFactory, rootResource: NamedNode) {
        this.__graph = graph
        this.__factory = factory
        this.rootNode = graph.node(rootResource)

        this.__uniqueResources = (() => {
            let map: Map<Term, Hydra.Resource<D>>

            return () => {
                if (!map) {
                    map = this.__graph.in().toArray()
                        .reduce((uniq, pointer) => {
                            if (!uniq.has(pointer.term)) {
                                return uniq.set(pointer.term, this._createEntity(pointer))
                            }

                            return uniq
                        }, new TermMap<Term, Hydra.Resource<D>>())
                }

                return map
            }
        })()
    }

    public get<T>(uri: string): (T & Hydra.Resource<D>) | undefined {
        const nodes = this.__graph.dataset.match(this.__graph.namedNode(decodeURI(uri)).term)

        if (nodes.size === 0) {
            return undefined
        }

        return this.__factory.createEntity<T & Hydra.Resource<D>>(this.__graph.namedNode(decodeURI(uri)))
    }

    public get root() {
        const collectionNode = this.rootNode.in(hydra.view)
        if (collectionNode.term) {
            return this.__factory.createEntity<Hydra.Resource<D> & T>(collectionNode as GraphPointer<ResourceIdentifier>)
        }

        return this.__factory.createEntity<Hydra.Resource<D> & T>(this.rootNode)
    }

    public get length(): number {
        return this.__uniqueResources().size
    }

    public ofType<T>(classId: string | NamedNode) {
        const type = typeof classId === 'string' ? $rdf.namedNode(classId) : classId

        return this.__graph.has(rdf.type, type).map(r => this._createEntity<T>(r))
    }

    public [Symbol.iterator]() {
        return this.__uniqueResources().values()
    }

    private _createEntity<T>(node: GraphPointer<ResourceIdentifier>) {
        return this.__factory.createEntity<T & Hydra.Resource<D>>(node)
    }
}
