import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lang = i18n.language === 'ar' ? 'ar' : 'en';
    fetch(`/api/about?lang=${lang}`)
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setContent('# About\n\nContent not available.'); setLoading(false); });
  }, [i18n.language]);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="about-page">
      <Helmet>
        <title>{t('nav.about')} — PAVS</title>
        <meta name="description" content="About PAVS (Phenotype-Associated Variants in Saudi Arabia) — project overview, team, and data sources." />
      </Helmet>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default AboutPage;
