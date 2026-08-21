import { describe, expect, it } from 'vitest';
import { isKnowledgeConvention, KNOWLEDGE_CONVENTION_KEYS } from '@/lib/knowledgeConventions';

describe('knowledge conventions', () => {
  it('marks the two system seeds as standing conventions', () => {
    expect(KNOWLEDGE_CONVENTION_KEYS).toEqual(['eyot.collab.passage', 'eyot.hub.shared_work']);
    expect(isKnowledgeConvention('eyot.collab.passage')).toBe(true);
    expect(isKnowledgeConvention('docs-runbook')).toBe(false);
  });
});
