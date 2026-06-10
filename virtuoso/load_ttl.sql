-- PAVS RDF bulk load script for Virtuoso isql
-- Run with: isql virtuoso:1111 dba pavs_dba /load/load_ttl.sql

-- Clear any previous load list entries for our files
DELETE FROM DB.DBA.LOAD_LIST WHERE LL_FILE LIKE '/rdf_import/%';

-- Clear existing graphs so we start clean
SPARQL CLEAR SILENT GRAPH <https://pavs.phenomebrowser.net/graph/cases>;
SPARQL CLEAR SILENT GRAPH <https://pavs.phenomebrowser.net/graph/genes>;
SPARQL CLEAR SILENT GRAPH <https://pavs.phenomebrowser.net/graph/hpoa>;
SPARQL CLEAR SILENT GRAPH <https://pavs.phenomebrowser.net/graph/hpo-ic>;
SPARQL CLEAR SILENT GRAPH <https://pavs.phenomebrowser.net/graph/literature>;
SPARQL CLEAR SILENT GRAPH <https://pavs.phenomebrowser.net/graph/metadata>;

-- Register TTL files for bulk loading (ld_dir queues them; rdf_loader_run processes)
ld_dir('/rdf_import', 'cases.ttl',      'https://pavs.phenomebrowser.net/graph/cases');
-- additive supplements to the cases graph (see PAVS_KG_DEPLOYMENT.md §4b/§4c):
-- variant annotations (zygosity/VEP/gnomAD/ClinVar) absent from the source TSV,
-- and the Phenopacket Store overlap flags (dct:source, Reviewer 1.1).
ld_dir('/rdf_import', 'variant_annotations.ttl', 'https://pavs.phenomebrowser.net/graph/cases');
ld_dir('/rdf_import', 'overlap_flags.ttl',       'https://pavs.phenomebrowser.net/graph/cases');
ld_dir('/rdf_import', 'genes.ttl',      'https://pavs.phenomebrowser.net/graph/genes');
ld_dir('/rdf_import', 'hpoa.ttl',       'https://pavs.phenomebrowser.net/graph/hpoa');
ld_dir('/rdf_import', 'hpo_ic.ttl',     'https://pavs.phenomebrowser.net/graph/hpo-ic');
ld_dir('/rdf_import', 'literature.ttl', 'https://pavs.phenomebrowser.net/graph/literature');
ld_dir('/rdf_import', 'metadata.ttl',   'https://pavs.phenomebrowser.net/graph/metadata');

-- Show what is queued
SELECT LL_FILE, LL_GRAPH FROM DB.DBA.LOAD_LIST;

-- Run the loader (processes all queued files)
rdf_loader_run();

-- Copy metadata to default graph for FAIR discoverability
-- FAIR checkers query the default graph without specifying a named graph
SPARQL
INSERT INTO <urn:virtuoso:DefaultQuadStorage> {
  ?s ?p ?o
}
WHERE {
  GRAPH <https://pavs.phenomebrowser.net/graph/metadata> {
    ?s ?p ?o
  }
};

-- Persist to disk
checkpoint;

-- Show result counts per graph
SPARQL SELECT ?g (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?g ORDER BY ?g;

-- Verify metadata in default graph
SPARQL SELECT (COUNT(*) AS ?n) WHERE { <https://pavs.phenomebrowser.net/dataset> ?p ?o };

exit;
