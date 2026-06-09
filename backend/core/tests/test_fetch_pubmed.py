from xml.etree import ElementTree as ET

import httpx

from scripts.fetchers import fetch_pubmed


class FakeClient:
    def __init__(self, text: str):
        self.text = text

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url: str, params: dict, timeout: int):
        return httpx.Response(
            200,
            text=self.text,
            request=httpx.Request("GET", url, params=params),
        )


def test_abstract_text_combines_labeled_sections_and_nested_text():
    article = ET.fromstring(
        """
        <PubmedArticle>
          <MedlineCitation>
            <Article>
              <Abstract>
                <AbstractText Label="BACKGROUND">First <i>section</i>.</AbstractText>
                <AbstractText Label="RESULTS">Second section.</AbstractText>
              </Abstract>
            </Article>
          </MedlineCitation>
        </PubmedArticle>
        """
    )

    assert fetch_pubmed.abstract_text(article) == "BACKGROUND: First section.\nRESULTS: Second section."


def test_fetch_abstracts_preserves_all_abstract_sections(monkeypatch):
    xml = """
    <PubmedArticleSet>
      <PubmedArticle>
        <MedlineCitation>
          <PMID>12345</PMID>
          <Article>
            <Abstract>
              <AbstractText Label="METHODS">Diet records were collected.</AbstractText>
              <AbstractText Label="RESULTS">Higher intake changed biomarkers.</AbstractText>
            </Abstract>
          </Article>
        </MedlineCitation>
      </PubmedArticle>
    </PubmedArticleSet>
    """
    monkeypatch.setattr(fetch_pubmed.httpx, "Client", lambda: FakeClient(xml))

    abstracts = fetch_pubmed.fetch_abstracts(["12345"])

    assert abstracts == {
        "12345": "METHODS: Diet records were collected.\nRESULTS: Higher intake changed biomarkers."
    }


def test_publication_year_accepts_only_model_safe_years():
    assert fetch_pubmed.publication_year("2025 Jan") == 2025
    assert fetch_pubmed.publication_year("1900") == 1900
    assert fetch_pubmed.publication_year("2100 Dec") == 2100
    assert fetch_pubmed.publication_year("") is None
    assert fetch_pubmed.publication_year("Fall 2025") is None
    assert fetch_pubmed.publication_year("1899") is None
    assert fetch_pubmed.publication_year("9999") is None


def test_build_study_entries_ignores_out_of_range_pubmed_year(monkeypatch):
    monkeypatch.setattr(
        fetch_pubmed,
        "fetch_summaries",
        lambda pmids: {
            "12345": {
                "title": "Placeholder year study",
                "authors": [{"name": "A Researcher"}],
                "fulljournalname": "Journal of Food Data",
                "pubdate": "9999",
            },
        },
    )
    monkeypatch.setattr(fetch_pubmed, "fetch_abstracts", lambda pmids: {"12345": "Abstract."})

    entries = fetch_pubmed.build_study_entries(["12345"])

    assert len(entries) == 1
    assert entries[0].publication_year is None
    assert entries[0].title == "Placeholder year study"
