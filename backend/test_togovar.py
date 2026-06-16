"""Tests for the TogoVar variant-link resolution.

The TogoVar deep-link is built by `_togovar_variant_url`, which parses the
`/api/search/variant` response. It must use the colocated dbSNP rsID
(`existing_variations`) — an earlier version read a `tgv` `id` field that the
search API no longer returns, which silently broke every link (always falling
back to the TogoVar homepage). These tests pin the correct behaviour and guard
against a future API-shape change.

Run:
    pytest backend/test_togovar.py                # unit tests only
    pytest backend/test_togovar.py -m network     # include the live API check
"""
import json
import urllib.request

import pytest

from backend.main import _togovar_variant_url


# --- unit tests (no network) -------------------------------------------------

def test_resolves_rsid_to_variant_page():
    # Real response shape from TogoVar /api/search/variant (chr3:4417183, SUMF1)
    body = {
        "data": [
            {
                "chromosome": "3",
                "position": 4417183,
                "existing_variations": ["rs1064793391"],
                "symbols": [{"name": "SUMF1"}],
            }
        ]
    }
    assert _togovar_variant_url(body) == "https://grch38.togovar.org/variant/rs1064793391"


def test_empty_data_returns_none():
    assert _togovar_variant_url({"data": []}) is None
    assert _togovar_variant_url({}) is None


def test_no_rsid_returns_none():
    # Variant present in TogoVar but without a colocated rsID
    assert _togovar_variant_url({"data": [{"existing_variations": []}]}) is None
    assert _togovar_variant_url({"data": [{"existing_variations": ["CM177977"]}]}) is None


def test_stale_id_field_is_not_used():
    # Regression guard: the old code keyed off a "tgv" id field. A hit carrying
    # only that field (and no rsID) must NOT produce a link.
    assert _togovar_variant_url({"data": [{"id": "tgv12345"}]}) is None


def test_picks_first_rsid_when_multiple():
    body = {"data": [{"existing_variations": ["COSV1", "rs1064793391", "rs999"]}]}
    assert _togovar_variant_url(body) == "https://grch38.togovar.org/variant/rs1064793391"


def test_malformed_body_returns_none():
    assert _togovar_variant_url(None) is None
    assert _togovar_variant_url([]) is None


# --- live integration (network) ----------------------------------------------

@pytest.mark.network
def test_live_togovar_api_returns_rsid():
    """Hits the real TogoVar API for a known PAVS variant (SUMF1 chr3:4417183)
    and asserts the response still yields an rsID-based variant URL — catching a
    future TogoVar API-shape change before it breaks the link in production."""
    payload = json.dumps(
        {"query": {"location": {"chromosome": "3", "position": 4417183}}, "limit": 1}
    ).encode()
    req = urllib.request.Request(
        "https://grch38.togovar.org/api/search/variant",
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read())
    url = _togovar_variant_url(body)
    assert url is not None, "TogoVar API no longer yields an rsID for SUMF1 chr3:4417183"
    assert url.startswith("https://grch38.togovar.org/variant/rs")
