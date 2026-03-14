# PAVS Website

Web interface for exploring the PAVS (Phenotype-Associated Variants in Saudi Arabia) knowledge graph of Saudi Arabian rare disease patients.

## Features

- **Phenotype Search**: Find similar cases using HPO-based semantic similarity (Lin/Resnik + BMA)
- **Variant Lookup**: Search by gene, rsID, HGVS notation, or ACMG classification
- **Disease Browser**: Explore disease-phenotype associations from HPOA
- **Gene Browser**: View gene-disease associations, constraint metrics, GO annotations, GTEx expression
- **Case Detail**: Full phenotype+variant profiles with suggested diseases, TogoVar integration
- **Bilingual UI**: English and Arabic interface (i18n ready)

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│  Virtuoso    │
│ React + Vite │  /api/  │   FastAPI    │  SPARQL │  RDF Store   │
│    (nginx)   │         │ (similarity) │         │  (graphs)    │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Named Graphs in Virtuoso

| Graph URI | Contents |
|---|---|
| `graph/cases` | Saudi PAVS case phenopackets (phenotypes, variants, demographics) |
| `graph/genes` | Gene→disease, pLI/LOEUF, GO, GTEx |
| `graph/hpoa` | Disease→HPO from phenotype.hpoa |
| `graph/hpo-ic` | IC values + HPO hierarchy + labels (for autocomplete) |
| `graph/literature` | 9,588 non-Saudi literature phenopackets |

### Backend In-Memory Caches

The backend loads these caches at startup (~15 seconds):

1. **ic_cache** — `{HP:NNNNNNN → float}` from graph/hpo-ic (12,725 terms)
2. **ancestor_cache** — `{HP:NNNNNNN → set of ancestor HP IDs}` (19,408 terms)
3. **case_hpo_cache** — all cases with HPO sets (17,149 cases) for similarity scoring
4. **disease_label_cache** — `{"OMIM:272200" → "Multiple sulfatase deficiency"}` from phenotype.hpoa (12,958 entries)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- RDF data files from [pavs-knowledge-graph](https://github.com/bio-ontology-research-group/pavs-knowledge-graph)

### Running the Stack

```bash
# 1. Clone this repository
git clone git@github.com:bio-ontology-research-group/pavs-website.git
cd pavs-website

# 2. Configure environment
cp .env.example .env
# Edit .env if needed (ports, passwords, etc.)

# 3. Mount or copy RDF data files
# Option A: Use Docker volume
docker volume create pavs_rdf
# Copy TTL files to the volume or use the knowledge graph docker compose

# Option B: Mount from host (update docker-compose.yml)
# volumes:
#   - /path/to/pavs-knowledge-graph/rdf_output:/rdf_import:ro

# 4. Start the stack
docker compose up -d

# Wait for services to be healthy (~30 seconds)
docker compose ps
```

### Accessing the Application

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API docs | http://localhost:8000/docs |
| Virtuoso SPARQL UI | http://localhost:8890/sparql |

## Development

### Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run locally (requires Virtuoso running)
export SPARQL_ENDPOINT=http://localhost:8890/sparql
export DATA_DIR=../data
uvicorn main:app --reload --port 8000
```

The backend uses:
- **FastAPI** for REST API
- **pandas** for data manipulation
- **pronto** for HPO ontology parsing
- Pure Python similarity functions (no pyhpo) for portability

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

The frontend uses:
- **React 18** with TypeScript
- **Vite** for build tooling
- **i18next** for internationalization (English + Arabic)
- **Tailwind CSS** for styling

### Rebuilding After Code Changes

```bash
# Rebuild backend + frontend only (fast)
docker compose build backend frontend
docker compose up -d backend frontend

# Full rebuild
docker compose down
docker compose up -d --build
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check (IC terms, ancestor terms, case cache size) |
| GET | `/api/search/hpo?q=` | HPO autocomplete (label substring match) |
| POST | `/api/search/phenotype` | Rank cases by HPO similarity (Lin+BMA default) |
| GET | `/api/search/gene?q=` | Search cases by gene symbol |
| GET | `/api/search/variant` | Lookup by gene / rsID / HGVS / ACMG class |
| GET | `/api/search/disease?q=` | Search by disease label substring |
| GET | `/api/case/{id}` | Full case detail with suggested diseases |
| GET | `/api/gene/{symbol}` | Gene detail from genes graph |
| GET | `/api/togovar-search?chrom=&pos=` | Proxy to TogoVar API → redirect to variant page |
| GET | `/api/phenopacket/{id}/download` | Download individual phenopacket JSON |
| GET | `/api/phenopackets/download-all` | Download PAVS_phenopackets.zip |

### POST `/api/search/phenotype` Request Body

```json
{
  "hpo_ids": ["HP:0001263", "HP:0001250"],
  "method": "lin",
  "limit": 20,
  "include_disease_phenotypes": false,
  "include_non_saudi": false
}
```

## Deployment

### Production Deployment

1. **Configure reverse proxy** (nginx/Caddy) to handle SSL
2. **Set PAVS_PUBLIC_URL** in `.env` if deploying behind a proxy
3. **Secure Virtuoso** — change default passwords in `.env`
4. **Persistent volumes** — ensure `virtuoso_db` and `pavs_rdf` volumes are backed up

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name pavs.example.com;
    
    ssl_certificate /etc/ssl/certs/pavs.crt;
    ssl_certificate_key /etc/ssl/private/pavs.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Updating RDF Data

```bash
# 1. Generate new RDF files using pavs-knowledge-graph
cd /path/to/pavs-knowledge-graph
./scripts/generate_rdf.sh

# 2. Copy to website volume
docker cp rdf_output/cases.ttl pavs-website-virtuoso-1:/rdf_import/
docker cp rdf_output/genes.ttl pavs-website-virtuoso-1:/rdf_import/
# ... etc for all TTL files

# 3. Reload Virtuoso graphs
docker compose restart loader
docker compose restart backend
```

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# Integration tests (requires running stack)
cd tests
pytest test_sparql_queries.py
```

## Known Issues / Gotchas

- **Virtuoso boolean encoding**: SPARQL JSON returns `"1"` not `"true"` for `true^^xsd:boolean`. Backend normalizes this.
- **TogoVar**: Saudi-specific variants are often absent from the Japanese cohort database (expected behavior).
- **Lin similarity > 1.0**: Can occur due to imperfect disease annotation propagation in phenotype.hpoa. Scores displayed as raw decimals.
- **Backend startup time**: ~15 seconds to load all caches from Virtuoso. Wait for `/api/health` to return 200.

## Citation

If you use this software, please cite:

```

```

## License

GNU General Public License v3.0 - See [LICENSE](LICENSE) for details.

## Related Projects

- [PAVS](https://github.com/bio-ontology-research-group/pavs) - Main PAVS repository
- [PAVS Knowledge Graph](https://github.com/bio-ontology-research-group/pavs-knowledge-graph) - RDF generation pipeline
- [PAVS Phenopackets](https://github.com/bio-ontology-research-group/pavs-phenopackets) - Standardized phenopackets
- [Phenotype Matcher](https://github.com/bio-ontology-research-group/phenotype-matcher) - Normalization library
