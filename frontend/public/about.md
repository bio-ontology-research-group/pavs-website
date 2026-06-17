# About PAVS

## What is PAVS?

The **Phenotype-Associated Variants in Saudi Arabia (PAVS)** database is a curated resource
of genomic variants and associated clinical phenotypes from Saudi Arabian patients with
rare genetic diseases. It integrates data from multiple clinical cohorts and links each
case to international ontologies (HPO, OMIM, MONDO) and variant databases (ClinVar, dbSNP).

## Data Sources

Sources differ along two axes — the **population** (colour) and the **phenotype
provenance** (how the phenotypes were recorded, shown after the "·" in each badge).
Provenance matters because it determines phenotype depth and specificity: routine
clinical notes contain few, general HPO terms, whereas published case reports and
research cohorts contain more and more specific terms.

- **Saudi · clinical** (green) — Saudi cohort sources curated from clinical notes
  and diagnostic reports (Alfares, Monies 2017/2019)
- **Saudi · case report** (green, outlined) — Saudi cases curated from published
  case reports (Abdelhakim, this study)
- **Mixed · clinical** (teal) — mixed-population clinical cohort (Ziats et al.)
- **DDD · research** (gray) — Deciphering Developmental Disorders, a deeply
  phenotyped non-Saudi research cohort
- **Literature** (indigo) — worldwide published case reports from the GA4GH
  Phenopacket Store

## Phenotype Similarity

Cases are searchable by phenotype using information-content-based similarity (**Lin + BMA**
by default, or **Resnik + BMA**). Similarity scores are computed using the Human Phenotype
Ontology (HPO) and disease–phenotype associations from the HPO Annotation file (phenotype.hpoa).

The **information content (IC)** of an HPO term *t* quantifies how specific it is,
based on its frequency across disease annotations:

> IC(*t*) = −log₂ P(*t*)

where P(*t*) is the proportion of cases annotated with *t* or any of its descendants.
Rare, specific terms have high IC; broad, common terms have low IC.

The **Lin similarity** between two HPO terms *a* and *b* is:

> Lin(*a*, *b*) = 2 × IC(MICA) / (IC(*a*) + IC(*b*))

where MICA is the Most Informative Common Ancestor of *a* and *b*.

The **Resnik similarity** uses only the MICA information content:

> Resnik(*a*, *b*) = IC(MICA)

**Best-Match Average (BMA)** symmetrises term-level scores across two phenotype sets *A* and *B*:

> BMA(*A*, *B*) = [ Σ_{a∈A} max_{b∈B} sim(*a*,*b*) + Σ_{b∈B} max_{a∈A} sim(*a*,*b*) ] / (|*A*| + |*B*|)

## Variant Annotation

Variants are annotated using the Ensembl Variant Effect Predictor (VEP) with:
- gnomAD allele frequencies
- SIFT and PolyPhen-2 pathogenicity scores
- ClinVar classifications
- Saudi cohort allele frequencies (novel to this resource)

Every variant with a known rsID or HGVS g. notation has a **TogoVar** link for instant
cross-referencing against Japanese and global variant databases.

## Use cases

PAVS is a population-specific genotype–phenotype resource. Three representative
uses (the queries are available in the **SPARQL** tab):

1. **Population-aware variant interpretation.** Retrieve all Saudi cases for a
   candidate gene together with their variants, zygosity, ACMG classification, and
   consanguinity status to judge whether a homozygous recessive call is recurrent
   in the population (e.g. *ELAC2* recurs in 51 Saudi cases, *ATP7B* in 42). Use
   the **Gene** tab or the *"Saudi cases for a gene"* SPARQL example.
2. **Phenotype-driven candidate shortlisting.** Enter a patient's HPO terms in the
   **Phenotype** search to obtain a ranked list of candidate genes (Lin or Resnik
   BMA). On sparse clinical profiles this is best used for shortlisting rather than
   single top-1 prediction, and can be combined with the variant-level evidence
   (VEP, SIFT, PolyPhen-2, gnomAD) stored for each variant.
3. **Population-specific disease burden.** The *"Most frequently affected genes
   (Saudi cohort)"* SPARQL example ranks the genes most often implicated in Saudi
   cases (e.g. *ELAC2*, *ATP7B*); in a consanguineous population these are
   dominated by autosomal-recessive disease genes. Per-case zygosity for
   homozygosity analyses is available in the downloadable phenopackets and TSV.

Cases without phenotype annotations (e.g. unaffected relatives or records with
only a suspected diagnosis) are retained for their genotype and family-structure
information and can be filtered out when phenotype annotations are required.

## Arabic translation

The Arabic HPO labels, definitions, and layperson synonyms used in this interface
are an independent, openly licensed resource developed for PAVS. There is no
official Arabic localization of HPO; our resource additionally provides full
definitions and layperson synonyms for patient-facing use and is distributed in
Babelon format so it can be adopted by the official HPO internationalization
infrastructure in the future.

## Phenopacket Store

The manually curated Saudi case reports are being prepared as a contribution to
the GA4GH Phenopacket Store. Curated case reports that share a source publication
with an existing Phenopacket Store entry are flagged with a source cross-reference
so they can be identified or excluded.

## Citation

## Contact

**Robert Hoehndorf** (ORCID: [0000-0001-8149-5890](https://orcid.org/0000-0001-8149-5890))
King Abdullah University of Science and Technology (KAUST)

## Acknowledgements

This work has been supported by funding from King Abdullah University of Science and
Technology (KAUST) Office of Sponsored Research (OSR) under Award No. URF/1/5041-01-01,
REI/1/5235-01-01, REI/1/4938-01-01, and REI/1/5659-01-01.

This work was supported by funding from King Abdullah University of Science and Technology
(KAUST) — KAUST Center of Excellence for Smart Health (KCSH), award no. 5932, and by
funding from King Abdullah University of Science and Technology (KAUST) — Center of
Excellence for Generative AI, award no. 5940.

We acknowledge support from the KAUST Supercomputing Laboratory.

## License

Data are released under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

Code is released under the [GNU General Public License v3](https://www.gnu.org/licenses/gpl-3.0.html)
at [github.com/bio-ontology-research-group/pavs](https://github.com/bio-ontology-research-group/pavs).
