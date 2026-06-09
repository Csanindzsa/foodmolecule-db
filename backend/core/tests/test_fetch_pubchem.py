import httpx

from scripts.fetchers import fetch_pubchem


class SequenceClient:
    def __init__(self, responses: list[httpx.Response]):
        self.responses = responses
        self.calls = 0

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url: str, timeout: int):
        self.calls += 1
        return self.responses.pop(0)


def _response(status_code: int, url: str, payload: dict):
    return httpx.Response(
        status_code,
        json=payload,
        request=httpx.Request("GET", url),
    )


def test_get_compound_properties_retries_transient_pubchem_status(monkeypatch):
    clients: list[SequenceClient] = []
    url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/971/property/data/JSON"

    def client_factory():
        client = SequenceClient(
            [
                _response(500, url, {}),
                _response(
                    200,
                    url,
                    {
                        "PropertyTable": {
                            "Properties": [
                                {
                                    "MolecularFormula": "C2H2O4",
                                    "MolecularWeight": 90.03,
                                }
                            ]
                        }
                    },
                ),
            ]
        )
        clients.append(client)
        return client

    monkeypatch.setattr(fetch_pubchem.httpx, "Client", client_factory)
    monkeypatch.setattr(fetch_pubchem.time, "sleep", lambda _: None)

    props = fetch_pubchem.get_compound_properties(971)

    assert props["MolecularFormula"] == "C2H2O4"
    assert clients[0].calls == 2


def test_get_cid_by_name_returns_none_for_not_found_without_retry(monkeypatch):
    clients: list[SequenceClient] = []
    url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/not-found/cids/JSON"

    def client_factory():
        client = SequenceClient([_response(404, url, {})])
        clients.append(client)
        return client

    monkeypatch.setattr(fetch_pubchem.httpx, "Client", client_factory)
    monkeypatch.setattr(fetch_pubchem.time, "sleep", lambda _: None)

    assert fetch_pubchem.get_cid_by_name("not-found") is None
    assert clients[0].calls == 1


def test_fetch_molecule_builds_pipeline_entry(monkeypatch):
    monkeypatch.setattr(fetch_pubchem, "get_cid_by_name", lambda name: 971)
    monkeypatch.setattr(
        fetch_pubchem,
        "get_compound_properties",
        lambda cid: {
            "MolecularFormula": "C2H2O4",
            "MolecularWeight": 90.03,
            "IUPACName": "ethanedioic acid",
            "CanonicalSMILES": "C(=O)(C(=O)O)O",
        },
    )

    entry = fetch_pubchem.fetch_molecule("Oxalic Acid")

    assert entry is not None
    assert entry.name == "oxalic acid"
    assert entry.pubchem_cid == 971
    assert entry.molecular_formula == "C2H2O4"
    assert entry.molecular_weight == 90.03
    assert entry.metadata["canonical_smiles"] == "C(=O)(C(=O)O)O"
