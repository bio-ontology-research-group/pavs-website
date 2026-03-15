import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import SourceBadge from './SourceBadge';

const API = import.meta.env.VITE_API_URL ?? '';

// HP:0000118 = Phenotypic abnormality (root for browsable tree)
const ROOT_ID = 'HP:0000118';

interface HpoNode {
  id: string;
  label: string;
  definition?: string;
  arabic_label?: string;
  case_count: number;
  saudi_case_count: number;
  child_count: number;
}

interface HpoEnrichment {
  id: string;
  definition: string;
  layperson_synonyms: string[];
  synonyms: string[];
  arabic_label: string;
  arabic_layperson: string;
  arabic_definition: string;
}

interface CaseResult {
  id: string;
  gene?: string;
  disease?: string;
  source?: string;
  is_saudi?: boolean;
  hpo_ids?: string[];
}

// ─── Tree node component ──────────────────────────────────────────────────────

interface TreeNodeProps {
  node: HpoNode;
  depth: number;
  selected: HpoNode | null;
  onSelect: (node: HpoNode) => void;
  childrenMap: Record<string, HpoNode[]>;
  expandedIds: Set<string>;
  loadingNodes: Set<string>;
  onToggle: (id: string) => void;
  isAr: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node, depth, selected, onSelect,
  childrenMap, expandedIds, loadingNodes, onToggle, isAr,
}) => {
  const hasChildren = node.child_count > 0;
  const isExpanded = expandedIds.has(node.id);
  const isLoading = loadingNodes.has(node.id);
  const isSelected = selected?.id === node.id;
  const children = childrenMap[node.id] || [];
  const displayLabel = isAr && node.arabic_label ? node.arabic_label : node.label;

  return (
    <div className="hpo-tree-node">
      <div
        className={`hpo-tree-row ${isSelected ? 'hpo-tree-selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          className="hpo-tree-toggle"
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {isLoading ? '⋯' : isExpanded ? '▼' : '▶'}
        </button>
        <span
          className="hpo-tree-label"
          onClick={() => onSelect(node)}
          title={node.definition}
        >
          {displayLabel}
          {node.saudi_case_count > 0 && (
            <span className="hpo-tree-count"> ({node.saudi_case_count})</span>
          )}
        </span>
        <span className="hpo-tree-id">{node.id}</span>
      </div>
      {isExpanded && children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
          childrenMap={childrenMap}
          expandedIds={expandedIds}
          loadingNodes={loadingNodes}
          onToggle={onToggle}
          isAr={isAr}
        />
      ))}
    </div>
  );
};

// ─── Case table ──────────────────────────────────────────────────────────────

const CaseTable: React.FC<{ cases: CaseResult[] }> = ({ cases }) => (
  <div className="gene-cases-table-wrap">
    <table className="gene-cases-table">
      <thead>
        <tr>
          <th>Case ID</th>
          <th>Gene</th>
          <th>Disease</th>
          <th>Source</th>
          <th>HPO</th>
        </tr>
      </thead>
      <tbody>
        {cases.map(c => (
          <tr key={c.id}>
            <td><Link to={`/case/${encodeURIComponent(c.id)}`}>{c.id}</Link></td>
            <td>
              {c.gene
                ? <Link to={`/gene?gene=${encodeURIComponent(c.gene)}`} className="gene-link">{c.gene}</Link>
                : '—'}
            </td>
            <td>{c.disease || '—'}</td>
            <td><SourceBadge source={c.source || ''} /></td>
            <td className="pb-hpo-count">{c.hpo_ids?.length ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const PhenotypeBrowser: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [searchParams, setSearchParams] = useSearchParams();

  // Tree state
  const [childrenMap, setChildrenMap] = useState<Record<string, HpoNode[]>>({});
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  // Expanded nodes from URL
  const expandedIds = useMemo(() => {
    const p = searchParams.get('expanded');
    const set = p ? new Set(p.split(',')) : new Set<string>();
    set.add(ROOT_ID); // Always expand root
    return set;
  }, [searchParams]);

  // Selected term + cases derived from URL
  const selectedHpId = searchParams.get('hp');
  const [selected, setSelected] = useState<HpoNode | null>(null);
  const [termEnrichment, setTermEnrichment] = useState<HpoEnrichment | null>(null);
  const [termCases, setTermCases] = useState<CaseResult[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);

  // Toggles for case sources from URL
  const includeChildren = searchParams.get('children') !== 'false';
  const includeDDD = searchParams.get('ddd') === 'true';
  const includeLiterature = searchParams.get('literature') === 'true';

  const fetchChildren = useCallback(async (hp_id: string) => {
    // Check if childrenMap[hp_id] is already fetched
    if (childrenMap[hp_id]) return childrenMap[hp_id];
    setLoadingNodes(prev => new Set(prev).add(hp_id));
    try {
      const res = await axios.get(`${API}/api/hpo-children/${encodeURIComponent(hp_id)}`);
      setChildrenMap(prev => ({ ...prev, [hp_id]: res.data }));
      return res.data;
    } catch {
      setChildrenMap(prev => ({ ...prev, [hp_id]: [] }));
      return [];
    } finally {
      setLoadingNodes(prev => { const next = new Set(prev); next.delete(hp_id); return next; });
    }
  }, [childrenMap]);

  const fetchCases = useCallback(async (
    hp_id: string,
    children: boolean,
    ddd: boolean,
    lit: boolean,
  ) => {
    setCasesLoading(true);
    try {
      const res = await axios.get(`${API}/api/phenotype/${encodeURIComponent(hp_id)}/cases`, {
        params: { include_children: children, include_ddd: ddd, include_literature: lit, limit: 1000 },
      });
      setTermCases(res.data);
    } catch {
      setTermCases([]);
    } finally {
      setCasesLoading(false);
    }
  }, []);

  // Sync selected term and cases when URL changes
  useEffect(() => {
    if (!selectedHpId) {
      setSelected(null);
      setTermEnrichment(null);
      setTermCases([]);
      return;
    }

    // Only fetch if selection actually changed
    if (selected?.id !== selectedHpId) {
      axios.get(`${API}/api/hpo/${encodeURIComponent(selectedHpId)}`).then(res => {
        const node: HpoNode = {
          id: res.data.id,
          label: res.data.name,
          arabic_label: res.data.arabic_label,
          case_count: 0,
          saudi_case_count: 0,
          child_count: 0
        };
        setSelected(node);
        setTermEnrichment(res.data);
      }).catch(() => {});
    }

    fetchCases(selectedHpId, includeChildren, includeDDD, includeLiterature);
  }, [selectedHpId, includeChildren, includeDDD, includeLiterature, fetchCases]);

  // Sync expanded IDs data
  useEffect(() => {
    expandedIds.forEach(id => {
      if (childrenMap[id] === undefined) {
        fetchChildren(id);
      }
    });
  }, [expandedIds, childrenMap, fetchChildren]);

  // Load root children on mount
  useEffect(() => {
    fetchChildren(ROOT_ID);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(async (id: string) => {
    const nextParams = new URLSearchParams(searchParams);
    const current = new Set(expandedIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
      if (childrenMap[id] === undefined) {
        await fetchChildren(id);
      }
    }
    current.delete(ROOT_ID); // root is always expanded by default in our useMemo
    if (current.size > 0) {
      nextParams.set('expanded', Array.from(current).join(','));
    } else {
      nextParams.delete('expanded');
    }
    setSearchParams(nextParams);
  }, [expandedIds, childrenMap, fetchChildren, searchParams, setSearchParams]);

  const handleSelect = useCallback((node: HpoNode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('hp', node.id);
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const handleToggleOption = (
    key: 'children' | 'ddd' | 'literature',
  ) => {
    if (!selectedHpId) return;
    
    const nextParams = new URLSearchParams(searchParams);
    if (key === 'children') {
      if (includeChildren) nextParams.set('children', 'false');
      else nextParams.delete('children');
    } else if (key === 'ddd') {
      if (includeDDD) nextParams.delete('ddd');
      else nextParams.set('ddd', 'true');
    } else if (key === 'literature') {
      if (includeLiterature) nextParams.delete('literature');
      else nextParams.set('literature', 'true');
    }
    setSearchParams(nextParams);
  };

  // Root nodes: children of HP:0000118
  const rootNodes = childrenMap[ROOT_ID] || [];
  const rootLoading = loadingNodes.has(ROOT_ID);

  const saudiCases = termCases.filter(r => r.is_saudi);
  const dddCases = termCases.filter(r => !r.is_saudi && r.source?.toLowerCase().includes('ddd'));
  const litCases = termCases.filter(r => !r.is_saudi && !r.source?.toLowerCase().includes('ddd'));

  return (
    <div className="hpo-browser-layout">
      <Helmet>
        <title>{selected ? `${selected.id} — Phenotype Browser` : t('nav.phenotypeBrowser')} — PAVS</title>
        <meta name="description" content={selected ? `Browse clinical cases matching phenotype ${selected.label} (${selected.id}) in Saudi Arabia.` : "Hierarchical browser for HPO phenotypes associated with Saudi clinical cases."} />
      </Helmet>

      {/* Left: HPO tree */}
      <div className="hpo-tree-panel">
        <div className="hpo-tree-header">
          <h3>{t('phenotypeBrowser.treeTitle')}</h3>
          <p className="hpo-tree-hint">{t('phenotypeBrowser.treeHint')}</p>
        </div>
        <div className="hpo-tree-scroll">
          {rootLoading && <div className="loading" style={{ padding: '12px' }}>{t('search.loading')}</div>}
          {rootNodes.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              selected={selected}
              onSelect={handleSelect}
              childrenMap={childrenMap}
              expandedIds={expandedIds}
              loadingNodes={loadingNodes}
              onToggle={handleToggle}
              isAr={isAr}
            />
          ))}
        </div>
      </div>

      {/* Right: selected term detail + cases */}
      <div className="hpo-detail-panel">
        {!selected ? (
          <p className="gene-select-prompt">{t('phenotypeBrowser.selectPrompt')}</p>
        ) : (
          <>
            <div className="hpo-term-card">
              <h3>
                {isAr && (termEnrichment?.arabic_label || selected.arabic_label)
                  ? (termEnrichment?.arabic_label || selected.arabic_label)
                  : selected.label}
                <span className="hpo-term-id"> {selected.id}</span>
              </h3>
              {isAr && termEnrichment?.arabic_layperson && (
                <p className="hpo-term-lay">
                  <span className="hpo-detail-key">{t('hpo.layTerm')}:</span>{' '}
                  {termEnrichment.arabic_layperson}
                </p>
              )}
              {(() => {
                const def = isAr
                  ? termEnrichment?.arabic_definition
                  : (termEnrichment?.definition || selected.definition);
                return def ? <p className="hpo-term-def">{def}</p> : null;
              })()}
              <div className="hpo-term-stats">
                <span>{t('phenotypeBrowser.casesCount')}: <strong>{termCases.length}</strong></span>
                {selected.child_count > 0 && (
                  <span> · {selected.child_count} {t('phenotypeBrowser.subcategories')}</span>
                )}
              </div>
              <a
                href={`https://hpo.jax.org/browse/term/${selected.id}`}
                target="_blank" rel="noopener noreferrer"
                className="ext-link"
              >
                HPO Browser ↗
              </a>
            </div>

            {/* Toggles */}
            <div className="gene-source-toggles" style={{ marginTop: '12px' }}>
              <label className="toggle-label">
                <input type="checkbox" checked={includeChildren}
                  onChange={() => handleToggleOption('children')} />
                {' '}{t('phenotypeBrowser.includeChildren')}
              </label>
              <label className="toggle-label">
                <input type="checkbox" checked={includeDDD}
                  onChange={() => handleToggleOption('ddd')} />
                {' '}DDD
              </label>
              <label className="toggle-label">
                <input type="checkbox" checked={includeLiterature}
                  onChange={() => handleToggleOption('literature')} />
                {' '}{t('badges.literature')}
              </label>
            </div>

            {casesLoading && <div className="loading">{t('search.loading')}</div>}

            {!casesLoading && (
              <div className="pb-sections">
                {saudiCases.length > 0 && (
                  <section className="pb-section">
                    <h4>Saudi cohort ({saudiCases.length})</h4>
                    <CaseTable cases={saudiCases} />
                  </section>
                )}
                {includeDDD && dddCases.length > 0 && (
                  <section className="pb-section">
                    <h4>DDD ({dddCases.length})</h4>
                    <CaseTable cases={dddCases} />
                  </section>
                )}
                {includeLiterature && litCases.length > 0 && (
                  <section className="pb-section">
                    <h4>Literature ({litCases.length})</h4>
                    <CaseTable cases={litCases} />
                  </section>
                )}
                {termCases.length === 0 && (
                  <p className="gene-select-prompt">{t('phenotypeBrowser.noCases')}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PhenotypeBrowser;
