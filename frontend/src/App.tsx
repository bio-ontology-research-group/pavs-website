import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, NavLink, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './i18n';
import './App.css';
import PhenotypeSearch from './components/PhenotypeSearch';
import VariantLookup from './components/VariantLookup';
import DiseaseBrowser from './components/DiseaseBrowser';
import GeneBrowser from './components/GeneBrowser';
import PhenotypeBrowser from './components/PhenotypeBrowser';
import SparqlExplorer from './components/SparqlExplorer';
import AboutPage from './components/AboutPage';
import CaseDetail from './components/CaseDetail';

const API = import.meta.env.VITE_API_URL ?? '';

const CaseDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <>
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      {id && <CaseDetail caseId={id} />}
    </>
  );
};

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const switchLang = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
    localStorage.setItem('i18nextLng', next);
  };

  // Apply RTL on init
  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  const tabs = [
    { id: 'phenotype',         path: '/',                  label: t('nav.phenotype') },
    { id: 'variant',           path: '/variant',           label: t('nav.variant') },
    { id: 'disease',           path: '/disease',           label: t('nav.disease') },
    { id: 'gene',              path: '/gene',              label: t('nav.gene') },
    { id: 'phenotype-browser', path: '/phenotype-browser', label: t('nav.phenotypeBrowser') },
    { id: 'sparql',            path: '/sparql',            label: t('nav.sparql') },
    { id: 'about',             path: '/about',             label: t('nav.about') },
  ];

  return (
    <div className="app">
      <Helmet>
        <title>PAVS — Phenotype-Associated Variants in Saudi Arabia</title>
        <meta name="description" content="A comprehensive database of phenotype-associated variants in Saudi Arabia, facilitating genomic research and diagnostics." />
      </Helmet>

      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <img src="/logo.svg" alt="PAVS Logo" height="36" />
        </Link>
        <div className="nav-tabs">
          {tabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-right">
          <a href={`${API}/api/phenopackets/download-all`}
             className="download-all-btn" title="Download all Saudi phenopackets" download>
            ↓ {t('results.downloadAll')}
          </a>
          <button className="lang-switcher" onClick={switchLang} title="Switch language / تغيير اللغة">
            {i18n.language === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<PhenotypeSearch />} />
          <Route path="/variant" element={<VariantLookup />} />
          <Route path="/disease" element={<DiseaseBrowser />} />
          <Route path="/gene" element={<GeneBrowser />} />
          <Route path="/phenotype-browser" element={<PhenotypeBrowser />} />
          <Route path="/sparql" element={<SparqlExplorer />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/case/:id" element={<CaseDetailWrapper />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>
          PAVS — Phenotype-Associated Variants in Saudi Arabia ·{' '}
          <a href="https://borg.kaust.edu.sa/" target="_blank" rel="noopener noreferrer">Bio-Ontology Research Group</a>,{' '}
          <a href="https://www.kaust.edu.sa" target="_blank" rel="noopener noreferrer">KAUST</a>
        </p>
      </footer>
    </div>
  );
};

export default App;
