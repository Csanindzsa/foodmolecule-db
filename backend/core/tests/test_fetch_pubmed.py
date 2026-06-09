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
