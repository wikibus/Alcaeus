import RdfResourceImpl from '@tpluscode/rdfine'
import Resource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import cf, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { BlankNode, DatasetCore } from 'rdf-js'
import { MemberAssertionMixin } from '../../../src/Resources/Mixins/MemberAssertion'
import { foaf, hydra, rdf } from '@tpluscode/rdf-ns-builders'

class MemberAssertion extends MemberAssertionMixin(Hydra.MemberAssertionMixin(Resource)) {}

describe('MemberAssertion', () => {
    let dataset: DatasetCore
    let node: GraphPointer<BlankNode>
    let memberAssertion: MemberAssertion

    beforeEach(() => {
        dataset = $rdf.dataset()
        node = cf({ dataset }).blankNode()

        memberAssertion = new MemberAssertion(node)
    })

    describe('shouldApply', () => {
        it('should return true if resource is object of hydra:manages property', () => {
            // given
            node.addIn(hydra.manages, node.blankNode())

            // when
            const result = MemberAssertionMixin.shouldApply(memberAssertion)

            // then
            expect(result).toBeTruthy()
        })

        it('should return true if resource is object of hydra:memberAssertion property', () => {
            // given
            node.addIn(hydra.memberAssertion, node.blankNode())

            // when
            const result = MemberAssertionMixin.shouldApply(memberAssertion)

            // then
            expect(result).toBeTruthy()
        })
    })

    describe('Mixin', () => {
        describe('object', () => {
            it('returns class from representation if missing in ApiDocumentation', () => {
                // given
                node.addOut(hydra.object, node.namedNode('http://vocab/class'))

                // when
                const obj = memberAssertion.object

                // then
                expect(obj?.id.value).toBe('http://vocab/class')
            })
        })

        describe('subject', () => {
            it('returns rdf:subject', () => {
                // given
                node.addOut(hydra.subject, node.namedNode('http://example.org/term'))

                // when
                const obj = memberAssertion.subject

                // then
                expect(obj?.id.value).toBe('http://example.org/term')
            })
        })

        describe('predicate', () => {
            it('returns rdf:subject', () => {
                // given
                node.addOut(hydra.property, node.namedNode('http://example.org/predicate'))

                // when
                const obj = memberAssertion.property

                // then
                expect(obj?.id.value).toBe('http://example.org/predicate')
            })
        })

        describe('matches', () => {
            describe('by class type', () => {
                it('returns true when object is string found of the rdf:object resource', () => {
                    // given
                    node
                        .addOut(hydra.object, node.namedNode('http://example.com/vocab#class'))
                        .addOut(hydra.property, rdf.type)

                    // when
                    const isMatch = memberAssertion.matches({
                        object: 'http://example.com/vocab#class',
                    })

                    // then
                    expect(isMatch).toBeTruthy()
                })

                it('returns true when object is resource with id of rdf:object resource', () => {
                    // given
                    node
                        .addOut(hydra.object, node.namedNode('http://example.com/vocab#class'))
                        .addOut(hydra.property, rdf.type)

                    // when
                    const isMatch = memberAssertion.matches({
                        object: $rdf.namedNode('http://example.com/vocab#class'),
                    })

                    // then
                    expect(isMatch).toBeTruthy()
                })

                it('returns false when predicate is not rdf:type', () => {
                    // given
                    node
                        .addOut(hydra.object, node.namedNode('http://example.com/vocab#class'))
                        .addOut(hydra.property, rdf.type)

                    // when
                    const isMatch = memberAssertion.matches({
                        object: $rdf.namedNode('http://example.com/vocab#class'),
                        predicate: 'http://some.other/property',
                    })

                    // then
                    expect(isMatch).toBeFalsy()
                })

                it('returns false when it is incomplete', () => {
                    // given
                    node
                        .addOut(hydra.property, rdf.type)

                    // when
                    const isMatch = memberAssertion.matches({
                        object: $rdf.namedNode('http://example.com/vocab#class'),
                        predicate: 'http://some.other/property',
                    })

                    // then
                    expect(isMatch).toBeFalsy()
                })
            })

            describe('by subject and predicate type', () => {
                it('returns true if pattern is matching string object and string property', () => {
                    // given
                    node
                        .addOut(hydra.subject, node.namedNode('http://example.com/person/Tomasz'))
                        .addOut(hydra.property, foaf.knows)

                    // when
                    const isMatch = memberAssertion.matches({
                        predicate: 'http://xmlns.com/foaf/0.1/knows',
                        subject: 'http://example.com/person/Tomasz',
                    })

                    // then
                    expect(isMatch).toBeTruthy()
                })

                it('returns true if pattern is matching string object and resource property', () => {
                    // given
                    node
                        .addOut(hydra.subject, node.namedNode('http://example.com/person/Tomasz'))
                        .addOut(hydra.property, foaf.knows)

                    // when
                    const isMatch = memberAssertion.matches({
                        predicate: foaf.knows,
                        subject: 'http://example.com/person/Tomasz',
                    })

                    // then
                    expect(isMatch).toBeTruthy()
                })

                it('returns true if pattern is matching resource object and string property', () => {
                    // given
                    node
                        .addOut(hydra.subject, node.namedNode('http://example.com/person/Tomasz'))
                        .addOut(hydra.property, foaf.knows)

                    // when
                    const isMatch = memberAssertion.matches({
                        predicate: 'http://xmlns.com/foaf/0.1/knows',
                        subject: $rdf.namedNode('http://example.com/person/Tomasz'),
                    })

                    // then
                    expect(isMatch).toBeTruthy()
                })

                it('returns true if pattern is matching resource object and resource property', () => {
                    // given
                    node
                        .addOut(hydra.subject, node.namedNode('http://example.com/person/Tomasz'))
                        .addOut(hydra.property, foaf.knows)

                    // when
                    const isMatch = memberAssertion.matches({
                        predicate: RdfResourceImpl.factory.createEntity(node.namedNode(foaf.knows)),
                        subject: RdfResourceImpl.factory.createEntity(node.namedNode('http://example.com/person/Tomasz')),
                    })

                    // then
                    expect(isMatch).toBeTruthy()
                })
            })
        })
    })
})
