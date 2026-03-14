import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import SourceBadge from './SourceBadge';

const API = import.meta.env.VITE_API_URL ?? '';

interface DiseaseResult {
  case?: string;
  id?: string;
  disease?: string;
  source?: string;
  gene?: string;
  isSaudi?: string;
}

const DiseaseBrowser: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<DiseaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isFirstRender = useRef(true);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/api/search/disease`, { params: { q: q.trim() } });
      setResults(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const q = searchParams.get('q');
      if (q) performSearch(q);
    }
  }, [searchParams]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearchParams({ q: query.trim() });
    performSearch(query);
  };

  return (
    <div className="search-panel">
      <Helmet>
        <title>{t('nav.disease')} — PAVS</title>
        <meta name="description" content="Browse clinical cases by disease name or OMIM ID in the PAVS database." />
      </Helmet>

      <h2>{t('nav.disease')}</h2>
      <div className="form-group inline">
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Disease name or OMIM ID…"
          className="text-input"
        />
        <button className="btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? t('search.loading') : t('search.search')}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {results.length > 0 && (
        <div className="results-table-wrapper">
          <p className="result-count">{results.length} cases</p>
          <table className="results-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>{t('results.disease')}</th>
                <th>{t('results.gene')}</th>
                <th>{t('results.source')}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx}>
                  <td>
                    <Link to={`/case/${encodeURIComponent(r.id || r.case || '')}`} className="case-link">
                      {r.id || r.case || '—'}
                    </Link>
                  </td>
                  <td>{r.disease || '—'}</td>
                  <td>{r.gene || '—'}</td>
                  <td><SourceBadge source={r.source || ''} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DiseaseBrowser;
