import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  source: string;
}

type Provenance = 'clinical' | 'caseReport' | 'research' | null;

// Each source is described by its population (encoded in the colour/className)
// and its phenotype provenance (clinical notes vs. literature case report vs.
// deeply phenotyped research cohort). Provenance is the distinction that drives
// phenotype depth/specificity, so it is shown in the label and explained in the
// tooltip.
const SOURCE_CONFIG: Record<string, { label: string; className: string; provenance: Provenance }> = {
  'ahmed-variants':       { label: 'Saudi · clinical',    className: 'badge-saudi',      provenance: 'clinical' },
  'ahmed-pmid28454995':   { label: 'Saudi · clinical',    className: 'badge-saudi',      provenance: 'clinical' },
  'fawzan-variants':      { label: 'Saudi · clinical',    className: 'badge-saudi',      provenance: 'clinical' },
  'PMC6562004':           { label: 'Saudi · clinical',    className: 'badge-saudi',      provenance: 'clinical' },
  'marwa-variants':       { label: 'Saudi · literature',  className: 'badge-saudi-lit',  provenance: 'caseReport' },
  'PMC7082194':           { label: 'Mixed · clinical',    className: 'badge-mixed',      provenance: 'clinical' },
  'ddd-diagnoses':        { label: 'DDD · research',       className: 'badge-ddd',        provenance: 'research' },
  'Literature':           { label: 'Literature',           className: 'badge-literature', provenance: 'caseReport' },
  'ClinVar':              { label: 'ClinVar',              className: 'badge-clinvar',    provenance: null },
};

const SourceBadge: React.FC<Props> = ({ source }) => {
  const { t } = useTranslation();
  const cfg = SOURCE_CONFIG[source] || { label: source, className: 'badge-unknown', provenance: null };
  const title = cfg.provenance ? `${source} — ${t(`source.${cfg.provenance}Tip`)}` : source;
  return (
    <span className={`source-badge ${cfg.className}`} title={title}>
      {cfg.label}
    </span>
  );
};

export default SourceBadge;
